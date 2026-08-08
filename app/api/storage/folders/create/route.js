import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthVendor } from '@/lib/auth';
import { createVendorSubFolder, createVendorRootFolder } from '@/lib/google-master-drive';

export const dynamic = 'force-dynamic';

/**
 * POST /api/storage/folders/create
 * Membuat Sub-Folder baru di dalam Cloud Drive Vendor via Google Drive API v3
 */
export async function POST(req) {
  const session = getAuthVendor();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Otentikasi dibutuhkan.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { folderName, parentFolderId } = body;

    if (!folderName || !folderName.trim()) {
      return NextResponse.json({ success: false, error: 'Nama folder wajib diisi.' }, { status: 400 });
    }

    const vendor = db.prepare('SELECT id, name, email, driveRootFolderId, hasStorageAddon FROM vendors WHERE id = ?').get(session.id);
    if (!vendor) {
      return NextResponse.json({ success: false, error: 'Vendor tidak ditemukan.' }, { status: 404 });
    }

    if (!vendor.hasStorageAddon) {
      return NextResponse.json({
        success: false,
        error: 'Anda belum memiliki Paket Add-On Storage aktif. Harap beri atau aktifkan paket storage terlebih dahulu.'
      }, { status: 403 });
    }

    // Pastikan vendor sudah memiliki Root Folder Sewa
    let rootFolderId = vendor.driveRootFolderId;
    if (!rootFolderId) {
      const root = await createVendorRootFolder(vendor.email, vendor.name);
      rootFolderId = root.folderId;
      db.prepare('UPDATE vendors SET driveRootFolderId = ? WHERE id = ?').run(rootFolderId, vendor.id);
    }

    const targetParentId = parentFolderId && parentFolderId !== 'root' ? parentFolderId : rootFolderId;

    // Buat sub-folder di Google Drive API v3
    const newFolder = await createVendorSubFolder(targetParentId, folderName.trim());

    // Catat sub-folder ini di tabel murni storage_folders
    const folderDriveLink = newFolder.webViewLink || `https://drive.google.com/drive/folders/${newFolder.id}`;
    db.prepare(`
      INSERT INTO storage_folders (vendorId, parentFolderId, driveFolderId, folderName, webViewLink)
      VALUES (?, ?, ?, ?, ?)
    `).run(vendor.id, targetParentId, newFolder.id, folderName.trim(), folderDriveLink);

    return NextResponse.json({
      success: true,
      message: `Folder "${folderName.trim()}" berhasil dibuat di Cloud Storage.`,
      folder: newFolder
    });
  } catch (error) {
    console.error('[Create Storage Sub-Folder Error]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
