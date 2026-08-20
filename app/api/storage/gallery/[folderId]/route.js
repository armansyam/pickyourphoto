import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const folderId = resolvedParams?.folderId || params?.folderId;
    if (!folderId) {
      return NextResponse.json({ success: false, message: 'Folder ID required' }, { status: 400 });
    }

    // 1. Cari folder berdasarkan driveFolderId atau ID numerik beserta hak izin allowCustomLogo paket vendor
    let folder = db.prepare(`
      SELECT sf.*, COALESCE(v.brandName, v.name) as vendorName, v.brandLogo as vendorLogo,
             COALESCE(pl.allowCustomLogo, 0) as allowCustomLogo
      FROM storage_folders sf
      JOIN vendors v ON sf.vendorId = v.id
      LEFT JOIN plans pl ON v.planId = pl.id
      WHERE sf.driveFolderId = ? OR sf.id = ?
    `).get(folderId, parseInt(folderId) || 0);

    if (!folder) {
      return NextResponse.json({ success: false, message: 'Folder storage tidak ditemukan' }, { status: 404 });
    }

    // 2. Ambil daftar sub-folder anak langsung untuk navigasi Tab Subfolder
    const subFolders = db.prepare(`
      SELECT sf.id, sf.folderName as name, sf.driveFolderId
      FROM storage_folders sf
      WHERE sf.parentFolderId = ?
      ORDER BY sf.folderName ASC
    `).all(folder.driveFolderId);

    // 3. Ambil berkas file beserta kategori nama subfolder-nya
    const files = db.prepare(`
      WITH RECURSIVE Subtree(fId, fName) AS (
        SELECT driveFolderId, folderName FROM storage_folders WHERE driveFolderId = ?
        UNION ALL
        SELECT child.driveFolderId, child.folderName FROM storage_folders child
        JOIN Subtree parent ON child.parentFolderId = parent.fId
      )
      SELECT sf.id, sf.fileName as name, sf.driveFileId, sf.fileSizeBytes, sf.mimeType, sf.uploadedAt, sf.parentFolderId,
             COALESCE(st.fName, '') as subFolderName
      FROM storage_files sf
      JOIN Subtree st ON sf.parentFolderId = st.fId
      ORDER BY sf.uploadedAt DESC
    `).all(folder.driveFolderId);

    // 4. Hitung berapa jumlah foto yang diunggah langsung di root folder utama
    const rootFilesCount = files.filter(f => f.parentFolderId === folder.driveFolderId).length;

    // Hanya tampilkan logo jika paket berlangganan vendor memiliki allowCustomLogo = 1
    const shouldShowLogo = folder.allowCustomLogo === 1 && Boolean(folder.vendorLogo);

    return NextResponse.json({
      success: true,
      folder: {
        id: folder.id,
        name: folder.folderName,
        driveFolderId: folder.driveFolderId,
        createdAt: folder.createdAt,
        rootFilesCount
      },
      subFolders: subFolders || [],
      vendor: {
        name: folder.vendorName,
        logoUrl: shouldShowLogo ? folder.vendorLogo : null,
        allowCustomLogo: Boolean(folder.allowCustomLogo),
        brandColor: folder.vendorBrandColor,
        phone: folder.vendorPhone
      },
      files: files || []
    });

  } catch (error) {
    console.error('Error fetching storage gallery:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}
