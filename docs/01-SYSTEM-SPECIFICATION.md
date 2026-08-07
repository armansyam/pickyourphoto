# 📘 01. Spesifikasi Master Sistem, Visi & Arsitektur (Pick Your Photo)

> **Dokumen Resmi Spesifikasi Terpadu Platform SaaS Pick Your Photo**  
> Lokasi: `docs/01-SYSTEM-SPECIFICATION.md`  
> **Terakhir diperbarui:** 07 Agustus 2026 — *Konsolidasi Terpadu Seluruh Modul, Blueprint Add-On Storage 6.1 & Audit Logika*

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
| **Superadmin** | `/admin` | Pemilik SaaS — kelola vendor, paket utama, Add-On storage, payment gateway, setting sistem, & audit pool |
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
| **Pro Studio Plan** | 20 Proyek | Rp 129.000 | ✅ | ❌ |
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

### 3.2. Add-On Cloud Storage Engine & Prorata Pricing (Blueprint 6.1)

Sistem Add-On Cloud Storage bersifat dinamis dan dapat disesuaikan kebutuhan fotografer:

**Paket Add-On Storage Aktif (`addon_plans`):**
| Nama Paket Add-On | Kapasitas Storage | Harga / Bulan |
|---|---|---|
| **Add-On 25GB** | 25 GB | Rp 15.000 |
| **Add-On 50GB** | 50 GB | Rp 25.000 |
| **Add-On 100GB** | 100 GB | Rp 45.000 |
| **Add-On 200GB** | 200 GB | Rp 85.000 |

**Aturan Prorata Harian Add-On Storage:**
- **Co-Terming Expiration:** Masa berlaku Add-On Storage **selalu diselaraskan (*co-terminous*)** dengan tanggal kedaluwarsa Paket Utama vendor (`expiresAt`).
- **Kalkulasi Harga Prorata:**
  $$\text{Harga Prorata} = \max\left(10.000,\, \text{Round}\left( \frac{\text{Harga Addon}}{30} \times \text{Sisa Hari Paket Utama} \right)\right)$$
- **Instant Quota Expansion:** Kuota storage (`addonStorageQuotaBytes`) diperbarui seketika saat Notifikasi Callback Midtrans QRIS bernilai `paid`.

---

### 3.3. Proteksi Galeri Klien: Glassmorphism Lock Overlay 🔒 & Grace Period

- **Proteksi Galeri Klien:**
  Saat vendor/storage kedaluwarsa, galeri klien di `/gallery/[projectId]` menampilkan efek **Glassmorphism Lock Overlay 🔒** dengan pesan *"GALERI TERKUNCI SEMENTARA"* dan tombol hubungi studio via WhatsApp.
- **Garansi Keamanan Berkas Foto:** Berkas foto **TIDAK DIHAPUS** selama masa tenggang (*Grace Period*) 30 hari. Saat vendor memperpanjang storage, galeri otomatis terbuka instan.
- **Auto-Cleanup Background Daemon (`lib/db.js`):**
  Daemon background di Node.js mengeksekusi pembersihan otomatis setiap 60 detik:
  1. Memeriksa vendor yang storage-nya kedaluwarsa $>30$ hari.
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

### 3.5. Google Drive Importer (Zero-Storage, Master OAuth)

- **Metode:** Google OAuth 2.0 Master — menggunakan akun Google Studio Master Admin SaaS.
- **Alur Import Background:**
  1. Vendor memasukkan URL folder Google Drive $\rightarrow$ `parseFolderId()` mengurai ID folder.
  2. Proyek dibuat dengan status `importing`.
  3. `processImagesInBackground()` $\rightarrow$ `addToImportQueue()` (FIFO, max 1 concurrent).
  4. Pemindaian rekursif hingga **depth 5** (subfolder bertingkat).
  5. Memetakan foto & file RAW (`.cr2`, `.cr3`, `.arw`, `.nef`, `.dng`, `.heic`, dll.).
  6. Simpan metadata foto: `originalPath` = `/api/proxy/thumb/{id}/{name}?sz=w1200`, `thumbnailPath` = `?sz=w400`.

---

### 3.6. Proxy Media Stream (True Pipe Stream — Zero RAM)

- **Route:** `GET /api/proxy/thumb/[fileId]`
- **Response Stream:** Direct `ReadableStream` (`response.body`) tanpa memuat file ke RAM server (`arrayBuffer()`).
- **CDN Caching Header:**
  ```http
  Cache-Control: public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400
  CDN-Cache-Control: public, max-age=2592000
  Cloudflare-CDN-Cache-Control: public, max-age=2592000
  ```

---

### 3.7. Payment Gateway QRIS & Pembatalan Transaksi Atomik

- **Provider:** Midtrans Snap + Core API QRIS dengan Notifikasi Webhook Signature Hash SHA512 (`SHA512(orderId + statusCode + grossAmount + ServerKey)`).
- **Pembatalan Transaksi QRIS Atomik:** Panggilan `/api/payment/cancel` memperbarui status di tabel `payment_sessions` dan `payment_transactions` menjadi `'cancelled'` secara bersamaan.

---

### 3.8. Panel Superadmin (`/admin`)

- **Modul Pengaturan:** Integrasi Google Cloud OAuth, SMTP Mailer, Midtrans Payment Gateway, & System Quota.
- **Kelola Add-On Plans:** Superadmin dapat mengubah harga, status, dan kuota Add-On Storage secara real-time.
- **Indicator SMTP Warning Badge:** Badge visual `🟢 SMTP Aktif` / `⚠️ SMTP Belum Aktif` memberikan kepastian status mailer pada Admin Panel.

---

## 🔧 4. Tech Stack Produksi

| Layer | Teknologi | Versi |
|---|---|---|
| **Framework** | Next.js (App Router) | 14.2.3 |
| **Runtime** | Node.js | v24.16.0 LTS |
| **Database** | SQLite via `better-sqlite3` | 11.x (WAL Mode) |
| **Auth** | JWT via `jsonwebtoken` | 9.x (httpOnly) |
| **Google Drive API** | `googleapis` (Drive API v3) | 140.x |
| **Email Mailer** | `nodemailer` (SMTP Gmail) | 9.x |
| **Payment Gateway** | Midtrans QRIS API | Core API |

---

## 🚀 5. Fitur Laporan Keuangan Admin & Evaluasi Roadmap

1. **🟢 Ekspor Laporan Keuangan Admin (CSV / Excel — ✅ SELESAI & AKTIF):**  
   Superadmin dapat mengunduh berkas laporan transaksi pendapatan langganan paket utama dan Add-On Storage dalam format `.csv` melalui tombol **`📊 Unduh Laporan Keuangan (CSV)`** di Admin Dashboard.
2. **❌ Email Alert Admin & CSV Seleksi Vendor (DIBATALKAN):**  
   Email alert pendaftaran dibatalkan karena Admin sudah memiliki widget notifikasi real-time di dashboard. Rekap CSV seleksi vendor dibatalkan karena fitur RAW Selector lokal dan copy file name 1-klik sudah memenuhi kebutuhan fotografer.

---

*Spesifikasi Master Sistem ini disusun secara resmi sebagai rujukan tunggal pengoperasian SaaS Pick Your Photo.*
