import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthVendor } from '@/lib/auth';
import { createVendorSubFolder, createVendorRootFolder, createVendorExternalSubFolder } from '@/lib/google-master-drive';

export const dynamic = 'force-dynamic';

/**
 * POST /api/storage/folders/batch-tree
 * Membuat seluruh struktur direktori folder (Batch Tree) secara cepat dan efisien di sisi server
 * Menggunakan pemrosesan bertingkat (Breadth-First Concurrent Level Processing)
 */
export async function POST(req) {
  const session = getAuthVendor();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Otentikasi dibutuhkan.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { folderPaths, parentFolderId, storageMode } = body;

    if (!Array.isArray(folderPaths) || folderPaths.length === 0) {
      return NextResponse.json({ success: true, createdFolderMap: {}, message: 'Tidak ada sub-folder yang perlu dibuat.' });
    }

    const vendor = db.prepare('SELECT id, name, email, driveRootFolderId, hasStorageAddon, addonStorageQuotaBytes, externalDriveConnected, externalDriveEmail, externalDriveRefreshToken, activeStorageMode FROM vendors WHERE id = ?').get(session.id);
    if (!vendor) {
      return NextResponse.json({ success: false, error: 'Vendor tidak ditemukan.' }, { status: 404 });
    }

    const isByos = storageMode === 'byos' || (!storageMode && Boolean(vendor.externalDriveConnected) && vendor.activeStorageMode === 'byos');

    let baseParentId = (!parentFolderId || parentFolderId === 'root') ? 'root' : parentFolderId;

    if (isByos) {
      if (!vendor.externalDriveConnected || !vendor.externalDriveRefreshToken) {
        return NextResponse.json({
          success: false,
          error: 'Akun Google Drive pribadi belum terhubung.'
        }, { status: 400 });
      }
    } else {
      const hasAddon = Boolean(vendor.hasStorageAddon || (vendor.addonStorageQuotaBytes && vendor.addonStorageQuotaBytes > 0));
      if (!hasAddon) {
        return NextResponse.json({
          success: false,
          error: 'Paket Add-On Dedicated SaaS belum aktif.'
        }, { status: 403 });
      }

      if (!vendor.driveRootFolderId) {
        const root = await createVendorRootFolder(vendor.email, vendor.name);
        vendor.driveRootFolderId = root.folderId;
        db.prepare('UPDATE vendors SET driveRootFolderId = ? WHERE id = ?').run(root.folderId, vendor.id);
      }

      if (baseParentId === 'root') {
        baseParentId = vendor.driveRootFolderId;
      }
    }

    // Urutkan path berdasarkan kedalaman struktur (depth level)
    const sortedPaths = [...new Set(folderPaths)].sort((a, b) => a.split('/').length - b.split('/').length);

    // Kelompokkan folder berdasarkan tingkat kedalamannya (Depth Groups)
    const depthGroups = {};
    for (const path of sortedPaths) {
      const depth = path.split('/').length;
      if (!depthGroups[depth]) depthGroups[depth] = [];
      depthGroups[depth].push(path);
    }

    const createdFolderMap = {};
    const createdFoldersDbRecords = [];
    const nowIso = new Date().toISOString();

    // Helper untuk menjalankan tugas dalam batch konkuren (Concurrency Pool)
    const runConcurrent = async (items, concurrencyLimit, taskFn) => {
      const results = [];
      let index = 0;

      const worker = async () => {
        while (index < items.length) {
          const currentIndex = index++;
          const item = items[currentIndex];
          try {
            const res = await taskFn(item);
            results[currentIndex] = res;
          } catch (err) {
            console.error(`[Batch Folder Error on "${item}"]:`, err.message);
            results[currentIndex] = null;
          }
        }
      };

      const workers = [];
      const numWorkers = Math.min(concurrencyLimit, items.length);
      for (let i = 0; i < numWorkers; i++) {
        workers.push(worker());
      }
      await Promise.all(workers);
      return results;
    };

    // Proses level demi level (Level 1, Level 2, Level 3, dst.)
    const sortedDepths = Object.keys(depthGroups).map(Number).sort((a, b) => a - b);

    for (const depth of sortedDepths) {
      const pathsAtDepth = depthGroups[depth];

      // Di setiap level, semua folder dapat dibuat paralel (maksimal 6-8 stream serentak)
      await runConcurrent(pathsAtDepth, 6, async (folderPath) => {
        const parts = folderPath.split('/');
        const folderName = parts[parts.length - 1];
        const parentPath = parts.slice(0, -1).join('/');
        const parentId = parentPath ? (createdFolderMap[parentPath] || baseParentId) : baseParentId;

        let createdFolder;
        if (isByos) {
          createdFolder = await createVendorExternalSubFolder(vendor.id, parentId, folderName);
        } else {
          createdFolder = await createVendorSubFolder(parentId, folderName);
        }

        if (createdFolder && createdFolder.id) {
          createdFolderMap[folderPath] = createdFolder.id;
          const folderDriveLink = createdFolder.webViewLink || `https://drive.google.com/drive/folders/${createdFolder.id}`;
          
          createdFoldersDbRecords.push({
            vendorId: vendor.id,
            parentFolderId: parentId,
            driveFolderId: createdFolder.id,
            folderName: folderName,
            webViewLink: folderDriveLink,
            isExternalDrive: isByos ? 1 : 0,
            createdAt: nowIso
          });
        }
      });
    }

    // Simpan semua metadata folder ke database SQLite dalam 1 transaksi cepat
    if (createdFoldersDbRecords.length > 0) {
      const insertStmt = db.prepare(`
        INSERT INTO storage_folders (vendorId, parentFolderId, driveFolderId, folderName, webViewLink, isExternalDrive, createdAt)
        VALUES (@vendorId, @parentFolderId, @driveFolderId, @folderName, @webViewLink, @isExternalDrive, @createdAt)
      `);

      const insertMany = db.transaction((records) => {
        for (const rec of records) {
          try {
            insertStmt.run(rec);
          } catch (e) {
            // Ignore jika duplicate key
          }
        }
      });

      insertMany(createdFoldersDbRecords);
    }

    const topFolderId = createdFolderMap[sortedPaths[0]] || baseParentId;

    return NextResponse.json({
      success: true,
      message: `Berhasil membuat ${Object.keys(createdFolderMap).length} sub-folder.`,
      createdFolderMap,
      topFolderId,
      totalCreated: Object.keys(createdFolderMap).length
    });

  } catch (error) {
    console.error('[Batch Tree Folder Creation Error]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
