# PROJECT MEMORY & TECHNICAL SPECIFICATION
# REPOSITORI: PICK YOUR PHOTO (PHOTOTA)
> **STATUS:** Single Source of Truth — 100% Diturunkan Langsung dari 154 File Kode Aktif.
> **PANDUAN OPERASIONAL:** Setiap agen AI yang bekerja di repositori ini **dilarang berasumsi** atau menggunakan memori usang. Dokumen ini adalah representasi nyata dari kode yang terpasang di codebase.

---

## DAFTAR ISI
1. [Arsitektur Database Triad (Master, Vendor, Analytics)](#1-arsitektur-database-triad)
2. [Sistem Autentikasi & Sesi (Google OAuth & JWT)](#2-sistem-autentikasi--sesi)
3. [Alur Registrasi & Onboarding Vendor (5 Tahapan Rinci)](#3-alur-registrasi--onboarding-vendor)
4. [Sistem Pembayaran Multi-Gateway & Transaksi](#4-sistem-pembayaran-multi-gateway--transaksi)
5. [Sistem Add-On Cloud Storage](#5-sistem-add-on-cloud-storage)
6. [Routing Multi-Tenant Subdomain (Middleware & Studio)](#6-routing-multi-tenant-subdomain)
7. [Panel Kontrol Admin (Superadmin Console)](#7-panel-kontrol-admin)
8. [Sistem Email Transaksional (Nodemailer SMTP)](#8-sistem-email-transaksional)
9. [Aturan Absolut UI, Desain, dan Copywriting](#9-aturan-absolut-ui-desain-dan-copywriting)
10. [Daftar Anti-Patterns & Catatan Bahaya Logika](#10-daftar-anti-patterns--catatan-bahaya-logika)

---

## 1. ARSITEKTUR DATABASE TRIAD (`lib/db.js`)

Sistem menggunakan 3 file database SQLite terpisah di direktori `data/` yang dikelola via library `better-sqlite3`:

### A. `data/master.db` (`masterDb`)
1. **`vendors`**:
   * `id`: INTEGER PRIMARY KEY AUTOINCREMENT
   * `email`: TEXT NOT NULL UNIQUE (Akun Gmail dari Google Sign-In)
   * `password`: TEXT NOT NULL (Bcrypt hashed random string)
   * `name`: TEXT NOT NULL (Nama lengkap pemilik)
   * `role`: TEXT DEFAULT 'vendor' (Pembeda role: `'vendor'` vs `'admin'`)
   * `status`: TEXT DEFAULT 'active' (`'draft_plan'`, `'pending_payment'`, `'pending_manual'`, `'active'`, `'expired_draft'`, `'rejected'`, `'cancelled'`, `'expired'`)
   * `planId`: INTEGER REFERENCES `plans(id)` (Bernilai `NULL` saat awal registrasi Google)
   * `expiresAt`: TEXT (ISO timestamp masa aktif paket)
   * `whatsapp`: TEXT (Nomor WhatsApp pemilik)
   * `paymentProof`: TEXT (Nama file bukti transfer manual di `/public/uploads/proofs/`)
   * `resetRequested`: INTEGER DEFAULT 0
   * `brandName`: TEXT (Nama studio/usaha fotografi vendor)
   * `brandLogo`: TEXT (Path file logo di `/uploads/logos/`)
   * `subdomain`: TEXT (Subdomain unik studio, e.g. `'ams-studio'`)
   * `subdomain_active`: INTEGER DEFAULT 0
   * `subdomain_set_at`: DATETIME
   * `custom_domain`: TEXT
   * `custom_domain_verified`: INTEGER DEFAULT 0
   * `city`: TEXT (Kota studio/pemilik)
   * `address`: TEXT (Alamat studio/pemilik)
   * `studio_whatsapp`: TEXT (Nomor WhatsApp kontak studio di galeri)
   * `is_setup_completed`: INTEGER DEFAULT 0 (Penanda apakah First-Time Setup Wizard `/setup` sudah diselesaikan)
   * `hasStorageAddon`: INTEGER DEFAULT 0
   * `addonStorageQuotaBytes`: INTEGER DEFAULT 0 (Kapasitas ekstra dalam bytes)
   * `addonPlanId`: INTEGER
   * `archivedAt`: DATETIME (Waktu pengarsipan saat pembayaran batal/expired, retensi 3 hari)
   * `createdAt`: DATETIME DEFAULT CURRENT_TIMESTAMP

2. **`plans`**:
   * `id`: INTEGER PRIMARY KEY AUTOINCREMENT
   * `name`: TEXT NOT NULL (e.g. `'Starter Plan'`, `'Pro Studio Plan'`, `'Elite Studio Plan'`)
   * `price`: REAL NOT NULL
   * `maxProjects`: INTEGER NOT NULL (Batas kuota proyek aktif, e.g. 5, 20, 50)
   * `activePeriodDays`: INTEGER NOT NULL DEFAULT 30
   * `allowCustomLogo`: INTEGER DEFAULT 0 (Fitur unggah logo studio kustom)
   * `allowRawSelector`: INTEGER DEFAULT 0 (Fitur seleksi format RAW)
   * `status`: TEXT DEFAULT 'active'
   * `createdAt`: DATETIME DEFAULT CURRENT_TIMESTAMP

3. **`addon_plans`**:
   * `id`: INTEGER PRIMARY KEY AUTOINCREMENT
   * `planKey`: TEXT NOT NULL UNIQUE (e.g. `'addon-10gb'`, `'addon-25gb'`, `'addon-50gb'`)
   * `name`: TEXT NOT NULL (e.g. `'Cloud Storage 25 GB'`)
   * `quotaBytes`: INTEGER NOT NULL (e.g. `26843545600` bytes)
   * `price`: REAL NOT NULL
   * `status`: TEXT DEFAULT 'active'
   * `sortOrder`: INTEGER DEFAULT 0
   * `createdAt`: DATETIME DEFAULT CURRENT_TIMESTAMP

4. **`payment_sessions`**:
   * `id`: INTEGER PRIMARY KEY AUTOINCREMENT
   * `orderId`: TEXT NOT NULL UNIQUE (e.g. `'ORD-1787299016-1001'`)
   * `vendorId`: INTEGER NOT NULL (FK `vendors.id`)
   * `planId`: INTEGER NOT NULL
   * `amount`: INTEGER NOT NULL (Total tagihan paket + addon)
   * `status`: TEXT DEFAULT 'pending' (`'pending'`, `'paid'`, `'expired'`, `'cancelled'`)
   * `paymentMethod`: TEXT DEFAULT 'qris'
   * `qrUrl`: TEXT DEFAULT '' (String QR code payload atau URL gambar QR)
   * `expiresAt`: DATETIME NOT NULL (Batas waktu pembayaran 15 menit)
   * `paidAt`: DATETIME
   * `rawResponse`: TEXT (JSON response mentah dari gateway)
   * `createdAt`: DATETIME DEFAULT CURRENT_TIMESTAMP

5. **`subscription_requests`**:
   * `id`: INTEGER PRIMARY KEY AUTOINCREMENT, `vendorId`, `planId`, `proratedPrice`, `transferProof`, `status` (`'pending'`, `'approved'`, `'rejected'`), `createdAt`.

6. **`saas_settings`**:
   * `key` (TEXT PK), `value` (TEXT) — Menyimpan setting SaaS: nama, logo, bank transfer, gateway aktif, kredensial SMTP.

---

### B. `data/vendor.db` (`vendorDb`)
* **`projects`**:
  * `id`: INTEGER PK AI, `vendorId` (INT), `name` (TEXT), `slug` (TEXT UNIQUE), `status` (`'draft'`, `'active'`, `'completed'`), `maxSelection` (INT), `expiresAt` (TEXT), `folderUrl` (TEXT), `galleryTheme` (TEXT), `createdAt` (DATETIME).
* **`clients`**:
  * `id`: INTEGER PK AI, `email` (TEXT), `projectId` (INT FK `projects`), `accessKey` (TEXT UNIQUE), `clientPhone` (TEXT), `createdAt` (DATETIME).
* **`photos`**:
  * `id`: INTEGER PK AI, `projectId` (INT FK `projects`), `name` (TEXT), `fileId` (TEXT), `url` (TEXT), `thumbnailUrl` (TEXT), `sizeBytes` (INT), `sortOrder` (INT), `selected` (INT), `createdAt` (DATETIME).
* **`selections`**:
  * `id`: INTEGER PK AI, `clientId` (INT), `photoId` (INT), `notes` (TEXT), `createdAt` (DATETIME).

---

### C. `data/analytics.db` (`analyticsDb`)
* **`traffic_logs`**, **`client_activity_logs`**, **`daily_stats`**.

---

## 2. SISTEM AUTENTIKASI & SESI (`lib/auth.js`)

* **Metode Autentikasi Vendor**: Murni 100% menggunakan **Google OAuth 2.0 (Google Sign-In)**. Tidak ada registrasi berbasis password manual.
* **Token JWT**:
  * Ditandatangani menggunakan `process.env.JWT_SECRET` (fallback ke string sha256 internal).
  * Payload: `{ id: vendor.id, email: vendor.email, name: vendor.name, role: vendor.role }`.
  * Masa Berlaku: 24 Jam (`maxAge: 24 * 60 * 60`).
  * Disimpan di HTTP-Only Cookie bernama `token` dengan path `/` dan `sameSite: 'lax'`.
* **Fungsi Utama (`lib/auth.js`)**:
  * `generateToken(payload)`: Mengenkripsi token JWT.
  * `verifyToken(token)`: Mendekripsi dan memvalidasi integritas token JWT.
  * `getAuthVendor()`: Membaca cookie `token` dari request headers, memvalidasi sesi, dan mengembalikan object vendor yang login.
  * `requireAuth()` & `requireAdmin()`: Middleware guard internal untuk memastikan hak akses.

---

## 3. ALUR REGISTRASI & ONBOARDING VENDOR (5 TAHAPAN PASTI)

```
[Tahap 1: Google Sign-In] ────> /api/auth/google?action=register
                                  │
                                  ▼ Google Callback (/api/auth/google/callback/route.js)
                                  DB: status='draft_plan', planId=NULL, whatsapp=''
                                  Cookie: token (JWT)
                                  Redirect: /register?step=select-plan
                                  │
[Tahap 2: Pilih Paket] ────────> /register?step=select-plan
                                  UI: 3 Kartu Paket (Starter, Pro, Elite) dari DB `plans`
                                  Action: User klik salah satu paket ➔ setPlanId
                                  │
[Tahap 3: Ringkasan Pesanan] ──> /register (showSummary=true)
                                  UI: Item Langganan + Dynamic Add-On Storage Modal
                                  Total: Harga Paket + Harga Add-On (Otomatis)
                                  Action: Klik "Bayar via QRIS" atau "Bayar via Transfer"
                                  │
                                  ├────────────────────────────────┐
                                  ▼ (QRIS Gateway)                 ▼ (Manual Transfer)
[Tahap 4: Pembayaran] ─────────> /api/payment/create             /api/auth/validate-register
                                  DB: status='pending_payment'    DB: status='pending_manual'
                                  UI: NativeQrisDisplay (15m)     UI: Menunggu Verifikasi
                                  │                                │
                                  ▼ (Webhook Lunas)                ▼ (Admin Approve)
                                  DB: status='active', is_setup_completed=0
                                  │
[Tahap 5: Setup Wizard] ───────> /setup (app/(auth)/setup/page.js)
                                  Form: Biodata Pemilik + Profil Studio & Subdomain
                                  Action: Tombol "Pratinjau Data" ➔ Modal Preview Formal
                                  Action: "Simpan & Masuk ke Dashboard"
                                  DB: is_setup_completed=1, subdomain_active=1
                                  │
[Dashboard Utama] ─────────────> /dashboard (app/dashboard/layout.js)
```

### Detail Perilaku Setiap Tahapan:

1. **Tahap 1: Registrasi Google (`app/api/auth/google/callback/route.js`)**:
   * Google mengembalikan `email` dan `name`.
   * Jika email sudah terdaftar dan `status === 'active'`, user langsung diarahkan ke `/dashboard` (atau `/setup` jika `is_setup_completed === 0`).
   * Jika user baru:
     * Dibuat record vendor di database dengan `status = 'draft_plan'`, `planId = NULL`, `whatsapp = ''`.
     * Dibuat cookie JWT dan di-redirect ke `/register?step=select-plan&email=...`.

2. **Tahap 2: Pemilihan Paket (`app/(auth)/register/page.js`)**:
   * Mengambil data paket aktif dari database via `/api/public/plans`.
   * User melihat 3 kartu paket tanpa ada yang terpilih otomatis.
   * Saat user memilih paket, `planId` dikirim ke `/api/register/select-plan` dan UI membuka Tahap 3.

3. **Tahap 3: Ringkasan Pesanan (`app/(auth)/register/page.js`)**:
   * Menampilkan:
     * **Akun Pemesan**: Nama, Email (terkunci), dan WhatsApp (opsional, auto-sync jika diedit).
     * **Item Langganan**: Nama paket, fitur, harga.
     * **Add-On Cloud Storage**: Jika tabel `addon_plans` memiliki paket aktif, tampil tombol `+ Tambah Kuota Storage Ekstra (Opsional)` yang membuka modal pilihan Add-On.
     * **Total Pembayaran**: Grand Total otomatis dijumlahkan.
     * **Tombol Aksi**: *Ubah Paket* (mereset ke Tahap 2) dan tombol *Bayar via QRIS* / *Transfer*.

4. **Tahap 4: Pembayaran (`app/api/payment/create/route.js` & `components/NativeQrisDisplay.jsx`)**:
   * **Jalur QRIS**:
     * Gateway terpilih (Midtrans/Duitku/iPaymu) membuat sesi QRIS.
     * Record dibuat di `payment_sessions` dengan masa berlaku 15 menit.
     * `vendors.status = 'pending_payment'`.
     * UI menampilkan QR code dengan countdown timer dinamis dan auto-polling status setiap 3 detik.
   * **Jalur Transfer Manual**:
     * User melihat rekening bank SaaS dari `saas_settings` dan mengunggah foto bukti transfer.
     * `vendors.status = 'pending_manual'`.
     * UI menampilkan layar "Menunggu Konfirmasi Administrator".

5. **Tahap 5: First-Time Setup Wizard (`app/(auth)/setup/page.js` & `app/api/vendor/setup/route.js`)**:
   * Terbuka hanya 1 kali saat `is_setup_completed === 0` dan akun sudah `active`.
   * **Bagian 1 (Biodata Pemilik)**: Email (terkunci), Nama Pemilik (*wajib*), WA Pribadi (*wajib*), Kota/Alamat (*opsional*).
   * **Bagian 2 (Profil Studio)**: Nama Studio (*opsional*), Logo Studio (*opsional*, max 2MB), WA Kontak Studio (*wajib* + toggle samakan WA pemilik), Subdomain Studio (*wajib* + tombol Cek Ketersediaan via `/api/vendor/check-subdomain`).
   * **Tombol Pratinjau**: Membuka popup modal ringkasan formal.
   * **Tombol Simpan**: Mengirim multipart `FormData` ke `/api/vendor/setup`, mengupdate database, mengeset `is_setup_completed = 1`, dan me-redirect ke `/dashboard`.
   * **Guard Dashboard (`app/dashboard/layout.js`)**: Jika vendor `active` mencoba masuk `/dashboard` dengan `is_setup_completed === 0`, server otomatis mengalihkan ke `/setup`.

---

## 4. SISTEM PEMBAYARAN MULTI-GATEWAY (`lib/payment-gateway/`)

Sistem menggunakan unified abstraction layer (`lib/payment-gateway/index.js`):
* **Gateway yang Didukung**:
  * `midtrans` (`lib/payment-gateway/midtrans.js`) — Core API Snap / QRIS.
  * `duitku` (`lib/payment-gateway/duitku.js`) — Pop/QRIS Gateway.
  * `ipaymu` (`lib/payment-gateway/ipaymu.js`) — Direct QRIS API.
  * `doku`, `tripay`, `xendit` — Modular adapters.
  * `manual` — Verifikasi bukti transfer bank oleh admin.
* **Webhook Handler (`app/api/payment/notification/route.js`)**:
  * Menerima HTTP POST notifikasi dari gateway pembayaran aktif.
  * Memvalidasi signature/hash pembayaran.
  * Saat transaksi `settlement` / `capture` / `paid`:
    * Mengubah `payment_sessions.status = 'paid'`, `paidAt = CURRENT_TIMESTAMP`.
    * Mengubah `vendors.status = 'active'`, `is_setup_completed = 0`.
    * Menghitung tanggal `expiresAt` berdasarkan `plans.activePeriodDays`.
    * Mengirim email invoice lunas resmi (`sendVendorApprovalEmail`).

---

## 5. SISTEM ADD-ON CLOUD STORAGE (`lib/db.js`, `app/api/admin/addon-plans/route.js`)

* **Tabel Master**: `addon_plans` (`planKey`, `name`, `quotaBytes`, `price`, `status`).
* **Di Halaman Registrasi**: Mengambil data aktif via `/api/public/plans`. Calon vendor dapat memilih kapasitas ekstra (misal: +10GB, +25GB, +50GB) sebelum bayar.
* **Di Pembayaran**: Parameter `addonPlanId` diteruskan ke `/api/payment/create`. Nominal dijumlahkan ke grand total.
* **Di Database Vendor**: Disimpan di `vendors.hasStorageAddon`, `vendors.addonStorageQuotaBytes`, `vendors.addonPlanId`.
* **Di Admin Console**: Ditampilkan pada kolom `STORAGE ADD-ON` di tabel Inquiry.
* **Grace Period Storage (`lib/mailer.js`)**: Sistem peringatan otomatis H-15 dan H-3 sebelum berkas storage tambahan dibersihkan jika tidak diperpanjang.

---

## 6. ROUTING MULTI-TENANT SUBDOMAIN (`middleware.js`)

* **Root Domain**: Diambil dari `process.env.ROOT_DOMAIN` (default: `photota.my.id`).
* **Reserved Words**: `www, api, admin, app, mail, ftp, static, help, support, public, assets, root, dashboard, login, register, auth, staging, dev, test, status, docs, cdn, demo, trial, gallery, storage, select`.
* **Mekanisme**:
  * Request `client.photota.my.id/gallery/5` di-rewrite transparan ke `/studio/client/gallery/5`.
  * Header disisipkan: `x-subdomain: client`, `x-is-subdomain: 1`.
* **Halaman Galeri Studio (`app/studio/[subdomain]/`)**:
  * Menampilkan branding studio vendor (logo, nama brand, nomor kontak WA studio).
  * Menampilkan galeri foto dengan thumbnail teroptimasi dan fitur seleksi foto untuk klien.

---

## 7. PANEL KONTROL ADMIN (`app/admin/`, `components/admin/`)

* **Autentikasi Admin**: Rute khusus `/admin/login` dengan validasi `role === 'admin'`.
* **Tab Inquiry Calon Vendor (`components/admin/AdminVendors.jsx`)**:
  * **Sub-Tab `Lead`**: Calon vendor berstatus `draft_plan`.
    * `planId == null` ➔ Badge: **`Sedang Memilih Paket`**.
    * `planId != null` ➔ Badge: **`Sudah Pilih Paket (Detail)`**.
  * **Sub-Tab `Menunggu Bayar`**:
    * `pending_payment` ➔ Badge QRIS + countdown timer.
    * `pending_manual` ➔ Tombol **`Verifikasi Bukti Transfer`** (menampilkan modal foto bukti transfer, tombol Setujui dan Tolak).
  * **Sub-Tab `Arsip`**:
    * Calon vendor berstatus `expired_draft`, `cancelled`, `rejected` dengan hitung mundur auto-delete (3 hari).
* **Tab Kelola Paket (`components/admin/AdminPlans.jsx`)**: CRUD paket langganan dan Add-On storage.
* **Tab Pengaturan SaaS (`components/admin/AdminSettings.jsx`)**: Konfigurasi payment gateway aktif, nomor rekening bank, logo SaaS, dan kredensial SMTP email.

---

## 8. SISTEM EMAIL TRANSAKSIONAL (`lib/mailer.js`)

Menggunakan Nodemailer dengan kredensial SMTP dinamis dari `saas_settings`:
1. `sendVendorApprovalEmail`: Invoice lunas aktivasi akun baru.
2. `sendTestEmail`: Uji coba koneksi SMTP.
3. `sendVendorRejectionEmail`: Pemberitahuan penolakan pendaftaran manual.
4. `sendSubscriptionExpiringWarningEmail`: Peringatan masa aktif paket berakhir (H-3 / H-1).
5. `sendVendorAccountExpiredEmail`: Pemberitahuan akun expired & aktivasi kembali.
6. `sendProjectQuotaWarningEmail`: Peringatan kuota proyek mendekati batas.
7. `sendClientGalleryExpiringWarningEmail`: Pengingat masa akses galeri klien berakhir 48 jam.
8. `sendVendorRenewalConfirmationEmail`: Invoice perpanjangan langganan lunas.
9. `sendVendorUpgradeConfirmationEmail`: Invoice upgrade paket lunas.
10. `sendStorageGracePeriodWarningEmail`: Pemberitahuan masa tenggang storage (H-15 & H-3).
11. `sendPendingQrisEmail`: Instruksi pembayaran QRIS.
12. `sendPendingManualTransferReceivedEmail`: Notifikasi bukti transfer diterima & menunggu admin.
13. `sendPendingManualTransferInstructionEmail`: Instruksi transfer bank manual 24 jam.

---

## 9. ATURAN STANDAR UI, DESAIN & COPYWRITING (ZERO TOLERANCE)

1. **0% EMOJI BAWAAN**:
   * DILARANG menggunakan karakter emoji bawaan (`🎉, 👋, 🧾, 💾, 🟢, 🚀, ✅, ⚠️, ⏰, 💬`, dll) di seluruh UI, email, dan komponen sistem.
   * Gunakan 100% icon SVG murni (`<svg>`).
2. **TANPA TANDA SERU (`!`)**:
   * Dilarang menggunakan tanda seru pada judul, subtitle, tombol, maupun notifikasi.
3. **BAHASA INDONESIA FORMAL & BAKU**:
   * Seluruh teks harus profesional, formal, dan sopan (e.g. *"Yth. [Nama],"*, *"Pembayaran Telah Diterima"*, *"Ringkasan Pesanan"*).
4. **DESAIN BORDERLESS & ZERO NESTED BOX**:
   * Hindari card di dalam card. Gunakan divider halus (`rgba(255, 255, 255, 0.06)`) untuk memisahkan bagian konten.

---

## 10. DAFTAR ANTI-PATTERNS (KESALAHAN FATAL — JANGAN DIULANGI!)

1. **JANGAN PERNAH mengisi `planId` otomatis pada Google OAuth Callback**:
   * Pendaftaran akun baru WAJIB dimulai dengan `planId = NULL` agar calon vendor mendarat di Tahap 2 (Pilih Paket).
2. **JANGAN PERNAH mengembalikan `hasExpired: true` pada `check-pending` tanpa riwayat transaksi nyata**:
   * `hasExpired: true` hanya berlaku jika ada record riil di tabel `payment_sessions` yang kedaluwarsa.
3. **JANGAN PERNAH menyebutkan atau membuat form registrasi manual**:
   * Registrasi vendor murni 100% menggunakan 1-klik Google Sign-In.
4. **JANGAN PERNAH menambal logika secara parsial (Analogi Tegel Lantai Bolong)**:
   * Setiap penambahan logika sesi/refresh wajib diuji dampaknya terhadap pembuatan akun baru dari hulu ke hilir.
5. **JANGAN PERNAH menjawab pertanyaan teknis berdasarkan file dokumentasi usang**:
   * Selalu lakukan penelusuran langsung pada file kode aktif (`.js`, `.jsx`, query DB riil).
