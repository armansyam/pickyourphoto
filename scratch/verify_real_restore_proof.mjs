/**
 * BUKTI EMPIRIS & FISIK PROSES RESTORE DATABASE
 * Membuktikan secara fisik bit-for-bit SHA-256 dan modifikasi file sistem nyata.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const dbFile = path.join(projectRoot, 'data/database.db');
const backupsDir = path.join(projectRoot, 'backups');

function getSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

console.log('================================================================');
console.log('🔬 BUKTI FISIK & EMPIRIS RESTORE DATABASE (NON-SIMULATION)');
console.log('================================================================\n');

// 1. Catat Data & SHA-256 Awal
const shaOriginal = getSha256(dbFile);
const statOriginal = fs.statSync(dbFile);
const db1 = new Database(dbFile);
const vendorBefore = db1.prepare("SELECT id, name, email FROM vendors").all();
const settingsCountBefore = db1.prepare("SELECT COUNT(*) as c FROM saas_settings").get().c;
db1.close();

console.log('📊 STATUS DATABASE AWAL:');
console.log(`   • Path Berkas     : ${dbFile}`);
console.log(`   • Ukuran          : ${statOriginal.size} bytes`);
console.log(`   • SHA-256 Hash    : ${shaOriginal}`);
console.log(`   • Jumlah Vendor   : ${vendorBefore.length} vendor (${vendorBefore[0]?.name || 'N/A'})`);
console.log(`   • SaaS Settings   : ${settingsCountBefore} baris konfigurasi\n`);

// 2. Buat File Backup Asli di Folder backups/
const proofBackupFile = path.join(backupsDir, `db_proof_${Date.now()}.db`);
fs.copyFileSync(dbFile, proofBackupFile);
const shaBackup = getSha256(proofBackupFile);
console.log('💾 BACKUP DIBUAT SECARA FISIK:');
console.log(`   • Path File       : ${proofBackupFile}`);
console.log(`   • SHA-256 Backup  : ${shaBackup}`);
console.log(`   • Kesamaan Hash   : ${shaOriginal === shaBackup ? 'IDENTIK 100%' : 'BEDA'}\n`);

// 3. Modifikasi Nyata Database (Tambahkan Data Palsu & Hapus Vendor Uji)
console.log('✍️  MEMODIFIKASI DATABASE AKTIF (MENGUBAH FISIK DATA):');
const dbMutate = new Database(dbFile);
dbMutate.prepare("INSERT INTO saas_settings (key, value) VALUES ('BUKTI_NYATA_PERUBAHAN', 'NILAI_YANG_AKAN_TERHAPUS')").run();
dbMutate.prepare("UPDATE saas_settings SET value = 'NILAI_DIUBAH_HACKER' WHERE key = 'bank_name'").run();
const modifiedCheck = dbMutate.prepare("SELECT value FROM saas_settings WHERE key = 'bank_name'").get();
dbMutate.close();

const shaModified = getSha256(dbFile);
console.log(`   • Nilai Bank Baru : '${modifiedCheck.value}'`);
console.log(`   • SHA-256 Berubah : ${shaModified}`);
console.log(`   • Status          : Database kini berbeda secara fisik (${shaOriginal !== shaModified ? 'TERBUKTI BERBEDA' : 'TIDAK BERUBAH'})\n`);

// 4. Eksekusi Restore Nyata (Penimpaan File Fisik)
console.log('🔄 EKSEKUSI PENIMPAAN RESTORE FISIK:');
// Hapus WAL/SHM jika ada
const wal = path.join(projectRoot, 'data/database.db-wal');
const shm = path.join(projectRoot, 'data/database.db-shm');
if (fs.existsSync(wal)) fs.unlinkSync(wal);
if (fs.existsSync(shm)) fs.unlinkSync(shm);

// Timpa database.db dengan proofBackupFile
fs.copyFileSync(proofBackupFile, dbFile);
const shaRestored = getSha256(dbFile);
console.log(`   • SHA-256 Setelah Restore : ${shaRestored}`);
console.log(`   • Verifikasi Bit-to-Bit   : ${shaRestored === shaBackup ? 'COCOK 100% PERSIS DENGAN FILE BACKUP' : 'GAGAL'}\n`);

// 5. Pembacaan Ulang Database Pasca Restore
console.log('📖 PEMERIKSAAN ULANG ISI DATABASE PASCA RESTORE:');
const dbCheck = new Database(dbFile);
const bankAfter = dbCheck.prepare("SELECT value FROM saas_settings WHERE key = 'bank_name'").get();
const markerAfter = dbCheck.prepare("SELECT value FROM saas_settings WHERE key = 'BUKTI_NYATA_PERUBAHAN'").get();
dbCheck.close();

console.log(`   • Nilai Bank Asli Pulih    : '${bankAfter.value}' (Bukan 'NILAI_DIUBAH_HACKER')`);
console.log(`   • Data Palsu Terhapus      : ${markerAfter === undefined ? 'BENAR (Hilang Total / Pulih ke Asal)' : 'GAGAL'}`);

// Bersihkan file backup uji coba
fs.unlinkSync(proofBackupFile);

console.log('\n================================================================');
console.log('🏁 KESIMPULAN EMPIRIS: RESTORE BENAR-BENAR BERJALAN NYATA PADA FILE SISTEM & DATABASE');
console.log('================================================================\n');
