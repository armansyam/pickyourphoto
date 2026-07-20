const Database = require('better-sqlite3');
const path = require('path');

// Tentukan path untuk database di dalam direktori proyek
const dbPath = path.join(process.cwd(), 'database.db');
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
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Migrasi skema plans: Tambah kolom baru jika belum ada
    try {
        const planCols = db.pragma('table_info(plans)');
        const hasPlanCol = (colName) => planCols.some(col => col.name === colName);

        if (!hasPlanCol('projectExpireDays')) {
            db.exec("ALTER TABLE plans ADD COLUMN projectExpireDays INTEGER DEFAULT 0");
            console.log("Migrated: Added 'projectExpireDays' column to plans.");
        }
        if (!hasPlanCol('maxPhotosPerProject')) {
            db.exec("ALTER TABLE plans ADD COLUMN maxPhotosPerProject INTEGER DEFAULT 0");
            console.log("Migrated: Added 'maxPhotosPerProject' column to plans.");
        }
        if (!hasPlanCol('activePeriodDays')) {
            db.exec("ALTER TABLE plans ADD COLUMN activePeriodDays INTEGER DEFAULT 30");
            console.log("Migrated: Added 'activePeriodDays' column to plans.");
        }
        if (!hasPlanCol('status')) {
            db.exec("ALTER TABLE plans ADD COLUMN status TEXT DEFAULT 'active'");
            console.log("Migrated: Added 'status' column to plans.");
        }
        if (!hasPlanCol('planType')) {
            db.exec("ALTER TABLE plans ADD COLUMN planType TEXT DEFAULT 'limit'");
            console.log("Migrated: Added 'planType' column to plans.");
        }
        if (!hasPlanCol('maxStorageMB')) {
            db.exec("ALTER TABLE plans ADD COLUMN maxStorageMB INTEGER DEFAULT 0");
            console.log("Migrated: Added 'maxStorageMB' column to plans.");
        }
    } catch (err) {
        console.error("Migration plans error:", err);
    }

    // Seed default plans if empty, or add Pro Storage plan
    try {
        const planCount = db.prepare("SELECT COUNT(*) as count FROM plans").get()?.count || 0;
        if (planCount === 0) {
            db.prepare("INSERT INTO plans (name, maxProjects, price, projectExpireDays, maxPhotosPerProject, activePeriodDays, status, planType, maxStorageMB) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run('Basic', 5, 0, 99999, 100, 30, 'active', 'limit', 0);
            db.prepare("INSERT INTO plans (name, maxProjects, price, projectExpireDays, maxPhotosPerProject, activePeriodDays, status, planType, maxStorageMB) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run('Pro', 20, 150000, 99999, 500, 30, 'active', 'limit', 0);
            db.prepare("INSERT INTO plans (name, maxProjects, price, projectExpireDays, maxPhotosPerProject, activePeriodDays, status, planType, maxStorageMB) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run('Pro Storage', 99999, 250000, 99999, 99999, 30, 'active', 'storage', 5000);
            console.log('Seeded default plans (Basic, Pro, Pro Storage).');
        } else {
            // Check if 'Pro Storage' exists
            const checkStoragePlan = db.prepare("SELECT id FROM plans WHERE name = 'Pro Storage'").get();
            if (!checkStoragePlan) {
                db.prepare("INSERT INTO plans (name, maxProjects, price, projectExpireDays, maxPhotosPerProject, activePeriodDays, status, planType, maxStorageMB) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run('Pro Storage', 99999, 250000, 99999, 99999, 30, 'active', 'storage', 5000);
                console.log("Seeded 'Pro Storage' plan.");
            }
        }
    } catch (err) {
        console.error("Seeding plans error:", err);
    }

    // Tabel untuk Vendor (Fotografer)
    db.exec(`
    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'vendor',
      maxProjects INTEGER DEFAULT 5,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Migrasi skema: Tambah kolom jika belum ada
    try {
        const columns = db.pragma('table_info(vendors)');
        const hasColumn = (colName) => columns.some(col => col.name === colName);

        if (!hasColumn('role')) {
            db.exec("ALTER TABLE vendors ADD COLUMN role TEXT DEFAULT 'vendor'");
            console.log("Migrated: Added 'role' column to vendors.");
        }
        if (!hasColumn('status')) {
            db.exec("ALTER TABLE vendors ADD COLUMN status TEXT DEFAULT 'active'");
            console.log("Migrated: Added 'status' column to vendors.");
        }
        if (!hasColumn('maxProjects')) {
            db.exec("ALTER TABLE vendors ADD COLUMN maxProjects INTEGER DEFAULT 5");
            console.log("Migrated: Added 'maxProjects' column to vendors.");
        }
        if (!hasColumn('planId')) {
            db.exec("ALTER TABLE vendors ADD COLUMN planId INTEGER REFERENCES plans(id)");
            console.log("Migrated: Added 'planId' column to vendors.");
        }
        if (!hasColumn('expiresAt')) {
            db.exec("ALTER TABLE vendors ADD COLUMN expiresAt TEXT");
            console.log("Migrated: Added 'expiresAt' column to vendors.");
        }
        if (!hasColumn('whatsapp')) {
            db.exec("ALTER TABLE vendors ADD COLUMN whatsapp TEXT");
            console.log("Migrated: Added 'whatsapp' column to vendors.");
        }
        if (!hasColumn('resetRequested')) {
            db.exec("ALTER TABLE vendors ADD COLUMN resetRequested INTEGER DEFAULT 0");
            console.log("Migrated: Added 'resetRequested' column to vendors.");
        }
        if (!hasColumn('brandName')) {
            db.exec("ALTER TABLE vendors ADD COLUMN brandName TEXT");
            console.log("Migrated: Added 'brandName' column to vendors.");
        }
        if (!hasColumn('brandLogo')) {
            db.exec("ALTER TABLE vendors ADD COLUMN brandLogo TEXT");
            console.log("Migrated: Added 'brandLogo' column to vendors.");
        }
        if (!hasColumn('additionalProjects')) {
            db.exec("ALTER TABLE vendors ADD COLUMN additionalProjects INTEGER DEFAULT 0");
            console.log("Migrated: Added 'additionalProjects' column to vendors.");
        }
        if (!hasColumn('additionalProjectsExpiresAt')) {
            db.exec("ALTER TABLE vendors ADD COLUMN additionalProjectsExpiresAt TEXT");
            console.log("Migrated: Added 'additionalProjectsExpiresAt' column to vendors.");
        }
        if (!hasColumn('additionalPhotosPerProject')) {
            db.exec("ALTER TABLE vendors ADD COLUMN additionalPhotosPerProject INTEGER DEFAULT 0");
            console.log("Migrated: Added 'additionalPhotosPerProject' column to vendors.");
        }
        if (!hasColumn('usedStorageBytes')) {
            db.exec("ALTER TABLE vendors ADD COLUMN usedStorageBytes INTEGER DEFAULT 0");
            console.log("Migrated: Added 'usedStorageBytes' column to vendors.");
        }
    } catch (err) {
        console.error("Migration error:", err);
    }

    // Migrasi skema proyek: Tambah kolom maxSelection jika belum ada
    try {
        const columns = db.pragma('table_info(projects)');
        const hasColumn = (colName) => columns.some(col => col.name === colName);

        if (!hasColumn('maxSelection')) {
            db.exec("ALTER TABLE projects ADD COLUMN maxSelection INTEGER DEFAULT 0");
            console.log("Migrated: Added 'maxSelection' column to projects.");
        }
        if (!hasColumn('expiresAt')) {
            db.exec("ALTER TABLE projects ADD COLUMN expiresAt TEXT");
            console.log("Migrated: Added 'expiresAt' column to projects.");
        }
        if (!hasColumn('filesDeleted')) {
            db.exec("ALTER TABLE projects ADD COLUMN filesDeleted INTEGER DEFAULT 0");
            console.log("Migrated: Added 'filesDeleted' column to projects.");
        }
        if (!hasColumn('folderUrl')) {
            db.exec("ALTER TABLE projects ADD COLUMN folderUrl TEXT");
            console.log("Migrated: Added 'folderUrl' column to projects.");
        }
        if (!hasColumn('galleryTheme')) {
            db.exec("ALTER TABLE projects ADD COLUMN galleryTheme TEXT DEFAULT 'default'");
            console.log("Migrated: Added 'galleryTheme' column to projects.");
        }
    } catch (err) {
        console.error("Migration projects error:", err);
    }

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

    // Tabel untuk Proyek/Galeri
    db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendorId INTEGER NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      status TEXT DEFAULT 'draft',
      folderUrl TEXT,
      galleryTheme TEXT DEFAULT 'default',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendorId) REFERENCES vendors (id)
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
      uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projectId) REFERENCES projects (id)
    )
  `);

    // Migrasi skema photos: Tambah kolom fileSizeBytes jika belum ada
    try {
        const photoCols = db.pragma('table_info(photos)');
        const hasPhotoCol = (colName) => photoCols.some(col => col.name === colName);

        if (!hasPhotoCol('fileSizeBytes')) {
            db.exec("ALTER TABLE photos ADD COLUMN fileSizeBytes INTEGER DEFAULT 0");
            console.log("Migrated: Added 'fileSizeBytes' column to photos.");
        }
    } catch (err) {
        console.error("Migration photos error:", err);
    }

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

    // Seed default saas settings if empty
    try {
        const checkSetting = db.prepare("SELECT key FROM saas_settings LIMIT 1").get();
        if (!checkSetting) {
            const insertStmt = db.prepare("INSERT INTO saas_settings (key, value) VALUES (?, ?)");
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
                db.prepare("INSERT INTO vendors (name, email, password, role, maxProjects) VALUES (?, ?, ?, 'admin', 999)").run(
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