# 🚀 03. Panduan Deployment, PM2 & Maintenance (Pick Your Photo)

> **Dokumen Panduan Production Deployment & Optimasi Performa Server**  
> Lokasi: `docs/03-DEPLOYMENT-GUIDE.md`  
> **Terakhir diperbarui:** 2026-08-05 — disesuaikan dengan script deployment aktual

---

## 🛠️ 1. Persyaratan Server Produksi

| Komponen | Requirement |
|---|---|
| **OS** | Ubuntu 20.04 / 22.04 LTS (atau Linux server) |
| **Node.js** | v18.x / v20.x LTS |
| **Process Manager** | PM2 (`npm install -g pm2`) |
| **Reverse Proxy** | Nginx (opsional, disarankan untuk SSL Let's Encrypt) |
| **Storage Disk** | Minimal 5 GB (hanya untuk DB SQLite + logs — foto tidak disimpan di server) |
| **RAM** | Minimal 1 GB (proxy gambar via pipe stream, RAM ~0 per gambar) |
| **SQLite** | v3.35+ (untuk support `DROP COLUMN` jika diperlukan migrasi) |

---

## 📁 2. Struktur Direktori Penting

```
pick-your-photo/
├── app/                   # Next.js App Router (pages & API routes)
├── components/            # React components
├── lib/                   # Shared utilities (db, auth, gdrive, dll.)
├── data/                  # 📂 DATABASE VOLUME — database.db di sini
│   └── database.db        # SQLite database (JANGAN hapus di produksi!)
├── public/
│   ├── staging_uploads/   # Upload sementara (bukti bayar, logo) — perlu persisted
│   └── vendor_logos/      # Logo vendor yang diunggah
├── .env.local             # Environment variables (JANGAN commit ke Git!)
├── deploy-pm2.sh          # Script deployment otomatis
├── docker-compose.yml     # Konfigurasi Docker
└── Dockerfile
```

**Yang WAJIB di-persist (volume mounting Docker / VPS):**
- `data/` — database SQLite
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
# GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
```

> **Catatan:** Google OAuth credentials bisa disimpan di `.env.local` ATAU di `saas_settings` (DB via Admin Panel). Jika keduanya ada, `.env.local` lebih diprioritaskan untuk `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET`.

---

## 📦 4. Alur Deployment Otomatis (`deploy-pm2.sh`)

Gunakan script `deploy-pm2.sh` untuk deployment 1-klik:

```bash
chmod +x deploy-pm2.sh
./deploy-pm2.sh
```

**Isi script (ringkasan):**
```bash
#!/bin/bash
set -e

# 1. Pull kode terbaru
git pull origin main

# 2. Install dependensi production
npm install

# 3. Build Next.js dengan batas memori (mencegah OOM pada VPS RAM kecil)
rm -rf .next node_modules/.cache
NODE_OPTIONS="--max-old-space-size=768" npm run build

# 4. Hapus devDependencies setelah build
npm prune --production

# 5. Restart PM2
pm2 restart pick-your-photo || pm2 start npm --name "pick-your-photo" -- start

echo "✅ Deployment selesai!"
```

---

## 🖥️ 5. Konfigurasi PM2

```bash
# Start pertama kali
pm2 start npm --name "pick-your-photo" -- start

# Simpan konfigurasi PM2 agar auto-start saat reboot
pm2 save
pm2 startup

# Monitor
pm2 logs pick-your-photo
pm2 status

# Restart manual
pm2 restart pick-your-photo

# Flush logs
pm2 flush
```

**Konfigurasi `next.config.js` (production):**
```javascript
module.exports = {
    reactStrictMode: true,
    eslint: {
        ignoreDuringBuilds: true,  // Skip ESLint saat build — hemat RAM
    },
};
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

```bash
# Build & start
docker compose up -d --build

# Logs
docker compose logs -f app

# Update
git pull && docker compose up -d --build
```

---

## 🧹 7. Pemeliharaan & Monitoring

### Backup Database

```bash
# Manual backup
cp data/database.db data/database_backup_$(date +%Y%m%d).db

# Atau via SQLite dump
sqlite3 data/database.db .dump > backup_$(date +%Y%m%d).sql
```

### Monitoring Disk

Server hanya perlu monitor:
- `data/database.db` — tumbuh seiring vendor & foto bertambah (~1KB per foto, sangat kecil)
- `public/staging_uploads/` — bukti transfer & logo vendor (biasanya kecil, < 5MB per file)
- **Folder foto TIDAK ADA di server** — zero-storage architecture

### Monitoring Memori (RAM)

Karena proxy gambar menggunakan **True Pipe Stream** (bukan `arrayBuffer`):
- RAM per request gambar = ~0 MB
- RAM server stabil meskipun ratusan client buka galeri bersamaan
- Monitor lewat: `pm2 monit` atau `htop`

### Import Queue

Import Google Drive berjalan in-memory queue (max 1 concurrent):
- Jika server restart saat import berlangsung → project status otomatis direset ke `failed`
- Vendor perlu retry import manual dari dashboard

### Pembersihan Log PM2

```bash
pm2 flush          # Hapus semua log lama
pm2 logs --lines 100  # Lihat 100 baris log terakhir
```

---

## 🔐 8. Setup Google OAuth Master (Pertama Kali)

1. Buka **Google Cloud Console** → buat OAuth 2.0 Client ID (Web Application)
2. Tambahkan redirect URI: `https://yourdomain.com/api/admin/auth/google/callback`
3. Simpan `Client ID` dan `Client Secret` ke `.env.local` atau Admin Panel → Settings → Google OAuth
4. Di Admin Panel → klik **"Hubungkan Google Drive Master"** → login dengan akun Google Studio Master
5. Setelah authorize → `refresh_token` dan `access_token` otomatis tersimpan ke `saas_settings`
6. Test dengan buat proyek baru dan import folder Google Drive

---

## ⚡ 9. Tips Optimasi Performa

| Masalah | Solusi |
|---|---|
| Build OOM di VPS RAM kecil | `NODE_OPTIONS="--max-old-space-size=768" npm run build` |
| SQLite locked di concurrent requests | WAL mode + `busy_timeout=10000` sudah aktif otomatis |
| Gambar lambat pertama kali | Normal (cache miss ke Google CDN) — request ke-2+ dari Cloudflare cache |
| Import lambat pada folder besar | Import queue async — vendor tidak perlu tunggu, notif status di dashboard |
| RAM tinggi saat galeri ramai | Tidak terjadi — pipe stream tidak buffer ke RAM |
