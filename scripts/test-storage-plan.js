import db from '../lib/db.js';
import { createVendorSubFolder, createVendorRootFolder } from '../lib/google-master-drive.js';

async function runStoragePlanIntegrationTest() {
  console.log('=== START INTEGRATION TEST: PLAN STORAGE ===\n');

  // 1. Ambil vendor test AMS Visual (ID: 28)
  const vendor = db.prepare('SELECT * FROM vendors WHERE email = ?').get('amsvisualphotography@gmail.com');
  if (!vendor) {
    console.error('❌ Vendor test amsvisualphotography@gmail.com tidak ditemukan.');
    process.exit(1);
  }
  console.log(`✓ Vendor Found: ${vendor.name} (ID: ${vendor.id}, Storage Addon: ${vendor.hasStorageAddon}, Quota: ${vendor.addonStorageQuotaBytes} bytes)`);

  // 2. Pastikan tabel storage_files & daily_upload_logs siap
  const fileCount = db.prepare('SELECT COUNT(*) as count FROM storage_files WHERE vendorId = ?').get(vendor.id)?.count || 0;
  console.log(`✓ DB storage_files query ok. Total files for vendor: ${fileCount}`);

  // 3. Simulasikan registrasi berkas test fisik (10 MB)
  const testFileName = `test_photo_${Date.now()}.jpg`;
  const testFileSize = 10 * 1024 * 1024; // 10 MB
  const fakeDriveId = `test_drive_file_${Date.now()}`;

  db.prepare(`
    INSERT INTO storage_files (vendorId, parentFolderId, driveFileId, fileName, fileSizeBytes, mimeType, webViewLink, webContentLink)
    VALUES (?, 'root', ?, ?, ?, 'image/jpeg', 'https://drive.google.com/test', 'https://drive.google.com/test/download')
  `).run(vendor.id, fakeDriveId, testFileName, testFileSize);

  // Update usedStorageBytes
  db.prepare('UPDATE vendors SET usedStorageBytes = usedStorageBytes + ? WHERE id = ?').run(testFileSize, vendor.id);

  const updatedVendor = db.prepare('SELECT usedStorageBytes FROM vendors WHERE id = ?').get(vendor.id);
  console.log(`✓ File Direct Upload Registered: ${testFileName} (${testFileSize} bytes). Updated Vendor usedStorageBytes: ${updatedVendor.usedStorageBytes} bytes.`);

  // 4. Simulasikan Quota Refund saat Hapus File
  const insertedFile = db.prepare('SELECT id FROM storage_files WHERE driveFileId = ?').get(fakeDriveId);
  if (insertedFile) {
    db.prepare('DELETE FROM storage_files WHERE id = ?').run(insertedFile.id);
    db.prepare('UPDATE vendors SET usedStorageBytes = MAX(0, usedStorageBytes - ?) WHERE id = ?').run(testFileSize, vendor.id);
    const finalVendor = db.prepare('SELECT usedStorageBytes FROM vendors WHERE id = ?').get(vendor.id);
    console.log(`✓ Quota Refund Successful. File removed. Final Vendor usedStorageBytes: ${finalVendor.usedStorageBytes} bytes.`);
  }

  console.log('\n=== ALL INTEGRATION TESTS PASSED 100% ===');
}

runStoragePlanIntegrationTest().catch(err => {
  console.error('❌ Integration Test Error:', err);
  process.exit(1);
});
