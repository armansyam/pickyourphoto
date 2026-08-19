import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthVendor } from '@/lib/auth';
import { getWorkerDriveClient, createVendorRootFolder, setDriveFilePublic } from '@/lib/google-master-drive';
import { Readable } from 'stream';

export const dynamic = 'force-dynamic';

const MAX_DAILY_PLATFORM_BYTES = 720 * 1024 * 1024 * 1024; // 720 GB Cap

// Kamus Format Media Fotografi & Videografi Lengkap (Semua Merk Kamera Dunia)
const ALLOWED_EXTENSIONS = /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif|tiff?|svg|psd|psb|ai|cr2|cr3|crw|arw|srf|sr2|nef|nrw|raf|rw2|raw|orf|dng|rwl|3fr|fff|iiq|pef|ptx|mp4|mov|avi|mkv|m4v|webm|mts|m2ts|flv|wmv|3gp)$/i;

// Blacklist Berkas Script, Executable & Coding
const FORBIDDEN_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs|json|map|css|scss|html|htm|py|php|rb|go|java|c|cpp|h|sh|bat|cmd|exe|dll|so|dylib|bin|zip|rar|7z|tar|gz|sql|env|lock|yml|yaml|md|txt)$/i;

/**
 * POST /api/storage/upload/direct
 * Stream Upload Direct ke Google Drive API v3 via Server Pipe Proxy
 * Menghindari kendala CORS browser & menjamin upload 100% sukses tanpa simpan file di disk lokal
 */
export async function POST(req) {
  const session = getAuthVendor();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Otentikasi dibutuhkan.' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const parentFolderId = formData.get('parentFolderId');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ success: false, error: 'File tidak ditemukan dalam request.' }, { status: 400 });
    }

    const fileName = file.name;
    const fileSizeBytes = file.size;
    const mimeType = file.type || '';

    // 1. FILTER KEAMANAN EKSTENSI FILE & JUNK FILES OS (.DS_Store, Thumbs.db)
    if (fileName.startsWith('.') || fileName.startsWith('._') || fileName === 'Thumbs.db' || fileName === 'desktop.ini') {
      return NextResponse.json({
        success: false,
        error: 'Berkas tersembunyi sistem (.DS_Store / Thumbs.db) diabaikan.'
      }, { status: 400 });
    }

    if (FORBIDDEN_EXTENSIONS.test(fileName)) {
      return NextResponse.json({
        success: false,
        error: `Format berkas "${fileName}" ditolak. Demi keamanan cloud studio foto, hanya berkas foto, video, dan aset desain yang diizinkan.`
      }, { status: 400 });
    }

    const isMimeMedia = mimeType && (mimeType.startsWith('image/') || mimeType.startsWith('video/'));
    const isAllowedExt = ALLOWED_EXTENSIONS.test(fileName);

    if (!isMimeMedia && !isAllowedExt) {
      return NextResponse.json({
        success: false,
        error: `Format berkas "${fileName}" tidak didukung. Harap unggah foto (.jpg, .png, .raw, .dng, dll) atau video (.mp4, .mov, dll).`
      }, { status: 400 });
    }

    const vendor = db.prepare('SELECT id, name, email, driveRootFolderId, hasStorageAddon, addonStorageQuotaBytes, usedStorageBytes, externalDriveConnected, externalDriveRefreshToken, activeStorageMode FROM vendors WHERE id = ?').get(session.id);
    if (!vendor) {
      return NextResponse.json({ success: false, error: 'Vendor tidak ditemukan.' }, { status: 404 });
    }

    const targetMode = formData.get('storageMode') || (formData.get('isExternalDrive') === 'true' ? 'byos' : (vendor.activeStorageMode || (vendor.externalDriveConnected ? 'byos' : 'system')));

    // A. JALUR UPLOAD DIRECT KE GOOGLE DRIVE VENDOR PRIBADI (BYOS)
    if (targetMode === 'byos') {
      if (!vendor.externalDriveConnected || !vendor.externalDriveRefreshToken) {
        return NextResponse.json({
          success: false,
          error: 'Akun Google Drive pribadi Anda belum terhubung. Silakan hubungkan Google Drive terlebih dahulu.'
        }, { status: 400 });
      }

      const { getVendorDriveClient } = await import('@/lib/google-master-drive');
      const vendorDrive = await getVendorDriveClient(vendor.id);
      if (!vendorDrive) throw new Error('Gagal menghubungkan ke Google Drive Vendor.');

      const targetFolderId = (!parentFolderId || parentFolderId === 'root') ? 'root' : parentFolderId;
      const buffer = Buffer.from(await file.arrayBuffer());
      const stream = Readable.from(buffer);

      const driveRes = await vendorDrive.files.create({
        requestBody: {
          name: fileName,
          parents: [targetFolderId],
        },
        media: {
          mimeType: mimeType,
          body: stream,
        },
        fields: 'id, name, mimeType, size, webViewLink, webContentLink',
      });

      const driveFileId = driveRes.data.id;

      // Set public reader (non-blocking)
      setDriveFilePublic(vendorDrive, driveFileId).catch(() => {});

      // Registrasikan ke database storage_files dengan isExternalDrive = 1 (tanpa memotong kuota SaaS)
      db.prepare(`
        INSERT INTO storage_files (vendorId, parentFolderId, driveFileId, fileName, fileSizeBytes, mimeType, webViewLink, webContentLink, isExternalDrive)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        vendor.id,
        targetFolderId,
        driveFileId,
        fileName,
        fileSizeBytes,
        mimeType,
        driveRes.data.webViewLink || '',
        driveRes.data.webContentLink || ''
      );

      return NextResponse.json({
        success: true,
        message: `Berkas ${fileName} berhasil diunggah ke Google Drive Anda.`,
        file: {
          id: driveFileId,
          fileName,
          fileSizeBytes,
          mimeType,
          webViewLink: driveRes.data.webViewLink
        }
      });
    }

    // B. JALUR UPLOAD KE SAAS DEDICATED STORAGE ADMIN
    const hasAddon = Boolean(vendor.hasStorageAddon || (vendor.addonStorageQuotaBytes && vendor.addonStorageQuotaBytes > 0));

    if (vendor.addonStorageQuotaBytes > 0 && !vendor.hasStorageAddon) {
      try {
        db.prepare('UPDATE vendors SET hasStorageAddon = 1 WHERE id = ?').run(vendor.id);
        vendor.hasStorageAddon = 1;
      } catch (_) {}
    }

    if (!hasAddon) {
      return NextResponse.json({
        success: false,
        error: 'Anda belum memiliki Paket Add-On Storage aktif. Harap beli atau aktifkan paket storage terlebih dahulu.'
      }, { status: 403 });
    }

    const usedBytes = vendor.usedStorageBytes || 0;
    const totalQuotaBytes = vendor.addonStorageQuotaBytes || 0;

    // 2. VALIDASI KUOTA PERSONAL VENDOR
    if (usedBytes + fileSizeBytes > totalQuotaBytes) {
      const remainingBytes = Math.max(0, totalQuotaBytes - usedBytes);
      return NextResponse.json({
        success: false,
        error: `Kapasitas Cloud Storage Anda tidak mencukupi. Sisa kuota: ${formatBytes(remainingBytes)}, Ukuran file: ${formatBytes(fileSizeBytes)}.`
      }, { status: 400 });
    }

    // 3. VALIDASI CAP HARIAN PLATFORM
    const capRow = db.prepare("SELECT value FROM saas_settings WHERE key = 'daily_upload_cap_gb'").get();
    const capGb = capRow && parseInt(capRow.value, 10) > 0 ? parseInt(capRow.value, 10) : 720;
    const maxDailyPlatformBytes = capGb * 1024 * 1024 * 1024;

    const today = new Date().toISOString().split('T')[0];
    const dailyLog = db.prepare('SELECT totalBytesUploaded FROM daily_upload_logs WHERE logDate = ?').get(today);
    const currentDailyBytes = dailyLog ? dailyLog.totalBytesUploaded : 0;

    if (currentDailyBytes + fileSizeBytes > maxDailyPlatformBytes) {
      db.prepare(`
        INSERT INTO upload_queue (vendorId, parentFolderId, fileName, fileSizeBytes, mimeType, status)
        VALUES (?, ?, ?, ?, ?, 'queued')
      `).run(vendor.id, parentFolderId || 'root', fileName, fileSizeBytes, mimeType);

      return NextResponse.json({
        success: true,
        queued: true,
        message: `Batas lalu lintas harian platform (${capGb} GB) sedang penuh. Berkas "${fileName}" dimasukkan ke antrean sistem dan akan diproses otomatis.`
      });
    }

    // 4. PASTI KAN ROOT FOLDER VENDOR TERSEDIA
    let rootFolderId = vendor.driveRootFolderId;
    if (!rootFolderId) {
      const root = await createVendorRootFolder(vendor.email, vendor.name);
      rootFolderId = root.folderId;
      db.prepare('UPDATE vendors SET driveRootFolderId = ? WHERE id = ?').run(rootFolderId, vendor.id);
    }

    const targetFolderId = parentFolderId && parentFolderId !== 'root' ? parentFolderId : rootFolderId;

    // 5. STREAM PIPE UPLOAD VIA WORKER DRIVE CLIENT (Worker Account is File Owner)
    const { drive: workerDrive, workerAccount } = await getWorkerDriveClient();
    if (!workerDrive) throw new Error('Integrasi Google Drive Worker belum dikonfigurasi.');

    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buffer);

    const driveRes = await workerDrive.files.create({
      requestBody: {
        name: fileName,
        parents: [targetFolderId],
      },
      media: {
        mimeType: mimeType,
        body: stream,
      },
      fields: 'id, name, mimeType, size, webViewLink, webContentLink',
    });

    const driveFileId = driveRes.data.id;

    // 6. AUTO SET HAK AKSES PUBLIK (Non-blocking background execution agar respons upload instan)
    setDriveFilePublic(workerDrive, driveFileId).catch(() => {});

    // Update usedStorageBytes & status pada Akun Worker di Database
    if (workerAccount) {
      const newWorkerUsed = (workerAccount.usedStorageBytes || 0) + fileSizeBytes;
      const isFull = newWorkerUsed >= workerAccount.totalLimitBytes;
      db.prepare('UPDATE master_drive_accounts SET usedStorageBytes = ?, status = ? WHERE id = ?')
        .run(newWorkerUsed, isFull ? 'full' : 'active', workerAccount.id);
    }

    // 7. REGISTRASIKAN FILE KE DATABASE & UPDATE USED STORAGE BYTES VENDOR
    db.prepare(`
      INSERT INTO storage_files (vendorId, parentFolderId, driveFileId, fileName, fileSizeBytes, mimeType, webViewLink, webContentLink, isExternalDrive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      vendor.id,
      targetFolderId,
      driveFileId,
      fileName,
      fileSizeBytes,
      mimeType,
      driveRes.data.webViewLink || '',
      driveRes.data.webContentLink || ''
    );

    // Update usedStorageBytes Vendor
    db.prepare('UPDATE vendors SET usedStorageBytes = usedStorageBytes + ? WHERE id = ?').run(fileSizeBytes, vendor.id);

    // Update log harian
    db.prepare(`
      INSERT INTO daily_upload_logs (logDate, totalBytesUploaded)
      VALUES (?, ?)
      ON CONFLICT(logDate) DO UPDATE SET totalBytesUploaded = totalBytesUploaded + ?
    `).run(today, fileSizeBytes, fileSizeBytes);

    return NextResponse.json({
      success: true,
      message: `Berkas ${fileName} berhasil diunggah ke Cloud Storage.`,
      file: {
        id: driveFileId,
        fileName,
        fileSizeBytes,
        mimeType,
        webViewLink: driveRes.data.webViewLink
      }
    });
  } catch (error) {
    console.error('[Direct Stream Upload Error]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}
