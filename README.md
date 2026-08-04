# Pick-Your-Photo — Self-Hosted SaaS Platform for Photographers

**Pick-Your-Photo** adalah platform SaaS mandiri yang dirancang khusus untuk memudahkan fotografer (vendor) mengelola proses seleksi foto bersama klien secara online, dengan sistem berlangganan berbasis paket, manajemen galeri Zero-Storage, dan integrasi Google Drive.

---

## 🏗️ Arsitektur Sistem

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 14.2.3 (App Router) |
| Database | SQLite via `better-sqlite3` (WAL mode) |
| Autentikasi | JWT (cookie `httpOnly`, 24 jam) + bcrypt |
| Payment Gateway | Midtrans Snap + Core API (QRIS/GoPay) |
| Google Drive | Master OAuth 2.0 (Drive API v3, rekursif 5 level) |
| Proxy Gambar | True Pipe Stream — RAM ~0, Cloudflare cache 30 hari |
| Process Manager | PM2 |
| Email Notifikasi | Nodemailer (SMTP via `saas_settings`) |

---

## 🖥️ Spesifikasi Server Deployment (LXC 102)

| Parameter | Nilai |
|-----------|-------|
| **Container Deploy** | LXC 102 |
| **IP Address LAN Deploy** | `192.168.100.83` |
| **Port Aplikasi** | `3051` |
| **Domain Utama (Primary)** | `https://pilih.ammang.my.id` |
| **Domain Sekunder** | `https://pick-your-photo.ammang.my.id` |
| **Process Manager** | PM2 (Node.js) |
| **Direktori Proyek di LXC 102** | `/DATA/AppData/pickyourphoto` |

---

## ⚙️ Environment Variables Wajib

```env
JWT_SECRET=          # String acak panjang & aman (WAJIB, tidak boleh kosong)
ADMIN_EMAIL=         # Email akun superadmin
ADMIN_PASSWORD=      # Password akun superadmin
NODE_ENV=production
```

> **Catatan:** Google OAuth, SMTP, dan Payment Gateway dikonfigurasi via **Admin Panel → Settings** (tersimpan di `saas_settings` DB) — tidak perlu di `.env`.

---

## 🚀 Menjalankan Aplikasi

```bash
# Development (clear cache otomatis)
npm run dev

# Production Build & Start
npm run build
pm2 restart pickyourphoto || pm2 start npm --name "pickyourphoto" -- start
```

---

## 📊 Alur Registrasi Vendor

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
                                                (Sesi QRIS expire sesuai konfigurasi Admin)
```

> ⚠️ **Tidak ada paket gratis di form registrasi.**  
> Demo/trial tersedia khusus di **halaman landing page** (`/`) — tanpa akun, langsung coba galeri seleksi dengan folder Google Drive sendiri.

---

## 🗂️ Struktur Data Penting

| Direktori/File | Fungsi |
|---|---|
| `data/database.db` | SQLite database — **JANGAN hapus di produksi** |
| `public/staging_uploads/payment_proofs/` | Bukti transfer vendor |
| `public/vendor_logos/` | Logo studio vendor |
| `backups/` | Auto-backup database (via Admin Panel) |

> **Volume yang wajib di-mount (Docker):** `data/`, `public/staging_uploads/`, `public/vendor_logos/`

---

## 📦 Paket Berlangganan

| Paket | Proyek Maks. | Harga/Bulan | Custom Logo | RAW Selector |
|---|---|---|---|---|
| Starter Plan | 5 | Rp 49.000 | ❌ | ❌ |
| Pro Studio Plan | 20 | Rp 129.000 | ✅ | ❌ |
| Business Studio Plan | 50 | Rp 249.000 | ✅ | ✅ |

> Semua paket: **30 hari masa aktif**, **Unlimited foto** (Zero-Storage — tidak ada file di server).

---

## 📖 Dokumentasi Lengkap

| Dokumen | Isi |
|---|---|
| [`docs/01-SYSTEM-SPECIFICATION.md`](docs/01-SYSTEM-SPECIFICATION.md) | Spesifikasi sistem, fitur, lifecycle status |
| [`docs/02-DATABASE-AND-SECURITY.md`](docs/02-DATABASE-AND-SECURITY.md) | Skema database, keamanan, migrasi |
| [`docs/03-DEPLOYMENT-GUIDE.md`](docs/03-DEPLOYMENT-GUIDE.md) | Panduan deployment, PM2, Docker |
| [`docs/04-IMPLEMENTATION-PLAN.md`](docs/04-IMPLEMENTATION-PLAN.md) | Status fitur & roadmap |
| [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md) | Dokumentasi API endpoint lengkap |

---

*Dikelola oleh: **AGY (Antigravity)** — Tim AMS Development*
