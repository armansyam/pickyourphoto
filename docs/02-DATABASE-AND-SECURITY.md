# 🔒 02. Panduan Database & Strategi Keamanan (Pick Your Photo)

> **Dokumen Resmi Arsitektur Basis Data & Keamanan SaaS**  
> Lokasi: `docs/02-DATABASE-AND-SECURITY.md`  
> **Terakhir diperbarui:** 20 Agustus 2026 — *Sinkronisasi Penuh Berbasis Kode Sumber Aktif*

---

## 🗄️ 1. Skema Database SQLite (Aktual)

Database disimpan di: `data/database.db`  
Engine: `better-sqlite3` — WAL mode (`PRAGMA journal_mode = WAL;`) + foreign keys enabled + busy timeout 10 detik.

---

### Tabel `plans` — Paket Berlangganan Utama

```sql
CREATE TABLE plans (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  name                TEXT NOT NULL UNIQUE,
  maxProjects         INTEGER NOT NULL,       -- maks. proyek aktif vendor
  price               REAL DEFAULT 0,         -- harga dalam Rupiah
  activePeriodDays    INTEGER DEFAULT 30,     -- durasi aktif (30 hari)
  status              TEXT DEFAULT 'active',
  planType            TEXT DEFAULT 'limit',   -- 'limit'
  maxStorageMB        INTEGER DEFAULT 0,      -- Zero Storage Mode
  projectExpireDays   INTEGER DEFAULT 0,
  maxPhotosPerProject INTEGER DEFAULT 0,      -- 0 = Unlimited
  allowCustomLogo     INTEGER DEFAULT 0,      -- 1 = Pro & Business
  allowRawSelector    INTEGER DEFAULT 1,      -- 1 = Pro & Business
  createdAt           DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### Tabel `addon_plans` — Paket Add-On Storage Dinamis

```sql
CREATE TABLE addon_plans (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  planKey    TEXT NOT NULL UNIQUE,   -- 'addon-10gb', 'addon-25gb', 'addon-50gb'
  name       TEXT NOT NULL,          -- 'Add-On Storage 10 GB'
  quotaBytes INTEGER NOT NULL,       -- kapasitas dalam bytes
  price      REAL NOT NULL,          -- harga per bulan
  status     TEXT DEFAULT 'active',
  sortOrder  INTEGER DEFAULT 0,
  createdAt  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### Tabel `vendors` — Fotografer/Pelanggan SaaS

```sql
CREATE TABLE vendors (
  id                          INTEGER PRIMARY KEY AUTOINCREMENT,
  email                       TEXT NOT NULL UNIQUE,
  password                    TEXT NOT NULL,           -- bcrypt hash (10 rounds)
  name                        TEXT NOT NULL,
  role                        TEXT DEFAULT 'vendor',
  status                      TEXT DEFAULT 'active',   -- 'active'|'pending_payment'|'pending_manual'|'expired'|'expired_draft'|'suspended'|'rejected'
  maxProjects                 INTEGER DEFAULT 5,
  planId                      INTEGER REFERENCES plans(id),
  expiresAt                   TEXT,                    -- ISO8601 string
  whatsapp                    TEXT,
  paymentProof                TEXT,
  pendingAddonPlanId          TEXT,
  pendingAddonQuotaBytes      INTEGER DEFAULT 0,
  addonPlanId                 TEXT,
  addonStorageQuotaBytes      INTEGER DEFAULT 0,
  hasStorageAddon             INTEGER DEFAULT 0,
  usedStorageBytes            INTEGER DEFAULT 0,
  brandName                   TEXT,
  brandLogo                   TEXT,
  driveRootFolderId           TEXT,
  externalDriveConnected      INTEGER DEFAULT 0,
  externalDriveEmail          TEXT,
  externalDriveRefreshToken   TEXT,
  externalDriveFolderId       TEXT,
  activeStorageMode           TEXT DEFAULT 'byos',
  copyDelimiter               TEXT DEFAULT ', ',
  copyIncludeExt              INTEGER DEFAULT 0,
  copySortOrder               TEXT DEFAULT 'name_asc',
  archivedAt                  DATETIME,
  createdAt                   DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### Tabel `admins` — Akun Superadmin & Sub-Admin (Terisolasi)

```sql
CREATE TABLE admins (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  email     TEXT NOT NULL UNIQUE,
  password  TEXT NOT NULL,           -- bcrypt hash (10 rounds)
  name      TEXT NOT NULL,
  role      TEXT DEFAULT 'admin',    -- 'superadmin' | 'admin'
  isRoot    INTEGER DEFAULT 0,       -- 1 = Master Recovery Root Admin
  status    TEXT DEFAULT 'active',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### Tabel `projects` — Proyek/Galeri Foto

```sql
CREATE TABLE projects (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  vendorId     INTEGER NOT NULL REFERENCES vendors(id),
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  status       TEXT DEFAULT 'draft',      -- 'importing'|'pending_selection'|'selection_done'|'archived'|'failed'
  maxSelection INTEGER DEFAULT 0,
  expiresAt    TEXT,
  filesDeleted INTEGER DEFAULT 0,
  folderUrl    TEXT,
  galleryTheme TEXT DEFAULT 'default',
  createdAt    DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### Tabel `photos` — Metadata Foto (Zero-Storage Media Streaming)

```sql
CREATE TABLE photos (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  projectId       INTEGER NOT NULL REFERENCES projects(id),
  originalPath    TEXT NOT NULL,    -- /api/proxy/thumb/{fileId}/{name}?sz=w1200
  thumbnailPath   TEXT NOT NULL,    -- /api/proxy/thumb/{fileId}/{name}?sz=w400
  watermarkedPath TEXT NOT NULL,
  fileSizeBytes   INTEGER DEFAULT 0,
  category        TEXT DEFAULT '',
  googleFileId    TEXT,
  workerAccountId INTEGER,
  uploadedAt      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### Tabel `clients` & `selections` — Akses & Pilihan Klien

```sql
CREATE TABLE clients (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT NOT NULL,
  projectId   INTEGER NOT NULL REFERENCES projects(id),
  accessKey   TEXT NOT NULL UNIQUE, -- 32 hex char token unik
  clientPhone TEXT DEFAULT '',
  createdAt   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE selections (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  clientId  INTEGER NOT NULL REFERENCES clients(id),
  photoId   INTEGER NOT NULL REFERENCES photos(id),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (clientId, photoId)
);
```

---

### Tabel `storage_folders` & `storage_files` — Dedicated Cloud Storage Engine

```sql
CREATE TABLE storage_folders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  vendorId        INTEGER NOT NULL REFERENCES vendors(id),
  parentFolderId  TEXT NOT NULL,
  driveFolderId   TEXT NOT NULL UNIQUE,
  folderName      TEXT NOT NULL,
  webViewLink     TEXT,
  isExternalDrive INTEGER DEFAULT 0,
  createdAt       DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE storage_files (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  vendorId        INTEGER NOT NULL REFERENCES vendors(id),
  parentFolderId  TEXT NOT NULL,
  driveFileId     TEXT NOT NULL UNIQUE,
  fileName        TEXT NOT NULL,
  fileSizeBytes   INTEGER NOT NULL DEFAULT 0,
  mimeType        TEXT NOT NULL,
  fileCategory    TEXT DEFAULT 'media',
  webContentLink  TEXT,
  webViewLink     TEXT,
  isExternalDrive INTEGER DEFAULT 0,
  uploadedAt      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### Tabel `master_drive_accounts` — Multi-Account Storage Pool

```sql
CREATE TABLE master_drive_accounts (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  email            TEXT NOT NULL UNIQUE,
  role             TEXT DEFAULT 'worker', -- 'master_index' | 'worker'
  refreshToken     TEXT NOT NULL,
  accessToken      TEXT,
  totalLimitBytes  INTEGER DEFAULT 16106127360, -- 15 GB default
  usedStorageBytes INTEGER DEFAULT 0,
  status           TEXT DEFAULT 'active',       -- 'active' | 'full' | 'disabled'
  createdAt        DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### Tabel `payment_transactions` & `payment_sessions`

```sql
CREATE TABLE payment_transactions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  orderId         TEXT NOT NULL UNIQUE,
  vendorId        INTEGER NOT NULL,
  planId          INTEGER NOT NULL,
  amount          INTEGER NOT NULL,
  provider        TEXT NOT NULL,          -- 'midtrans' | 'xendit' | 'tripay' | 'duitku'
  status          TEXT NOT NULL DEFAULT 'pending',
  paymentUrl      TEXT,
  paymentType     TEXT,
  paymentMethod   TEXT DEFAULT 'qris',
  paymentProof    TEXT,
  addonPlanId     INTEGER,
  addonQuotaBytes INTEGER DEFAULT 0,
  transactionType TEXT DEFAULT 'plan',
  rawResponse     TEXT,
  createdAt       DATETIME DEFAULT CURRENT_TIMESTAMP,
  paidAt          DATETIME
);

CREATE TABLE payment_sessions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  orderId         TEXT NOT NULL UNIQUE,
  vendorId        INTEGER NOT NULL REFERENCES vendors(id),
  planId          INTEGER NOT NULL,
  amount          INTEGER NOT NULL,
  status          TEXT DEFAULT 'pending',
  paymentMethod   TEXT DEFAULT 'qris',
  qrUrl           TEXT DEFAULT '',
  expiresAt       DATETIME NOT NULL,
  addonPlanId     INTEGER,
  addonQuotaBytes INTEGER DEFAULT 0,
  transactionType TEXT DEFAULT 'plan',
  rawResponse     TEXT,
  createdAt       DATETIME DEFAULT CURRENT_TIMESTAMP,
  paidAt          DATETIME
);
```

---

### Tabel `system_settings` & `saas_settings`

```sql
CREATE TABLE system_settings (
  id                              INTEGER PRIMARY KEY CHECK (id = 1),
  enable_registration             INTEGER NOT NULL DEFAULT 1,
  enable_free_trial               INTEGER NOT NULL DEFAULT 1,
  max_vendor_quota                INTEGER DEFAULT NULL,
  disk_warning_threshold_percent  INTEGER NOT NULL DEFAULT 20,
  disk_critical_threshold_percent INTEGER NOT NULL DEFAULT 10,
  enable_auto_backup              INTEGER NOT NULL DEFAULT 0,
  backup_interval_hours           INTEGER NOT NULL DEFAULT 6,
  trial_expiration_hours          INTEGER NOT NULL DEFAULT 1,
  trial_expiration_minutes        INTEGER NOT NULL DEFAULT 30,
  enable_auto_purge               INTEGER NOT NULL DEFAULT 1,
  last_hard_purge_at              TEXT,
  updated_at                      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE saas_settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
```

---

## 🛡️ 2. Strategi Keamanan Sistem (Security Architecture)

### 1. Autentikasi JWT & Role Middleware Terisolasi (`lib/auth.js`)
- **Vendor:** JWT disimpan di cookie `token` (`httpOnly: true, sameSite: 'strict'`).
- **Admin:** JWT disimpan di cookie `adminToken` (`httpOnly: true`). Akun admin terisolasi sepenuhnya di tabel `admins`.
- **Master Recovery:** Jika data admin terkunci, kredensial `.env.local` (`ADMIN_EMAIL` + `ADMIN_PASSWORD`) berfungsi sebagai pemulihan darurat utama (*Root Master Admin*).

### 2. Proteksi SQL Injection Mutlak
- Seluruh kueri SQLite menggunakan *Prepared Statements* (`db.prepare(...)`) dengan parameter binding (`?`). Tidak ada string concatenation pada query SQL.

### 3. Hardened Version Endpoint (`/api/public/version`)
- Non-blocking asynchronous git info retriever.
- Mendeteksi build-time environment variable (`VERCEL_GIT_COMMIT_SHA`).
- Anti-Reconnaissance: Menghilangkan commit message internal dari respons publik.

### 4. Zero-Storage Proxy Stream (`/api/proxy/thumb/[fileId]`)
- Validasi ketat format Google Drive File ID: `/^[a-zA-Z0-9_-]{10,}$/`.
- Direct `ReadableStream` pipe tanpa menimbun RAM di server VPS.
- CDN Cache Header (7 hari browser, 30 hari edge CDN).

### 5. Auto-Cleanup Background Daemon (Setiap 60 Detik di `lib/db.js`)
- Expire sesi pembayaran QRIS yang melewati batas waktu.
- Soft-lock vendor kedaluwarsa dan arsip galeri terkait.
- Hard purge pembersihan file foto dari Google Drive storage pool setelah melewati masa tenggang 30 hari.
- Auto-delete draft registrasi gantung tanpa bukti bayar (>48 jam).
