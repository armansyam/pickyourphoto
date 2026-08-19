import { google } from 'googleapis';
import db from './db.js';

/**
 * Google Master Drive OAuth Helper
 * Enables centralized Studio Master OAuth for Pick-Your-Photo SaaS platform
 */

let cachedDriveClient = null;
let cachedClientTimestamp = 0;
const CACHE_TTL_MS = 45 * 60 * 1000; // 45 minutes cache TTL

export function getMasterDriveClient() {
  try {
    const now = Date.now();
    if (cachedDriveClient && (now - cachedClientTimestamp < CACHE_TTL_MS)) {
      return cachedDriveClient;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || getSaasSetting('google_client_id');
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || getSaasSetting('google_client_secret');
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || getSaasSetting('google_refresh_token');
    const accessToken = getSaasSetting('google_access_token');

    if (!clientId || !clientSecret || (!refreshToken && !accessToken)) {
      return null;
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
    );

    const credentials = {};
    if (refreshToken) credentials.refresh_token = refreshToken;
    if (accessToken) credentials.access_token = accessToken;

    oauth2Client.setCredentials(credentials);

    oauth2Client.on('tokens', (tokens) => {
      if (tokens.access_token) {
        try {
          db.prepare("INSERT OR REPLACE INTO saas_settings (key, value) VALUES ('google_access_token', ?)").run(tokens.access_token);
        } catch (e) {}
        // Reset cache agar client berikutnya dibuat ulang dengan token fresh (cegah 401 stale token)
        cachedDriveClient = null;
        cachedClientTimestamp = 0;
      }
      if (tokens.refresh_token) {
        try {
          db.prepare("INSERT OR REPLACE INTO saas_settings (key, value) VALUES ('google_refresh_token', ?)").run(tokens.refresh_token);
        } catch (e) {}
      }
    });

    const client = google.drive({ version: 'v3', auth: oauth2Client });
    cachedDriveClient = client;
    cachedClientTimestamp = now;


    return client;
  } catch (err) {
    console.error('[Google Master Drive Client Error]:', err.message);
    return null;
  }
}


function getSaasSetting(key) {
  try {
    const row = db.prepare('SELECT value FROM saas_settings WHERE key = ?').get(key);
    return row ? row.value : null;
  } catch {
    return null;
  }
}

let currentWorkerIndex = 0;

/**
 * Mendapatkan Drive API Client dari Worker Account aktif (role = 'worker')
 * Mengalokasikan file fisik ke Worker Account secara Round-Robin Load Balancing
 * sehingga seluruh Akun Worker yang memiliki kuota bekerja membagi tugas antrean secara paralel.
 */
export async function getWorkerDriveClient() {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || getSaasSetting('google_client_id');
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || getSaasSetting('google_client_secret');

    if (!clientId || !clientSecret) {
      const masterDrive = getMasterDriveClient();
      return { drive: masterDrive, workerAccount: null };
    }

    // 1. Ambil seluruh Akun Worker aktif yang masih memiliki sisa kuota (diurutkan sisa kuota terbanyak dulu)
    const activeWorkers = db.prepare(`
      SELECT * FROM master_drive_accounts 
      WHERE role = 'worker' AND status = 'active' AND usedStorageBytes < totalLimitBytes 
      ORDER BY (totalLimitBytes - usedStorageBytes) DESC, id ASC
    `).all();

    let workerAccount = null;
    if (activeWorkers && activeWorkers.length > 0) {
      // Distribusi tugas antrean secara Round-Robin bergiliran ke tiap Akun Worker
      const index = currentWorkerIndex % activeWorkers.length;
      currentWorkerIndex = (currentWorkerIndex + 1) % activeWorkers.length;
      workerAccount = activeWorkers[index];
    } else {
      // 2. Jika belum ada Worker khusus, fallback ke Master Index Hub
      workerAccount = db.prepare(`
        SELECT * FROM master_drive_accounts 
        WHERE role = 'master_index' AND status = 'active' 
        LIMIT 1
      `).get();
    }

    const refreshToken = workerAccount ? workerAccount.refreshToken : (process.env.GOOGLE_REFRESH_TOKEN || getSaasSetting('google_refresh_token'));

    if (!refreshToken) {
      const masterDrive = getMasterDriveClient();
      return { drive: masterDrive, workerAccount: null };
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    // Paksa pembaharuan access token agar tidak pernah 401 Invalid Credentials akibat token kadaluarsa
    try {
      const tokenRes = await oauth2Client.getAccessToken();
      if (tokenRes.token && workerAccount) {
        db.prepare("UPDATE master_drive_accounts SET accessToken = ? WHERE id = ?").run(tokenRes.token, workerAccount.id);
      }
    } catch (refErr) {
      console.warn('[Worker Token Refresh Warning]:', refErr.message);
    }

    return {
      drive: google.drive({ version: 'v3', auth: oauth2Client }),
      workerAccount
    };
  } catch (err) {
    console.error('[Worker Drive Client Error]:', err.message);
    const masterDrive = getMasterDriveClient();
    return { drive: masterDrive, workerAccount: null };
  }
}

/**
 * Menyinkronkan kuota penyimpanan seluruh Akun Worker secara live langsung dari Google Drive Cloud API
 * Jika langganan 5TB akun worker berubah/berhenti kembali ke 15GB, database akan diperbarui seketika.
 */
export async function syncWorkerStorageQuotas() {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || getSaasSetting('google_client_id');
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || getSaasSetting('google_client_secret');

    if (!clientId || !clientSecret) {
      return { success: false, error: 'Google OAuth Client ID / Secret belum dikonfigurasi.' };
    }

    const accounts = db.prepare("SELECT id, email, role, refreshToken, totalLimitBytes, usedStorageBytes, status FROM master_drive_accounts").all() || [];
    const syncLogs = [];

    for (const acc of accounts) {
      if (!acc.refreshToken) continue;

      try {
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
        oauth2Client.setCredentials({ refresh_token: acc.refreshToken });
        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        const aboutRes = await drive.about.get({ fields: 'storageQuota, user' });
        const quota = aboutRes.data?.storageQuota;

        if (quota && quota.limit) {
          const liveLimitBytes = parseInt(quota.limit, 10);
          const liveUsageBytes = parseInt(quota.usageInDrive || quota.usage || 0, 10);

          // Tentukan status berdasarkan kapasitas nyata
          let newStatus = acc.status === 'disabled' ? 'disabled' : 'active';
          if (acc.usedStorageBytes >= liveLimitBytes || liveUsageBytes >= liveLimitBytes) {
            newStatus = 'full';
          } else if (acc.status === 'full' && liveUsageBytes < liveLimitBytes && acc.usedStorageBytes < liveLimitBytes) {
            newStatus = 'active';
          }

          db.prepare(`
            UPDATE master_drive_accounts 
            SET totalLimitBytes = ?, usedStorageBytes = MAX(usedStorageBytes, ?), status = ?
            WHERE id = ?
          `).run(liveLimitBytes, liveUsageBytes, newStatus, acc.id);

          syncLogs.push({
            id: acc.id,
            email: acc.email,
            previousLimitGB: (acc.totalLimitBytes / (1024 ** 3)).toFixed(2),
            liveLimitGB: (liveLimitBytes / (1024 ** 3)).toFixed(2),
            liveUsageGB: (liveUsageBytes / (1024 ** 3)).toFixed(2),
            status: newStatus,
            success: true
          });
        } else {
          // Akun tanpa batas kuota spesifik (Google Workspace Unlimited)
          syncLogs.push({
            id: acc.id,
            email: acc.email,
            status: acc.status,
            success: true,
            note: 'Unlimited storage or unmetered quota'
          });
        }
      } catch (workerErr) {
        console.warn(`[Sync Worker Quota Warning] Gagal membaca kuota Google untuk ${acc.email}:`, workerErr.message);

        // Jika Refresh Token ditolak atau dicabut
        if (workerErr.message && (workerErr.message.includes('invalid_grant') || workerErr.message.includes('Token has been expired or revoked'))) {
          db.prepare("UPDATE master_drive_accounts SET status = 'disabled' WHERE id = ?").run(acc.id);
        }

        syncLogs.push({
          id: acc.id,
          email: acc.email,
          error: workerErr.message,
          success: false
        });
      }
    }

    return {
      success: true,
      syncedAt: new Date().toISOString(),
      totalAccounts: accounts.length,
      syncedCount: syncLogs.filter(s => s.success).length,
      details: syncLogs
    };
  } catch (err) {
    console.error('[Sync Worker Storage Quotas Error]:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Mengubah Izin Berkas File menjadi Publik (type: 'anyone', role: 'reader')
 * Diperlukan agar thumbnail & foto dapat tampil langsung di Galeri Seleksi Klien
 */
export async function setDriveFilePublic(driveClient, driveFileId) {
  try {
    await driveClient.permissions.create({
      fileId: driveFileId,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });
    return true;
  } catch (err) {
    console.warn(`[Public Permission Warning] Gagal mengeset publik untuk file ${driveFileId}:`, err.message);
    return false;
  }
}

export async function fetchFolderFilesMasterOAuth(folderId, categoryName = '', depth = 0) {
  const drive = getMasterDriveClient();
  if (!drive) {
    throw new Error('Integrasi Google OAuth 2.0 belum dikonfigurasi atau belum terhubung di Panel Admin.');
  }

  // Safety depth limit to prevent infinite loops (max 5 levels)
  if (depth > 5) return [];

  let files = [];
  let pageToken = '';
  const isImageFile = (filename) => /\.(jpe?g|png|webp|gif|bmp|heic|heif|tiff?|cr2|cr3|arw|nef|dng|raw|orf|rw2)$/i.test(filename || '');

  do {
    let res;
    try {
      res = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'nextPageToken, files(id, name, mimeType, size)',
        pageSize: 200,
        pageToken: pageToken || undefined
      });
    } catch (err) {
      console.error('[Master OAuth Fetch Error]:', err.message);
      if (err.status === 404 || err.code === 404) {
        throw new Error('Folder Google Drive tidak ditemukan. Harap periksa kembali URL/ID folder.');
      } else if (err.status === 403 || err.code === 403) {
        throw new Error('Akses ke folder Google Drive ditolak. Harap pastikan folder diset publik/dapat diakses.');
      } else if (err.status === 401 || err.code === 401) {
        throw new Error('Otentikasi Google OAuth tidak valid atau kadaluarsa. Harap hubungkan ulang Google OAuth di Panel Admin.');
      }
      throw new Error(`Gagal membaca Google Drive via OAuth: ${err.message}`);
    }

    const pageFiles = res.data.files || [];

    // 1. Filter image files
    const images = pageFiles
      .filter(file => (file.mimeType && file.mimeType.startsWith('image/')) || isImageFile(file.name))
      .map(file => ({ id: file.id, name: file.name, category: categoryName, size: parseInt(file.size) || 0 }));
    files = files.concat(images);

    // 2. Process sub-folders recursively at all nested depths
    const subFolders = pageFiles.filter(file => file.mimeType === 'application/vnd.google-apps.folder');
    for (const sf of subFolders) {
      try {
        const subCategory = categoryName ? `${categoryName} / ${sf.name}` : sf.name;
        const sfFiles = await fetchFolderFilesMasterOAuth(sf.id, subCategory, depth + 1);
        if (sfFiles && sfFiles.length > 0) {
          files = files.concat(sfFiles);
        }
      } catch (sfErr) {
        console.warn(`[Master OAuth] Gagal memindai subfolder ${sf.name}:`, sfErr.message);
      }
    }

    pageToken = res.data.nextPageToken || '';
  } while (pageToken);

  return files;
}

/**
 * Wraps Google Drive API calls dengan Exponential Backoff Loop untuk menangani HTTP 403 / 429 Rate Limit
 */
export async function executeWithBackoff(apiCallFn, maxRetries = 4) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await apiCallFn();
    } catch (err) {
      attempt++;
      const isRateLimit = err.status === 429 || err.status === 403 || err.code === 429 || err.code === 403 || (err.message && err.message.toLowerCase().includes('rate limit'));
      if (isRateLimit && attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 500); // 2s, 4s, 8s, 16s + jitter
        console.warn(`[Google Drive Rate Limit 429/403] Menunggu ${delayMs}ms sebelum mencoba ulang (Percobaan ${attempt}/${maxRetries})...`);
        await new Promise(res => setTimeout(res, delayMs));
      } else {
        throw err;
      }
    }
  }
}

/**
 * Memastikan Folder Kluster Master (Master_Cluster_A, Master_Cluster_B, dst) siap untuk menampung max 500 vendor
 */
async function getOrCreateActiveMasterClusterFolder(drive) {
  let clusterRow = db.prepare("SELECT value FROM saas_settings WHERE key = 'current_master_cluster_id'").get();
  let clusterCountRow = db.prepare("SELECT value FROM saas_settings WHERE key = 'current_master_cluster_count'").get();
  let clusterNameRow = db.prepare("SELECT value FROM saas_settings WHERE key = 'master_cluster_name'").get();
  let parentFolderIdRow = db.prepare("SELECT value FROM saas_settings WHERE key = 'master_parent_folder_id'").get();
  
  let clusterId = clusterRow ? clusterRow.value : null;
  let count = clusterCountRow ? parseInt(clusterCountRow.value, 10) : 0;
  let clusterName = clusterNameRow ? clusterNameRow.value : '[PICK-YOUR-PHOTO] Platform Master Storage Cluster A';
  let parentFolderId = parentFolderIdRow ? parentFolderIdRow.value : null;

  // Jika belum ada kluster atau kluster penuh (>= 500 vendor), buat kluster baru!
  if (!clusterId || count >= 500) {
    const clusterIndex = Math.floor(count / 500);
    const clusterLetter = String.fromCharCode(65 + (clusterIndex % 26)); // A, B, C...
    const dynamicClusterName = `${clusterName} ${clusterLetter}`;
    
    const fileMetadata = {
      name: dynamicClusterName,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentFolderId && parentFolderId !== 'root') {
      fileMetadata.parents = [parentFolderId];
    }

    const clusterRes = await executeWithBackoff(() => drive.files.create({
      resource: fileMetadata,
      fields: 'id, name',
    }));

    clusterId = clusterRes.data.id;
    count = 0;

    db.prepare("INSERT OR REPLACE INTO saas_settings (key, value) VALUES ('current_master_cluster_id', ?)").run(clusterId);
    db.prepare("INSERT OR REPLACE INTO saas_settings (key, value) VALUES ('current_master_cluster_count', ?)").run('0');
    db.prepare("INSERT OR REPLACE INTO saas_settings (key, value) VALUES ('master_cluster_name', ?)").run(dynamicClusterName);
  }

  // Update jumlah folder vendor di kluster aktif — hanya increment jika clusterId valid
  if (clusterId) {
    db.prepare("INSERT OR REPLACE INTO saas_settings (key, value) VALUES ('current_master_cluster_count', ?)").run(String(count + 1));
  }
  return clusterId;
}

/**
 * Buat Folder Induk Sewa Vendor di Google Drive Admin Pool & Set Read-Only Permission ke Gmail Vendor
 */
export async function createVendorRootFolder(vendorEmail, vendorName) {
  const drive = getMasterDriveClient();
  if (!drive) throw new Error('Integrasi Google OAuth Admin belum aktif.');

  // Dapatkan atau buat Kluster Induk (Master_Cluster_A, Master_Cluster_B, dst.)
  const clusterFolderId = await getOrCreateActiveMasterClusterFolder(drive);

  const vendorTemplateRow = db.prepare("SELECT value FROM saas_settings WHERE key = 'vendor_folder_naming_template'").get();
  const template = vendorTemplateRow ? vendorTemplateRow.value : '📁 [STORAGE DEDICATED] {vendor_name} ({vendor_email})';

  const folderName = template
    .replace('{vendor_name}', vendorName || 'Vendor')
    .replace('{vendor_email}', vendorEmail || '');

  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [clusterFolderId],
  };

  const folderRes = await executeWithBackoff(() => drive.files.create({
    resource: fileMetadata,
    fields: 'id, name, webViewLink',
  }));

  const folderId = folderRes.data.id;

  // Set Writer permission KHUSUS untuk seluruh email Akun Worker terdaftar di DB
  await ensureFolderWriterPermission(folderId);

  // Set Reader (Read-Only) permission untuk email Gmail vendor jika valid
  if (vendorEmail && vendorEmail.includes('@')) {
    try {
      await executeWithBackoff(() => drive.permissions.create({
        fileId: folderId,
        resource: {
          role: 'reader',
          type: 'user',
          emailAddress: vendorEmail,
        },
        sendNotificationEmail: false,
      }));
    } catch (permErr) {
      console.warn(`[Drive Perms Warning] Gagal mengeset izin Reader untuk ${vendorEmail}:`, permErr.message);
    }
  }

  return {
    folderId,
    folderName,
    webViewLink: folderRes.data.webViewLink,
  };
}

/**
 * Memastikan target folder berstatus:
 * 1. PUBLIK READ-ONLY untuk publik / siapapun yang memegang link (type: 'anyone', role: 'reader' / Viewer Only).
 * 2. WRITER KHUSUS untuk daftar email Akun Worker Pool terdaftar di DB (type: 'user', role: 'writer', emailAddress: worker.email).
 */
export async function ensureFolderWriterPermission(folderId) {
  if (!folderId || folderId === 'root') return;
  try {
    const drive = getMasterDriveClient();
    if (!drive) return;

    // 1. Set Publik Reader ONLY (Read-Only / Viewer Only untuk publik)
    try {
      await executeWithBackoff(() => drive.permissions.create({
        fileId: folderId,
        resource: {
          role: 'reader',
          type: 'anyone',
        },
      }));
    } catch (_) {}

    // Jika anyoneWithLink sebelumnya terlanjur 'writer', turunkan ke 'reader'
    try {
      await executeWithBackoff(() => drive.permissions.update({
        fileId: folderId,
        permissionId: 'anyoneWithLink',
        resource: {
          role: 'reader',
        },
      }));
    } catch (_) {}

    // 2. Set Writer Access KHUSUS untuk seluruh Akun Worker Pool terdaftar di DB
    const workers = db.prepare("SELECT email FROM master_drive_accounts WHERE role = 'worker' AND status = 'active'").all();
    for (const w of workers) {
      if (w.email && w.email.includes('@')) {
        try {
          await executeWithBackoff(() => drive.permissions.create({
            fileId: folderId,
            resource: {
              role: 'writer',
              type: 'user',
              emailAddress: w.email,
            },
            sendNotificationEmail: false,
          }));
        } catch (_) {}
      }
    }
  } catch (err) {
    console.warn(`[Folder Security Sharing Warning] Gagal mengeset izin folder ${folderId}:`, err.message);
  }
}

/**
 * Buat Sub-Folder Anak milik Vendor di dalam Folder Sewa
 */
export async function createVendorSubFolder(parentFolderId, folderName) {
  const drive = getMasterDriveClient();
  if (!drive) throw new Error('Integrasi Google OAuth Admin belum aktif.');

  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentFolderId],
  };

  const res = await executeWithBackoff(() => drive.files.create({
    resource: fileMetadata,
    fields: 'id, name, webViewLink',
  }));

  const subFolderId = res.data.id;

  // Set Writer permission KHUSUS untuk seluruh email Akun Worker terdaftar di DB
  await ensureFolderWriterPermission(subFolderId);

  return {
    id: subFolderId,
    name: res.data.name,
    webViewLink: res.data.webViewLink,
  };
}

/**
 * Hapus Berkas File/Folder Permanen dari Google Drive Admin
 */
export async function deleteDriveFile(driveFileId) {
  const drive = getMasterDriveClient();
  if (!drive) throw new Error('Integrasi Google OAuth Admin belum aktif.');

  await executeWithBackoff(() => drive.files.delete({
    fileId: driveFileId,
    supportsAllDrives: true,
    supportsTeamDrives: true
  }));

  return true;
}

/**
 * Penerbitan Tiket Upload Direct (Resumable Upload Session URL) dari Google Drive API v3
 * Memungkinkan browser user mengunggah file langsung ke Google Cloud tanpa membebani server Next.js (0 Byte Local Disk Load).
 */
export async function createResumableUploadTicket(parentFolderId, fileName, mimeType, fileSizeBytes) {
  const clientId = process.env.GOOGLE_CLIENT_ID || getSaasSetting('google_client_id');
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || getSaasSetting('google_client_secret');
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || getSaasSetting('google_refresh_token');

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error('Integrasi Google OAuth belum lengkap.');
  }

  // Dapatkan fresh OAuth access token
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const tokenRes = await oauth2Client.getAccessToken();
  const accessToken = tokenRes.token;

  if (!accessToken) throw new Error('Gagal mendapatkan Access Token Google Drive.');

  // Minta Session Upload URL dari Google Drive API v3
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Upload-Content-Type': mimeType || 'image/jpeg',
      'X-Upload-Content-Length': String(fileSizeBytes || 0),
    },
    body: JSON.stringify({
      name: fileName,
      parents: [parentFolderId],
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google API Gagal Menerbitkan Tiket Upload: ${errorText}`);
  }

  const uploadUrl = res.headers.get('location');
  if (!uploadUrl) throw new Error('Google API tidak mengembalikan Resumable Upload URL.');

  return { uploadUrl, accessToken };
}

/**
 * Mendapatkan Drive Client khusus menggunakan Refresh Token milik Vendor (BYOS External Drive)
 */
export async function getVendorDriveClient(vendorId) {
  try {
    const vendor = db.prepare('SELECT externalDriveConnected, externalDriveRefreshToken, externalDriveEmail FROM vendors WHERE id = ?').get(vendorId);
    if (!vendor || !vendor.externalDriveConnected || !vendor.externalDriveRefreshToken) {
      return null;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || getSaasSetting('google_client_id');
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || getSaasSetting('google_client_secret');

    if (!clientId || !clientSecret) return null;

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
    );

    oauth2Client.setCredentials({ refresh_token: vendor.externalDriveRefreshToken });

    return google.drive({ version: 'v3', auth: oauth2Client });
  } catch (err) {
    console.error('[Vendor Drive Client Error]:', err.message);
    return null;
  }
}

/**
 * Mengambil Kuota Real-time Google Drive milik Vendor (BYOS API about.get)
 */
export async function fetchVendorDriveAboutQuota(vendorId) {
  try {
    const drive = await getVendorDriveClient(vendorId);
    if (!drive) return null;

    const res = await drive.about.get({ fields: 'storageQuota, user' });
    const quota = res.data.storageQuota || {};
    const limit = parseInt(quota.limit, 10) || 0;
    const usage = parseInt(quota.usage, 10) || 0;
    const usageInDrive = parseInt(quota.usageInDrive, 10) || 0;

    return {
      limitBytes: limit,
      usedBytes: usage,
      usageInDriveBytes: usageInDrive,
      freeBytes: limit > 0 ? Math.max(0, limit - usage) : null,
      user: res.data.user || null,
    };
  } catch (err) {
    console.error('[Vendor Drive Quota Error]:', err.message);
    return null;
  }
}

/**
 * Terbit tiket Direct Upload ke Google Drive Vendor Sendiri (BYOS)
 */
export async function createVendorExternalResumableUploadTicket(vendorId, parentFolderId, fileName, mimeType, fileSizeBytes) {
  const vendor = db.prepare('SELECT externalDriveConnected, externalDriveRefreshToken, externalDriveFolderId FROM vendors WHERE id = ?').get(vendorId);
  if (!vendor || !vendor.externalDriveConnected || !vendor.externalDriveRefreshToken) {
    throw new Error('Akun Google Drive Vendor belum terhubung.');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || getSaasSetting('google_client_id');
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || getSaasSetting('google_client_secret');

  if (!clientId || !clientSecret) {
    throw new Error('Konfigurasi Google OAuth Client belum lengkap di server.');
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: vendor.externalDriveRefreshToken });
  const tokenRes = await oauth2Client.getAccessToken();
  const accessToken = tokenRes.token;

  if (!accessToken) throw new Error('Gagal memperbarui Access Token Google Drive Vendor.');

  const targetFolderId = (!parentFolderId || parentFolderId === 'root') ? (vendor.externalDriveFolderId || 'root') : parentFolderId;

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Upload-Content-Type': mimeType || 'image/jpeg',
      'X-Upload-Content-Length': String(fileSizeBytes || 0),
    },
    body: JSON.stringify({
      name: fileName,
      parents: [targetFolderId],
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google API (Vendor GDrive) Gagal Menerbitkan Tiket Upload: ${errorText}`);
  }

  const uploadUrl = res.headers.get('location');
  if (!uploadUrl) throw new Error('Google API tidak mengembalikan Resumable Upload URL.');

  return { uploadUrl, accessToken, targetFolderId };
}


