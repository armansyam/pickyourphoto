# 📸 Pick Your Photo — SaaS Platform Fotografer & Galeri Klien Enterprise

> **Platform Web SaaS Manajemen Galeri Foto, Seleksi Foto Klien, dan Cloud Storage Dedicated Berkecepatan Tinggi untuk Studio Fotografi.**

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org)
[![Node.js](https://img.shields.io/badge/Node.js-v24_LTS-green?logo=node.js)](https://nodejs.org)
[![SQLite](https://img.shields.io/badge/SQLite-WAL_Mode-blue?logo=sqlite)](https://sqlite.org)
[![License](https://img.shields.io/badge/License-Private-red)](./LICENSE)

---

## 🚀 Fitur Utama Platform

### 💳 Multi-Provider Payment Gateway
Mendukung **4 provider pembayaran** yang dapat dipilih Admin secara dinamis via Admin Panel: **Midtrans**, **Xendit**, **Tripay**, dan **Duitku** — tanpa mengubah kode apapun. Seluruh payment flow (QRIS + Transfer Bank Manual) sepenuhnya otomatis, mulai dari pembuatan invoice hingga aktivasi akun vendor.

### 👑 Admin Control Hub & Multi-Tier Admin System
Superadmin dapat mengelola seluruh platform melalui Admin Panel terpadu — termasuk **Sub-Admin Team Management** (tambah/kelola akun admin dengan level akses terpisah), Kelola Vendor, Paket Langganan, Add-On Storage, dan System Settings.

### 📁 Google Drive BYOS (Bring Your Own Storage)
Vendor dapat menghubungkan akun Google Drive pribadi sebagai storage dedicated untuk upload foto. Platform mendukung arsitektur **Multi-Account Cloud Storage Pool** dengan **Smart Capacity Load Balancing** — secara otomatis memilih akun worker dengan sisa kapasitas terbesar.

### 💾 Enterprise Add-On Cloud Storage (10 GB – 200 GB)
Kalkulator kuota storage interaktif dengan pembayaran otomatis dan aktivasi instan. Tersedia 3 paket tetap (10/25/50 GB) dan paket **Custom Enterprise** (50–200 GB, Rp 1.250/GB). Mendukung pembelian Add-On bersamaan dengan registrasi paket utama (**Order Bump Modal**) maupun upgrade mandiri kapan saja.

### ⚡ Hardware Adaptive Concurrency & Turbo Upload Latency Governor
Pengunggah foto pintar otomatis hingga **8–10 thread paralel** di PC Overpower, dengan **Event Loop Latency Governor** yang menurunkan kecepatan secara halus saat pengguna membuka aplikasi berat (Photoshop/Lightroom) dan memulihkannya saat CPU kembali santai.

### 🔒 Proteksi Galeri Klien & Grace Period 30 Hari
Saat vendor/storage kedaluwarsa, galeri klien menampilkan efek **Glassmorphism Lock Overlay 🔒** tanpa menghapus foto. File fisik dijamin aman selama **30 hari Grace Period**. Setelah 30 hari, Hard Purge berjalan otomatis via Background Daemon.

### 🔬 RAW Selector — Sortir File RAW Lokal 100% Client-Side
Vendor dapat menyalin/memindahkan file RAW (`.cr2`, `.cr3`, `.arw`, `.nef`, dll.) dari folder lokal komputer ke folder tujuan secara otomatis — dicocokan berdasarkan nama file yang dipilih klien. **0 upload ke server**, menggunakan **File System Access API** browser.

### 📊 Laporan Keuangan Admin (CSV Export)
Superadmin dapat mengunduh laporan transaksi pendapatan langganan dan Add-On Storage dalam format `.csv` 1-klik langsung dari Admin Dashboard.

### 📦 Corporate Batch Upload Modal
Pratinjau batch unggah dengan 4 kartu statistik (Folder Utama, Total File, Total Sub-Folder, Estimasi Ukuran) dan rincian hierarki sub-folder sebelum pengunggahan dimulai.

### 🖼️ Zero-Storage Proxy Stream Architecture
Foto **tidak pernah tersimpan di server VPS**. Import metadata dari Google Drive secara langsung, lalu di-stream via True Pipe Stream (`ReadableStream`) ke klien — RAM server ~0 per request gambar, dengan cache agresif hingga 30 hari di Cloudflare CDN.

---

## 🛠️ Tech Stack Produksi

| Layer | Teknologi | Versi |
|---|---|---|
| **Framework** | Next.js (App Router) | 14.2.3 |
| **Runtime** | Node.js | v24.x LTS |
| **Database** | SQLite via `better-sqlite3` | 11.x (WAL Mode) |
| **Auth** | JWT via `jsonwebtoken` | 9.x (httpOnly Cookie) |
| **Google Drive API** | `googleapis` (Drive API v3) | 140.x |
| **Email Mailer** | `nodemailer` (SMTP) | 9.x |
| **Payment Gateway** | Midtrans / Xendit / Tripay / Duitku | Multi-Provider |
| **Process Manager** | PM2 | Latest |
| **Container** | Docker Compose | Latest |

---

## 📚 Dokumentasi Lengkap

Seluruh dokumen arsitektur teknis dan panduan peluncuran tersedia di folder [`docs/`](./docs):

| Dokumen | Deskripsi |
|---|---|
| 📄 [**Spesifikasi Sistem SaaS**](./docs/01-SYSTEM-SPECIFICATION.md) | Arsitektur utama, fitur SaaS, peran pengguna, email notifikasi, payment gateway |
| 📄 [**Skema Basis Data & Keamanan**](./docs/02-DATABASE-AND-SECURITY.md) | Skema SQLite lengkap, tabel payment, tabel Add-On, keamanan JWT & proxy |
| 📄 [**Panduan Deployment Produksi**](./docs/03-DEPLOYMENT-GUIDE.md) | PM2, Docker, Nginx SSL, Google OAuth setup, environment variables |
| 📄 [**Spesifikasi Master Cloud Storage**](./docs/04-MASTER-STORAGE-SPECIFICATION.md) | BYOS GDrive, Load Balancing, Turbo Upload, Grace Period & Hard Purge |
| 📄 [**Dokumentasi API Endpoints**](./docs/API_DOCUMENTATION.md) | Seluruh API endpoint: Auth, Admin, Payment Gateway, Storage, RAW Selector |

---

## ⚡ Quick Start (Lokal)

```bash
# 1. Clone dan masuk ke direktori
git clone https://github.com/armansyam/pickyourphoto.git
cd pick-your-photo

# 2. Salin template environment
cp .env.example .env.local

# 3. Install dependencies
npm install

# 4. Jalankan server development
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

---

## 🚀 Quick Deploy (Produksi)

### Opsi A — PM2 (Rekomendasi VPS / Default)
```bash
chmod +x deploy.sh
./deploy.sh
```

### Opsi B — Docker Compose
```bash
chmod +x deploy-docker.sh
./deploy-docker.sh
```

> Kedua script secara otomatis men-generate `JWT_SECRET` acak yang aman jika belum dikonfigurasi.

---

## 📋 Persyaratan Server

| Komponen | Requirement |
|---|---|
| **OS** | Ubuntu 20.04 / 22.04 LTS |
| **Node.js** | v18+ (disarankan v24 LTS) |
| **RAM** | Minimal 1 GB |
| **Disk** | Minimal 5 GB (DB SQLite + logs saja — foto tidak disimpan di server) |
| **Process Manager** | PM2 atau Docker Compose |

---

© 2026 Pick Your Photo SaaS Platform. All rights reserved.
