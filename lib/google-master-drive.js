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

