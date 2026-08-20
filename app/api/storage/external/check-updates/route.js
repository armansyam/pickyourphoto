import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import db from '@/lib/db';
import { getAuthVendor } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const session = getAuthVendor();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Otentikasi dibutuhkan.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get('folderId');

    // Jika folderId diberikan, validasi kepemilikan folder (cegah IDOR)
    if (folderId) {
      const targetFolder = db.prepare('SELECT id FROM storage_folders WHERE id = ? AND vendorId = ?').get(folderId, session.id);
      if (!targetFolder) {
        return NextResponse.json({ success: false, error: 'Folder tidak ditemukan atau akses tidak diizinkan.' }, { status: 403 });
      }
    }

    const vendor = db.prepare('SELECT id, externalDriveConnected, externalDriveRefreshToken, externalDriveFolderId FROM vendors WHERE id = ?').get(session.id);
    if (!vendor || !vendor.externalDriveConnected || !vendor.externalDriveRefreshToken) {
      return NextResponse.json({ success: true, hasUpdates: false });
    }

    const getSaasSetting = (key) => {
      try {
        const row = db.prepare('SELECT value FROM saas_settings WHERE key = ?').get(key);
        return row ? row.value : null;
      } catch {
        return null;
      }
    };

    const clientId = process.env.GOOGLE_CLIENT_ID || getSaasSetting('google_client_id');
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || getSaasSetting('google_client_secret');

    if (!clientId || !clientSecret) {
      return NextResponse.json({ success: true, hasUpdates: false });
    }

    const vendorOAuth2Client = new google.auth.OAuth2(clientId, clientSecret);
    vendorOAuth2Client.setCredentials({ refresh_token: vendor.externalDriveRefreshToken });
    const vendorDrive = google.drive({ version: 'v3', auth: vendorOAuth2Client });

    // Cek timestamp berkas/folder paling baru di database kita
    const lastLocalFolder = db.prepare('SELECT MAX(createdAt) as maxTime FROM storage_folders WHERE vendorId = ?').get(vendor.id);
    const lastLocalFile = db.prepare('SELECT MAX(uploadedAt) as maxTime FROM storage_files WHERE vendorId = ?').get(vendor.id);

    const latestDbTimeStr = [lastLocalFolder?.maxTime, lastLocalFile?.maxTime].filter(Boolean).sort().pop();
    const latestDbTime = latestDbTimeStr ? new Date(latestDbTimeStr).getTime() : 0;

    // Panggil API Google Drive ringan (pageSize = 1) untuk cek item paling baru di seluruh hierarki GDrive vendor
    const gDriveRes = await vendorDrive.files.list({
      q: "trashed = false",
      fields: 'files(id, name, createdTime, modifiedTime)',
      orderBy: 'modifiedTime desc',
      pageSize: 1
    });

    const latestFile = gDriveRes.data.files?.[0];
    let hasUpdates = false;

    if (latestFile) {
      const gDriveTime = new Date(latestFile.createdTime || latestFile.modifiedTime).getTime();
      // Jika di GDrive ada berkas yang lebih baru dibanding timestamp DB lokal kita (+ selisih 5 detik)
      if (gDriveTime > latestDbTime + 5000) {
        hasUpdates = true;
      }
    }

    return NextResponse.json({
      success: true,
      hasUpdates,
      latestDbTime: latestDbTimeStr,
      latestGDriveTime: latestFile?.createdTime || null
    });
  } catch (err) {
    console.error('[BYOS Update Check Error]:', err.message);
    return NextResponse.json({ success: true, hasUpdates: false });
  }
}
