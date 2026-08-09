# 🚀 03. Panduan Deployment, PM2 & Maintenance (Pick Your Photo)

> **Dokumen Panduan Production Deployment & Optimasi Performa Server**  
> Lokasi: `docs/03-DEPLOYMENT-GUIDE.md`  
> **Terakhir diperbarui:** 10 Agustus 2026 — *Disesuaikan dengan script deployment otomatis `deploy.sh` & `deploy-pm2.sh` terkini*

---

## 🛠️ 1. Persyaratan Server Produksi

| Komponen | Requirement |
|---|---|
| **OS** | Ubuntu 20.04 / 22.04 LTS (atau Linux server modern) |
| **Node.js** | v18.x / v20.x / v24.x LTS (Minimum v18+) |
| **Process Manager** | PM2 (`npm install -g pm2`) atau Docker Compose |
| **Reverse Proxy** | Nginx (disarankan untuk SSL Let's Encrypt) |
| **Storage Disk** | Minimal 5 GB (hanya untuk DB SQLite + logs — foto tidak disimpan di server) |
| **RAM** | Minimal 1 GB (proxy gambar via pipe stream, RAM ~0 per gambar) |
| **SQLite** | v3.35+ (mendukung `better-sqlite3` 11.x) |

---

## 📁 2. Struktur Direktori Penting

```
pick-your-photo/
├── app/                   # Next.js App Router (pages & API routes)
├── components/            # React components
├── lib/                   # Shared utilities (db, auth, gdrive, payment-gateway, dll.)
├── data/                  # 📂 DATABASE VOLUME — database.db di sini
│   └── database.db        # SQLite database (JANGAN hapus di produksi!)
├── public/
│   ├── staging_uploads/   # Upload sementara (bukti bayar, logo) — perlu persisted
│   └── vendor_logos/      # Logo vendor yang diunggah
├── .env.local             # Environment variables (JANGAN commit ke Git!)
├── deploy.sh              # Script deployment Docker Compose
├── deploy-pm2.sh          # Script deployment PM2
├── docker-compose.yml     # Konfigurasi Docker Compose
└── Dockerfile
```

**Yang WAJIB di-persist (volume mounting Docker / VPS):**
- `data/` — database SQLite (`database.db`)
- `public/staging_uploads/` — bukti transfer & file upload vendor
- `public/vendor_logos/` — logo brand vendor

---

## ⚙️ 3. Environment Variables (`.env.local`)

Salin dari `.env.example` dan isi nilainya:

```env
# JWT Authentication
JWT_SECRET=string_acak_panjang_minimal_32_karakter

# Superadmin Default
ADMIN_EMAIL=your@email.com
ADMIN_PASSWORD=password_aman

# Path storage (default sudah aman, ubah hanya jika pakai external disk)
DB_PATH=./data
STAGING_PATH=./public/staging_uploads
LOGOS_PATH=./public/vendor_logos

# Google OAuth (opsional di .env, bisa juga di-set via Admin Panel)
# GOOGLE_CLIENT_ID=xxx
# GOOGLE_CLIENT_SECRET=xxx
# GOOGLE_REFRESH_TOKEN=xxx
# GOOGLE_REDIRECT_URI=https://yourdomain.com/api/admin/auth/google/callback
```

> **Catatan:** Kredensial Google OAuth & Payment Gateway bisa disimpan di `.env.local` ATAU di `saas_settings` (DB via Admin Panel). Jika keduanya ada, `.env.local` lebih diprioritaskan.

---

## 📦 4. Alur Deployment Otomatis (`deploy-pm2.sh` & `deploy.sh`)

### Opsi A: Deployment PM2 (Rekomendasi VPS RAM 1 GB+)

Gunakan script `deploy-pm2.sh` untuk deployment 1-klik:

```bash
chmod +x deploy-pm2.sh
./deploy-pm2.sh
```

**Isi dan Langkah `deploy-pm2.sh`:**
1. **Verifikasi Node.js:** Memastikan versi Node.js minimal v18+.
2. **Git Pull:** Menarik kode terbaru dari branch `main`.
3. **Penyimpanan `.env.local` & Auto JWT:** Membuat `.env.local` dari `.env.example` jika belum ada dan otomatis generate 64 hex random key untuk `JWT_SECRET`.
4. **Npm Install:** Menginstall seluruh dependensi (termasuk `devDependencies` untuk Next build).
5. **Build Next.js:** Eksekusi `npm run build` dengan opsi `NODE_OPTIONS="--max-old-space-size=768"` untuk mencegah Out-Of-Memory (OOM) pada VPS kecil.
6. **Npm Prune:** Membersihkan `devDependencies` setelah build selesai untuk menghemat ruang disk.
7. **PM2 Zero-Downtime Reload:** Menggunakan `pm2 reload` (atau `pm2 start`) dan mengeksekusi `pm2 save`.

---

### Opsi B: Deployment Docker (`deploy.sh`)

Gunakan script `deploy.sh`:

```bash
chmod +x deploy.sh
./deploy.sh
```

**Isi dan Langkah `deploy.sh`:**
1. **Git Pull:** Menarik kode terbaru dari branch `main`.
2. **Setup `.env`:** Memastikan `.env` terkonfigurasi dan generate `JWT_SECRET`.
3. **Docker Compose Rebuild:** Eksekusi `docker compose up -d --build --remove-orphans`.
4. **Docker Prune:** Membersihkan cache image lama dengan `docker image prune -f`.

---

## 🖥️ 5. Konfigurasi & Perintah PM2

```bash
# Start pertama kali jika tanpa script
pm2 start npm --name "pick-your-photo" -- start

# Simpan konfigurasi PM2 agar auto-start saat reboot VPS
pm2 save
pm2 startup

# Monitoring aplikasi & resource
pm2 monit
pm2 status

# Melihat log aplikasi real-time
pm2 logs pick-your-photo --lines 100

# Restart / Reload manual
pm2 reload pick-your-photo
```

---

## 🐳 6. Deployment via Docker Compose

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data                             # 📂 SQLite DB
      - ./public/staging_uploads:/app/public/staging_uploads
      - ./public/vendor_logos:/app/public/vendor_logos
    environment:
      - NODE_ENV=production
    env_file:
      - .env.local
    restart: always
```

---

## 🧹 7. Pemeliharaan & Monitoring

### Backup Database Automatic & Manual

```bash
# Manual backup
cp data/database.db data/database_backup_$(date +%Y%m%d).db

# Skrip otomatis backup DB sudah tersedia di:
./scripts/backup-db.sh
```

### Monitoring Storage & Memory

- Server VPS **bebas dari file foto fisik** (Zero-Storage).
- Memory footprint sangat efisien karena proxy gambar menggunakan **True Pipe Stream** (`ReadableStream`) tanpa buffering ke RAM server.
- Monitoring berkas upload sementara di `./public/staging_uploads/`.

---

## 🔐 8. Setup Google OAuth Master (Pertama Kali)

1. Buka **Google Cloud Console** → buat OAuth 2.0 Client ID (Web Application).
2. Tambahkan redirect URI: `https://yourdomain.com/api/admin/auth/google/callback`.
3. Simpan `Client ID` dan `Client Secret` di Admin Panel → Settings → Google OAuth (atau di `.env.local`).
4. Di Admin Panel → klik **"Hubungkan Google Drive Master"** → login dengan akun Google Studio Master.
5. Setelah otorisasi, `refresh_token` dan `access_token` otomatis tersimpan di basis data `saas_settings`.
