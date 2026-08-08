import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthVendor } from '@/lib/auth';
import { deleteDriveFile, createVendorRootFolder } from '@/lib/google-master-drive';

export const dynamic = 'force-dynamic';

/**
 * GET /api/storage/files?folderId=xxx
 * Mengambil daftar berkas file & sub-folder milik vendor di dalam folder terpilih
 */
export async function GET(req) {
  const session = getAuthVendor();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Otentikasi dibutuhkan.' }, { status: 401 });
  }

  try {
    const vendor = db.prepare('SELECT id, name, email, driveRootFolderId, hasStorageAddon, addonStorageQuotaBytes, usedStorageBytes, expiresAt, planId, status FROM vendors WHERE id = ?').get(session.id);
    if (!vendor) {
      return NextResponse.json({ success: false, error: 'Vendor tidak ditemukan.' }, { status: 404 });
    }

    // Pastikan vendor memiliki Root Folder Sewa di Google Drive Admin jika punya Add-On
    let rootFolderId = vendor.driveRootFolderId;
    if (!rootFolderId && vendor.hasStorageAddon) {
      try {
        const root = await createVendorRootFolder(vendor.email, vendor.name);
        rootFolderId = root.folderId;
        db.prepare('UPDATE vendors SET driveRootFolderId = ? WHERE id = ?').run(rootFolderId, vendor.id);
      } catch (err) {
        console.warn('[Root Folder Creation Warning]:', err.message);
      }
    }

    // Auto-sync real-time usedStorageBytes berdasarkan total file aktual di Dedicated Storage
    const actualStorageBytesRow = db.prepare('SELECT COALESCE(SUM(fileSizeBytes), 0) as totalBytes FROM storage_files WHERE vendorId = ?').get(vendor.id);
    const actualStorageBytes = actualStorageBytesRow ? actualStorageBytesRow.totalBytes : 0;
    if (vendor.usedStorageBytes !== actualStorageBytes) {
      db.prepare('UPDATE vendors SET usedStorageBytes = ? WHERE id = ?').run(actualStorageBytes, vendor.id);
      vendor.usedStorageBytes = actualStorageBytes;
    }

    const { searchParams } = new URL(req.url);
    const rawParentFolderId = searchParams.get('folderId');
    const parentFolderId = (!rawParentFolderId || rawParentFolderId === 'root') ? (rootFolderId || 'root') : rawParentFolderId;

    // Ambil daftar berkas file di folder ini dari DB
    const files = db.prepare(`
      SELECT * FROM storage_files 
      WHERE vendorId = ? AND (parentFolderId = ? OR parentFolderId = 'root')
      ORDER BY uploadedAt DESC
    `).all(vendor.id, parentFolderId);

    // Ambil sub-folder internal buatan vendor di Cloud Storage beserta statistik rekursif jumlah foto, subfolder, byte storage, & status proyek terhubung
    const subFolders = db.prepare(`
      WITH RECURSIVE Subtree(folderId) AS (
        SELECT driveFolderId FROM storage_folders WHERE driveFolderId = sf.driveFolderId
        UNION ALL
        SELECT child.driveFolderId FROM storage_folders child
        JOIN Subtree parent ON child.parentFolderId = parent.folderId
      )
      SELECT sf.id, sf.folderName as name, sf.driveFolderId, sf.webViewLink, sf.createdAt,
             (SELECT COUNT(*) FROM storage_folders WHERE parentFolderId = sf.driveFolderId) as subFolderCount,
             (SELECT COUNT(*) FROM storage_files WHERE parentFolderId IN (SELECT folderId FROM Subtree)) as fileCount,
             (SELECT COALESCE(SUM(fileSizeBytes), 0) FROM storage_files WHERE parentFolderId IN (SELECT folderId FROM Subtree)) as totalSizeBytes,
             (SELECT p.id FROM projects p WHERE p.vendorId = sf.vendorId AND (INSTR(p.folderUrl, sf.driveFolderId) > 0 OR p.folderUrl LIKE '%' || sf.driveFolderId || '%') LIMIT 1) as linkedProjectId,
             (SELECT p.name FROM projects p WHERE p.vendorId = sf.vendorId AND (INSTR(p.folderUrl, sf.driveFolderId) > 0 OR p.folderUrl LIKE '%' || sf.driveFolderId || '%') LIMIT 1) as linkedProjectName
      FROM storage_folders sf
      WHERE sf.vendorId = ? AND (sf.parentFolderId = ? OR sf.parentFolderId = 'root')
    `).all(vendor.id, parentFolderId);

    // Ambil proyek link Google Drive murni EKSTERNAL milik studio vendor (yang TIDAK berada di dalam Dedicated Storage SaaS)
    const externalProjects = db.prepare(`
      SELECT p.id, p.name, p.folderUrl, p.createdAt,
             (SELECT COUNT(*) FROM photos WHERE projectId = p.id) as photoCount
      FROM projects p
      WHERE p.vendorId = ? 
        AND (p.folderUrl IS NOT NULL AND p.folderUrl != '')
        AND NOT EXISTS (
          SELECT 1 FROM storage_folders sf 
          WHERE sf.vendorId = p.vendorId 
            AND (INSTR(p.folderUrl, sf.driveFolderId) > 0 OR sf.driveFolderId = REPLACE(p.folderUrl, 'https://drive.google.com/drive/folders/', ''))
        )
    `).all(vendor.id);

    // Hitung jumlah Akun Worker aktif & ambil konfigurasi Max Concurrency Thread dari saas_settings
    const activeWorkerCountRow = db.prepare("SELECT COUNT(*) as count FROM master_drive_accounts WHERE role = 'worker' AND status = 'active' AND usedStorageBytes < totalLimitBytes").get();
    const activeWorkerCount = activeWorkerCountRow && activeWorkerCountRow.count > 0 ? activeWorkerCountRow.count : 1;

    const configuredConcurrencyRow = db.prepare("SELECT value FROM saas_settings WHERE key = 'max_upload_concurrency_threads'").get();
    const configuredConcurrency = configuredConcurrencyRow ? parseInt(configuredConcurrencyRow.value, 10) : 4;
    const maxConcurrency = Math.max(1, configuredConcurrency || 4);

    let activeAddonPlan = null;
    if (vendor.addonPlanId) {
      activeAddonPlan = db.prepare('SELECT * FROM addon_plans WHERE id = ?').get(vendor.addonPlanId);
    }

    return NextResponse.json({
      success: true,
      rootFolderId,
      currentFolderId: parentFolderId,
      files,
      subFolders,
      externalProjects,
      activeWorkerCount,
      maxConcurrency,
      vendor: {
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        expiresAt: vendor.expiresAt,
        usedStorageBytes: vendor.usedStorageBytes || 0,
        addonStorageQuotaBytes: vendor.addonStorageQuotaBytes || 0,
        hasStorageAddon: Boolean(vendor.hasStorageAddon),
        addonPlanId: vendor.addonPlanId || null,
        activeAddonPlan
      }
    });
  } catch (error) {
    console.error('[Storage Files GET Error]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/storage/files
 * Registrasi berkas file ke DB setelah sukses Direct Resumable Upload dari browser ke Google Cloud
 */
export async function POST(req) {
  const session = getAuthVendor();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Otentikasi dibutuhkan.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { parentFolderId, driveFileId, fileName, fileSizeBytes, mimeType, webViewLink, webContentLink } = body;

    if (!driveFileId || !fileName || !fileSizeBytes) {
      return NextResponse.json({ success: false, error: 'Data registrasi file tidak lengkap.' }, { status: 400 });
    }

    const vendor = db.prepare('SELECT id, usedStorageBytes, addonStorageQuotaBytes FROM vendors WHERE id = ?').get(session.id);
    if (!vendor) {
      return NextResponse.json({ success: false, error: 'Vendor tidak ditemukan.' }, { status: 404 });
    }

    const bytes = parseInt(fileSizeBytes, 10) || 0;

    // Simpan berkas file ke storage_files
    db.prepare(`
      INSERT INTO storage_files (vendorId, parentFolderId, driveFileId, fileName, fileSizeBytes, mimeType, webViewLink, webContentLink)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(vendor.id, parentFolderId || 'root', driveFileId, fileName, bytes, mimeType || 'image/jpeg', webViewLink || '', webContentLink || '');

    // Update usedStorageBytes vendor
    db.prepare('UPDATE vendors SET usedStorageBytes = usedStorageBytes + ? WHERE id = ?').run(bytes, vendor.id);

    // Update log harian upload global platform
    const today = new Date().toISOString().split('T')[0];
    db.prepare(`
      INSERT INTO daily_upload_logs (logDate, totalBytesUploaded)
      VALUES (?, ?)
      ON CONFLICT(logDate) DO UPDATE SET totalBytesUploaded = totalBytesUploaded + ?
    `).run(today, bytes, bytes);

    return NextResponse.json({
      success: true,
      message: `Berkas ${fileName} berhasil disimpan di Cloud Storage.`,
      fileSizeBytes: bytes
    });
  } catch (error) {
    console.error('[Storage Files POST Error]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/storage/files?id=123
 * Hapus file dari Google Drive API & database, lalu refund usedStorageBytes vendor
 */
export async function DELETE(req) {
  const session = getAuthVendor();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Otentikasi dibutuhkan.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('id');

    if (!fileId) {
      return NextResponse.json({ success: false, error: 'ID file wajib diisi.' }, { status: 400 });
    }

    const file = db.prepare('SELECT * FROM storage_files WHERE id = ? AND vendorId = ?').get(fileId, session.id);
    if (!file) {
      return NextResponse.json({ success: false, error: 'File tidak ditemukan atau bukan milik Anda.' }, { status: 404 });
    }

    // 1. Hapus dari Google Drive API
    try {
      if (file.driveFileId) {
        await deleteDriveFile(file.driveFileId);
      }
    } catch (driveErr) {
      console.warn(`[Drive Delete Warning] Gagal menghapus file di Drive ${file.driveFileId}:`, driveErr.message);
    }

    // 2. Hapus dari DB storage_files
    db.prepare('DELETE FROM storage_files WHERE id = ?').run(file.id);

    // 3. Refund usedStorageBytes vendor
    db.prepare('UPDATE vendors SET usedStorageBytes = MAX(0, usedStorageBytes - ?) WHERE id = ?').run(file.fileSizeBytes, session.id);

    return NextResponse.json({
      success: true,
      message: `File "${file.fileName}" berhasil dihapus dari Cloud Storage. Kuota sebesar ${formatBytes(file.fileSizeBytes)} telah dikembalikan.`,
      refundedBytes: file.fileSizeBytes
    });
  } catch (error) {
    console.error('[Storage Files DELETE Error]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}
