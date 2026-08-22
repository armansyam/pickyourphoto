# PROJECT MEMORY & TECHNICAL SPECIFICATION
# REPOSITORI: PICK YOUR PHOTO (PHOTOTA)
> **STATUS:** Single Source of Truth — 100% Diturunkan Langsung dari 154 File Kode Aktif & Aturan Bisnis yang Disepakati.
> **PANDUAN OPERASIONAL:** Setiap agen AI yang bekerja di repositori ini **dilarang berasumsi** atau membuat solusi tambal sulam lokal (Analogi Tegel Lantai Bolong). Setiap logika wajib sinkron antara Database, API, Frontend, dan Admin.

---

## 1. ARSITEKTUR DATABASE TRIAD (`lib/db.js`)

Sistem menggunakan 3 file database SQLite terpisah di direktori `data/` via `better-sqlite3` dengan mode **WAL (`PRAGMA journal_mode = WAL;`)** dan memory cache berkecepatan tinggi:

### A. `data/master.db` (`masterDb`)
1. **`vendors`**:
   * `id`: INTEGER PRIMARY KEY AUTOINCREMENT
   * `email`: TEXT NOT NULL UNIQUE (Akun Gmail dari Google Sign-In)
   * `password`: TEXT NOT NULL (Bcrypt hashed random string)
   * `name`: TEXT NOT NULL (Nama lengkap pemilik)
   * `role`: TEXT DEFAULT 'vendor' (`'vendor'` vs `'admin'`)
   * `status`: TEXT DEFAULT 'active' (`'draft_plan'`, `'pending_payment'`, `'pending_manual'`, `'active'`, `'expired_draft'`, `'rejected'`, `'cancelled'`, `'expired'`, `'suspended'`)
   * `planId`: INTEGER REFERENCES `plans(id)`
   * `expiresAt`: TEXT (ISO timestamp masa aktif paket)
   * `whatsapp`: TEXT (Nomor WhatsApp pemilik)
   * `paymentProof`: TEXT (Nama file bukti transfer manual)
   * `resetRequested`: INTEGER DEFAULT 0
   * `brandName`: TEXT (Nama studio/usaha fotografi vendor)
   * `brandLogo`: TEXT (Path file logo di `/uploads/logos/`)
   * `subdomain`: TEXT (Subdomain eksklusif studio, e.g. `'alana'`)
   * `subdomain_active`: INTEGER DEFAULT 0 (Status aktifasi routing subdomain)
   * `subdomain_set_at`: DATETIME
   * `portfolioDriveUrl`: TEXT (Tautan Google Drive publik portofolio studio)
   * `city`: TEXT (Kota studio/pemilik)
   * `address`: TEXT (Alamat studio/pemilik)
   * `studio_whatsapp`: TEXT (Nomor WhatsApp kontak studio di galeri)
   * `is_setup_completed`: INTEGER DEFAULT 0 (Penanda First-Time Setup Wizard `/setup`)
   * `hasStorageAddon`: INTEGER DEFAULT 0
   * `addonStorageQuotaBytes`: INTEGER DEFAULT 0
   * `addonPlanId`: INTEGER
   * `externalDriveConnected`: INTEGER DEFAULT 0 (Status integrasi BYOS Google Drive)
   * `externalDriveEmail`: TEXT (Akun email Google Drive pribadi vendor)
   * `externalDriveRefreshToken`: TEXT (Token OAuth tersimpan **TERENKRIPSI AES-256-CBC** via `crypto-vault.js`)
   * `externalDriveFolderId`: TEXT DEFAULT 'root'
   * `activeStorageMode`: TEXT DEFAULT 'byos' (`'byos'` vs `'system'`)
   * `archivedAt`: DATETIME
   * `createdAt`: DATETIME DEFAULT CURRENT_TIMESTAMP

2. **`subdomain_history`**:
   * `id`: INTEGER PRIMARY KEY AUTOINCREMENT
   * `vendorId`: INTEGER NOT NULL (FK `vendors.id`)
   * `oldSubdomain`: TEXT NOT NULL (Subdomain lama)
   * `newSubdomain`: TEXT NOT NULL (Subdomain baru)
   * `changedAt`: DATETIME DEFAULT CURRENT_TIMESTAMP
   * `expiresAt`: DATETIME (Masa retensi redirect 301 selama 90 hari)

3. **`plans`**:
   * `id`: INTEGER PRIMARY KEY AUTOINCREMENT
   * `name`: TEXT NOT NULL (`'Starter'`, `'Pro Studio'`, `'Business'`)
   * `price`: REAL NOT NULL
   * `maxProjects`: INTEGER NOT NULL (Batas kuota proyek aktif, e.g. 5, 20, 50)
   * `activePeriodDays`: INTEGER NOT NULL DEFAULT 30
   * `allowCustomLogo`: INTEGER DEFAULT 0
   * `allowRawSelector`: INTEGER DEFAULT 0
   * `status`: TEXT DEFAULT 'active'
   * `createdAt`: DATETIME DEFAULT CURRENT_TIMESTAMP

4. **`addon_plans`**:
   * `id`: INTEGER PRIMARY KEY AUTOINCREMENT
   * `planKey`: TEXT NOT NULL UNIQUE (e.g. `'addon-10gb'`, `'addon-25gb'`, `'addon-50gb'`)
   * `name`: TEXT NOT NULL (e.g. `'Cloud Storage 25 GB'`)
   * `quotaBytes`: INTEGER NOT NULL
   * `price`: REAL NOT NULL
   * `status`: TEXT DEFAULT 'active'
   * `sortOrder`: INTEGER DEFAULT 0
   * `createdAt`: DATETIME DEFAULT CURRENT_TIMESTAMP

5. **`payment_sessions`**:
   * `id`: INTEGER PRIMARY KEY AUTOINCREMENT
   * `orderId`: TEXT NOT NULL UNIQUE (e.g. `'ORD-1787299016-1001'`)
   * `vendorId`: INTEGER NOT NULL (FK `vendors.id`)
   * `planId`: INTEGER NOT NULL
   * `amount`: INTEGER NOT NULL
   * `status`: TEXT DEFAULT 'pending' (`'pending'`, `'paid'`, `'expired'`, `'cancelled'`)
   * `paymentMethod`: TEXT DEFAULT 'qris'
   * `qrUrl`: TEXT DEFAULT ''
   * `expiresAt`: DATETIME NOT NULL
   * `paidAt`: DATETIME
   * `rawResponse`: TEXT
   * `createdAt`: DATETIME DEFAULT CURRENT_TIMESTAMP

6. **`saas_settings`**:
   * `key` (TEXT PK), `value` (TEXT) — Pengaturan SaaS global (`saas_name`, `saas_tagline`, `saas_domain`, `payment_gateway`, dll.).

---

### B. `data/vendor.db` (`vendorDb`)
* **`projects`**: `id`, `vendorId`, `name`, `slug` (UNIQUE), `status` (`'draft'`, `'active'`, `'completed'`), `maxSelection`, `expiresAt`, `folderUrl`, `galleryTheme`, `createdAt`.
* **`clients`**: `id`, `email`, `projectId` (FK), `accessKey` (UNIQUE), `clientPhone`, `createdAt`.
* **`photos`**: `id`, `projectId` (FK), `name`, `fileId`, `url`, `thumbnailUrl`, `sizeBytes`, `sortOrder`, `selected`, `createdAt`.
* **`selections`**: `id`, `clientId` (FK), `photoId` (FK), `notes`, `createdAt`.
* **`storage_folders`** & **`storage_files`**: Struktur virtual folder dan metadata berkas cloud storage vendor.
* **`daily_upload_logs`** & **`upload_queue`**: Tracking transaksi upload per vendor.

---

### C. `data/trial.db` (`trialDb`)
* **`trial_galleries`**: `id`, `slug` (UNIQUE), `title`, `folderUrl`, `expiresAt`, `viewCount`, `createdAt` — Menyimpan simulasi galeri instan tanpa akun (retensi 24 jam).

---

## 2. ARSITEKTUR MULTI-TENANT SUBDOMAIN & STUDIO PORTAL

### A. Dynamic Hostname Detection (`middleware.js`)
Sistem mendeteksi subdomain secara **100% dinamis** dari header HTTP request (`x-forwarded-host` / `host`) tanpa bergantung pada konfigurasi domain hardcode di `.env`:
* Jika request masuk dengan format `[subdomain].[domain-utama].[tld]` (contoh: `alana.photota.my.id` atau `studio.domain.com`):
  1. `middleware.js` mengekstrak `subdomain` secara cerdas (mendukung multi-part TLD seperti `.my.id`, `.co.id`, dll.).
  2. Request di-rewrite secara transparan di layer Next.js ke path internal `/studio/[subdomain]`.
  3. URL di bilah alamat browser klien tetap menampilkan `https://alana.photota.my.id/`.

### B. Halaman Profil Studio Eksklusif (`app/studio/[subdomain]/`)
Halaman portal studio menyediakan representasi resmi studio fotografer:
* **Branding & Identitas**: Menampilkan logo studio vendor, nama studio dengan lencana resmi (*Verified Official Profile*), dan tombol kontak langsung ke WhatsApp Studio (`wa.me/[nomorWA]`).
* **Favicon Dinamis**: Tab browser otomatis menampilkan logo studio vendor yang diunggah (`vendor.brandLogo`).
* **OpenGraph & Media Sharing**: Dilengkapi meta tag OpenGraph dan Twitter Card dengan judul `[Nama Studio] — Official Profile` dan thumbnail logo studio untuk tampilan rich preview elegan saat dibagikan ke WhatsApp dan media sosial.
* **Streaming Portofolio Google Drive**: Menampilkan galeri portofolio foto pilihan secara live streaming langsung dari tautan Google Drive vendor (`vendor.portfolioDriveUrl`) tanpa membebani storage lokal.
* **White-Label Footer**: Menampilkan hak cipta vendor dan kredit platform dinamis `Powered by {saas_name}` yang bersumber langsung dari tabel `saas_settings`.

---

## 3. STATE MACHINE REGISTRASI & SINKRONISASI REFRESH (4 KONDISI EKSPLANATIF)

```
[Tahap 1: Google Sign-In]
       │
       ▼ (DB: status='draft_plan', planId=NULL) ➔ Admin: "Sedang Memilih Paket"
[Tahap 2: Pilih Paket Langganan] ◄──────────────┐
       │ (User klik paket ➔ DB: planId=ID)      │ (User klik "Ubah Paket" ➔ DB: planId=NULL)
       ▼                                        │
[Tahap 3: Ringkasan Pesanan (Detail + Add-On)] ─┘
  [Saat Refresh: Tetap di Ringkasan Detail] ➔ Admin: "Sudah Pilih Paket (Detail)"
       │ (User klik Bayar)
       ├─────────────────────────────────┐
       ▼ (QRIS Otomatis)                 ▼ (Transfer Manual)
[Tahap 4A: QRIS Payment (15m Timer)]  [Tahap 4B: Unggah Bukti Transfer]
  [Saat Refresh: Tetap di QRIS]         [Saat Refresh: Tetap Menunggu Admin]
       │ (Webhook/Polling Paid)          │ (Admin Approval di /admin)
       └────────────────┬────────────────┘
                        ▼ (DB: status='active', is_setup_completed=0)
[Tahap 5: Setup Wizard (/setup)] (Hanya 1x Pertama Kali)
       │ (Pratinjau Data ➔ Simpan & Masuk ke Dashboard)
       ▼ (DB: is_setup_completed=1)
[Dashboard Vendor (/dashboard)]
```

### Rincian 4 Kondisi Penanganan State & Refresh:

| Kondisi Sistem | State di Database | Respons `/api/payment/check-pending` | Tampilan User di `/register` | Tampilan di Admin Console (`/admin#inquiry`) |
| :--- | :--- | :--- | :--- | :--- |
| **1. Akun Baru** | `planId = NULL`, tidak ada transaksi di `payment_sessions` | `{ hasPending: false, hasExpired: false, planId: null }` | **Tahap 2 (Pilih Paket Langganan)** — 3 Kartu Paket Bersih | Tab Inquiry: `Lead` ➔ **`Sedang Memilih Paket`** |
| **2. Tahap Detail (Ringkasan)** | `planId = [ID]`, tidak ada transaksi di `payment_sessions` | `{ hasPending: false, hasExpired: false, planId: [ID], planName: '...', planPrice: ... }` | **Tahap 3 (Ringkasan Pesanan)** — Menampilkan paket yang dipilih (Saat refresh **tetap bertahan di Ringkasan**) | Tab Inquiry: `Lead` ➔ **`Sudah Pilih Paket (Detail)`** |
| **3. Pembayaran QRIS Aktif** | Ada row di `payment_sessions` status `'pending'` (< 15 menit) | `{ hasPending: true, orderId: '...', qrUrl: '...', expiresAt: '...' }` | **Tahap 4 (Layar QRIS)** — Menampilkan QR code dan countdown timer | Tab Inquiry: `Menunggu Bayar` ➔ **Badge QRIS + Countdown** |
| **4. Pembayaran QRIS Expired** | Ada row di `payment_sessions` status `'expired'` / waktu lewat | `{ hasPending: false, hasExpired: true, planId: [ID] }` | **Tahap 3 (Ringkasan Pesanan)** — Disertai notifikasi merah QRIS expired dan tombol buat QRIS baru | Tab Inquiry: `Arsip` ➔ **Auto-delete 3 hari** |

---

## 3. LOGIKA TOMBOL "UBAH PAKET" DI RINGKASAN PESANAN

1. Saat user berada di **Tahap 3 (Ringkasan Pesanan)** dan ingin mengganti paket:
2. User menekan tombol **`Ubah Paket`**.
3. Frontend mengeksekusi request:
   `POST /api/register/select-plan` dengan body `{ email, planId: null }`.
4. Database mengupdate: `vendors.planId = NULL`, `vendors.status = 'draft_plan'`.
5. Frontend mengeset `showSummary = false`, `plan = ''`.
6. Tampilan User kembali ke **Tahap 2 (Pilih Paket Langganan)**.
7. Di Admin Console, status vendor otomatis kembali menjadi **`Sedang Memilih Paket`**.

---

## 4. SISTEM ADD-ON STORAGE DINAMIS

* Master data disimpan di tabel `addon_plans`.
* Di **Tahap 3 (Ringkasan Pesanan)**, tombol `+ Tambah Kuota Storage Ekstra (Opsional)` muncul jika ada Add-On aktif di DB.
* Jika dipilih, item Add-On tampil di bawah paket utama dan `Grand Total = Harga Paket + Harga Add-On`.
* Parameter `addonPlanId` diteruskan ke pembuatan pembayaran `/api/payment/create`.
* Di Admin Console, kuota yang dipesan tampil pada kolom `STORAGE ADD-ON` (misal: `+25 GB`).
* Saat pembayaran lunas, kuota `vendors.addonStorageQuotaBytes` otomatis terisi.

---

## 5. FIRST-TIME SETUP WIZARD (`/setup`) & DASHBOARD GUARD

* **Trigger Masuk**: `vendors.status === 'active'` dan `vendors.is_setup_completed === 0`.
* **Guard Server (`app/dashboard/layout.js`)**:
  ```javascript
  if (vendor && vendor.role !== 'admin') {
      const checkSetup = db.prepare('SELECT is_setup_completed, status FROM vendors WHERE id = ?').get(vendor.id);
      if (checkSetup && checkSetup.status === 'active' && !checkSetup.is_setup_completed) {
          redirect('/setup');
      }
  }
  ```
* **Form `/setup`**:
  * Biodata Pemilik: Email (terkunci), Nama Pemilik (*wajib*), WA Pribadi (*wajib*), Kota/Alamat (*opsional*).
  * Profil Studio: Nama Studio (*opsional*), Logo (*opsional*), WA Kontak Studio (*wajib* + toggle samakan WA pemilik), Subdomain Studio (*wajib* + tombol Cek Ketersediaan real-time via `/api/vendor/check-subdomain`).
* **Pratinjau & Simpan**:
  * Tombol **`Pratinjau Data`** ➔ Membuka popup modal ringkasan formal.
  * Tombol **`Simpan & Masuk ke Dashboard`** ➔ Simpan ke `/api/vendor/setup`, set `is_setup_completed = 1`, aktifkan subdomain (`subdomain_active = 1`), dan redirect ke `/dashboard`.

---

## 6. ATURAN UI, DESAIN & COPYWRITING (ZERO TOLERANCE)

1. **0% EMOJI BAWAAN**: Wajib 100% menggunakan pure SVG icons. Dilarang keras memakai karakter emoji bawaan pada UI, email, tabel admin, dan notifikasi.
2. **TANPA TANDA SERU (`!`)**: Seluruh salinan teks formal korporat/SaaS tanpa tanda seru.
3. **BAHASA FORMAL**: Menggunakan bahasa Indonesia baku (e.g. *"Yth. [Nama],"*, *"Pembayaran Telah Diterima"*, *"Ringkasan Pesanan"*).
4. **DESAIN BORDERLESS & ZERO NESTED BOX**: Tanpa kotak di dalam kotak. Gunakan divider halus (`rgba(255,255,255,0.06)`).

---

## 7. DAFTAR KESALAHAN FATAL (ANTI-PATTERNS — DILARANG DIULANGI!)

1. **JANGAN PERNAH mengisi `planId` otomatis saat registrasi Google baru**: User baru wajib `planId = NULL` agar mendarat di Tahap 2.
2. **JANGAN PERNAH mengembalikan `hasExpired: true` pada `check-pending` tanpa riwayat transaksi nyata**.
3. **JANGAN PERNAH menghilangkan `planId` di `check-pending` saat user berada di Tahap 3 (Ringkasan)**: User yang sudah di Ringkasan harus tetap di Ringkasan saat di-refresh.
4. **JANGAN PERNAH menyebutkan atau membuat form registrasi manual**: Registrasi vendor murni 100% menggunakan 1-klik Google Sign-In.
5. **JANGAN PERNAH menambal logika secara lokal tanpa menelusuri hulu data (Analogi Tegel Lantai Bolong)**.
