import { getMasterDriveClient } from '../lib/google-master-drive.js';

async function scanAndCleanSharedFiles(isDeleteMode = false) {
  const drive = getMasterDriveClient();
  if (!drive) {
    console.log('❌ Client OAuth Google Drive tidak ditemukan.');
    return;
  }

  try {
    const about = await drive.about.get({ fields: 'user' });
    const myEmail = about.data.user.emailAddress;
    console.log('==================================================');
    console.log('🔍 AKUN SINKRONISASI GOOGLE MASTER');
    console.log('Email Akun Aktif:', myEmail);
    console.log('==================================================\n');

    // Ambil seluruh file milik akun aktif
    const res = await drive.files.list({
      q: "'me' in owners and trashed = false and mimeType != 'application/vnd.google-apps.folder'",
      fields: 'files(id, name, parents, size)',
      pageSize: 1000
    });

    const files = res.data.files || [];
    console.log(`📂 Total file milik Anda di Google Cloud: ${files.length} file.`);

    const sharedFilesTarget = [];
    const uniqueParentIds = new Set();
    files.forEach(f => {
      if (f.parents && f.parents.length > 0) {
        uniqueParentIds.add(f.parents[0]);
      }
    });

    console.log(`🔎 Memeriksa pemilik dari ${uniqueParentIds.size} folder unik...`);

    const parentCache = new Map();
    // Batch fetch parent folders
    await Promise.all(
      Array.from(uniqueParentIds).map(async (parentId) => {
        try {
          const parentFolder = await drive.files.get({ fileId: parentId, fields: 'id, name, owners' });
          const ownerEmail = parentFolder.data.owners?.[0]?.emailAddress || 'Unknown';
          const isOtherOwner = (ownerEmail !== myEmail);
          parentCache.set(parentId, { isOtherOwner, folderName: parentFolder.data.name, ownerEmail });
        } catch (e) {
          parentCache.set(parentId, { isOtherOwner: false, folderName: 'My Drive', ownerEmail: myEmail });
        }
      })
    );

    for (const f of files) {
      if (!f.parents || f.parents.length === 0) continue;
      const parentInfo = parentCache.get(f.parents[0]);
      if (parentInfo && parentInfo.isOtherOwner) {
        sharedFilesTarget.push({
          id: f.id,
          name: f.name,
          sizeMB: f.size ? (parseInt(f.size) / (1024 * 1024)).toFixed(2) : '0',
          folderName: parentInfo.folderName,
          folderOwner: parentInfo.ownerEmail
        });
      }
    }

    console.log('\n🎯 HASIL FILTERING: FILE DI FOLDER ORANG LAIN SAJA');
    console.log(`Jumlah file target yang ditemukan: ${sharedFilesTarget.length} file\n`);

    if (sharedFilesTarget.length === 0) {
      console.log('✅ SELAMAT! Tidak ditemukan file milik Anda yang tersangkut di folder orang lain.');
      return;
    }

    sharedFilesTarget.forEach((item, index) => {
      console.log(`[${index + 1}] ${item.name} (${item.sizeMB} MB)`);
      console.log(`    └── Lokasi: Folder '${item.folderName}' (Milik: ${item.folderOwner})`);
    });

    if (isDeleteMode) {
      console.log('\n🗑️ MEMULAI PROSES PENGHAPUSAN BERSIH...');
      for (const item of sharedFilesTarget) {
        try {
          await drive.files.delete({ fileId: item.id });
          console.log(`✅ Hapus Sukses: ${item.name}`);
        } catch (err) {
          console.error(`❌ Gagal Hapus ${item.name}:`, err.message);
        }
      }
      console.log('\n🎉 PROSES PENGHAPUSAN SELESAI 100%!');
    } else {
      console.log('\n💡 MODE PEMINDAIAN (SCAN ONLY). File belum dihapus.');
      console.log('Untuk mengeksekusi penghapusan, jalankan dengan argumen --delete.');
    }

  } catch (err) {
    console.error('❌ Error saat memindai Google Drive:', err.message);
  }
}

const args = process.argv.slice(2);
const isDelete = args.includes('--delete');
scanAndCleanSharedFiles(isDelete);
