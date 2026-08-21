const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(process.cwd(), 'data');
const legacyDbPath = path.join(dbDir, 'database.db');
const masterDbPath = path.join(dbDir, 'master.db');
const vendorDbPath = path.join(dbDir, 'vendor.db');
const trialDbPath = path.join(dbDir, 'trial.db');

console.log('================================================================');
console.log('🚀 MEMULAI MIGRASI DATABASE KE ARSITEKTUR TRIAD (3 DATABASE)');
console.log('================================================================');

if (!fs.existsSync(legacyDbPath)) {
    console.log('ℹ️ Tidak ditemukan legacy database.db. Sistem akan membuat database baru secara otomatis.');
    process.exit(0);
}

try {
    const legacyDb = new Database(legacyDbPath);
    const masterDb = new Database(masterDbPath);
    const vendorDb = new Database(vendorDbPath);
    const trialDb = new Database(trialDbPath);

    // Nonaktifkan foreign keys selama migrasi agar insert data lancar
    masterDb.pragma('foreign_keys = OFF');
    vendorDb.pragma('foreign_keys = OFF');
    trialDb.pragma('foreign_keys = OFF');

    // Aktifkan WAL mode di semua DB
    masterDb.pragma('journal_mode = WAL');
    vendorDb.pragma('journal_mode = WAL');
    trialDb.pragma('journal_mode = WAL');

    // Dapatkan daftar tabel yang ada di database lama
    const tables = legacyDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(r => r.name);
    console.log('📊 Tabel ditemukan di database lama:', tables.join(', '));

    const MASTER_TABLES = [
        'admins', 'plans', 'addon_plans', 'saas_settings', 'system_settings',
        'vendors', 'subscription_requests', 'payment_sessions', 'master_drive_accounts',
        'subdomain_history', 'custom_domains', 'payment_transactions', 'storage_addon_subscriptions'
    ];

    const VENDOR_TABLES = [
        'projects', 'clients', 'photos', 'selections', 'storage_folders', 'storage_files',
        'daily_upload_logs', 'upload_queue'
    ];

    const TRIAL_TABLES = [
        'trial_galleries'
    ];

    // Helper migrasi tabel
    function migrateTable(srcDb, destDb, tableName) {
        if (!tables.includes(tableName)) return;
        
        // 1. Dapatkan DDL CREATE TABLE dari legacy DB
        const createStmtRow = srcDb.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name = ?").get(tableName);
        if (!createStmtRow || !createStmtRow.sql) return;

        let cleanSql = createStmtRow.sql;
        if (destDb === vendorDb) {
            cleanSql = cleanSql.replace(/,?\s*FOREIGN KEY\s*\([a-zA-Z0-9_]+\)\s*REFERENCES\s*vendors\s*\([a-zA-Z0-9_]+\)/gi, '');
        }

        destDb.exec(cleanSql);

        // 2. Salin data baris per baris
        const rows = srcDb.prepare(`SELECT * FROM ${tableName}`).all();
        if (rows.length > 0) {
            const cols = Object.keys(rows[0]);
            const placeholders = cols.map(() => '?').join(', ');
            const insertStmt = destDb.prepare(`INSERT OR REPLACE INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders})`);

            const insertMany = destDb.transaction((data) => {
                for (const row of data) {
                    insertStmt.run(...Object.values(row));
                }
            });
            insertMany(rows);
            console.log(`  ✅ [${tableName}] Berhasil migrasi ${rows.length} baris.`);
        } else {
            console.log(`  ✅ [${tableName}] Tabel siap (0 baris).`);
        }

        // 3. Salin Indeks jika ada
        const indexes = srcDb.prepare("SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name = ? AND sql IS NOT NULL").all(tableName);
        for (const idx of indexes) {
            try {
                destDb.exec(idx.sql);
            } catch (_) {}
        }
    }

    console.log('\n👑 [1/3] Memindahkan data ke master.db (Admin & Finansial)...');
    for (const t of MASTER_TABLES) {
        migrateTable(legacyDb, masterDb, t);
    }

    console.log('\n📸 [2/3] Memindahkan data ke vendor.db (Galeri & Foto Klien)...');
    for (const t of VENDOR_TABLES) {
        migrateTable(legacyDb, vendorDb, t);
    }

    console.log('\n🧪 [3/3] Memindahkan data ke trial.db (Sandbox Uji Coba)...');
    for (const t of TRIAL_TABLES) {
        migrateTable(legacyDb, trialDb, t);
    }

    legacyDb.close();
    masterDb.close();
    vendorDb.close();
    trialDb.close();

    // Backup legacy database.db
    const backupPath = path.join(dbDir, 'database.db.backup');
    if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(legacyDbPath, backupPath);
        console.log(`\n💾 Berkas database.db lama telah dicadangkan ke: ${backupPath}`);
    }

    console.log('\n🎉 MIGRASI KE 3 DATABASE TRIAD SELESAI DENGAN SUKSES 100%!');
    console.log('================================================================\n');
} catch (err) {
    console.error('❌ Terjadi kesalahan saat migrasi:', err);
    process.exit(1);
}
