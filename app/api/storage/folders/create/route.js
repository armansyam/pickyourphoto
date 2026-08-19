import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthVendor } from '@/lib/auth';
import { createVendorSubFolder, createVendorRootFolder, createVendorExternalSubFolder } from '@/lib/google-master-drive';

export const dynamic = 'force-dynamic';

/**
 * POST /api/storage/folders/create
 * Membuat Sub-Folder baru di dalam Cloud Drive Vendor (BYOS / SaaS Add-On) via Google Drive API v3
 */
export async function POST(req) {
  const session = getAuthVendor();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Otentikasi dibutuhkan.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { folderName, parentFolderId, storageMode } = body;

    if (!folderName || !folderName.trim()) {
      return NextResponse.json({ success: false, error: 'Nama folder wajib diisi.' }, { status: 400 });
    }

    const vendor = db.prepare('SELECT id, name, email, driveRootFolderId, hasStorageAddon, addonStorageQuotaBytes, externalDriveConnected, externalDriveEmail, externalDriveRefreshToken, activeStorageMode FROM vendors WHERE id = ?').get(session.id);
    if (!vendor) {
      return NextResponse.json({ success: false, error: 'Vendor tidak ditemukan.' }, { status: 404 });
    }

    const isByos = storageMode === 'byos' || (!storageMode && Boolean(vendor.externalDriveConnected) && vendor.activeStorageMode === 'byos');

    if (isByos) {
      // 1. BUAT FOLDER DI GOOGLE DRIVE PRIBADI VENDOR (BYOS)
      if (!vendor.externalDriveConnected || !vendor.externalDriveRefreshToken) {
        return NextResponse.json({
          success: false,
          error: 'Akun Google Drive pribadi Anda belum terhubung. Silakan hubungkan Google Drive terlebih dahulu.'
        }, { status: 400 });
      }

      const targetParentId = (!parentFolderId || parentFolderId === 'root') ? 'root' : parentFolderId;
      const newFolder = await createVendorExternalSubFolder(vendor.id, targetParentId, folderName.trim());

      const folderDriveLink = newFolder.webViewLink || `https://drive.google.com/drive/folders/${newFolder.id}`;
      db.prepare(`
        INSERT INTO storage_folders (vendorId, parentFolderId, driveFolderId, folderName, webViewLink, isExternalDrive, createdAt)
        VALUES (?, ?, ?, ?, ?, 1, ?)
      `).run(vendor.id, targetParentId, newFolder.id, folderName.trim(), folderDriveLink, new Date().toISOString());

      return NextResponse.json({
        success: true,
        message: `Folder "${folderName.trim()}" berhasil dibuat di Google Drive Anda.`,
        folder: newFolder,
        isExternalDrive: 1
      });

    } else {
      // 2. BUAT FOLDER DI DEDICATED CLOUD STORAGE SAAS (ADD-ON)
      const hasAddon = Boolean(vendor.hasStorageAddon || (vendor.addonStorageQuotaBytes && vendor.addonStorageQuotaBytes > 0));

      if (!hasAddon) {
        return NextResponse.json({
          success: false,
          error: 'Anda belum memiliki Paket Add-On Storage aktif. Harap beli atau aktifkan paket storage terlebih dahulu.'
        }, { status: 403 });
      }

      // Auto-sync flag hasStorageAddon jika ada kuota tapi flag masih 0
      if (vendor.addonStorageQuotaBytes > 0 && !vendor.hasStorageAddon) {
        try {
          db.prepare('UPDATE vendors SET hasStorageAddon = 1 WHERE id = ?').run(vendor.id);
        } catch (_) {}
      }

      // Pastikan vendor sudah memiliki Root Folder Sewa
      let rootFolderId = vendor.driveRootFolderId;
      if (!rootFolderId) {
        const root = await createVendorRootFolder(vendor.email, vendor.name);
        rootFolderId = root.folderId;
        db.prepare('UPDATE vendors SET driveRootFolderId = ? WHERE id = ?').run(rootFolderId, vendor.id);
      }

      const targetParentId = parentFolderId && parentFolderId !== 'root' ? parentFolderId : rootFolderId;

      // Buat sub-folder di Google Drive API v3 (Master Server)
      const newFolder = await createVendorSubFolder(targetParentId, folderName.trim());

      // Catat sub-folder ini di tabel murni storage_folders
      const folderDriveLink = newFolder.webViewLink || `https://drive.google.com/drive/folders/${newFolder.id}`;
      db.prepare(`
        INSERT INTO storage_folders (vendorId, parentFolderId, driveFolderId, folderName, webViewLink, isExternalDrive, createdAt)
        VALUES (?, ?, ?, ?, ?, 0, ?)
      `).run(vendor.id, targetParentId, newFolder.id, folderName.trim(), folderDriveLink, new Date().toISOString());

      return NextResponse.json({
        success: true,
        message: `Folder "${folderName.trim()}" berhasil dibuat di Dedicated Cloud Storage.`,
        folder: newFolder,
        isExternalDrive: 0
      });
    }

  } catch (error) {
    console.error('[Create Storage Sub-Folder Error]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
