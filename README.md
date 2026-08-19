# 📸 Pick Your Photo — SaaS Platform Fotografer & Galeri Klien Enterprise

> **Platform Web SaaS Manajemen Galeri Foto, Seleksi Foto Klien, dan Cloud Storage Dedicated Berkecepatan Tinggi untuk Studio Fotografi.**

[![Next.js](https://img.shields.io/badge/Next.js-14.2.3-black?logo=next.js)](https://nextjs.org)
[![Node.js](https://img.shields.io/badge/Node.js-v24_LTS-green?logo=node.js)](https://nodejs.org)
[![SQLite](https://img.shields.io/badge/SQLite-WAL_Mode-blue?logo=sqlite)](https://sqlite.org)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-CDN_Cache_Ready-orange?logo=cloudflare)](https://cloudflare.com)
[![Developed by](https://img.shields.io/badge/Developer-AMS_DEV-purple)](https://github.com/armansyam)
[![License](https://img.shields.io/badge/License-Proprietary-red)](./LICENSE)

---

## 🚀 Fitur Unggulan Platform

### 💳 Multi-Provider Payment Gateway (Zero-Code Switch)
Mendukung **4 gateway pembayaran Indonesia**: **Midtrans**, **Xendit**, **Tripay**, dan **Duitku** yang dapat dipilih dan dikonfigurasi langsung via Admin Panel tanpa mengubah kode.
- **Otomatisasi Penuh:** Invoice QRIS dinamis & Transfer Bank Manual terverifikasi.
- **Proteksi Transaksi Atomic:** SQLite conditional lock mencegah *double activation* saat polling status frontend & webhook gateway masuk bersamaan.
- **Auto-Calculated Proration:** Perpanjangan dan upgrade paket secara otomatis menghitung akumulasi sisa hari aktif vendor.

### 👑 Admin Control Hub & Multi-Tier Admin System
- **Sub-Admin Management:** Tambah dan kelola akun staf admin dengan level otorisasi terisolasi dari akun Master Superadmin.
- **Master Account Drive Pool:** Manajemen multi-akun Google Drive Worker dengan kapasitas *load-balancing* cerdas.
- **Laporan Keuangan 1-Klik:** Ekspor ringkasan seluruh transaksi pembayaran ke format `.csv`.

### 🧹 Sistem Hard Purge Ganda (Otomatis 24 Jam & Manual)
- **Masa Tenggang Fleksibel (Grace Period):** Galeri klien terkunci sementara (*Soft Lock 🔒*) saat langganan vendor habis tanpa menghapus berkas foto.
- **Otomatis (24-Hour Daemon):** Server secara berkala membersihkan data vendor yang melewati masa tenggang langsung di background database.
- **Manual (Admin Button):** Tombol eksekusi instan di Admin Settings untuk memindai dan menghapus berkas fisik Google Drive Worker SaaS kapan saja.
- **Token Keamanan CRON:** Endpoint `/api/cron/purge-expired` diproteksi ganda dengan sesi Superadmin dan token `CRON_SECRET`.

### 🗄️ Backup & Disaster Recovery Suite Terpadu
- **Auto-Backup Berkala:** Penjadwalan snapshot database otomatis (interval 3, 6, 12, atau 24 jam).
- **Snapshot Manual 1-Klik:** Buat salinan cadangan instan sebelum melakukan perubahan besar.
- **Pre-Restore Snapshot Otomatis:** Sistem secara otomatis mengamankan database terkini sebelum proses restore dijalankan.
- **Upload & Unduh .db:** Dukungan unggah file cadangan dari komputer lokal dan download file backup langsung dari browser.

### 📁 Google Drive BYOS (Bring Your Own Storage)
Vendor dapat menghubungkan akun Google Drive pribadi mereka sendiri secara mandiri via OAuth 2.0. Berkas foto fisik tersimpan di cloud milik vendor, dengan fitur *auto-token refresh* dan *token revoke* otomatis saat akun dihapus.

### 💾 Enterprise Add-On Cloud Storage (10 GB – 200 GB)
Kalkulator kuota penyimpanan interaktif dengan 3 paket instan (10/25/50 GB) serta paket Custom Enterprise (50–200 GB, Rp 1.250/GB). Mendukung pembelian bersamaan saat registrasi paket utama (**Order Bump Modal**) maupun top-up mandiri.

### ⚡ Hardware Adaptive Concurrency & Turbo Upload Governor
Pengunggah foto multi-thread adaptif (**8–10 thread paralel**) dengan pengatur latensi cerdas (*Event Loop Latency Governor*) yang otomatis menurunkan beban saat pengguna membuka aplikasi berat (Photoshop/Lightroom) dan menaikkan kembali saat CPU senggang.

### 🔬 RAW Selector — Sortir File RAW 100% Client-Side
Vendor dapat menyalin/memindahkan file RAW asli (`.cr2`, `.cr3`, `.arw`, `.nef`, dll.) dari folder lokal komputer ke folder hasil seleksi secara otomatis sesuai pilihan klien. **0 byte diunggah ke server**, menggunakan **File System Access API** browser.

### 🖼️ Zero-Storage Proxy Stream Architecture
Foto **tidak disimpan di storage server VPS**. Metadata diimpor dari Google Drive, lalu dialirkan via *True Pipe Stream* (`ReadableStream`) ke browser klien. Penggunaan RAM server mendekati ~0 MB per request gambar, didukung integrasi cache edge hingga 30 hari di Cloudflare CDN.

---

## 🛠️ Tech Stack Produksi

| Layer | Komponen / Library | Keterangan |
|---|---|---|
| **Framework** | [Next.js](https://nextjs.org) 14.2.3 (App Router) | React Server Components & API Routes |
| **Runtime** | [Node.js](https://nodejs.org) v18+ (Disarankan v24 LTS) | Fast async runtime |
| **Database** | SQLite via [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) | WAL Mode, concurrency timeout 10s |
| **Autentikasi** | JWT via [`jsonwebtoken`](https://github.com/auth0/node-jsonwebtoken) | Secure httpOnly cookie, fresh DB check |
| **Hashing** | [`bcryptjs`](https://github.com/dcodeIO/bcrypt.js) | Salted password hashing (cost 10) |
| **Cloud API** | [`googleapis`](https://github.com/googleapis/google-api-nodejs-client) v140+ | Google Drive API v3 OAuth & Streams |
| **Email SMTP** | [`nodemailer`](https://nodemailer.com) | HTML transactional emails |
| **Payment Gateway** | Midtrans / Xendit / Tripay / Duitku | Signature verification SHA512/MD5 |
| **Process Manager** | PM2 (`ecosystem.config.js`) | Zero-downtime cluster/fork daemon |
| **Container** | Docker & Docker Compose | Multi-stage lightweight Alpine runner |

---

## 📁 Struktur Direktori Proyek

```
pick-your-photo/
├── app/                        # Next.js App Router (Pages & API Endpoints)
│   ├── (auth)/                 # Rute Auth (Login & Registrasi Vendor)
│   ├── admin/                  # Dashboard Superadmin & Settings Panel
│   ├── api/                    # REST API Endpoints (Admin, Auth, Storage, Cron, Proxy)
│   ├── dashboard/              # Panel Kerja Vendor (Proyek, Galeri, Kuota)
│   └── gallery/                # Halaman Seleksi Foto Interaktif Klien
├── components/                 # Komponen React Reusable (UI & Modal)
│   └── admin/                  # Komponen Admin Settings, Trial & Upgrades
├── data/                       # Volume SQLite & Private Storage (Bukti Transfer)
├── docs/                       # Dokumentasi Arsitektur Lengkap (01 s/d 04)
├── lib/                        # Core Utilities (Database, Auth, Rate Limit, Cloud Drive)
├── public/                     # Static Assets, Panduan & Vendor Logos
├── scripts/                    # Shell Scripts (Auto Backup DB & Photos, Restore DB)
├── .env.example                # Template Variabel Lingkungan
├── deploy.sh                   # Script Deployment Otomatis PM2
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

### 📌 Persiapan Wajib Sebelum Deploy
Pastikan Anda telah mengisi kredensial Superadmin di berkas `.env.local` server VPS Anda:

```bash
ADMIN_EMAIL=admin@domainanda.com
ADMIN_PASSWORD=Password_Kuat_Pilihan_Anda_2026!
```

---

### Opsi A: Deployment Otomatis PM2 (Sangat Direkomendasikan untuk VPS/LXC)

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

## 🌐 Konfigurasi Cloudflare CDN & Cache Rules (Wajib untuk Streaming Gambar)

Platform **Pick Your Photo** menggunakan arsitektur *Zero-Storage Media Proxy*. Untuk performa maksimal dan efisiensi RAM/Bandwidth VPS, aktifkan **1 Cache Rule** di dashboard Cloudflare (Free Tier):

### 1. Buat Cache Rule untuk Thumbnail Stream
1. Buka **Dashboard Cloudflare** → Pilih domain Anda.
2. Masuk ke menu **Caching** → **Cache Rules** → Klik **Create Rule**.
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

### 2. Konfigurasi SSL/TLS
- Menu **SSL/TLS** → **Overview** → Pilih mode **Full** atau **Full (Strict)**.

### 3. Rekomendasi Fitur Performa Tambahan
- **Speed** → **Optimization** → Aktifkan **Brotli** & **Early Hints**.
- **Network** → Aktifkan **HTTP/3 (QUIC)** & **0-RTT Connection Resumption**.

---

## 📋 Persyaratan Minimum Server

| Komponen | Spesifikasi Minimum | Rekomendasi Produksi |
|---|---|---|
| **OS** | Ubuntu 20.04 LTS / Debian 11 | Ubuntu 22.04 / 24.04 LTS |
| **Node.js** | Node.js v18.x | Node.js v24.x LTS |
| **RAM** | 1 GB | 2 GB+ |
| **CPU** | 1 vCPU | 2 vCPU |
| **Storage** | 5 GB SSD (SQLite & Logs) | 20 GB SSD |

---

## 📚 Dokumentasi Lanjutan

Rincian spesifikasi teknis dan panduan integrasi lebih lanjut tersedia di folder [`docs/`](./docs):
- 📄 [**01-SYSTEM-SPECIFICATION.md**](./docs/01-SYSTEM-SPECIFICATION.md) — Arsitektur sistem, peran user, dan alur pembayaran.
- 📄 [**02-DATABASE-AND-SECURITY.md**](./docs/02-DATABASE-AND-SECURITY.md) — Skema database lengkap & strategi keamanan.
- 📄 [**03-DEPLOYMENT-GUIDE.md**](./docs/03-DEPLOYMENT-GUIDE.md) — Panduan konfigurasi Nginx reverse proxy, certbot, dan PM2.
- 📄 [**04-MASTER-STORAGE-SPECIFICATION.md**](./docs/04-MASTER-STORAGE-SPECIFICATION.md) — Spesifikasi multi-worker pool Google Drive.
- 📄 [**API_DOCUMENTATION.md**](./docs/API_DOCUMENTATION.md) — Daftar lengkap endpoint REST API.

---

## 🛡️ Lisensi & Hak Cipta

Dikelola dan dikembangkan oleh **AMS DEV (Arman Syam)**.  
Hak Cipta © 2026 **Pick Your Photo SaaS Platform**. Seluruh hak cipta dilindungi undang-undang.
