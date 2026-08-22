import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import db from '@/lib/db';
import { getAuthVendor } from '@/lib/auth';
import { decryptSecret } from '@/lib/crypto-vault';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const session = getAuthVendor();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Otentikasi dibutuhkan.' }, { status: 401 });
  }

  try {
    const { folderId } = await req.json();
    if (!folderId) {
      return NextResponse.json({ success: false, error: 'ID Folder tidak valid.' }, { status: 400 });
    }

    const vendor = db.prepare('SELECT id, name, email, externalDriveConnected, externalDriveEmail, externalDriveRefreshToken, externalDriveFolderId FROM vendors WHERE id = ?').get(session.id);
    if (!vendor || !vendor.externalDriveConnected || !vendor.externalDriveRefreshToken) {
      return NextResponse.json({ success: false, error: 'Akun Google Drive Vendor belum terhubung. Harap hubungkan Google Drive Anda terlebih dahulu.' }, { status: 400 });
    }

    // Ambil detail folder dari storage_folders
    const folder = db.prepare('SELECT * FROM storage_folders WHERE vendorId = ? AND driveFolderId = ?').get(vendor.id, folderId);
    if (!folder) {
      return NextResponse.json({ success: false, error: 'Folder tidak ditemukan di storage.' }, { status: 404 });
    }

    // Persiapkan OAuth client milik Vendor
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
      return NextResponse.json({ success: false, error: 'Kredensial Google OAuth server belum diisi.' }, { status: 500 });
    }

    const vendorOAuth2Client = new google.auth.OAuth2(clientId, clientSecret);
    const rawToken = decryptSecret(vendor.externalDriveRefreshToken);
    vendorOAuth2Client.setCredentials({ refresh_token: rawToken });
    const vendorDrive = google.drive({ version: 'v3', auth: vendorOAuth2Client });

    // Buat folder baru di Root Google Drive Vendor ('root')
    const targetParentId = vendor.externalDriveFolderId || 'root';
    const newDriveFolder = await vendorDrive.files.create({
      resource: {
        name: folder.folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [targetParentId]
      },
      fields: 'id, webViewLink'
    });

    const newDriveFolderId = newDriveFolder.data.id;
    const newWebViewLink = newDriveFolder.data.webViewLink || `https://drive.google.com/drive/folders/${newDriveFolderId}`;

    // Update data folder & proyek terkait di SQLite DB
    db.transaction(() => {
      // Update parentFolderId dari berkas foto di folder ini
      db.prepare('UPDATE storage_files SET parentFolderId = ? WHERE vendorId = ? AND parentFolderId = ?').run(newDriveFolderId, vendor.id, folderId);
      
      // Update folder record
      db.prepare('UPDATE storage_folders SET driveFolderId = ?, webViewLink = ?, parentFolderId = ? WHERE id = ?').run(newDriveFolderId, newWebViewLink, targetParentId, folder.id);

      // Update URL folder pada tabel projects jika ada
      db.prepare("UPDATE projects SET folderUrl = ? WHERE vendorId = ? AND (INSTR(folderUrl, ?) > 0)").run(newWebViewLink, vendor.id, folderId);
    })();

    console.log(`[Folder Migrate Success]: Folder ${folder.folderName} (ID: ${folderId}) migrated to vendor BYOS GDrive folder ID: ${newDriveFolderId}`);

    return NextResponse.json({
      success: true,
      message: `Folder "${folder.folderName}" berhasil dipindahkan ke Root Google Drive Anda.`,
      newDriveFolderId,
      newWebViewLink
    });
  } catch (err) {
    console.error('[Folder Migration Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
