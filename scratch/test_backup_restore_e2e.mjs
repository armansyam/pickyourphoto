/**
 * TEST BACKUP & RESTORE DATABASE E2E
 * Memvalidasi mekanisme snapshot, online backup, dan restore SQLite
 */

import Database from 'better-sqlite3';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const dbDir = path.join(projectRoot, 'data');
const dbFile = path.join(dbDir, 'database.db');
const backupsDir = path.join(projectRoot, 'backups');

if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

console.log('================================================================');
console.log('🧪 PENGUJIAN INTEGRITAS BACKUP & RESTORE DATABASE (E2E)');
console.log('================================================================\n');

// 1. Buat Snapshot Backup Awal
const testBackupName = `db_test_e2e_${Date.now()}.db`;
const testBackupPath = path.join(backupsDir, testBackupName);

console.log('📦 1. Membuat Snapshot Cadangan SQLite Online...');
execSync(`sqlite3 "${dbFile}" ".backup '${testBackupPath}'"`);
if (!fs.existsSync(testBackupPath)) {
  console.error('❌ GAGAL: Berkas snapshot tidak terbuat.');
  process.exit(1);
}

const stat = fs.statSync(testBackupPath);
console.log(`   ✅ Berkas cadangan terbuat: ${testBackupName} (${(stat.size / 1024).toFixed(1)} KB)`);

// Validasi SQLite header
const buf = fs.readFileSync(testBackupPath);
const header = buf.slice(0, 16).toString('ascii');
if (!header.startsWith('SQLite format 3')) {
  console.error('❌ GAGAL: Berkas bukan SQLite 3 format.');
  process.exit(1);
}
console.log('   ✅ Validasi Header: SQLite format 3 Valid\n');

// 2. Modifikasi Database Aktif (Simulasi Penambahan Data Sementara)
console.log('📝 2. Menyuntikkan Data Uji Coba ke Database Aktif...');
const dbActive = new Database(dbFile);
dbActive.prepare("INSERT OR REPLACE INTO saas_settings (key, value) VALUES ('test_marker_e2e', 'SHOULD_DISAPPEAR_AFTER_RESTORE')").run();
const insertedCheck = dbActive.prepare("SELECT value FROM saas_settings WHERE key = 'test_marker_e2e'").get();
console.log(`   ✅ Data terinjeksi: key='test_marker_e2e', value='${insertedCheck.value}'\n`);
dbActive.close();

// 3. Eksekusi Restore Sesuai Prosedur Backend
console.log('🔄 3. Menjalankan Alur Restore Database dari Snapshot...');
const emergencyName = `db_pre_restore_e2e_${Date.now()}.db`;
const emergencyPath = path.join(backupsDir, emergencyName);

// Safety Step: Pre-restore snapshot
fs.copyFileSync(dbFile, emergencyPath);
console.log(`   ✅ Emergency snapshot dibuat: ${emergencyName}`);

// Bersihkan WAL & SHM
const walFile = path.join(dbDir, 'database.db-wal');
const shmFile = path.join(dbDir, 'database.db-shm');
if (fs.existsSync(walFile)) try { fs.unlinkSync(walFile); } catch (_) {}
if (fs.existsSync(shmFile)) try { fs.unlinkSync(shmFile); } catch (_) {}

// Timpa database utama dengan snapshot cadangan awal
fs.copyFileSync(testBackupPath, dbFile);
console.log('   ✅ Database utama berhasil ditimpa dengan berkas cadangan\n');

// 4. Verifikasi Integritas Pasca-Restore
console.log('🔍 4. Memverifikasi Integritas Data Pasca-Restore...');
const dbRestored = new Database(dbFile);
const markerAfterRestore = dbRestored.prepare("SELECT value FROM saas_settings WHERE key = 'test_marker_e2e'").get();

if (markerAfterRestore === undefined) {
  console.log('   ✅ SUCCESS: Data sementara hilang (Database berhasil kembali ke status snapshot awal)');
} else {
  console.error('   ❌ FAILED: Data sementara masih ada, restore tidak sempurna.');
  process.exit(1);
}

// Cek integritas tabel inti
const tables = ['vendors', 'projects', 'master_drive_accounts', 'saas_settings', 'system_settings', 'plans'];
for (const t of tables) {
  const count = dbRestored.prepare(`SELECT COUNT(*) as c FROM ${t}`).get().c;
  console.log(`   ✅ Tabel '${t}': Terbaca normal (${count} baris data)`);
}
dbRestored.close();

// 5. Bersihkan Berkas Uji Coba
console.log('\n🧹 5. Membersihkan Berkas Uji Coba...');
try { fs.unlinkSync(testBackupPath); } catch (_) {}
try { fs.unlinkSync(emergencyPath); } catch (_) {}
console.log('   ✅ Berkas uji coba dibersihkan.');

console.log('\n================================================================');
console.log('🎉 HASIL: PENGUJIAN RESTORE DATABASE SELESAI & 100% SUKSES!');
console.log('================================================================\n');
