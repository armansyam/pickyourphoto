import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import db from '@/lib/db';
import { getAuthVendor } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const session = getAuthVendor();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Otentikasi dibutuhkan.' }, { status: 401 });
  }

  try {
    const vendor = db.prepare('SELECT id, name, email, externalDriveConnected, externalDriveEmail, externalDriveRefreshToken, externalDriveFolderId FROM vendors WHERE id = ?').get(session.id);
    if (!vendor || !vendor.externalDriveConnected || !vendor.externalDriveRefreshToken) {
      return NextResponse.json({ success: false, error: 'Akun Google Drive Vendor belum terhubung.' }, { status: 400 });
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
      return NextResponse.json({ success: false, error: 'Kredensial Google OAuth server belum diisi.' }, { status: 500 });
    }

    const vendorOAuth2Client = new google.auth.OAuth2(clientId, clientSecret);
    vendorOAuth2Client.setCredentials({ refresh_token: vendor.externalDriveRefreshToken });
    const vendorDrive = google.drive({ version: 'v3', auth: vendorOAuth2Client });

    // Sync Rekursif dari Root ('root') sampai seluruh sub-folder & file (maks 10 level kedalaman)
    const MAX_SYNC_DEPTH = 10;
    const syncDriveTree = async (parentDriveId = 'root', depth = 0) => {
      // Safety guard: cegah rekursi tak terbatas (timeout / stack overflow)
      if (depth > MAX_SYNC_DEPTH) {
        console.warn(`[BYOS Sync] Batas kedalaman folder (${MAX_SYNC_DEPTH} level) tercapai di parentId=${parentDriveId}. Sub-folder lebih dalam dilewati.`);
        return { foldersCount: 0, filesCount: 0 };
      }

      let foldersCount = 0;
      let filesCount = 0;

      let pageToken = null;
      do {
        const res = await vendorDrive.files.list({
          q: `'${parentDriveId}' in parents and trashed = false`,
          fields: 'nextPageToken, files(id, name, mimeType, size, webViewLink, webContentLink, createdTime)',
          pageSize: 200,
          pageToken: pageToken
        });

        const items = res.data.files || [];
        pageToken = res.data.nextPageToken;

        for (const item of items) {
          if (item.mimeType === 'application/vnd.google-apps.folder') {
            db.prepare(`
              INSERT INTO storage_folders (vendorId, folderName, driveFolderId, parentFolderId, webViewLink, isExternalDrive, createdAt)
              VALUES (?, ?, ?, ?, ?, 1, ?)
              ON CONFLICT(driveFolderId) DO UPDATE SET
                folderName = excluded.folderName,
                parentFolderId = excluded.parentFolderId,
                webViewLink = excluded.webViewLink,
                isExternalDrive = 1
            `).run(
              vendor.id,
              item.name,
              item.id,
              parentDriveId,
              item.webViewLink || `https://drive.google.com/drive/folders/${item.id}`,
              item.createdTime || new Date().toISOString()
            );
            foldersCount++;

            // Rekursif sync sub-folder dengan depth tracking
            const subCounts = await syncDriveTree(item.id, depth + 1);
            foldersCount += subCounts.foldersCount;
            filesCount += subCounts.filesCount;
          } else {
            db.prepare(`
              INSERT INTO storage_files (vendorId, parentFolderId, driveFileId, fileName, fileSizeBytes, mimeType, webViewLink, webContentLink, isExternalDrive, uploadedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
              ON CONFLICT(driveFileId) DO UPDATE SET
                fileName = excluded.fileName,
                parentFolderId = excluded.parentFolderId,
                fileSizeBytes = excluded.fileSizeBytes,
                webViewLink = excluded.webViewLink,
                webContentLink = excluded.webContentLink,
                isExternalDrive = 1
            `).run(
              vendor.id,
              parentDriveId,
              item.id,
              item.name,
              parseInt(item.size || '0', 10),
              item.mimeType,
              item.webViewLink || '',
              item.webContentLink || '',
              item.createdTime || new Date().toISOString()
            );
            filesCount++;
          }
        }
      } while (pageToken);

      return { foldersCount, filesCount };
    };

    const { foldersCount, filesCount } = await syncDriveTree('root');

    console.log(`[BYOS Folder/File Sync Success]: Vendor ID ${vendor.id} synced ${foldersCount} folders & ${filesCount} files from GDrive root hierarchy.`);

    return NextResponse.json({
      success: true,
      count: foldersCount + filesCount,
      foldersCount,
      filesCount,
      message: `Berhasil menyinkronkan ${foldersCount} folder & ${filesCount} berkas dari Google Drive Anda.`
    });
  } catch (err) {
    console.error('[BYOS Folder Sync Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
