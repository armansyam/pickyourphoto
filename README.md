# 📸 Pick Your Photo — SaaS Platform Fotografer & Galeri Klien Enterprise

> **Platform Web SaaS All-in-One: Manajemen Galeri Foto Klien, Seleksi Foto Interaktif Berkecepatan Tinggi, Multi-Account Cloud Storage Pool (Google Drive Master Hub + Workers), serta Multi-Provider Payment Gateway Indonesia.**

[![Next.js](https://img.shields.io/badge/Next.js-14.2.3-black?logo=next.js)](https://nextjs.org)
[![Node.js](https://img.shields.io/badge/Node.js-v18+_LTS-green?logo=node.js)](https://nodejs.org)
[![SQLite](https://img.shields.io/badge/SQLite-WAL_Mode-blue?logo=sqlite)](https://sqlite.org)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-CDN_Cache_Ready-orange?logo=cloudflare)](https://cloudflare.com)
[![Developed by](https://img.shields.io/badge/Developer-AMS_DEV-purple)](https://github.com/armansyam)
[![License](https://img.shields.io/badge/License-Proprietary-red)](./LICENSE)

---

## 🚀 Fitur Lengkap & Keunggulan Platform

### 💳 1. Multi-Provider Payment Gateway (Zero-Code Switch)
Mendukung **6 Gateway Pembayaran Indonesia** yang dapat dipilih dan diaktifkan secara dinamis melalui Admin Panel tanpa mengubah satu baris kode pun:
1. **IPaymu** (Direct QRIS API — Rekomendasi Bebas Iframe)
2. **Midtrans** (Snap Popup / Direct QRIS / GoPay)
3. **Xendit** (Xendit Invoice API & Virtual Account)
4. **Tripay** (Closed Payment QRIS & Virtual Account)
5. **Duitku** (Duitku Pop & QRIS)
6. **DOKU** (DOKU Checkout & Direct Pay)

- **Otomatisasi Penuh:** Penerbitan Invoice QRIS dinamis real-time & verifikasi Transfer Bank Manual.
- **Proteksi Transaksi Atomic:** SQLite conditional lock (`WHERE status = 'pending'`) mencegah *double activation* saat polling status frontend dan webhook gateway masuk bersamaan.
- **Order Bump Modal:** Calon vendor dapat memilih paket tambahan penyimpanan (*Add-On Storage 10–200 GB*) saat checkout registrasi awal dalam satu tagihan QRIS terpadu.
- **Uji Konektivitas Live:** Pengujian koneksi API gateway secara instan melalui endpoint `/api/admin/payment/test`.

---

### 📦 2. Multi-Account Cloud Storage Pool & Direct Upload Tickets
- **Google Drive Multi-Account Pool:** Memisahkan akun **Master Index Hub** (pemilik metadata & hierarki folder) dan **Worker Accounts** (penyimpan berkas fisik terdistribusi).
- **Smart Capacity Load Balancing:** Sistem secara otomatis menempatkan file vendor baru ke akun worker aktif dengan sisa kapasitas terbanyak (*Highest Free Space First*).
- **Direct Upload Streaming Tickets (`/api/storage/upload/ticket`):** Vendor mengunggah foto berukuran besar secara langsung melalui tiket otorisasi berumur pendek ke worker account tanpa membebani disk lokal atau RAM server VPS.
- **Hardware Adaptive Concurrency & Turbo Upload Governor:** 
  - Mode adaptif 4, 8, hingga **10 thread paralel** (*Workstation Mode*).
  - *Dynamic Event-Loop Latency Governor* mengukur responsivitas browser setiap 1.5 detik: otomatis menurunkan thread (`10 ➔ 8 ➔ 6 ➔ 4`) jika CPU sibuk membuka Photoshop/Lightroom, dan melesat kembali saat CPU senggang.
- **Google Drive BYOS (Bring Your Own Storage):** Opsi bagi fotografer untuk menghubungkan akun Google Drive pribadi mereka sendiri secara mandiri via OAuth 2.0.

---

### 🖼️ 3. Zero-Storage Media Streaming Proxy
- **Bebas Beban Disk VPS:** Foto **tidak disimpan di storage server VPS**. Metadata diimpor dari Google Drive, lalu dialirkan melalui *Native Pipe Stream* (`ReadableStream`) ke browser klien.
- **RAM Server ~0 MB:** Streaming langsung dari Google CDN ke klien tanpa akumulasi memory buffer di server.
- **Cloudflare Edge Caching:** Integrasi cache edge 30 hari di Cloudflare CDN dan 7 hari di browser klien untuk kecepatan load kilat.

---

### 🔬 4. RAW Selector — Sortir File RAW 100% Client-Side
- Vendor dapat menyalin atau memindahkan file RAW asli (`.cr2`, `.cr3`, `.arw`, `.nef`, `.dng`, `.heic`, dll.) dari folder lokal komputer ke folder hasil seleksi secara otomatis berdasarkan daftar pilihan foto klien.
- **100% Client-Side:** Memanfaatkan **File System Access API** browser (Chrome/Edge 86+). **0 byte data RAW yang diunggah ke server**, menjaga privasi dan menghemat bandwidth.

---

### 👑 5. Admin Control Hub (8 Tab Operasional Terpadu)
Dashboard Superadmin di `/admin` dilengkapi 8 modul kendali terpisah:
1. **Analytics & Financial CSV:** Grafik pendapatan, metrik vendor aktif, konversi, dan tombol unduh laporan keuangan `.csv` 1-klik.
2. **Inquiry / Leads:** Manajemen antrean calon vendor, status checkout, dan tindak lanjut pembayaran.
3. **Upgrades & Perpanjangan:** Verifikasi persetujuan (*approval*) upgrade paket dan add-on storage manual dengan foto bukti transfer.
4. **Vendors:** Daftar seluruh vendor, status langganan, kuota terpakai, reset status, arsip, dan penghapusan akun.
5. **Plans & Add-On Management:** Pengaturan harga dan kuota paket utama (Starter, Pro Studio, Business Studio) serta paket Add-On Storage.
6. **Trial Control:** Pengaturan demo galeri trial publik (limit foto, limit seleksi, masa aktif galeri demo).
7. **Storage Pool Management:** Monitor kapasitas akun Master Hub & Worker, live rename/move Google Drive cluster, dan tambah worker account baru.
8. **Settings & Sub-Admin Team:** Pengaturan identitas SaaS, integrasi Google OAuth, SMTP Mailer + Live Test, Gateway Pembayaran, Bank Transfer, Backup & Restore, serta manajemen akun staf Sub-Admin.

---

### 🧹 6. Grace Period 30 Hari & Hard Purge Daemon
- **Masa Tenggang Fleksibel (Grace Period 30 Hari):** Galeri klien terkunci sementara (*Glassmorphism Soft Lock 🔒*) saat langganan vendor kedaluwarsa tanpa langsung menghapus foto.
- **Peringatan Otomatis:** Email peringatan dikirimkan pada H-15 dan H-3 sebelum pembersihan permanen.
- **Autonomous Daemon Cron (`/api/cron/purge-expired`):** Daemon background membersihkan data vendor dan berkas foto fisik di Google Drive pool setelah melewati masa tenggang 30 hari.

---

### 🗄️ 7. Backup & Disaster Recovery Suite Terpadu
- **Auto-Backup Terjadwal:** Penjadwalan snapshot database SQLite otomatis (interval 3, 6, 12, atau 24 jam).
- **Snapshot Manual & Pre-Restore:** Pembuatan salinan cadangan instan satu klik sebelum proses restore atau perubahan besar dieksekusi.
- **Upload & Download .db:** Dukungan unduh dan unggah berkas cadangan langsung dari browser.

---

## 🛠️ Tech Stack Produksi Aktual

| Layer | Komponen / Library | Versi / Keterangan |
|---|---|---|
| **Framework** | [Next.js](https://nextjs.org) (App Router) | **14.2.3** (React 18, Server Components & API Routes) |
| **Runtime** | [Node.js](https://nodejs.org) | **v18+ / v20+ / v24.x LTS** |
| **Database** | SQLite via [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) | **v11.x** (WAL Mode, Concurrency Timeout 10s) |
| **Autentikasi** | JWT via [`jsonwebtoken`](https://github.com/auth0/node-jsonwebtoken) | **v9.x** (httpOnly Cookie, Fresh DB Checks) |
| **Password Hashing** | [`bcryptjs`](https://github.com/dcodeIO/bcrypt.js) | **v3.x** (Salted Hash, Cost 10) |
| **Cloud Storage** | [`googleapis`](https://github.com/googleapis/google-api-nodejs-client) | **v140.x** (Google Drive API v3) |
| **Email Mailer** | [`nodemailer`](https://nodemailer.com) | **v9.x** (White-Label HTML Transactional Emails) |
| **Payment Gateway** | IPaymu, Midtrans, Xendit, Tripay, Duitku, DOKU | Multi-Provider Signature Verification |
| **Process Manager** | PM2 (`ecosystem.config.js`) | Zero-downtime cluster/fork runner |
| **Container** | Docker & Docker Compose | Multi-stage Alpine container |

---

## 📁 Struktur Direktori Proyek

```
pick-your-photo/
├── app/                        # Next.js App Router (Pages & 70+ REST API Routes)
│   ├── (auth)/                 # Rute Auth (Login & Registrasi Vendor)
│   ├── admin/                  # Dashboard Superadmin & Settings Panel (8 Tab)
│   ├── api/                    # REST API Endpoints (Admin, Auth, Storage, Cron, Proxy, Payment)
│   ├── dashboard/              # Panel Kerja Vendor (Proyek, Galeri, Kuota Storage)
│   │   └── storage/            # Dedicated Cloud Storage Explorer & Batch Uploader
│   ├── gallery/                # Halaman Seleksi Foto Interaktif Klien
│   ├── storage/                # Halaman Galeri Berbasis Folder Storage Langsung
│   └── trial/                  # Sesi Demo Galeri Publik
├── components/                 # Komponen React Reusable (UI, Modals, Admin Settings)
│   ├── admin/                  # Komponen Tab Admin (Overview, Plans, Settings, StoragePool, Trial, Upgrades, Vendors)
│   ├── DevWatermark.js         # Watermark Developer AMS Non-Blocking
│   ├── NativeQrisDisplay.jsx   # Komponen Render QRIS Dinamis & Timer
│   ├── RawSorterDrawer.jsx     # Modal RAW Sorter 100% Client-Side
│   ├── StorageIcons.jsx        # Pustaka Ikon SVG Terpadu
│   └── TrialWidget.jsx         # Widget Demo Trial Publik
├── data/                       # 📂 Database Volume SQLite & Bukti Pembayaran (Wajib Persist!)
├── docs/                       # 📚 Dokumentasi Arsitektur Resmi Lengkap (01 s/d 04 & API)
├── hooks/                      # Custom React Hooks (useRawSorter.js)
├── lib/                        # Utilitas Inti Backend
│   ├── payment-gateway/        # Drivers: ipaymu.js, midtrans.js, xendit.js, tripay.js, duitku.js, doku.js, index.js
│   ├── auth.js                 # JWT & Role Verification Middleware
│   ├── db.js                   # SQLite Connection, Schemas & Auto-Cleanup Cron
│   ├── google-master-drive.js  # Google Drive API Master & Worker Pool Engine
│   ├── mailer.js               # Sistem Notifikasi Email White-Label
│   └── rate-limit.js           # API Rate Limiter
├── public/                     # Static Assets, Panduan (guide.html) & Logo Vendor
├── scripts/                    # Shell Scripts (Auto Backup DB & Photos, Restore DB)
├── .env.example                # Template Variabel Lingkungan
├── deploy.sh                   # Script Deployment Otomatis PM2 (One-Click Deploy)
├── deploy-docker.sh            # Script Deployment Docker Compose
├── docker-compose.yml          # Konfigurasi Container Produksi
├── Dockerfile                  # Multi-stage Docker Build Recipe
└── ecosystem.config.js         # Konfigurasi Runtime PM2
```

---

## ⚡ Panduan Instalasi Lokal (Development)

```bash
# 1. Kloning repositori
git clone https://github.com/armansyam/pickyourphoto.git
cd pick-your-photo

# 2. Siapkan file environment
cp .env.example .env.local

# 3. Instal semua dependensi
npm install

# 4. Jalankan server dev lokal
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

## 🚀 Panduan Deployment Produksi (VPS)

### 📌 Persiapan Kredensial Superadmin
Pastikan Anda telah mengisi akun Superadmin di berkas `.env.local` server VPS Anda:

```bash
ADMIN_EMAIL=admin@domainanda.com
ADMIN_PASSWORD=Password_Kuat_Pilihan_Anda_2026!
```

---

### Opsi A: Deployment Otomatis PM2 (Direkomendasikan)

Script `deploy.sh` telah dilengkapi otomasi pembuatan secret acak 64-karakter (`JWT_SECRET` & `CRON_SECRET`), instalasi dependensi, build produksi Next.js, dan reload PM2:

```bash
# Berikan izin eksekusi lalu jalankan
chmod +x deploy.sh
./deploy.sh
```

**Pastikan PM2 otomatis aktif saat VPS reboot:**
```bash
pm2 save && pm2 startup
```

---

### Opsi B: Deployment Container Docker Compose

```bash
chmod +x deploy-docker.sh
./deploy-docker.sh
```

---

## 🌐 Konfigurasi Cloudflare CDN (Wajib untuk Streaming Gambar)

Platform **Pick Your Photo** menggunakan arsitektur *Zero-Storage Media Proxy*. Untuk performa maksimal dan efisiensi RAM/Bandwidth VPS, aktifkan **1 Cache Rule** di dashboard Cloudflare (Free Tier):

1. Masuk ke **Dashboard Cloudflare** → Pilih domain Anda.
2. Buka menu **Caching** → **Cache Rules** → Klik **Create Rule**.
3. Isi parameter aturan berikut:
   - **Rule name:** `Cache Thumbnail Stream`
   - **Field:** `URI Path`
   - **Operator:** `starts with`
   - **Value:** `/api/proxy/thumb/`
4. Di bagian **Cache settings**:
   - **Cache eligibility:** Pilih `Eligible for cache` (Cache Everything)
   - **Edge TTL:** Pilih `Respect origin server` *(sistem mengirim header 30 hari)*
   - **Browser TTL:** Pilih `Respect origin server` *(sistem mengirim header 7 hari)*
5. Klik **Deploy**.

---

## 📚 Dokumentasi Teknis Lengkap

Rincian spesifikasi teknis dan panduan integrasi lebih lanjut tersedia di folder [`docs/`](./docs):
- 📄 [**01-SYSTEM-SPECIFICATION.md**](./docs/01-SYSTEM-SPECIFICATION.md) — Spesifikasi master sistem, 6 payment gateway, dan fitur SaaS.
- 📄 [**02-DATABASE-AND-SECURITY.md**](./docs/02-DATABASE-AND-SECURITY.md) — Skema database lengkap SQLite & arsitektur keamanan.
- 📄 [**03-DEPLOYMENT-GUIDE.md**](./docs/03-DEPLOYMENT-GUIDE.md) — Panduan konfigurasi server, PM2, dan Nginx SSL.
- 📄 [**04-MASTER-STORAGE-SPECIFICATION.md**](./docs/04-MASTER-STORAGE-SPECIFICATION.md) — Spesifikasi multi-account storage pool Google Drive.
- 📄 [**API_DOCUMENTATION.md**](./docs/API_DOCUMENTATION.md) — Katalog lengkap 70+ endpoint REST API.

---

## 🛡️ Lisensi & Hak Cipta

Dikelola dan dikembangkan oleh **AMS DEV (Arman Syam)**.  
Hak Cipta © 2026 **Pick Your Photo SaaS Platform**. Seluruh hak cipta dilindungi undang-undang.
