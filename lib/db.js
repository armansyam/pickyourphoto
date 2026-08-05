const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// Tentukan path untuk database di dalam direktori proyek (dalam subfolder 'data' untuk Docker volume mounting)
const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, 'database.db');
let db;
if (process.env.NODE_ENV === 'production') {
    db = new Database(dbPath);
    try {
        db.pragma('journal_mode = WAL');
        db.pragma('busy_timeout = 10000');
    } catch (err) {}
} else {
    if (!globalThis._sqliteDb) {
        globalThis._sqliteDb = new Database(dbPath);
        try {
            globalThis._sqliteDb.pragma('journal_mode = WAL');
            globalThis._sqliteDb.pragma('busy_timeout = 10000');
        } catch (err) {}
    }
    db = globalThis._sqliteDb;
}

const bcrypt = require('bcryptjs');

// Fungsi untuk inisialisasi database
function initDb() {
    // Tabel untuk Paket Berlangganan (SaaS Plans)
    db.exec(`
    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      maxProjects INTEGER NOT NULL,
      price REAL DEFAULT 0,
      activePeriodDays INTEGER DEFAULT 30,
      status TEXT DEFAULT 'active',
      planType TEXT DEFAULT 'limit',
      maxStorageMB INTEGER DEFAULT 0,
      projectExpireDays INTEGER DEFAULT 0,
      maxPhotosPerProject INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Tabel untuk Vendor (Fotografer)
    db.exec(`
    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'vendor',
      status TEXT DEFAULT 'active',
      maxProjects INTEGER DEFAULT 5,
      planId INTEGER REFERENCES plans(id),
      expiresAt TEXT,
      whatsapp TEXT,
      paymentProof TEXT,
      resetRequested INTEGER DEFAULT 0,
      brandName TEXT,
      brandLogo TEXT,
      additionalProjects INTEGER DEFAULT 0,
      additionalProjectsExpiresAt TEXT,
      additionalPhotosPerProject INTEGER DEFAULT 0,
      usedStorageBytes INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Migrasi tabel vendors: Tambah kolom paymentProof & preferensi format salin jika belum ada
    try {
        const columns = db.pragma('table_info(vendors)');
        const hasColumn = (colName) => columns.some(col => col.name === colName);
        if (!hasColumn('paymentProof')) {
            db.exec("ALTER TABLE vendors ADD COLUMN paymentProof TEXT");
        }
        if (!hasColumn('copyDelimiter')) {
            db.exec("ALTER TABLE vendors ADD COLUMN copyDelimiter TEXT DEFAULT ', '");
        }
        if (!hasColumn('copyIncludeExt')) {
            db.exec("ALTER TABLE vendors ADD COLUMN copyIncludeExt INTEGER DEFAULT 0");
        }
        if (!hasColumn('copySortOrder')) {
            db.exec("ALTER TABLE vendors ADD COLUMN copySortOrder TEXT DEFAULT 'name_asc'");
        }
        if (!hasColumn('archivedAt')) {
            db.exec("ALTER TABLE vendors ADD COLUMN archivedAt DATETIME");
        }
    } catch (err) {
        console.error("Migration vendors error:", err);
    }

    // Tabel untuk Proyek/Galeri
    db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendorId INTEGER NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      status TEXT DEFAULT 'draft',
      maxSelection INTEGER DEFAULT 0,
      expiresAt TEXT,
      filesDeleted INTEGER DEFAULT 0,
      folderUrl TEXT,
      galleryTheme TEXT DEFAULT 'default',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendorId) REFERENCES vendors (id)
    )
  `);

    // Tabel untuk Klien
    db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      projectId INTEGER NOT NULL,
      accessKey TEXT NOT NULL UNIQUE,
      clientPhone TEXT DEFAULT '',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projectId) REFERENCES projects (id)
    )
  `);

    // Tabel untuk Foto
    db.exec(`
    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projectId INTEGER NOT NULL,
      originalPath TEXT NOT NULL,
      thumbnailPath TEXT NOT NULL,
      watermarkedPath TEXT NOT NULL,
      fileSizeBytes INTEGER DEFAULT 0,
      uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projectId) REFERENCES projects (id)
    )
  `);

    // Tabel untuk Seleksi Foto oleh Klien
    db.exec(`
    CREATE TABLE IF NOT EXISTS selections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      photoId INTEGER NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clientId) REFERENCES clients (id),
      FOREIGN KEY (photoId) REFERENCES photos (id),
      UNIQUE (clientId, photoId)
    )
  `);

    // Tabel untuk Konfigurasi SaaS
    db.exec(`
    CREATE TABLE IF NOT EXISTS saas_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

    // Tabel untuk Pengaturan Sistem & Perlindungan Disk (system_settings)
    db.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      enable_registration INTEGER NOT NULL DEFAULT 1,
      enable_free_trial INTEGER NOT NULL DEFAULT 1,
      max_vendor_quota INTEGER DEFAULT NULL,
      disk_warning_threshold_percent INTEGER NOT NULL DEFAULT 20,
      disk_critical_threshold_percent INTEGER NOT NULL DEFAULT 10,
      enable_auto_backup INTEGER NOT NULL DEFAULT 0,
      backup_interval_hours INTEGER NOT NULL DEFAULT 6,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Seed default system_settings
    try {
        db.prepare(`
            INSERT OR IGNORE INTO system_settings (id, enable_registration, enable_free_trial, max_vendor_quota, disk_warning_threshold_percent, disk_critical_threshold_percent, enable_auto_backup, backup_interval_hours) 
            VALUES (1, 1, 1, NULL, 20, 10, 0, 6)
        `).run();
    } catch (err) {
        console.error("Failed to seed default system_settings:", err);
    }

    // Migrasi untuk existing system_settings & plans
    try {
        db.exec("ALTER TABLE system_settings ADD COLUMN enable_auto_backup INTEGER NOT NULL DEFAULT 0;");
    } catch (e) {}
    try {
        db.exec("ALTER TABLE system_settings ADD COLUMN backup_interval_hours INTEGER NOT NULL DEFAULT 6;");
    } catch (e) {}
    try {
        db.exec("ALTER TABLE system_settings ADD COLUMN trial_expiration_hours INTEGER NOT NULL DEFAULT 1;");
    } catch (e) {}
    try {
        db.exec("ALTER TABLE system_settings ADD COLUMN trial_expiration_minutes INTEGER NOT NULL DEFAULT 30;");
    } catch (e) {}
    try {
        db.exec("ALTER TABLE plans ADD COLUMN allowCustomLogo INTEGER NOT NULL DEFAULT 0;");
    } catch (e) {}
    try {
        db.exec("ALTER TABLE plans ADD COLUMN allowRawSelector INTEGER NOT NULL DEFAULT 1;");
    } catch (e) {}
    try {
        db.exec("ALTER TABLE clients ADD COLUMN clientPhone TEXT DEFAULT '';");
    } catch (e) {}
    try {
        db.exec("ALTER TABLE photos ADD COLUMN category TEXT DEFAULT '';");
    } catch (e) {}

    // Tabel untuk Upgrade Plan & Bukti Transfer
    db.exec(`
    CREATE TABLE IF NOT EXISTS subscription_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendorId INTEGER NOT NULL,
      planId INTEGER NOT NULL,
      proratedPrice REAL NOT NULL,
      transferProof TEXT NOT NULL,
      status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendorId) REFERENCES vendors (id),
      FOREIGN KEY (planId) REFERENCES plans (id)
    )
  `);

    // Tambahkan Database Index untuk Optimasi Performa Query (Foreign Keys)
    db.exec("CREATE INDEX IF NOT EXISTS idx_projects_vendorId ON projects (vendorId)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_photos_projectId ON photos (projectId)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_clients_projectId ON clients (projectId)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_selections_clientId ON selections (clientId)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_subscription_requests_vendorId ON subscription_requests (vendorId)");

    // Bersihkan proyek yang terhenti di status 'importing' akibat restart server
    try {
        const stale = db.prepare("UPDATE projects SET status = 'failed' WHERE status = 'importing'").run();
        if (stale.changes > 0) {
            console.log(`[Database Init] Reset ${stale.changes} stale importing projects to failed status.`);
        }
    } catch (err) {
        console.error("Failed to clean stale importing projects:", err);
    }

    // Seed/update default v2.0 SaaS plans (Starter, Pro Studio, Business Studio)
    try {
        // Ensure all plans have activePeriodDays = 30, maxPhotosPerProject = 0 (Unlimited Photos), maxStorageMB = 0 (Zero Storage), projectExpireDays = 0
        db.exec("UPDATE plans SET activePeriodDays = 30, maxPhotosPerProject = 0, maxStorageMB = 0, projectExpireDays = 0;");

        // Seed default 3 clean SaaS plans if empty
        const checkPlans = db.prepare("SELECT count(*) as count FROM plans").get();
        if (!checkPlans || checkPlans.count === 0) {
            const insertPlan = db.prepare(`
                INSERT INTO plans (name, maxProjects, price, projectExpireDays, maxPhotosPerProject, activePeriodDays, status, planType, maxStorageMB, allowCustomLogo, allowRawSelector) 
                VALUES (?, ?, ?, 0, 0, ?, 'active', 'limit', 0, ?, ?)
            `);

            insertPlan.run('Starter Plan', 5, 49000, 30, 0, 0);
            insertPlan.run('Pro Studio Plan', 20, 129000, 30, 1, 0);
            insertPlan.run('Business Studio Plan', 50, 249000, 30, 1, 1);
            console.log('Seeded 3 ideal SaaS Plans cleanly with 30-day billing & Unlimited Photos.');
        }

    } catch (err) {
        console.error("Seeding/updating plans error:", err);
    }

    // Seed default saas settings if empty
    try {
        const checkSetting = db.prepare("SELECT key FROM saas_settings LIMIT 1").get();
        if (!checkSetting) {
            const insertStmt = db.prepare("INSERT OR IGNORE INTO saas_settings (key, value) VALUES (?, ?)");
            insertStmt.run('bank_name', 'BCA (Bank Central Asia)');
            insertStmt.run('bank_account_number', '1234-5678-90');
            insertStmt.run('bank_account_name', 'PT Pick Your Photo');
            insertStmt.run('contact_email', 'support@pickyourphoto.com');
            insertStmt.run('contact_whatsapp', '6281234567890');
            console.log('Seeded default SaaS settings.');
        }
    } catch (err) {
        console.error("Seeding SaaS settings error:", err);
    }

    // Ensure trial saas setting keys exist (safe — INSERT OR IGNORE)
    try {
        db.prepare("INSERT OR IGNORE INTO saas_settings (key, value) VALUES ('raw_sorter_trial_limit', '5')").run();
        db.prepare("INSERT OR IGNORE INTO saas_settings (key, value) VALUES ('trial_max_selection', '10')").run();
        db.prepare("INSERT OR IGNORE INTO saas_settings (key, value) VALUES ('trial_max_photos', '50')").run();
        db.prepare("INSERT OR IGNORE INTO saas_settings (key, value) VALUES ('trial_max_subfolders', '1')").run();
    } catch (err) {
        console.error("Failed to seed trial saas settings:", err);
    }

    // Seed default admin account
    try {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPass = process.env.ADMIN_PASSWORD;

        if (!adminEmail || !adminPass) {
            console.warn("⚠️ [Database Init] ADMIN_EMAIL atau ADMIN_PASSWORD belum diatur di environment. Seeding superadmin ditangguhkan.");
        } else {
            const adminExists = db.prepare("SELECT id, email, password FROM vendors WHERE role = 'admin'").get();
            if (!adminExists) {
                const hashedPassword = bcrypt.hashSync(adminPass, 10);
                db.prepare("INSERT OR IGNORE INTO vendors (name, email, password, role, maxProjects) VALUES (?, ?, ?, 'admin', 999)").run(
                    'System Owner',
                    adminEmail,
                    hashedPassword
                );
                console.log(`[Database Init] Berhasil melakukan seed akun admin baru: ${adminEmail}`);
            } else {
                const isEmailDifferent = adminExists.email !== adminEmail;
                const isPasswordDifferent = !bcrypt.compareSync(adminPass, adminExists.password);
                if (isEmailDifferent || isPasswordDifferent) {
                    const hashedPassword = bcrypt.hashSync(adminPass, 10);
                    db.prepare("UPDATE vendors SET email = ?, password = ? WHERE role = 'admin'").run(
                        adminEmail,
                        hashedPassword
                    );
                    console.log(`[Database Init] Berhasil sinkronisasi kredensial admin: ${adminEmail}`);
                }
            }
        }
    } catch (err) {
        console.error("Seeding admin error:", err);
    }

    // Tabel untuk Galeri Trial Instan (1-Hour Expiration, Zero-Storage)
    db.exec(`
    CREATE TABLE IF NOT EXISTS trial_galleries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      folderUrl TEXT NOT NULL,
      title TEXT DEFAULT 'Galeri Seleksi Foto (Trial)',
      maxSelection INTEGER DEFAULT 15,
      stagingFiles TEXT,
      selectedPhotos TEXT,
      logoUrl TEXT,
      selectionStatus TEXT DEFAULT 'pending',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      expiresAt DATETIME NOT NULL
    )
  `);

    try {
        const trialCols = db.pragma('table_info(trial_galleries)');
        if (!trialCols.some(c => c.name === 'logoUrl')) {
            db.exec("ALTER TABLE trial_galleries ADD COLUMN logoUrl TEXT");
        }
        if (!trialCols.some(c => c.name === 'selectionStatus')) {
            db.exec("ALTER TABLE trial_galleries ADD COLUMN selectionStatus TEXT DEFAULT 'pending'");
        }
    } catch (e) {
        console.error("Migrasi trial_galleries logoUrl/selectionStatus error:", e);
    }

    // Tabel transaksi pembayaran Payment Gateway
    db.exec(`
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderId TEXT NOT NULL UNIQUE,
      vendorId INTEGER NOT NULL,
      planId INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      provider TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      paymentUrl TEXT,
      paymentType TEXT,
      rawResponse TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      paidAt DATETIME
    )
  `);
    db.exec("CREATE INDEX IF NOT EXISTS idx_payment_transactions_orderId ON payment_transactions (orderId)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_payment_transactions_vendorId ON payment_transactions (vendorId)");

    // Tabel Sesi Pembayaran QRIS / Gateway (2-Hour Expiration & Session Isolation)
    db.exec(`
    CREATE TABLE IF NOT EXISTS payment_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderId TEXT NOT NULL UNIQUE,
      vendorId INTEGER NOT NULL,
      planId INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      paymentMethod TEXT DEFAULT 'qris',
      qrUrl TEXT DEFAULT '',
      expiresAt DATETIME NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      paidAt DATETIME,
      rawResponse TEXT,
      FOREIGN KEY (vendorId) REFERENCES vendors (id)
    )
  `);
    db.exec("CREATE INDEX IF NOT EXISTS idx_payment_sessions_orderId ON payment_sessions (orderId)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_payment_sessions_vendorId ON payment_sessions (vendorId)");

    console.log('Database initialized successfully.');
}

// Inisialisasi database secara otomatis saat di-import
// (Lewati saat build Next.js untuk mencegah lock contention/SQLITE_BUSY antar worker paralel)
const isNextBuild = process.env.NEXT_PHASE === 'phase-production-build' || process.env.NEXT_PHASE === 'phase-export';
if (!isNextBuild) {
    try {
        initDb();
    } catch (err) {
        console.warn("[Database Warning] Gagal inisialisasi DB otomatis:", err.message);
    }

    // =====================================================================
    // AUTO-CLEANUP INTERVAL — Runs every 60 seconds
    // Keeps the database clean from stale payment sessions and archive data
    // =====================================================================
    setInterval(() => {
        try {
            const now = new Date().toISOString();

            // 1. Expire payment sessions that have passed their expiresAt
            const expiredSessions = db.prepare(`
                UPDATE payment_sessions
                SET status = 'expired'
                WHERE status = 'pending' AND expiresAt < ?
            `).run(now);

            // 2. Archive vendor drafts whose QRIS session has expired (and not paid via webhook)
            //    Only archive if NO active/paid session exists for that vendor
            const archivedVendors = db.prepare(`
                UPDATE vendors
                SET status = 'expired_draft', archivedAt = ?
                WHERE status = 'pending_payment'
                  AND id IN (
                    SELECT vendorId FROM payment_sessions
                    WHERE status = 'expired'
                  )
                  AND id NOT IN (
                    SELECT vendorId FROM payment_sessions
                    WHERE status IN ('paid', 'pending')
                  )
            `).run(now);

            // 3. Auto-expire active vendors whose subscription has passed expiresAt
            const expiredVendors = db.prepare(`
                SELECT id FROM vendors 
                WHERE role = 'vendor' 
                  AND status = 'active' 
                  AND expiresAt IS NOT NULL 
                  AND expiresAt < ?
            `).all(now);

            if (expiredVendors.length > 0) {
                const vendorIds = expiredVendors.map(v => v.id);
                const placeholders = vendorIds.map(() => '?').join(',');

                db.prepare(`
                    UPDATE vendors 
                    SET status = 'expired' 
                    WHERE id IN (${placeholders})
                `).run(...vendorIds);

                const projInfo = db.prepare(`
                    UPDATE projects 
                    SET status = 'archived' 
                    WHERE vendorId IN (${placeholders}) AND status != 'completed'
                `).run(...vendorIds);

                console.log(`[Auto-Expire Cron] Soft-locked ${expiredVendors.length} vendors and archived ${projInfo.changes} projects.`);
            }

            // 4. Auto-delete inactive draft_plan leads older than 48 hours (prospect cleanup)
            const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
            const deletedLeads = db.prepare(`
                DELETE FROM vendors
                WHERE status = 'draft_plan'
                  AND createdAt < ?
                  AND role != 'admin'
            `).run(fortyEightHoursAgo);

            if (expiredSessions.changes > 0 || archivedVendors.changes > 0 || deletedLeads.changes > 0) {
                console.log(`[DB Cleanup] Sessions expired: ${expiredSessions.changes}, Archived: ${archivedVendors.changes}, Leads cleaned: ${deletedLeads.changes}`);
            }

            // 5. Autonomous Auto-Backup Cron (Runs based on system_settings.enable_auto_backup & backup_interval_hours)
            try {
                const settings = db.prepare("SELECT enable_auto_backup, backup_interval_hours FROM system_settings WHERE id = 1").get();
                if (settings && settings.enable_auto_backup === 1) {
                    const intervalMs = (settings.backup_interval_hours || 6) * 60 * 60 * 1000;
                    const backupsDir = path.join(process.cwd(), 'backups');
                    let lastBackupMs = 0;
                    if (fs.existsSync(backupsDir)) {
                        const files = fs.readdirSync(backupsDir).filter(f => f.startsWith('db_') && f.endsWith('.db'));
                        files.forEach(f => {
                            try {
                                const stat = fs.statSync(path.join(backupsDir, f));
                                if (stat.mtimeMs > lastBackupMs) lastBackupMs = stat.mtimeMs;
                            } catch (e) {}
                        });
                    }
                    if (Date.now() - lastBackupMs > intervalMs) {
                        console.log(`[Auto Backup Cron] Interval elapsed (${settings.backup_interval_hours}h). Triggering backup...`);
                        exec('bash scripts/backup-db.sh', (err, stdout) => {
                            if (err) console.error('[Auto Backup DB Error]', err.message);
                            else console.log('[Auto Backup DB Success]', stdout.trim());
                        });
                        exec('bash scripts/backup-photos.sh', (err, stdout) => {
                            if (err) console.error('[Auto Backup Photos Error]', err.message);
                            else console.log('[Auto Backup Photos Success]', stdout.trim());
                        });
                    }
                }
            } catch (backupErr) {
                console.error('[Auto Backup Cron Error]:', backupErr.message);
            }
        } catch (cleanupErr) {
            console.error('[DB Cleanup Error]:', cleanupErr.message);
        }
    }, 60 * 1000);

} else {
    console.log("[Database] Melewati inisialisasi tabel selama fase build Next.js.");
}

module.exports = db;