const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Tentukan direktori data
const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// ── TRIAD DATABASE PATHS ──
const masterDbPath = path.join(dbDir, 'master.db');
const vendorDbPath = path.join(dbDir, 'vendor.db');
const trialDbPath = path.join(dbDir, 'trial.db');

let masterDb;
let vendorDb;
let trialDb;

function initTriadConnections() {
    if (globalThis._triadMasterDb && globalThis._triadVendorDb && globalThis._triadTrialDb) {
        masterDb = globalThis._triadMasterDb;
        vendorDb = globalThis._triadVendorDb;
        trialDb = globalThis._triadTrialDb;
        return;
    }

    masterDb = new Database(masterDbPath);
    vendorDb = new Database(vendorDbPath);
    trialDb = new Database(trialDbPath);

    const setupPragmas = (conn) => {
        try {
            conn.pragma('journal_mode = WAL');
            conn.pragma('synchronous = NORMAL');
            conn.pragma('busy_timeout = 10000');
            conn.pragma('temp_store = MEMORY');
            conn.pragma('foreign_keys = ON');
            conn.pragma('cache_size = -64000'); // 64 MB Fast RAM cache
            conn.pragma('mmap_size = 268435456'); // 256 MB Memory-Mapped I/O
        } catch (err) {}
    };

    setupPragmas(masterDb);
    setupPragmas(vendorDb);
    setupPragmas(trialDb);

    // Cross-attach for seamless schema lookups and cross-database queries
    try {
        masterDb.exec(`ATTACH DATABASE '${vendorDbPath}' AS vendor;`);
        masterDb.exec(`ATTACH DATABASE '${trialDbPath}' AS trial;`);
        vendorDb.exec(`ATTACH DATABASE '${masterDbPath}' AS master;`);
        trialDb.exec(`ATTACH DATABASE '${masterDbPath}' AS master;`);
    } catch (attachErr) {}

    if (process.env.NODE_ENV !== 'production') {
        globalThis._triadMasterDb = masterDb;
        globalThis._triadVendorDb = vendorDb;
        globalThis._triadTrialDb = trialDb;
    }
}

initTriadConnections();

const VENDOR_TABLES = [
    'projects', 'clients', 'photos', 'selections', 'storage_folders', 'storage_files',
    'daily_upload_logs', 'upload_queue'
];

const TRIAL_TABLES = [
    'trial_galleries'
];

function transformSql(sql) {
    if (!sql || typeof sql !== 'string') return sql || '';
    let transformed = sql;
    for (const t of VENDOR_TABLES) {
        const regex = new RegExp("\\b(?<![a-zA-Z0-9_.]|vendor\\.)" + t + "\\b", 'gi');
        transformed = transformed.replace(regex, 'vendor.' + t);
    }
    for (const t of TRIAL_TABLES) {
        const regex = new RegExp("\\b(?<![a-zA-Z0-9_.]|trial\\.)" + t + "\\b", 'gi');
        transformed = transformed.replace(regex, 'trial.' + t);
    }
    return transformed;
}

// ── UNIFIED DB PROXY ──
const db = {
    prepare(sql) {
        return masterDb.prepare(transformSql(sql));
    },
    exec(sql) {
        return masterDb.exec(transformSql(sql));
    },
    transaction(fn) {
        return masterDb.transaction(fn);
    },
    pragma(str) {
        return masterDb.pragma(str);
    },
    close() {
        try { masterDb.close(); } catch (_) {}
    },
    master: masterDb,
    vendor: vendorDb,
    trial: trialDb
};

// ══════════════════════════════════════════════════════════════
// 🛠️ DATABASE SCHEMA INITIALIZATION & SEEDING
// ══════════════════════════════════════════════════════════════
function initDb() {
    // 👑 1. SCHEMA MASTER DB (data/master.db) — ADMIN & SAAS
    masterDb.exec(`
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
      allowCustomLogo INTEGER NOT NULL DEFAULT 0,
      allowRawSelector INTEGER NOT NULL DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      isRoot INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

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
      copyDelimiter TEXT DEFAULT ', ',
      copyIncludeExt INTEGER DEFAULT 0,
      copySortOrder TEXT DEFAULT 'name_asc',
      archivedAt DATETIME,
      subdomain TEXT,
      subdomain_active INTEGER DEFAULT 0,
      subdomain_set_at DATETIME,
      custom_domain TEXT,
      custom_domain_verified INTEGER DEFAULT 0,
      city TEXT,
      address TEXT,
      studio_whatsapp TEXT,
      is_setup_completed INTEGER DEFAULT 0,
      hasStorageAddon INTEGER DEFAULT 0,
      addonStorageQuotaBytes INTEGER DEFAULT 0,
      addonPlanId INTEGER,
      externalDriveConnected INTEGER DEFAULT 0,
      externalDriveEmail TEXT,
      externalDriveRefreshToken TEXT,
      externalDriveFolderId TEXT,
      activeStorageMode TEXT DEFAULT 'byos',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS saas_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      enable_registration INTEGER NOT NULL DEFAULT 1,
      enable_free_trial INTEGER NOT NULL DEFAULT 1,
      max_vendor_quota INTEGER DEFAULT NULL,
      disk_warning_threshold_percent INTEGER NOT NULL DEFAULT 20,
      disk_critical_threshold_percent INTEGER NOT NULL DEFAULT 10,
      enable_auto_backup INTEGER NOT NULL DEFAULT 0,
      backup_interval_hours INTEGER NOT NULL DEFAULT 6,
      enable_flash_promo INTEGER NOT NULL DEFAULT 0,
      flash_promo_discount_percent INTEGER NOT NULL DEFAULT 20,
      flash_promo_ends_at TEXT,
      flash_promo_title TEXT DEFAULT 'FLASH SALE PROMO',
      flash_promo_banner_text TEXT DEFAULT 'Diskon Spesial Paket Berlangganan!',
      flash_promo_duration_hours INTEGER NOT NULL DEFAULT 24,
      flash_promo_type TEXT DEFAULT 'percent',
      flash_bundle_plan_id INTEGER,
      flash_bundle_addon_name TEXT DEFAULT 'Gratis +2 Extra Sub-Event Link',
      flash_bundle_addon_type TEXT DEFAULT 'sub_event',
      flash_bundle_addon_value INTEGER DEFAULT 2,
      flash_bundle_anchor_price REAL DEFAULT 199000,
      trial_expiration_hours INTEGER NOT NULL DEFAULT 1,
      trial_expiration_minutes INTEGER NOT NULL DEFAULT 30,
      enable_auto_purge INTEGER NOT NULL DEFAULT 1,
      last_hard_purge_at TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subscription_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendorId INTEGER NOT NULL,
      planId INTEGER NOT NULL,
      proratedPrice REAL NOT NULL,
      transferProof TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendorId) REFERENCES vendors (id),
      FOREIGN KEY (planId) REFERENCES plans (id)
    );

    CREATE TABLE IF NOT EXISTS subdomain_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendorId INTEGER NOT NULL,
      oldSubdomain TEXT NOT NULL,
      newSubdomain TEXT NOT NULL,
      changedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      expiresAt DATETIME,
      FOREIGN KEY (vendorId) REFERENCES vendors (id)
    );

    CREATE TABLE IF NOT EXISTS custom_domains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendorId INTEGER NOT NULL,
      domain TEXT NOT NULL UNIQUE,
      verified INTEGER DEFAULT 0,
      verifyToken TEXT,
      verifiedAt DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendorId) REFERENCES vendors (id)
    );

    CREATE TABLE IF NOT EXISTS master_drive_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      role TEXT DEFAULT 'worker',
      refreshToken TEXT NOT NULL,
      accessToken TEXT,
      totalLimitBytes INTEGER DEFAULT 16106127360,
      usedStorageBytes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS addon_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      planKey TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      quotaBytes INTEGER NOT NULL,
      price REAL NOT NULL,
      status TEXT DEFAULT 'active',
      sortOrder INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS storage_addon_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendorId INTEGER NOT NULL,
      addonPlanId INTEGER NOT NULL,
      price REAL NOT NULL,
      proratedPrice REAL NOT NULL,
      status TEXT DEFAULT 'active',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendorId) REFERENCES vendors (id),
      FOREIGN KEY (addonPlanId) REFERENCES addon_plans (id)
    );

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
    );

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
    );
  `);

    // Master indexes
    masterDb.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_email ON vendors(email);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_subdomain ON vendors(subdomain) WHERE subdomain IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_custom_domain ON vendors(custom_domain) WHERE custom_domain IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_vendors_status_role ON vendors (status, role);
    CREATE INDEX IF NOT EXISTS idx_subscription_requests_vendorId ON subscription_requests (vendorId);
    CREATE INDEX IF NOT EXISTS idx_master_drive_accounts_role ON master_drive_accounts (role);
    CREATE INDEX IF NOT EXISTS idx_addon_plans_status ON addon_plans (status);
    CREATE INDEX IF NOT EXISTS idx_payment_transactions_orderId ON payment_transactions (orderId);
    CREATE INDEX IF NOT EXISTS idx_payment_transactions_vendorId ON payment_transactions (vendorId);
    CREATE INDEX IF NOT EXISTS idx_payment_sessions_orderId ON payment_sessions (orderId);
    CREATE INDEX IF NOT EXISTS idx_payment_sessions_vendorId ON payment_sessions (vendorId);
  `);

    // 📸 2. SCHEMA VENDOR DB (data/vendor.db) — GALERI & FOTO VENDOR
    vendorDb.exec(`
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
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      projectId INTEGER NOT NULL,
      accessKey TEXT NOT NULL UNIQUE,
      clientPhone TEXT DEFAULT '',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projectId) REFERENCES projects (id)
    );

    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projectId INTEGER NOT NULL,
      originalPath TEXT NOT NULL,
      thumbnailPath TEXT NOT NULL,
      watermarkedPath TEXT NOT NULL,
      fileSizeBytes INTEGER DEFAULT 0,
      category TEXT DEFAULT '',
      googleFileId TEXT,
      workerAccountId INTEGER,
      uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projectId) REFERENCES projects (id)
    );

    CREATE TABLE IF NOT EXISTS selections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      photoId INTEGER NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clientId) REFERENCES clients (id),
      FOREIGN KEY (photoId) REFERENCES photos (id),
      UNIQUE (clientId, photoId)
    );

    CREATE TABLE IF NOT EXISTS storage_folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendorId INTEGER NOT NULL,
      folderName TEXT NOT NULL,
      driveFolderId TEXT NOT NULL UNIQUE,
      parentFolderId TEXT,
      folderPath TEXT,
      webViewLink TEXT,
      isExternalDrive INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS storage_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendorId INTEGER NOT NULL,
      parentFolderId TEXT NOT NULL,
      driveFileId TEXT NOT NULL UNIQUE,
      fileName TEXT NOT NULL,
      fileSizeBytes INTEGER NOT NULL DEFAULT 0,
      mimeType TEXT NOT NULL,
      fileCategory TEXT DEFAULT 'media',
      webContentLink TEXT,
      webViewLink TEXT,
      isExternalDrive INTEGER DEFAULT 0,
      uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS daily_upload_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendorId INTEGER NOT NULL,
      logDate TEXT NOT NULL,
      uploadedBytes INTEGER DEFAULT 0,
      uploadedCount INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (vendorId, logDate)
    );

    CREATE TABLE IF NOT EXISTS upload_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendorId INTEGER NOT NULL,
      clientFileName TEXT NOT NULL,
      fileSizeBytes INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      uploadedBytes INTEGER DEFAULT 0,
      retryCount INTEGER DEFAULT 0,
      errorMessage TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

    // Vendor indexes
    vendorDb.exec(`
    CREATE INDEX IF NOT EXISTS idx_projects_vendorId ON projects (vendorId);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_slug ON projects (slug);
    CREATE INDEX IF NOT EXISTS idx_projects_status ON projects (status);
    CREATE INDEX IF NOT EXISTS idx_photos_projectId ON photos (projectId);
    CREATE INDEX IF NOT EXISTS idx_clients_projectId ON clients (projectId);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_accessKey ON clients (accessKey);
    CREATE INDEX IF NOT EXISTS idx_selections_clientId ON selections (clientId);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_selections_client_photo ON selections (clientId, photoId);
    CREATE INDEX IF NOT EXISTS idx_storage_folders_vendorId ON storage_folders (vendorId);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_storage_folders_driveFolderId ON storage_folders (driveFolderId);
    CREATE INDEX IF NOT EXISTS idx_storage_files_vendorId ON storage_files (vendorId);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_storage_files_driveFileId ON storage_files (driveFileId);
  `);

    // 🧪 3. SCHEMA TRIAL DB (data/trial.db) — SANDBOX UJI COBA PUBLIK
    trialDb.exec(`
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
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_trial_galleries_slug ON trial_galleries (slug);
    CREATE INDEX IF NOT EXISTS idx_trial_galleries_expiresAt ON trial_galleries (expiresAt);
    CREATE INDEX IF NOT EXISTS idx_trial_galleries_createdAt ON trial_galleries (createdAt);
  `);

    // ── SEEDING DEFAULT MASTER VALUES ──
    try {
        masterDb.prepare(`
            INSERT OR IGNORE INTO system_settings (
                id, enable_registration, enable_free_trial, max_vendor_quota, 
                disk_warning_threshold_percent, disk_critical_threshold_percent, 
                enable_auto_backup, backup_interval_hours, enable_flash_promo,
                flash_promo_discount_percent, flash_promo_title, flash_promo_banner_text,
                flash_promo_duration_hours, flash_promo_type, flash_bundle_addon_name,
                flash_bundle_addon_type, flash_bundle_addon_value, flash_bundle_anchor_price
            ) 
            VALUES (1, 1, 1, NULL, 20, 10, 0, 6, 0, 20, 'FLASH SALE PROMO', 'Diskon Spesial Paket Berlangganan!', 24, 'percent', 'Gratis +2 Extra Sub-Event Link', 'sub_event', 2, 199000)
        `).run();
    } catch (_) {}

    // Seed default plans if empty
    try {
        const checkPlans = masterDb.prepare("SELECT count(*) as count FROM plans").get();
        if (!checkPlans || checkPlans.count === 0) {
            const insertPlan = masterDb.prepare(`
                INSERT INTO plans (name, maxProjects, price, projectExpireDays, maxPhotosPerProject, activePeriodDays, status, planType, maxStorageMB, allowCustomLogo, allowRawSelector) 
                VALUES (?, ?, ?, 0, 0, ?, 'active', 'limit', 0, ?, ?)
            `);
            insertPlan.run('Starter Plan', 5, 49000, 30, 0, 0);
            insertPlan.run('Pro Studio Plan', 20, 129000, 30, 1, 0);
            insertPlan.run('Business Studio Plan', 60, 249000, 30, 1, 1);
        }
    } catch (_) {}

    // Seed default addon_plans if empty
    try {
        const checkAddon = masterDb.prepare("SELECT count(*) as count FROM addon_plans").get();
        if (!checkAddon || checkAddon.count === 0) {
            const insertAddon = masterDb.prepare(`
                INSERT OR IGNORE INTO addon_plans (planKey, name, quotaBytes, price, status, sortOrder)
                VALUES (?, ?, ?, ?, 'active', ?)
            `);
            insertAddon.run('addon-10gb', 'Add-On Storage 10 GB', 10737418240, 29000, 1);
            insertAddon.run('addon-25gb', 'Add-On Storage 25 GB', 26843545600, 49000, 2);
            insertAddon.run('addon-50gb', 'Add-On Storage 50 GB', 53687091200, 89000, 3);
        }
    } catch (_) {}

    // Seed default saas_settings
    try {
        const checkSetting = masterDb.prepare("SELECT key FROM saas_settings LIMIT 1").get();
        if (!checkSetting) {
            const insertStmt = masterDb.prepare("INSERT OR IGNORE INTO saas_settings (key, value) VALUES (?, ?)");
            insertStmt.run('bank_name', 'BCA (Bank Central Asia)');
            insertStmt.run('bank_account_number', '1234-5678-90');
            insertStmt.run('bank_account_name', 'PT Pick Your Photo');
            insertStmt.run('contact_email', 'support@pickyourphoto.com');
            insertStmt.run('contact_whatsapp', '6281234567890');
            insertStmt.run('raw_sorter_trial_limit', '5');
            insertStmt.run('trial_max_selection', '10');
            insertStmt.run('trial_max_photos', '50');
            insertStmt.run('trial_max_subfolders', '1');
            insertStmt.run('grace_period_days', '7');
        }
    } catch (_) {}

    // Self-healing columns for vendors
    try { masterDb.exec("ALTER TABLE vendors ADD COLUMN city TEXT;"); } catch (_) {}
    try { masterDb.exec("ALTER TABLE vendors ADD COLUMN address TEXT;"); } catch (_) {}
    try { masterDb.exec("ALTER TABLE vendors ADD COLUMN studio_whatsapp TEXT;"); } catch (_) {}
    try { masterDb.exec("ALTER TABLE vendors ADD COLUMN is_setup_completed INTEGER DEFAULT 0;"); } catch (_) {}

    // Seed/Sync Master Root Admin from .env.local
    try {
        let adminEmail = process.env.ADMIN_EMAIL;
        let adminPass = process.env.ADMIN_PASSWORD;

        if (!adminEmail || !adminPass) {
            try {
                const envLocalPath = path.join(process.cwd(), '.env.local');
                const envPath = path.join(process.cwd(), '.env');
                const targetEnv = fs.existsSync(envLocalPath) ? envLocalPath : (fs.existsSync(envPath) ? envPath : null);
                if (targetEnv) {
                    const envContent = fs.readFileSync(targetEnv, 'utf8');
                    envContent.split('\n').forEach(line => {
                        const trimmed = line.trim();
                        if (trimmed && !trimmed.startsWith('#')) {
                            const [k, ...v] = trimmed.split('=');
                            const key = k ? k.trim() : '';
                            const val = v ? v.join('=').trim().replace(/^["']|["']$/g, '') : '';
                            if (key === 'ADMIN_EMAIL' && !adminEmail) adminEmail = val;
                            if (key === 'ADMIN_PASSWORD' && !adminPass) adminPass = val;
                        }
                    });
                }
            } catch (_) {}
        }

        if (adminEmail && adminPass) {
            const cleanEnvEmail = adminEmail.toLowerCase().trim();
            const mainAdmin = masterDb.prepare("SELECT id, email, password FROM admins WHERE isRoot = 1 OR id = 1 ORDER BY id ASC LIMIT 1").get();

            if (!mainAdmin) {
                const hashedPassword = bcrypt.hashSync(adminPass, 10);
                masterDb.prepare("INSERT INTO admins (name, email, password, role, isRoot, status) VALUES ('System Owner', ?, ?, 'admin', 1, 'active')").run(
                    cleanEnvEmail,
                    hashedPassword
                );
            } else {
                const isEmailDiff = mainAdmin.email !== cleanEnvEmail;
                const isPassDiff = !bcrypt.compareSync(adminPass, mainAdmin.password);

                if (isEmailDiff || isPassDiff) {
                    const hashedPassword = bcrypt.hashSync(adminPass, 10);
                    masterDb.prepare("UPDATE admins SET email = ?, password = ?, isRoot = 1 WHERE id = ?").run(
                        cleanEnvEmail,
                        hashedPassword,
                        mainAdmin.id
                    );
                }
            }
        }
    } catch (adminErr) {
        console.error("Seeding admin error:", adminErr);
    }
}

// 1. Inisialisasi skema tabel database (Selalu dijalankan agar tabel selalu siap, baik saat build maupun runtime)
initDb();

// 2. Background Auto-Cleanup Worker (Hanya dijalankan saat server runtime aktif, bukan saat build agar proses build tidak tertahan)
if (process.env.NEXT_PHASE !== 'phase-production-build') {
    setInterval(async () => {
        try {
            // 1. Cleanup expired payment sessions
            db.prepare("UPDATE payment_sessions SET status = 'expired' WHERE status = 'pending' AND datetime(expiresAt) <= datetime('now')").run();

            // 2. Soft-lock expired projects
            db.prepare("UPDATE projects SET status = 'expired' WHERE status = 'active' AND expiresAt IS NOT NULL AND datetime(expiresAt) <= datetime('now')").run();

            // 3. Cleanup expired trial galleries (> 24 hours)
            db.prepare("DELETE FROM trial_galleries WHERE datetime(expiresAt) <= datetime('now', '-24 hours')").run();

            // 4. Check & run hard purge for vendors expired > grace_period_days
            try {
                const sysSettings = masterDb.prepare("SELECT enable_auto_purge, last_hard_purge_at FROM system_settings WHERE id = 1").get();
                if (sysSettings && (sysSettings.enable_auto_purge === 1 || sysSettings.enable_auto_purge === true)) {
                    const lastPurge = sysSettings.last_hard_purge_at ? new Date(sysSettings.last_hard_purge_at).getTime() : 0;
                    const now = Date.now();
                    const oneDayMs = 24 * 60 * 60 * 1000;

                    if (now - lastPurge > oneDayMs) {
                        const settingRow = masterDb.prepare("SELECT value FROM saas_settings WHERE key = 'grace_period_days'").get();
                        const graceDays = parseInt(settingRow?.value || '7', 10);
                        const graceMs = graceDays * 24 * 60 * 60 * 1000;

                        const vendorsToCheck = masterDb.prepare("SELECT id, email, expiresAt, status FROM vendors WHERE role = 'vendor' AND status != 'suspended' AND expiresAt IS NOT NULL").all();
                        const vendorsToPurge = vendorsToCheck.filter(v => {
                            const expTime = new Date(v.expiresAt).getTime();
                            return expTime > 0 && (now - expTime) > graceMs;
                        });

                        if (vendorsToPurge.length > 0) {
                            for (const vendor of vendorsToPurge) {
                                try {
                                    db.prepare('DELETE FROM selections WHERE clientId IN (SELECT id FROM clients WHERE projectId IN (SELECT id FROM projects WHERE vendorId = ?))').run(vendor.id);
                                    db.prepare('DELETE FROM photos WHERE projectId IN (SELECT id FROM projects WHERE vendorId = ?)').run(vendor.id);
                                    db.prepare('DELETE FROM clients WHERE projectId IN (SELECT id FROM projects WHERE vendorId = ?)').run(vendor.id);
                                    db.prepare('DELETE FROM projects WHERE vendorId = ?').run(vendor.id);
                                    db.prepare('DELETE FROM storage_files WHERE vendorId = ?').run(vendor.id);
                                    db.prepare('DELETE FROM storage_folders WHERE vendorId = ?').run(vendor.id);
                                    masterDb.prepare("UPDATE vendors SET status = 'suspended', usedStorageBytes = 0 WHERE id = ?").run(vendor.id);
                                } catch (vErr) {
                                    console.error(`[Auto Purge] Failed purging vendor ${vendor.id}:`, vErr.message);
                                }
                            }
                        }
                        masterDb.prepare("UPDATE system_settings SET last_hard_purge_at = datetime('now') WHERE id = 1").run();
                    }
                }
            } catch (_) {}

            // 5. Periodic database index optimization sweep
            try {
                masterDb.pragma('optimize');
                vendorDb.pragma('optimize');
                trialDb.pragma('optimize');
            } catch (_) {}
        } catch (cleanupErr) {
            console.error('[DB Cleanup Error]:', cleanupErr.message);
        }
    }, 60 * 1000);
}

module.exports = db;
module.exports.masterDb = masterDb;
module.exports.vendorDb = vendorDb;
module.exports.trialDb = trialDb;
module.exports.db = db;
module.exports.default = db;