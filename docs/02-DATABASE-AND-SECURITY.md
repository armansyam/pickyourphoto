# 🔒 02. Panduan Database & Strategi Keamanan (Pick Your Photo)

> **Dokumen Resmi Arsitektur Basis Data & Keamanan SaaS**  
> Lokasi: `docs/02-DATABASE-AND-SECURITY.md`  
> **Terakhir diperbarui:** 10 Agustus 2026 — *Sinkronisasi pasca-audit: Tambah tabel `payment_transactions`, `payment_sessions`, `addon_plans`, `master_drive_accounts` & kolom baru `subscription_requests`*

---

## 🗄️ 1. Skema Database SQLite (Aktual)

Database disimpan di: `data/database.db`  
Engine: `better-sqlite3` — WAL mode + busy_timeout 10 detik.

---

### Tabel `plans` — Paket Berlangganan

```sql
CREATE TABLE plans (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  name                 TEXT NOT NULL UNIQUE,
  maxProjects          INTEGER NOT NULL,       -- maks. proyek aktif vendor
  price                REAL DEFAULT 0,         -- harga dalam Rupiah
  activePeriodDays     INTEGER DEFAULT 30,     -- durasi aktif (semua = 30 hari)
  status               TEXT DEFAULT 'active',
  planType             TEXT DEFAULT 'limit',   -- selalu 'limit' (bukan storage)
  maxStorageMB         INTEGER DEFAULT 0,      -- LEGACY, selalu 0 (tidak dipakai)
  projectExpireDays    INTEGER DEFAULT 0,      -- LEGACY, selalu 0 (tidak dipakai)
  maxPhotosPerProject  INTEGER DEFAULT 0,      -- 0 = Unlimited
  allowCustomLogo      INTEGER DEFAULT 0,      -- 1 = Pro & Business
  allowRawSelector     INTEGER DEFAULT 1,      -- 1 = Pro & Business
  createdAt            DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

**Data default 3 paket aktif:**

| id | name | maxProjects | price | activePeriodDays | allowCustomLogo | allowRawSelector |
|---|---|---|---|---|---|---|
| 1 | Starter Plan | 5 | 49000 | 30 | 0 | 0 |
| 2 | Pro Studio Plan | 20 | 129000 | 30 | 1 | 1 |
| 3 | Business Studio Plan | 50 | 249000 | 30 | 1 | 1 |

---

### Tabel `addon_plans` — Paket Add-On Storage

```sql
CREATE TABLE addon_plans (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  planId           TEXT NOT NULL UNIQUE,   -- e.g. 'addon-10gb', 'addon-25gb', 'addon-50gb'
  name             TEXT NOT NULL,          -- nama tampilan (e.g. 'Drive 10 GB')
  quotaBytes       INTEGER NOT NULL,       -- kapasitas dalam bytes
  price            REAL NOT NULL,          -- harga dalam Rupiah / bulan
  status           TEXT DEFAULT 'active',  -- 'active' | 'inactive'
  createdAt        DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

**Data default 3 paket Add-On aktif:**

| planId | name | quotaBytes | price |
|---|---|---|---|
| `addon-10gb` | Drive 10 GB | 10737418240 | 29000 |
| `addon-25gb` | Drive 25 GB | 26843545600 | 49000 |
| `addon-50gb` | Drive 50 GB | 53687091200 | 89000 |

> **Custom Enterprise (50–200 GB):** Tidak di-seed sebagai baris tetap — dikalkulasi dinamis di `app/api/payment/addon/create` dengan harga Rp 1.250/GB.

---

### Tabel `vendors` — Fotografer/Pengguna

```sql
CREATE TABLE vendors (
  id                          INTEGER PRIMARY KEY AUTOINCREMENT,
  email                       TEXT NOT NULL UNIQUE,
  password                    TEXT NOT NULL,           -- bcrypt hash
  name                        TEXT NOT NULL,
  role                        TEXT DEFAULT 'vendor',   -- 'vendor'
  status                      TEXT DEFAULT 'active',   -- 'active'|'pending_payment'|'pending_manual'|'expired_draft'|'suspended'
  maxProjects                 INTEGER DEFAULT 5,
  planId                      INTEGER REFERENCES plans(id),
  expiresAt                   TEXT,                    -- ISO8601, masa aktif berlangganan
  whatsapp                    TEXT,
  paymentProof                TEXT,                    -- path bukti transfer
  pendingAddonPlanId          TEXT,                    -- plan id addon yang diajukan (misal: addon-25gb)
  pendingAddonQuotaBytes      INTEGER DEFAULT 0,       -- kuota bytes addon yang diajukan
  addonPlanId                 TEXT,                    -- plan id addon aktif
  addonStorageQuotaBytes      INTEGER DEFAULT 0,       -- kuota bytes addon aktif
  resetRequested              INTEGER DEFAULT 0,
  brandName                   TEXT,
  brandLogo                   TEXT,                    -- path logo studio
  additionalProjects          INTEGER DEFAULT 0,
  additionalProjectsExpiresAt TEXT,
  additionalPhotosPerProject  INTEGER DEFAULT 0,
  usedStorageBytes            INTEGER DEFAULT 0,       -- ukuran byte foto proyek terpakai
  copyDelimiter               TEXT DEFAULT ', ',       -- pemisah nama file salin
  copyIncludeExt              INTEGER DEFAULT 0,       -- 1 = sertakan ekstensi
  copySortOrder               TEXT DEFAULT 'name_asc', -- urutan salin nama file
  archivedAt                  DATETIME,
  createdAt                   DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

---

### Tabel `admins` — Akun Superadmin & Sub-Admin

```sql
CREATE TABLE admins (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL UNIQUE,
  password   TEXT NOT NULL,           -- bcrypt hash
  name       TEXT NOT NULL,
  role       TEXT DEFAULT 'admin',    -- 'superadmin' | 'admin'
  status     TEXT DEFAULT 'active',   -- 'active' | 'inactive'
  createdAt  DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

> **Hierarki:** `superadmin` — pemilik platform, dibuat via `ADMIN_EMAIL` + `ADMIN_PASSWORD` di `.env.local`. `admin` — Sub-Admin yang ditambahkan via Admin Panel → Sub-Admin Team.

---

### Tabel `projects` — Proyek/Galeri Foto

```sql
CREATE TABLE projects (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  vendorId     INTEGER NOT NULL REFERENCES vendors(id),
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,      -- URL-friendly identifier
  status       TEXT DEFAULT 'draft',      -- lihat status lifecycle di bawah
  maxSelection INTEGER DEFAULT 0,         -- 0 = unlimited seleksi
  expiresAt    TEXT,                      -- kapan galeri expired
  filesDeleted INTEGER DEFAULT 0,
  folderUrl    TEXT,                       -- URL folder Google Drive asal
  galleryTheme TEXT DEFAULT 'default',
  createdAt    DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

**Lifecycle status `projects`:**

```
importing → pending_selection → selection_done
                              → archived
failed
```

| Status | Artinya |
|---|---|
| `importing` | Sedang fetch metadata dari Google Drive API |
| `pending_selection` | Siap dibuka klien untuk seleksi |
| `selection_done` | Klien sudah selesai memilih foto |
| `archived` | Galeri diarsipkan (expired atau manual) |
| `failed` | Import gagal |

---

### Tabel `photos` — Metadata Foto (Zero-Storage)

```sql
CREATE TABLE photos (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  projectId       INTEGER NOT NULL REFERENCES projects(id),
  originalPath    TEXT NOT NULL,    -- /api/proxy/thumb/{fileId}/{name}?sz=w1200
  thumbnailPath   TEXT NOT NULL,    -- /api/proxy/thumb/{fileId}/{name}?sz=w400
  watermarkedPath TEXT NOT NULL,    -- sama dengan originalPath (belum watermark)
  fileSizeBytes   INTEGER DEFAULT 0, -- selalu 0 (zero-storage)
  category        TEXT DEFAULT '',   -- nama subfolder Google Drive (path kategori)
  uploadedAt      DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

> ⚠️ **Tidak ada file foto di server.** `originalPath` dan `thumbnailPath` adalah URL ke proxy route internal yang meneruskan request ke Google CDN.

---

### Tabel `clients` — Akses Klien

```sql
CREATE TABLE clients (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT NOT NULL,        -- default 'client@example.com'
  projectId   INTEGER NOT NULL REFERENCES projects(id),
  accessKey   TEXT NOT NULL UNIQUE, -- 32 hex char random token
  clientPhone TEXT DEFAULT '',
  createdAt   DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

---

### Tabel `selections` — Foto Terpilih Klien

```sql
CREATE TABLE selections (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  clientId  INTEGER NOT NULL REFERENCES clients(id),
  photoId   INTEGER NOT NULL REFERENCES photos(id),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (clientId, photoId)          -- satu klien tidak bisa pilih foto yang sama 2x
)
```

---

### Tabel `subscription_requests` — Permintaan Upgrade/Perpanjangan Manual

```sql
CREATE TABLE subscription_requests (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  vendorId      INTEGER NOT NULL REFERENCES vendors(id),
  planId        INTEGER NOT NULL REFERENCES plans(id),
  addonPlanId   TEXT DEFAULT NULL,     -- ID Add-On Storage yang diajukan bersamaan (opsional)
  requestType   TEXT DEFAULT 'plan',   -- 'plan' | 'addon' | 'plan_addon'
  proratedPrice REAL NOT NULL,
  transferProof TEXT NOT NULL,         -- path file bukti transfer
  status        TEXT DEFAULT 'pending', -- 'pending'|'approved'|'rejected'
  createdAt     DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

> **Kolom `addonPlanId` dan `requestType`** ditambahkan dalam audit 09 Agustus 2026 (Bug #9): sebelumnya permintaan upgrade bundel Plan+Add-On tidak menyimpan `addonPlanId`, sehingga kuota Add-On tidak teraktivasi saat Admin approve.

---

### Tabel `payment_transactions` — Log Semua Transaksi Payment Gateway

```sql
CREATE TABLE payment_transactions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  orderId         TEXT NOT NULL UNIQUE,   -- ORDER-{timestamp}-{vendorId}-{random}
  vendorId        INTEGER NOT NULL,
  planId          INTEGER NOT NULL,
  addonPlanId     TEXT DEFAULT NULL,      -- ID Add-On Storage (jika bundel)
  addonQuotaBytes INTEGER DEFAULT 0,      -- kuota Add-On dalam bytes
  transactionType TEXT DEFAULT 'plan',    -- 'plan' | 'addon' | 'plan_addon'
  amount          REAL NOT NULL,
  provider        TEXT NOT NULL,          -- 'midtrans' | 'xendit' | 'tripay' | 'duitku'
  status          TEXT DEFAULT 'pending', -- 'pending'|'paid'|'expired'|'failed'|'cancelled'
  paymentUrl      TEXT,
  rawResponse     TEXT,                   -- JSON response mentah dari provider
  paidAt          DATETIME,
  createdAt       DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

---

### Tabel `payment_sessions` — Sesi QRIS Aktif

```sql
CREATE TABLE payment_sessions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  orderId         TEXT NOT NULL UNIQUE,
  vendorId        INTEGER NOT NULL,
  planId          INTEGER NOT NULL,
  addonPlanId     TEXT DEFAULT NULL,      -- ID Add-On Storage (jika bundel)
  addonQuotaBytes INTEGER DEFAULT 0,      -- kuota Add-On dalam bytes
  transactionType TEXT DEFAULT 'plan',    -- 'plan' | 'addon' | 'plan_addon'
  amount          REAL NOT NULL,
  status          TEXT DEFAULT 'pending', -- 'pending'|'paid'|'expired'|'replaced'|'cancelled'
  paymentMethod   TEXT DEFAULT 'qris',
  qrUrl           TEXT,                   -- URL gambar QR code / redirect Snap
  expiresAt       TEXT,                   -- ISO8601 waktu kedaluwarsa QRIS
  rawResponse     TEXT,
  paidAt          DATETIME,
  createdAt       DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

---

### Tabel `master_drive_accounts` — Akun Google Drive Pool (BYOS)

```sql
CREATE TABLE master_drive_accounts (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT NOT NULL,          -- nama label akun (e.g. 'Worker Account A')
  role              TEXT DEFAULT 'worker',  -- 'master' | 'worker'
  email             TEXT,                   -- email akun Google Drive
  clientId          TEXT,                   -- Google OAuth Client ID
  clientSecret      TEXT,                   -- Google OAuth Client Secret
  refreshToken      TEXT,                   -- OAuth Refresh Token
  accessToken       TEXT,                   -- OAuth Access Token (auto-refresh)
  rootFolderId      TEXT,                   -- ID folder root vendor di akun ini
  totalLimitBytes   INTEGER DEFAULT 0,      -- total kapasitas akun (bytes)
  usedStorageBytes  INTEGER DEFAULT 0,      -- storage terpakai di akun ini (bytes)
  status            TEXT DEFAULT 'active',  -- 'active' | 'disabled'
  createdAt         DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

---

### Tabel `saas_settings` — Konfigurasi Platform

```sql
CREATE TABLE saas_settings (
  key   TEXT PRIMARY KEY,
  value TEXT
)
```

**Keys yang tersedia:**

| Key | Deskripsi |
|---|---|
| `bank_name` | Nama bank untuk transfer |
| `bank_account_number` | Nomor rekening |
| `bank_account_name` | Nama pemilik rekening |
| `contact_email` | Email support |
| `contact_whatsapp` | Nomor WA admin (format 62xxx) |
| `google_client_id` | Google OAuth Client ID |
| `google_client_secret` | Google OAuth Client Secret |
| `google_refresh_token` | Google OAuth Refresh Token (Master Index) |
| `google_access_token` | Access token aktif (auto-refresh) |
| `current_master_cluster_id` | ID Folder Master Cluster aktif di Google Drive |
| `current_master_cluster_count` | Jumlah folder vendor dalam cluster aktif |
| `master_cluster_name` | Nama dinamis folder Master Cluster |
| `master_parent_folder_id` | ID Folder Induk Wadah Master di Google Drive (default: `root`) |
| `vendor_folder_naming_template` | Format templat nama folder vendor |
| `custom_storage_price_per_gb` | Tarif per GB paket storage custom (default: `1250`) |
| `worker_storage_warning_threshold_gb` | Batas peringatan sisa ruang worker (default: `2` GB) |
| `max_upload_concurrency_threads` | Batas dasar jalur thread unggah paralel per vendor (default: `4`) |
| `smtp_host` / `smtp_port` | Konfigurasi SMTP email |
| `smtp_user` / `smtp_pass` | Kredensial SMTP |
| `smtp_enable` | `'true'` / `'false'` |
| `trial_max_selection` | Maks. foto boleh dipilih di trial |
| `trial_max_photos` | Maks. foto tampil di trial galeri |
| `trial_max_subfolders` | Maks. subfolder di trial |
| `raw_sorter_trial_limit` | Maks. file di RAW sorter trial |
| `enable_payment_gateway` | `'1'` = aktif, `'0'` = nonaktif |
| `payment_gateway_provider` | `'midtrans'` / `'xendit'` / `'tripay'` / `'duitku'` |
| `payment_gateway_server_key` | Server key / API key provider |
| `payment_gateway_client_key` | Client key (untuk Midtrans Snap embed) |
| `payment_gateway_merchant_code` | Merchant code (untuk Duitku) |
| `payment_gateway_is_production` | `'1'` = production, `'0'` = sandbox |
| `qris_expiration_minutes` | Durasi kedaluwarsa QRIS (default: `15` menit) |

---

### Tabel `system_settings` — Pengaturan Sistem

```sql
CREATE TABLE system_settings (
  id                              INTEGER PRIMARY KEY CHECK (id = 1),
  enable_registration             INTEGER DEFAULT 1,   -- toggle buka/tutup registrasi
  enable_free_trial               INTEGER DEFAULT 1,   -- toggle aktif/nonaktif trial
  max_vendor_quota                INTEGER DEFAULT NULL, -- NULL = unlimited
  disk_warning_threshold_percent  INTEGER DEFAULT 20,
  disk_critical_threshold_percent INTEGER DEFAULT 10,
  enable_auto_backup              INTEGER DEFAULT 0,
  backup_interval_hours           INTEGER DEFAULT 6,
  trial_expiration_hours          INTEGER DEFAULT 1,
  trial_expiration_minutes        INTEGER DEFAULT 30,
  updated_at                      DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

---

## 🔄 2. SOP Pemeliharaan & Migrasi Database SQLite

### Aturan Emas

1. **JANGAN hapus `data/database.db` produksi** — kehilangan semua data vendor, proyek, seleksi.
2. **SELALU gunakan pengecekan kolom sebelum `ALTER TABLE`** — mencegah crash `duplicate column name`.
3. **`data/database.db` wajib di `.gitignore`** — tidak boleh masuk repositori Git.
4. **Backup sebelum migrasi skema** — terutama `ALTER TABLE ... DROP COLUMN`.

### Pattern Migrasi Aman (`lib/db.js`)

```javascript
try {
    const columns = db.pragma('table_info(vendors)');
    const hasColumn = (colName) => columns.some(col => col.name === colName);

    if (!hasColumn('nama_kolom_baru')) {
        db.exec("ALTER TABLE vendors ADD COLUMN nama_kolom_baru TEXT DEFAULT 'default'");
        console.log("Migrasi: Kolom 'nama_kolom_baru' ditambahkan.");
    }
} catch (err) {
    console.error("Gagal migrasi:", err);
}
```

### Index Database (Performance)

```sql
CREATE INDEX IF NOT EXISTS idx_projects_vendorId      ON projects (vendorId);
CREATE INDEX IF NOT EXISTS idx_photos_projectId       ON photos (projectId);
CREATE INDEX IF NOT EXISTS idx_clients_projectId      ON clients (projectId);
CREATE INDEX IF NOT EXISTS idx_selections_clientId    ON selections (clientId);
CREATE INDEX IF NOT EXISTS idx_subscription_requests_vendorId ON subscription_requests (vendorId);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_vendorId  ON payment_transactions (vendorId);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_vendorId      ON payment_sessions (vendorId);
```

---

## 🛡️ 3. Keamanan Sistem

### Autentikasi JWT (HTTP-Only Cookie)

- **Vendor:** Login menghasilkan JWT yang disimpan di cookie `token` (HTTP-Only, SameSite=Strict).
- **Admin (Superadmin & Sub-Admin):** Login menggunakan tabel `admins` — JWT disimpan di cookie `adminToken` (HTTP-Only).
- **Hierarki Isolasi:** Akun Superadmin (`role = 'superadmin'`) dan Sub-Admin (`role = 'admin'`) sepenuhnya terpisah dari tabel `vendors` di tabel `admins` yang terdedikasi.
- **Expiry:** Dikonfigurasi di `lib/auth.js`.
- **Validasi:** Setiap API request divalidasi via `getAuthVendor()` / `getAuthAdmin()` di `lib/auth.js`.
- **Master Recovery Override:** Jika seluruh akun admin hilang/terkunci, `.env.local` (`ADMIN_EMAIL` + `ADMIN_PASSWORD`) berfungsi sebagai *Master Recovery Overrule* untuk login Superadmin.

### Keamanan Galeri Klien

- **Access Key:** 32 hex character random token — unik per proyek.
- **Format URL:** `/gallery/[projectId]?key=[accessKey]`
- **Blokir galeri expired:** `app/api/projects/[projectId]/route.js` memblokir akses dengan status 403 jika `vendor.expiresAt < now`.

### Keamanan Proxy Gambar

- **Validasi File ID:** Regex `/^[a-zA-Z0-9_-]{10,}$/` — mencegah path traversal / injection.
- **Domain tersembunyi:** URL Google CDN tidak pernah terekspos ke client — proxy pipe stream menjaga URL asli tersembunyi.
- **Cache agresif:** Gambar di-cache 7 hari di browser, 30 hari di Cloudflare CDN.

### Keamanan Payment Status Endpoint

- **`GET /api/payment/status`** diproteksi: hanya dapat diakses oleh pengguna dengan sesi autentikasi aktif ATAU vendor yang memiliki transaksi dengan `vendorId` yang cocok — mencegah manipulasi status dari pihak anonim.

### Keamanan Google OAuth Master

- **Credential storage:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` disimpan di `.env.local` **DAN/ATAU** `saas_settings` (DB).
- **Auto refresh token:** Event `tokens` di `oauth2Client` otomatis update `google_access_token` ke DB.
- **Cache client:** `getMasterDriveClient()` cache selama 45 menit untuk efisiensi.
- **Google OAuth Callback:** `SELECT id, email, name, role, status` — tidak pernah mengambil kolom sensitif (`password`, `refreshToken`) yang tidak dibutuhkan.

### Keamanan File ID Google Drive

- `GOOGLE_FILE_ID` bukan kredensial sensitif — hanya string identifier publik.
- Tanpa OAuth token valid, ID tidak bisa digunakan untuk modifikasi file.
- Semua file di Google Drive diatur **Read-Only (Viewer)** — tidak ada risiko penghapusan/edit.

---

## 🔒 4. Catatan Isolasi SQLite (Produksi)

- Mode **WAL (Write-Ahead Logging)** diaktifkan untuk concurrency read/write.
- **busy_timeout = 10 detik** — mencegah error `SQLITE_BUSY` saat concurrent requests.
- Di development, menggunakan singleton `globalThis._sqliteDb` — mencegah multiple connection di Next.js hot-reload.
- Di production, `new Database()` fresh per process — aman karena PM2 single instance.
