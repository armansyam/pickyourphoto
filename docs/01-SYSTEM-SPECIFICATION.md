# 📘 01. Spesifikasi Master Sistem, Visi & Arsitektur (Pick Your Photo)

> **Dokumen Resmi Spesifikasi Terpadu Platform SaaS Pick Your Photo**  
> Lokasi: `docs/01-SYSTEM-SPECIFICATION.md`  
> **Terakhir diperbarui:** 10 Agustus 2026 — *Sinkronisasi Pasca-Audit 23 Bug: Multi-Provider Gateway, BYOS GDrive, Sub-Admin Team, Grace Period & Hard Purge Policy*

---

## 🎯 1. Visi, Misi & Arsitektur Utama

### Visi
Menjadi platform SaaS nomor satu bagi fotografer profesional untuk berkolaborasi dengan klien dalam memilih foto terbaik secara instan, aman, dan elegan — sekaligus meningkatkan nilai profesionalisme brand mereka di mata klien.

### Misi & Pilar Utama Arsitektur
1. **Menghilangkan Kerumitan Manual:** Mengotomatisasi proses seleksi foto yang sebelumnya dilakukan via WhatsApp/spreadsheet.
2. **Zero-Storage Direct Stream Architecture:** Import metadata foto secara langsung dari Google Drive tanpa menyimpan byte fisik foto di disk server.
3. **Multi-Tenant Add-On Cloud Storage:** Menyediakan opsi kapasitas cloud storage tambahan dengan harga prorata harian yang transparan dan fleksibel.
4. **Keamanan & Privasi:** Galeri klien diproteksi access key unik; URL Google CDN tidak pernah terekspos ke browser client.
5. **Skalabilitas:** Pengelolaan banyak proyek dengan antrian import, Cloudflare CDN caching 30-hari, dan True Pipe Stream.

---

## 👥 2. Segmentasi Pengguna

| Peran | Akses | Deskripsi |
|---|---|---|
| **Superadmin** | `/admin` | Pemilik SaaS — kelola vendor, paket utama, Add-On storage, payment gateway, setting sistem, sub-admin team, & audit pool |
| **Sub-Admin** | `/admin` | Anggota tim admin — akses terbatas sesuai role yang ditetapkan Superadmin |
| **Vendor (Fotografer)** | `/dashboard` & `/dashboard/storage` | Pelanggan aktif — buat galeri, kelola storage cloud, perpanjang Add-On, bagikan link galeri ke klien |
| **Klien** | `/gallery/[id]?key=xxx` | Penerima galeri — pilih foto favorit, tidak perlu mendaftar akun |
| **Pengunjung Trial** | `/trial-gallery/[slug]` | Demo galeri publik dari landing page tanpa perlu daftar akun |

---

## ⚡ 3. Spesifikasi Fitur Utama (Core Features)

### 3.1. Sistem Langganan SaaS Utama (Multi-Tier Subscription)

**3 Paket Utama Aktif (Masa Aktif 30 Hari):**

| Paket Utama | Maks. Proyek | Harga / Bulan | Custom Logo | RAW Selector |
|---|---|---|---|---|
| **Starter Plan** | 5 Proyek | Rp 49.000 | ❌ | ❌ |
| **Pro Studio Plan** | 20 Proyek | Rp 129.000 | ✅ | ✅ |
| **Business Studio Plan** | 50 Proyek | Rp 249.000 | ✅ | ✅ |

**Vendor Status Lifecycle:**
```
draft_plan → pending_payment (QRIS) ──→ active (webhook paid)
           → pending_manual (transfer) ──→ active (Admin approve)
expired_draft / cancelled / suspended
expired (otomatis via autoCheckVendorSubscriptionExpiry saat login/request)
```

**Aturan Akumulasi Renewal & Prorata Upgrade Paket Utama:**
- **Perpanjangan Paket Sama (Renewal):** Hari diakumulasikan dari tanggal kedaluwarsa lama jika belum lewat (`expiresAt = oldExpiresAt + activePeriodDays`), sehingga sisa hari vendor **tidak pernah hangus**.
- **Upgrade Paket Utama:** Harga dikurangi sisa nilai prorata harian paket lama.

---

### 3.2. Add-On Cloud Storage Engine & Order Bump Modal (10 GB – 200 GB)

Sistem Add-On Cloud Storage bersifat dinamis dan dapat disesuaikan kebutuhan fotografer:

**Paket Add-On Storage Aktif (`addon_plans` & Custom Storage Enterprise):**
| Nama Paket Add-On | Kapasitas Storage | Harga / Bulan |
|---|---|---|
| **Drive 10 GB** | 10 GB | Rp 29.000 |
| **Drive 25 GB** | 25 GB | Rp 49.000 |
| **Drive 50 GB** | 50 GB | Rp 89.000 |
| **Custom Enterprise (50–200 GB)** | 50 GB – 200 GB | Rp 1.250 / GB |

**Strategi Penawaran Modal Popup Add-On saat Registrasi (Order Bump):**
- **Clean Checkout:** Halaman checkout registrasi awal tetap bersih dan menampilkan total biaya default Paket Utama.
- **Interactive Modal Selector:** Calon vendor dapat mengklik tombol `[ ⚡ + Tambahkan Cloud Storage Tambahan ]` untuk membuka Modal Popup pemilihan Add-On Storage.
- **Dynamic Re-calculation:** Memilih paket pada modal akan menambahkan line item Add-On di rincian order dan menjumlahkan total tagihan secara instan. Vendor dapat menghapus Add-On (opsi reset) jika batal memilih.
- **Bundled QRIS Payment:** Payment gateway membuat 1 transaksi tunggal dengan `item_details` berisi Paket Utama & Add-On Storage.
- **Automated Instant Setup:** Webhook notification payment gateway mengaktifkan status vendor (`status = 'active'`) dan mengisi `addonStorageQuotaBytes` di database secara serentak (*100% co-terming & ready-to-use*).

**Pengelolaan Upgrade di Admin Dashboard & Proteksi QRIS Expiry:**
- **Kelola Vendor Scope (`/admin` → Tab Vendors):** Seluruh pengajuan upgrade dari vendor aktif (baik Upgrade Plan + Add-On maupun Standalone Add-On Storage) yang menggunakan **Manual Transfer** dikelola langsung di tabel Kelola Vendor.
- **Emblem Notifikasi `⚡ UPGRADE PENDING`:** Baris vendor yang mengajukan upgrade manual menampilkan emblem terang `⚡ UPGRADE PENDING`. Mengklik emblem ini membuka Modal Konfirmasi Approval berisi rincian upgrade (prorata), nominal transfer, dan foto bukti bayar.
- **QRIS Expiration Safety:** Transaksi upgrade QRIS memiliki timer countdown kedaluwarsa. Jika transaksi QRIS expired/dibatalkan, vendor **tetap menggunakan Paket Utama & kuota storage versi sebelumnya secara aman** tanpa ada gangguan pada langganan aktif.

**Aturan Prorata Harian & Upgrade Add-On Storage:**
- **Co-Terming Expiration:** Masa berlaku Add-On Storage **selalu diselaraskan (*co-terminous*)** dengan tanggal kedaluwarsa Paket Utama vendor (`expiresAt`).
- **Prorata Upgrade Add-On Custom:** Vendor yang meng-upgrade kuota custom dari kuota sebelumnya hanya membayar selisih GB tambahan ($\text{Selisih GB} \times \text{Rp } 1.250$).
- **Instant Quota Expansion:** Kuota storage (`addonStorageQuotaBytes`) diperbarui seketika saat Notifikasi Callback Payment Gateway / Polling Pending bernilai `paid` atau saat Admin menekan tombol Approve pada pengajuan manual.

---

### 3.3. Proteksi Galeri Klien: Glassmorphism Lock Overlay 🔒 & Grace Period

- **Proteksi Galeri Klien:**  
  Saat vendor/storage kedaluwarsa, galeri klien di `/gallery/[projectId]` menampilkan efek **Glassmorphism Lock Overlay 🔒** dengan pesan *"GALERI TERKUNCI SEMENTARA"* dan tombol hubungi studio via WhatsApp.
- **Garansi Keamanan Berkas Foto — Grace Period 30 Hari:** Berkas foto **TIDAK DIHAPUS** selama masa tenggang (*Grace Period*) 30 hari. Saat vendor memperpanjang storage, galeri otomatis terbuka instan.
- **Hard Purge setelah Grace Period:** Setelah 30 hari masa tenggang terlampaui, Background Daemon secara otomatis menghapus berkas foto fisik dari Google Drive sebagai *garbage collection*.
- **Auto-Cleanup Background Daemon (`lib/db.js`):**  
  Daemon background di Node.js mengeksekusi pembersihan otomatis setiap 60 detik:
  1. Memeriksa vendor yang storage-nya kedaluwarsa >30 hari.
  2. Menghapus berkas foto fisik untuk *garbage collection* jika melebihi masa tenggang 30 hari.
  3. Mengirim email peringatan otomatis di H-15 dan H-3 via SMTP.

---

### 3.4. Multi-Tenant Storage Metering (`usedStorageBytes`) & Google Drive Size Ingestion

- **Presisi Pengukuran Storage:**
  - Google Drive API list (`lib/google-master-drive.js`) menyertakan parameter `size`: `fields: 'nextPageToken, files(id, name, mimeType, size)'`.
  - Berkas foto diindeks dengan ukuran byte asli (`fileSizeBytes`).
  - Total byte foto proyek diakumulasikan ke kolom `usedStorageBytes` milik vendor di tabel `vendors`.
  - Hapus proyek/folder mengembalikan kuota secara instan (`usedStorageBytes - totalBytes`).
- **Capacity Meter Visual:** Progress bar di `/dashboard/storage` berubah warna secara dinamis menjadi merah saat penggunaan mencapai $\ge 90\%$.

---

### 3.5. Google Drive BYOS (Bring Your Own Storage)

- **Konsep:** Vendor dapat menghubungkan akun Google Drive pribadi sebagai storage dedicated untuk upload foto proyek.
- **Arsitektur Pool:** Platform mengelola multi-akun Google Drive (Master Index Hub + Worker Accounts) dalam satu pool terpadu.
- **Smart Capacity Load Balancing:** Mesin pemilih akun worker memilih lokasi penyimpanan berdasarkan sisa kapasitas terbesar secara otomatis.
- **Live GDrive API Rename & Move:** Superadmin dapat mengubah nama folder master cluster dan memindahkannya secara live via Google Drive API tanpa proses manual.
- **Isolated Vendor Folder:** Setiap vendor mendapat folder dedicated di dalam worker account yang terpilih.

---

### 3.6. Google Drive Importer (Zero-Storage, Master OAuth)

- **Metode:** Google OAuth 2.0 Master — menggunakan akun Google Studio Master Admin SaaS.
- **Alur Import Background:**
  1. Vendor memasukkan URL folder Google Drive → `parseFolderId()` mengurai ID folder.
  2. Proyek dibuat dengan status `importing`.
  3. `processImagesInBackground()` → `addToImportQueue()` (FIFO, max 1 concurrent).
  4. Pemindaian rekursif hingga **depth 5** (subfolder bertingkat).
  5. Memetakan foto & file RAW (`.cr2`, `.cr3`, `.arw`, `.nef`, `.dng`, `.heic`, dll.).
  6. Simpan metadata foto: `originalPath` = `/api/proxy/thumb/{id}/{name}?sz=w1200`, `thumbnailPath` = `?sz=w400`.

---

### 3.7. Proxy Media Stream (True Pipe Stream — Zero RAM)

- **Route:** `GET /api/proxy/thumb/[fileId]`
- **Response Stream:** Direct `ReadableStream` (`response.body`) tanpa memuat file ke RAM server (`arrayBuffer()`).
- **CDN Caching Header:**
  ```http
  Cache-Control: public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400
  CDN-Cache-Control: public, max-age=2592000
  Cloudflare-CDN-Cache-Control: public, max-age=2592000
  ```

---

### 3.8. Multi-Provider Payment Gateway

- **Arsitektur Multi-Provider:** Platform mendukung 4 payment gateway yang dapat dikonfigurasi Admin secara dinamis via `saas_settings` — tanpa mengubah kode apapun.
  
  | Provider | Metode Pembayaran | Driver |
  |---|---|---|
  | **Midtrans** (default) | QRIS + GoPay (Snap API) | `lib/payment-gateway/midtrans.js` |
  | **Xendit** | Invoice / Virtual Account | `lib/payment-gateway/xendit.js` |
  | **Tripay** | QRIS + VA | `lib/payment-gateway/tripay.js` |
  | **Duitku** | QRIS + VA | `lib/payment-gateway/duitku.js` |

- **Dispatcher terpusat:** `lib/payment-gateway/index.js` — semua API route memanggil `createPayment()` dan `verifyPaymentWebhook()` tanpa perlu tahu provider aktif.
- **Pembatalan Transaksi QRIS Atomik:** Panggilan `/api/payment/cancel` memperbarui status di tabel `payment_sessions` dan `payment_transactions` menjadi `'cancelled'` secara bersamaan.
- **Webhook Signature Verification:** Setiap provider memiliki algoritma verifikasi signature tersendiri (Midtrans: SHA512, Xendit: HMAC-SHA256, dll.) yang di-handle secara transparan oleh driver masing-masing.

---

### 3.9. Panel Superadmin (`/admin`)

- **Modul Pengaturan:** Integrasi Google Cloud OAuth, SMTP Mailer, Multi-Provider Payment Gateway, & System Quota.
- **Sub-Admin Team Management:** Superadmin dapat menambahkan, mengelola, dan menonaktifkan akun Sub-Admin dengan level akses terpisah dari akun Superadmin.
- **Kelola Add-On Plans:** Superadmin dapat mengubah harga, status, dan kuota Add-On Storage secara real-time.
- **Analytics Dashboard:** Statistik platform real-time: jumlah vendor aktif, total transaksi, pendapatan, penggunaan storage, dll.
- **Disk Stats Monitor:** Monitor penggunaan disk VPS secara real-time, lengkap dengan warning threshold yang dapat dikonfigurasi.
- **Indicator SMTP Warning Badge:** Badge visual `🟢 SMTP Aktif` / `⚠️ SMTP Belum Aktif` memberikan kepastian status mailer pada Admin Panel.

---

### 3.10. Sistem Email Notifikasi Terpadu (`lib/mailer.js`) & White-Label Invoice

Sistem email notifikasi dirancang 100% white-label tanpa mencantumkan brand gateway pihak ketiga:

1. **Email Tagihan QRIS Pending (`sendPendingQrisEmail`):**  
   * **Pemicu:** Dikirim seketika saat QRIS dibuat (`/api/payment/create`).
   * **Subjek:** `💳 Pendaftaran Akun [Nama App] Telah Diterima — Instruksi Pembayaran QRIS`
   * **Isi:** Memuat No. Order, Rincian Paket + Add-On Storage, Total Nominal, & Tombol `[ 🚀 Selesaikan Pembayaran QRIS Sekarang ]`.

2. **Email Instruksi Transfer Manual 24h (`sendPendingManualTransferInstructionEmail`):**  
   * **Pemicu:** Dikirim saat registrasi manual dipilih tanpa upload bukti.
   * **Subjek:** `📩 Pendaftaran Akun [Nama App] Telah Diterima — Instruksi Transfer Bank (Berlaku 24 Jam)`
   * **Isi:** Memuat No. Rekening BCA, Nominal Bayar, Batas Waktu 24 Jam, & Tombol `[ 📤 Upload Bukti Transfer Sekarang ]`.

3. **Email Pendaftaran Diterima (`sendPendingManualTransferReceivedEmail`):**  
   * **Pemicu:** Dikirim saat registrasi manual dilengkapi foto bukti transfer.
   * **Subjek:** `📩 Pendaftaran Akun [Nama App] Telah Diterima — Menunggu Verifikasi Pembayaran`
   * **Isi:** Menginfokan bahwa foto bukti transfer sedang diperiksa oleh Tim Admin (Est. Max 1x24 Jam).

4. **Email Bukti Invoice Lunas Resmi (`sendVendorApprovalEmail`):**  
   * **Pemicu:** Dikirim seketika saat pembayaran QRIS `paid` atau saat Admin mengeklik **Setujui/Approve** di Admin Dashboard.
   * **Subjek:** `🎉 Invoice Lunas: Akun Berlangganan [Nama App] Telah Aktif!`
   * **Isi:** Memuat Kotak Invoice HTML resmi dengan No. Invoice (`INV-xxx`), Metode Pembayaran (`QRIS Otomatis / Transfer Bank Manual`), Rincian Paket + Add-On Storage, dan Status `🟢 PAID / LUNAS (VERIFIED)`.

5. **Email Konfirmasi Upgrade/Perpanjangan & Add-On (`sendVendorUpgradeConfirmationEmail`):**  
   * **Pemicu:** Dikirim setelah Admin approve upgrade/perpanjangan manual, atau setelah webhook QRIS settlement untuk Add-On Storage.
   * **Subjek:** `🎉 Konfirmasi Upgrade/Perpanjangan Paket — [Nama App]`
   * **Isi:** Rincian paket baru, metode pembayaran yang digunakan, tanggal kedaluwarsa baru, dan masa aktif tambahan.

6. **Proteksi Privasi Klien:** Platform **TIDAK PERNAH** mengirimkan email otomatis ke pelanggan/klien akhir fotografer.

---

### 3.11. Batas Waktu 1x24 Jam Transfer Manual & Auto-Cleanup Daemon

- **Aturan Batas Waktu 24 Jam:** Pendaftaran Transfer Manual tanpa bukti bayar (`paymentProof IS NULL`) wajib diselesaikan dalam waktu 1x24 jam dari registrasi (`createdAt <= DATETIME('now', '-24 hours')`).
- **Auto-Cleanup Background Sync (`/api/admin/vendors`):** Background worker otomatis memperbarui status pendaftaran manual gantung yang melebihi 24 jam menjadi `expired_draft` dan memindahkannya ke **Sub-Tab Arsip** di Admin Panel, sehingga antrean Admin Panel selalu bersih.

---

### 3.12. RAW Selector — Sortir File RAW Lokal (100% Client-Side)

- **Arsitektur:** 100% Client-Side menggunakan **File System Access API** — tidak ada file yang di-upload ke server.
- **Fungsi:** Vendor dapat menyalin/memindahkan file RAW (`.cr2`, `.cr3`, `.arw`, `.nef`, `.dng`, `.raw`, dll.) dari folder lokal ke folder tujuan secara otomatis berdasarkan nama file yang dipilih klien.
- **Akses Berdasarkan Paket:** Pro & Business Plan mendapatkan akses penuh; Starter Plan terkunci; Free Trial dibatasi oleh `raw_sorter_trial_limit`.
- **Pencocokan:** Nama file galeri di-strip ekstensinya lalu dicocokkan secara *case-insensitive* dengan file di folder sumber.
- **Kompatibilitas:** Chrome 86+ / Edge 86+ (Firefox & Safari tidak mendukung File System Access API).

---

## 🔧 4. Tech Stack Produksi

| Layer | Teknologi | Versi |
|---|---|---|
| **Framework** | Next.js (App Router) | 14.2.3 |
| **Runtime** | Node.js | v24.x LTS |
| **Database** | SQLite via `better-sqlite3` | 11.x (WAL Mode) |
| **Auth** | JWT via `jsonwebtoken` | 9.x (httpOnly) |
| **Google Drive API** | `googleapis` (Drive API v3) | 140.x |
| **Email Mailer** | `nodemailer` (SMTP Gmail) | 9.x |
| **Payment Gateway** | Midtrans / Xendit / Tripay / Duitku | Multi-Provider |
| **Process Manager** | PM2 | Latest |
| **Container** | Docker Compose | Latest |

---

## 🚀 5. Fitur Laporan Keuangan Admin & Evaluasi Roadmap

1. **🟢 Ekspor Laporan Keuangan Admin (CSV / Excel — ✅ SELESAI & AKTIF):**  
   Superadmin dapat mengunduh berkas laporan transaksi pendapatan langganan paket utama dan Add-On Storage dalam format `.csv` melalui tombol **`📊 Unduh Laporan Keuangan (CSV)`** di Admin Dashboard.

2. **🟢 Sub-Admin Team Management (✅ SELESAI & AKTIF):**  
   Superadmin dapat menambahkan akun Sub-Admin dengan level akses terpisah dari akun Superadmin utama. Endpoint: `/api/admin/admins`.

3. **❌ Email Alert Admin & CSV Seleksi Vendor (DIBATALKAN):**  
   Email alert pendaftaran dibatalkan karena Admin sudah memiliki widget notifikasi real-time di dashboard. Rekap CSV seleksi vendor dibatalkan karena fitur RAW Selector lokal dan copy file name 1-klik sudah memenuhi kebutuhan fotografer.

---

*Spesifikasi Master Sistem ini disusun secara resmi sebagai rujukan tunggal pengoperasian SaaS Pick Your Photo.*
