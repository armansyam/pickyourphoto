import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const session = getAuthVendor();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Otentikasi dibutuhkan.' }, { status: 401 });
  }

  try {
    db.transaction(() => {
      // 1. Reset koneksi GDrive Vendor & kembalikan mode storage ke system
      db.prepare(`
        UPDATE vendors 
        SET externalDriveConnected = 0,
            externalDriveEmail = NULL,
            externalDriveRefreshToken = NULL,
            externalDriveFolderId = NULL,
            activeStorageMode = 'system'
        WHERE id = ?
      `).run(session.id);

      // 2. Hapus seluruh indeks folder & berkas hasil sync Google Drive Vendor (isExternalDrive = 1) dari DB lokal
      // (Berkas fisik di GDrive vendor tetap 100% aman di akun Google vendor)
      db.prepare('DELETE FROM storage_files WHERE vendorId = ? AND isExternalDrive = 1').run(session.id);
      db.prepare('DELETE FROM storage_folders WHERE vendorId = ? AND isExternalDrive = 1').run(session.id);
    })();

    console.log(`[BYOS Disconnect Success]: Vendor ID ${session.id} disconnected external GDrive & cleared GDrive index cleanly.`);

    return NextResponse.json({
      success: true,
      message: 'Koneksi Google Drive berhasil dilepas. Indeks berkas eksternal telah dibersihkan dan tampilan kembali ke struktur sistem default.'
    });
  } catch (err) {
    console.error('[External Drive Disconnect Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
