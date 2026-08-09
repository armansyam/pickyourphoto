import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getWorkerDriveClient } from '@/lib/google-master-drive';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  return handlePurge(req);
}

export async function POST(req) {
  return handlePurge(req);
}

async function handlePurge(req) {
  try {
    // 1. Ambil durasi masa tenggang dari saas_settings
    const graceRow = db.prepare("SELECT value FROM saas_settings WHERE key = 'grace_period_days'").get();
    const graceDays = graceRow && parseInt(graceRow.value, 10) > 0 ? parseInt(graceRow.value, 10) : 7;
    const graceMs = graceDays * 24 * 60 * 60 * 1000;

    const nowTime = new Date().getTime();

    // 2. Cari vendor yang telah MELEWATI Masa Tenggang (expiresAt + graceMs < now)
    const vendors = db.prepare(`
      SELECT id, email, name, expiresAt, status 
      FROM vendors 
      WHERE expiresAt IS NOT NULL AND status != 'purged'
    `).all();

    const expiredVendorsToPurge = vendors.filter(v => {
      const expTime = new Date(v.expiresAt).getTime();
      return expTime > 0 && nowTime > (expTime + graceMs);
    });

    if (expiredVendorsToPurge.length === 0) {
      return NextResponse.json({
        success: true,
        message: `Tidak ada vendor yang melewati masa tenggang (${graceDays} hari).`,
        purgedVendorsCount: 0
      });
    }

    let totalFilesDeletedFromDrive = 0;
    let totalVendorsPurged = 0;

    // Inisialisasi Google Drive Worker Client
    let workerDrive = null;
    try {
      const workerClient = await getWorkerDriveClient();
      workerDrive = workerClient?.drive;
    } catch (e) {
      console.warn('[Purge Cron Warning]: Gagal menginisialisasi Worker Drive client:', e.message);
    }

    for (const vendor of expiredVendorsToPurge) {
      console.log(`[HARD PURGE EXECUTED]: Vendor ID ${vendor.id} (${vendor.email}) melewati masa tenggang (${graceDays} hari). Memulai pembersihan berkas...`);

      // A. Ambil seluruh file fisik milik vendor di Platform Storage SaaS (isExternalDrive = 0)
      const saasFiles = db.prepare(`
        SELECT driveFileId, fileName FROM storage_files 
        WHERE vendorId = ? AND (isExternalDrive IS NULL OR isExternalDrive = 0)
      `).all(vendor.id);

      // B. Hapus fisik file dari Google Drive Worker SaaS
      if (workerDrive && saasFiles.length > 0) {
        for (const file of saasFiles) {
          try {
            await workerDrive.files.delete({ fileId: file.driveFileId });
            totalFilesDeletedFromDrive++;
          } catch (err) {
            console.warn(`[Purge File Warning]: Gagal menghapus file ${file.driveFileId} (${file.fileName}) dari GDrive Worker:`, err.message);
          }
        }
      }

      // C. Eksekusi Hapus Bersih Record Database
      db.transaction(() => {
        // 1. Hapus seleksi & foto proyek
        db.prepare('DELETE FROM selections WHERE clientId IN (SELECT id FROM clients WHERE projectId IN (SELECT id FROM projects WHERE vendorId = ?))').run(vendor.id);
        db.prepare('DELETE FROM photos WHERE projectId IN (SELECT id FROM projects WHERE vendorId = ?)').run(vendor.id);
        db.prepare('DELETE FROM clients WHERE projectId IN (SELECT id FROM projects WHERE vendorId = ?)').run(vendor.id);
        
        // 2. Hapus proyek vendor
        db.prepare('DELETE FROM projects WHERE vendorId = ?').run(vendor.id);

        // 3. Hapus berkas & folder storage SaaS vendor (isExternalDrive = 0)
        db.prepare('DELETE FROM storage_files WHERE vendorId = ? AND (isExternalDrive IS NULL OR isExternalDrive = 0)').run(vendor.id);
        db.prepare('DELETE FROM storage_folders WHERE vendorId = ? AND (isExternalDrive IS NULL OR isExternalDrive = 0)').run(vendor.id);

        // 4. Hapus record BYOS dari DB (file fisik di Drive vendor tidak dihapus — itu milik mereka)
        db.prepare('DELETE FROM storage_files WHERE vendorId = ? AND isExternalDrive = 1').run(vendor.id);
        db.prepare('DELETE FROM storage_folders WHERE vendorId = ? AND isExternalDrive = 1').run(vendor.id);

        // 5. Update status vendor menjadi suspended & usedStorageBytes = 0
        db.prepare(`
          UPDATE vendors 
          SET status = 'suspended',
              usedStorageBytes = 0
          WHERE id = ?
        `).run(vendor.id);
      })();

      totalVendorsPurged++;
      console.log(`[HARD PURGE COMPLETED]: Vendor ID ${vendor.id} (${vendor.email}) berhasil dibersihkan total.`);
    }

    return NextResponse.json({
      success: true,
      graceDays,
      purgedVendorsCount: totalVendorsPurged,
      totalFilesDeletedFromDrive,
      message: `Berhasil membersihkan ${totalVendorsPurged} vendor dan menghapus ${totalFilesDeletedFromDrive} berkas fisik dari Worker Drive.`
    });
  } catch (error) {
    console.error('[Hard Purge Cron Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
