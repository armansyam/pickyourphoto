# Pick-Your-Photo — Self-Hosted SaaS Platform for Photographers

> 📚 **DOKUMENTASI KEMAJUAN & BLUEPRINT PROYEK TERKINI**:
> Sebelum memulai sesi baru atau mengerjakan fitur, **WAJIB MEMERIKSA FOLDER [`docs/`](docs/README.md)**.
> Lihat **[`docs/README.md`](docs/README.md)** untuk membaca indeks dokumentasi, status pengerjaan fitur terkini, dan panduan berkas aktif!

---

**Pick-Your-Photo** adalah platform SaaS mandiri yang dirancang khusus untuk memudahkan fotografer (vendor) mengelola proses seleksi foto bersama klien secara online, dengan sistem berlangganan berbasis paket, manajemen galeri Zero-Storage, sortir file RAW lokal, dan integrasi Google Drive.

---

## 🏗️ Arsitektur & Spesifikasi Teknikal

| Layer | Teknologi & Implementasi |
|-------|--------------------------|
| **Framework** | Next.js 14.2.3 (App Router) |
| **Database** | SQLite via `better-sqlite3` (WAL mode, busy_timeout 10s) |
| **Autentikasi** | JWT (cookie `httpOnly`, 24 jam) + bcrypt (cost 10) |
| **Payment Gateway** | Multi-provider dispatcher: Midtrans Snap + Core API (QRIS/GoPay), Xendit, Tripay, Duitku |
| **Google Drive** | Master OAuth 2.0 (Drive API v3, scan rekursif hingga 5 subfolder) |
| **Proxy Gambar** | True Pipe Stream (`ReadableStream`) — RAM ~0 MB, Cloudflare CDN Cache 30 hari |
| **RAW Selector** | 100% Client-side sorting via File System Access API (Chrome/Edge) |
| **Email Notifikasi** | Nodemailer (SMTP otomatis via `saas_settings` DB) |
| **Process Manager** | PM2 |

---

## 🖥️ Spesifikasi Server Deployment (LXC 102)

| Parameter | Nilai |
|-----------|-------|
| **Container Deploy** | Proxmox LXC 102 |
| **IP Address LAN Deploy** | `192.168.100.83` |
| **Port Aplikasi** | `3051` |
| **Domain Utama (Primary)** | `https://pilih.ammang.my.id` |
| **Domain Sekunder** | `https://pick-your-photo.ammang.my.id` |
| **Process Manager** | PM2 (Node.js) |
| **Direktori Proyek di Server** | `/DATA/AppData/pickyourphoto` |

---

## ⚙️ Environment Variables Wajib

```env
JWT_SECRET=          # String acak panjang & aman (WAJIB, tidak boleh kosong)
ADMIN_EMAIL=         # Email akun superadmin
ADMIN_PASSWORD=      # Password akun superadmin
NODE_ENV=production
```

> **Catatan:** Integrasi Google OAuth Master, SMTP Email, dan Payment Gateway QRIS dikonfigurasi langsung melalui **Admin Panel → Settings** (tersimpan di `saas_settings` DB) tanpa perlu edit file `.env`.

---

## 🚀 Menjalankan Aplikasi

```bash
# Development (dengan HMR)
npm run dev

# Production Build & Start
npm run build
pm2 restart pickyourphoto || pm2 start npm --name "pickyourphoto" -- start
```

---

## 📊 Alur Operasional Sistem

### 1. Registrasi Vendor
```
Vendor mengisi form registrasi di /register
        │
        ├─ Paket Berbayar (Transfer Manual) ─► Status: pending_manual
        │                                       Admin approve di panel → active
        │                                       + Email notifikasi otomatis (SMTP)
        │
        └─ Paket Berbayar (QRIS/GoPay) ──────► Status: pending_payment
                                                Scan QR → Midtrans webhook/polling
                                                → active + Email notifikasi otomatis
                                                (Sesi QRIS expire dalam 2 jam / auto-cleanup)
```

> ⚠️ **Tidak ada paket gratis di form registrasi.**  
> Demo/trial tersedia khusus di **halaman landing page** (`/`) — tanpa perlu daftar akun, pengunjung langsung dapat mencoba galeri seleksi dengan folder Google Drive publik.

### 2. Galeri Trial Instan (Landing Page)
- Pengunjung input link folder Google Drive di halaman utama (`/`)
- Server memindai file & mengelompokkan berdasarkan subfolder/kategori
- Galeri instan dibuat dengan masa aktif (default: 30–60 menit)
- Pengunjung dapat mencoba pengalaman memilih foto secara real-time

### 3. RAW Selector (Sortir RAW Lokal)
- Fotografer membuka proyek di Dashboard → klik **"📁 Sortir RAW"**
- Browser menyalin/memindahkan file RAW (`.CR2`, `.NEF`, `.ARW`, `.DNG`, dll.) di folder lokal komputer fotografer sesuai nama file yang dipilih klien
- **0 Byte diunggah ke server** (100% menggunakan File System Access API browser)

---

## 🗂️ Struktur Data & Persistent Volume

| Direktori/File | Fungsi |
|---|---|
| `data/database.db` | SQLite database — **Wajib di-mount / di-backup** |
| `public/staging_uploads/payment_proofs/` | Bukti transfer pembayaran manual vendor |
| `public/vendor_logos/` | Brand logo studio vendor |
| `backups/` | Folder backup otomatis database (`.db`) & foto static |

> **Volume yang wajib di-mount di Docker/LXC:**  
> `./data`, `./public/staging_uploads`, `./public/vendor_logos`, `./backups`

---

## 📦 Paket Berlangganan (SaaS Multi-Tier)

| Paket | Proyek Maks. | Harga/Bulan | Custom Logo | RAW Selector |
|---|---|---|---|---|
| **Starter Plan** | 5 Proyek | Rp 49.000 | ❌ | ❌ |
| **Pro Studio Plan** | 20 Proyek | Rp 129.000 | ✅ | ❌ |
| **Business Studio Plan** | 50 Proyek | Rp 249.000 | ✅ | ✅ |

> **Fitur Semua Paket:** 30 hari masa aktif, **Unlimited Foto per Proyek** (Zero-Storage architecture — gambar langsung disajikan via Direct Stream Google CDN).

---

## 🎯 Status Fitur & Roadmap

| Fitur | Kategori | Keterangan & Status |
|---|---|---|
| **Email Expiry (H-3, H-1, H-0)** | 🔴 Core Mailer | ✅ **Selesai** — Otomatis dikirim via daemon `lib/db.js` & `lib/mailer.js` |
| **Badge Status Visual Dashboard** | 🎨 UI Dashboard | ✅ **Selesai** — Visualisasi status proyek (`Aktif`, `Selesai`, `Diarsipkan`, `Gagal`) |
| **Google Drive Direct Scanner** | ⚡ Zero-Storage | ✅ **Selesai** — Instan scan via Direct OAuth 2.0 API (RAM ~0 Byte) |
| **Export Rekap Seleksi CSV** | 📊 Reporting | 🟢 Fitur Tambahan — Unduh daftar nama foto terpilih klien dalam format CSV |

> Rincian lengkap rencana pengembangan dapat dibaca pada berkas [`docs/PLAN_FITUR_BARU.md`](docs/PLAN_FITUR_BARU.md) & [`docs/04-IMPLEMENTATION-PLAN.md`](docs/04-IMPLEMENTATION-PLAN.md).

---

## 📖 Dokumentasi Teknis Terstruktur

| Dokumen | Deskripsi & Isi |
|---|---|
| [`docs/01-SYSTEM-SPECIFICATION.md`](docs/01-SYSTEM-SPECIFICATION.md) | Visi, spesifikasi lengkap, arsitektur, dan lifecycle status |
| [`docs/02-DATABASE-AND-SECURITY.md`](docs/02-DATABASE-AND-SECURITY.md) | Skema tabel SQLite, indeks, migrasi, dan standar keamanan |
| [`docs/03-DEPLOYMENT-GUIDE.md`](docs/03-DEPLOYMENT-GUIDE.md) | Panduan deployment LXC, PM2, Docker, Nginx, dan SSL |
| [`docs/04-IMPLEMENTATION-PLAN.md`](docs/04-IMPLEMENTATION-PLAN.md) | Status fitur berjalan, roadmap prioritas, & audit history |
| [`docs/PLAN_FITUR_BARU.md`](docs/PLAN_FITUR_BARU.md) | Rencana & rincian fitur baru mendatang |
| [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md) | Dokumentasi API endpoint terperinci (Auth, Proxy, Payment, RAW Selector) |

---

*Dikelola oleh: **AGY (Antigravity)** — Tim AMS Development*


