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
    db.prepare(`
      UPDATE vendors 
      SET externalDriveConnected = 0,
          externalDriveEmail = NULL,
          externalDriveRefreshToken = NULL,
          externalDriveFolderId = NULL
      WHERE id = ?
    `).run(session.id);

    console.log(`[BYOS Integration] Vendor ID ${session.id} disconnected external GDrive.`);

    return NextResponse.json({
      success: true,
      message: 'Koneksi Google Drive Eksternal berhasil dilepas.'
    });
  } catch (err) {
    console.error('[External Drive Disconnect Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
