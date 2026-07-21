const Database = require('better-sqlite3');
const path = require('path');

const fs = require('fs');

// Tentukan path untuk database di dalam direktori proyek (dalam subfolder 'data' untuk Docker volume mounting)
const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, 'database.db');
const db = new Database(dbPath);

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

    // Migrasi tabel vendors: Tambah kolom paymentProof jika belum ada
    try {
        const columns = db.pragma('table_info(vendors)');
        const hasColumn = (colName) => columns.some(col => col.name === colName);
        if (!hasColumn('paymentProof')) {
            db.exec("ALTER TABLE vendors ADD COLUMN paymentProof TEXT");
            console.log("Migrated: Added 'paymentProof' column to vendors.");
        }
    } catch (err) {
        console.error("Migration vendors paymentProof error:", err);
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

    // Migrasi untuk existing system_settings
    try {
        db.exec("ALTER TABLE system_settings ADD COLUMN enable_auto_backup INTEGER NOT NULL DEFAULT 0;");
    } catch (e) {}
    try {
        db.exec("ALTER TABLE system_settings ADD COLUMN backup_interval_hours INTEGER NOT NULL DEFAULT 6;");
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

    // Seed default plans if empty, or insert the 8 default plans if they don't exist
    try {
        const planCount = db.prepare("SELECT COUNT(*) as count FROM plans").get()?.count || 0;
        if (planCount === 0) {
            const insertPlan = db.prepare(`
                INSERT OR IGNORE INTO plans (name, maxProjects, price, projectExpireDays, maxPhotosPerProject, activePeriodDays, status, planType, maxStorageMB) 
                VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
            `);

            // Limit-based default plans (Free Trial set to 1 day)
            insertPlan.run('Trial Limit', 3, 0, 99999, 50, 1, 'limit', 0);
            insertPlan.run('Tier 1', 5, 50000, 99999, 100, 30, 'limit', 0);
            insertPlan.run('Tier 2', 15, 120000, 99999, 250, 30, 'limit', 0);
            insertPlan.run('Tier 3', 50, 250000, 99999, 500, 30, 'limit', 0);

            // Storage-based default plans (Free Trial set to 1 day)
            insertPlan.run('Trial Storage', 99999, 0, 99999, 99999, 1, 'storage', 500);
            insertPlan.run('Base', 99999, 100000, 99999, 99999, 30, 'storage', 2000);
            insertPlan.run('Pro', 99999, 200000, 99999, 99999, 30, 'storage', 5000);
            insertPlan.run('Business', 99999, 400000, 99999, 99999, 30, 'storage', 15000);

            console.log('Seeded 8 default plans (Trial & Paid for Limit & Storage based).');
        }
    } catch (err) {
        console.error("Seeding plans error:", err);
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

    // Seed default admin account
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
        console.error("[Database Init] Gagal inisialisasi superadmin:", err);
    }

    console.log('Database initialized successfully.');
}

// Inisialisasi database secara otomatis saat di-import
initDb();

module.exports = db;