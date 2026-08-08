import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthVendor } from '@/lib/auth';
import { deleteDriveFile } from '@/lib/google-master-drive';

export async function GET() {
  const session = getAuthVendor();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Otentikasi dibutuhkan. Harap login kembali.' }, { status: 401 });
  }

  try {
    const vendor = db.prepare(`
      SELECT id, email, name, status, expiresAt, usedStorageBytes, hasStorageAddon, addonStorageQuotaBytes, addonPlanId
      FROM vendors WHERE id = ?
    `).get(session.id);

    if (!vendor) {
      return NextResponse.json({ success: false, error: 'Data vendor tidak ditemukan.' }, { status: 404 });
    }

    // Ambil daftar proyek (folder) INTERNAL Cloud Storage milik vendor (mengabaikan Google Drive External Link)
    const projects = db.prepare(`
      SELECT 
        p.id, p.name, p.slug, p.status, p.createdAt, p.folderUrl,
        COUNT(ph.id) as photoCount,
        COALESCE(SUM(ph.fileSizeBytes), 0) as totalSizeBytes
      FROM projects p
      LEFT JOIN photos ph ON ph.projectId = p.id
      WHERE p.vendorId = ? AND (p.folderUrl IS NULL OR p.folderUrl = '')
      GROUP BY p.id
      ORDER BY p.createdAt DESC
    `).all(vendor.id);

    // Hitung pemakaian storage fisik INTERNAL Dedicated Storage (mengabaikan Google Drive eksternal)
    const usedBytes = projects.reduce((acc, curr) => acc + (curr.totalSizeBytes || 0), 0);

    // Sync updated usedStorageBytes ke tabel vendors jika ada perbedaan dari proyek eksternal
    if (vendor.usedStorageBytes !== usedBytes) {
      db.prepare('UPDATE vendors SET usedStorageBytes = ? WHERE id = ?').run(usedBytes, vendor.id);
    }

    // Ambil detail paket addon aktif jika ada
    let activeAddon = null;
    if (vendor.addonPlanId) {
      activeAddon = db.prepare('SELECT * FROM addon_plans WHERE id = ?').get(vendor.addonPlanId);
    }

    const quotaLimitBytes = vendor.addonStorageQuotaBytes || 0;
    const isOverQuota = quotaLimitBytes > 0 ? (usedBytes > quotaLimitBytes) : (usedBytes > 0 && !vendor.hasStorageAddon);

    const settingsRows = db.prepare("SELECT key, value FROM saas_settings WHERE key IN ('bank_name', 'bank_account_number', 'bank_account_name')").all() || [];
    const bankInfo = {
      bankName: null,
      accountNumber: null,
      accountName: null
    };
    settingsRows.forEach(r => {
      if (r.key === 'bank_name' && r.value) bankInfo.bankName = r.value;
      if (r.key === 'bank_account_number' && r.value) bankInfo.accountNumber = r.value;
      if (r.key === 'bank_account_name' && r.value) bankInfo.accountName = r.value;
    });

    return NextResponse.json({
      success: true,
      bankInfo,
      vendor: {
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        expiresAt: vendor.expiresAt,
        status: vendor.status,
        usedStorageBytes: usedBytes,
        addonStorageQuotaBytes: quotaLimitBytes,
        hasStorageAddon: Boolean(vendor.hasStorageAddon),
        isOverQuota,
        activeAddon
      },
      projects
    });
  } catch (error) {
    console.error('[Storage Folders GET Error]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  const session = getAuthVendor();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Otentikasi dibutuhkan.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get('folderId') || searchParams.get('id');
    const projectId = searchParams.get('projectId');

    if (!folderId && !projectId) {
      return NextResponse.json({ success: false, error: 'ID folder tidak diberikan.' }, { status: 400 });
    }

    // A. APABILA MENGHAPUS INTERNAL STORAGE FOLDER
    if (folderId) {
      const folder = db.prepare('SELECT id, folderName, driveFolderId FROM storage_folders WHERE (id = ? OR driveFolderId = ?) AND vendorId = ?').get(folderId, folderId, session.id);
      if (!folder) {
        return NextResponse.json({ success: false, error: 'Folder tidak ditemukan atau akses ditolak.' }, { status: 404 });
      }

      // 1. Hapus Folder beserta seluruh isinya langsung dari Google Drive Web API
      try {
        if (folder.driveFolderId) {
          await deleteDriveFile(folder.driveFolderId);
        }
      } catch (driveErr) {
        console.warn(`[Drive Folder Delete Warning] Gagal menghapus folder di Drive ${folder.driveFolderId}:`, driveErr.message);
      }

      // Hitung total bytes & kumpulkan driveFolderId rekursif
      const subtreeFolders = db.prepare(`
        WITH RECURSIVE Subtree(driveFolderId) AS (
          SELECT driveFolderId FROM storage_folders WHERE driveFolderId = ? AND vendorId = ?
          UNION ALL
          SELECT child.driveFolderId FROM storage_folders child
          JOIN Subtree parent ON child.parentFolderId = parent.driveFolderId
          WHERE child.vendorId = ?
        )
        SELECT driveFolderId FROM Subtree
      `).all(folder.driveFolderId, session.id, session.id).map(r => r.driveFolderId);

      const targetFolderIds = Array.from(new Set([folder.driveFolderId, ...subtreeFolders]));
      const placeholders = targetFolderIds.map(() => '?').join(',');

      const freedBytesRow = db.prepare(`
        SELECT COALESCE(SUM(fileSizeBytes), 0) as freedBytes 
        FROM storage_files 
        WHERE parentFolderId IN (${placeholders}) AND vendorId = ?
      `).get(...targetFolderIds, session.id);

      const freedBytes = freedBytesRow ? freedBytesRow.freedBytes : 0;

      const deleteTx = db.transaction(() => {
        // Hapus proyek terkait dari tabel projects, clients, photos, selections jika folder ini pernah dijadikan proyek galeri
        const linkedProjects = db.prepare(`SELECT id FROM projects WHERE vendorId = ? AND (${targetFolderIds.map(() => "folderUrl LIKE '%' || ? || '%'").join(' OR ')})`).all(session.id, ...targetFolderIds);
        for (const lp of linkedProjects) {
          db.prepare('DELETE FROM selections WHERE clientId IN (SELECT id FROM clients WHERE projectId = ?)').run(lp.id);
          db.prepare('DELETE FROM photos WHERE projectId = ?').run(lp.id);
          db.prepare('DELETE FROM clients WHERE projectId = ?').run(lp.id);
          db.prepare('DELETE FROM projects WHERE id = ?').run(lp.id);
        }

        db.prepare(`DELETE FROM storage_files WHERE parentFolderId IN (${placeholders}) AND vendorId = ?`).run(...targetFolderIds, session.id);
        db.prepare(`DELETE FROM storage_folders WHERE driveFolderId IN (${placeholders}) AND vendorId = ?`).run(...targetFolderIds, session.id);
        
        const remainingBytesRow = db.prepare('SELECT COALESCE(SUM(fileSizeBytes), 0) as totalBytes FROM storage_files WHERE vendorId = ?').get(session.id);
        const remainingBytes = remainingBytesRow ? remainingBytesRow.totalBytes : 0;
        db.prepare('UPDATE vendors SET usedStorageBytes = ? WHERE id = ?').run(remainingBytes, session.id);
      });

      deleteTx();

      return NextResponse.json({
        success: true,
        message: `Folder "${folder.folderName}" beserta seluruh isinya berhasil dihapus. Kuota storage sebesar ${formatBytes(freedBytes)} telah dikembalikan.`,
        freedBytes
      });
    }

    // B. APABILA MENGHAPUS PROYEK (FALLBACK LEGACY)
    const project = db.prepare('SELECT id, name, vendorId FROM projects WHERE id = ? AND vendorId = ?').get(projectId, session.id);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Proyek tidak ditemukan atau akses ditolak.' }, { status: 404 });
    }

    const photoStats = db.prepare('SELECT COALESCE(SUM(fileSizeBytes), 0) as totalBytes FROM photos WHERE projectId = ?').get(projectId);
    const freedBytes = photoStats ? photoStats.totalBytes : 0;

    const deleteTx = db.transaction(() => {
      db.prepare('DELETE FROM selections WHERE photoId IN (SELECT id FROM photos WHERE projectId = ?)').run(projectId);
      db.prepare('DELETE FROM photos WHERE projectId = ?').run(projectId);
      db.prepare('DELETE FROM clients WHERE projectId = ?').run(projectId);
      db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
      if (freedBytes > 0) {
        db.prepare('UPDATE vendors SET usedStorageBytes = MAX(0, usedStorageBytes - ?) WHERE id = ?').run(freedBytes, session.id);
      }
    });

    deleteTx();

    return NextResponse.json({
      success: true,
      message: `Folder proyek "${project.name}" berhasil dihapus. Kuota storage sebesar ${formatBytes(freedBytes)} telah dikembalikan.`,
      freedBytes
    });
  } catch (error) {
    console.error('[Storage Folders DELETE Error]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
