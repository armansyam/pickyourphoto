# 🚀 03. Panduan Deployment, PM2 & Maintenance (Pick Your Photo)

> **Dokumen Panduan Production Deployment & Optimasi Performa Server**  
> Lokasi: `docs/03-DEPLOYMENT-GUIDE.md`  
> **Terakhir diperbarui:** 20 Agustus 2026 — *Disesuaikan dengan basis kode produksi & deploy.sh termutakhir*

---

## 🛠️ 1. Persyaratan Server Produksi

| Komponen | Requirement |
|---|---|
| **OS** | Ubuntu 20.04 / 22.04 LTS (atau Linux server modern) |
| **Node.js** | v18.x / v20.x / v24.x LTS |
| **Process Manager** | PM2 (`npm install -g pm2`) atau Docker Compose |
| **Reverse Proxy** | Nginx (disarankan untuk SSL Let's Encrypt / Cloudflare SSL) |
| **Storage Disk** | Minimal 5 GB (hanya untuk DB SQLite + logs — foto tidak disimpan di server) |
| **RAM** | Minimal 1 GB (proxy gambar via pipe stream, RAM ~0 per gambar) |
| **SQLite** | v3.35+ (didukung oleh `better-sqlite3` 11.x) |

---

## 📁 2. Struktur Direktori Kritis Produksi

```
pick-your-photo/
├── app/                   # Next.js 14 App Router (pages, dynamic studio [subdomain], 70+ API routes)
├── components/            # React Client & Server components (Studio Portal, Dynamic Sliders, etc.)
├── lib/                   # Shared utilities (db, auth, crypto-vault, gdrive, payment-gateway)
├── data/                  # 📂 TRIAD DATABASE & PROOFS VOLUME (WAJIB DIPERSIST!)
│   ├── master.db          # Akun vendor, admin, paket, subdomain, dan transaksi
│   ├── vendor.db          # Proyek galeri foto, klien, dan virtual storage
│   ├── trial.db           # Simulasi galeri instan publik
│   └── payment_proofs/    # Berkas bukti transfer pembayaran manual
├── public/
│   ├── branding/          # Aset brand & logo platform
│   ├── icons/             # Ikon gateway pembayaran (QRIS, GPN)
│   └── vendor_logos/      # Logo studio vendor (WAJIB DIPERSIST!)
├── .env.local             # Environment variables lokal server (JANGAN commit ke Git!)
├── deploy.sh              # Script deployment PM2 otomatis (One-Click Deploy)
├── deploy-docker.sh       # Script deployment Docker Compose
├── docker-compose.yml     # Konfigurasi Docker Compose produksi
├── ecosystem.config.js    # Konfigurasi PM2 Process Manager
└── Dockerfile
```

---

## ⚙️ 3. Environment Variables (`.env.local`)

Salin dari `.env.example` dan sesuaikan nilainya:

```env
# JWT Authentication (Di-generate otomatis 64-hex oleh deploy.sh jika kosong)
JWT_SECRET=string_acak_panjang_minimal_32_karakter

# Cron Secret Key
CRON_SECRET=token_rahasia_cron_keamanan_sistem

# Superadmin Root Recovery (Fallback Master)
ADMIN_EMAIL=your@email.com
ADMIN_PASSWORD=password_aman_anda

# Port Server
PORT=3000

# Path Storage Data
DB_PATH=./data
LOGOS_PATH=./public/vendor_logos
```

---

## 📦 4. Alur Deployment Otomatis (`deploy.sh`)

Gunakan script `deploy.sh` untuk deployment 1-klik di VPS:

```bash
chmod +x deploy.sh
./deploy.sh
```

**Langkah-Langkah Otomatisasi `deploy.sh`:**
1. **Verifikasi Node.js:** Memastikan versi Node.js minimal v18+ LTS.
2. **Git Pull:** Menarik pembaruan kode terbaru dari branch `main`.
3. **Validasi `.env.local` & Auto-Generate Kunci Rahasia:** Menghasilkan `JWT_SECRET` dan `CRON_SECRET` 64-hex karakter secara otomatis jika belum terisi.
4. **Npm Install:** Menginstal dependensi untuk tahap kompilasi build.
5. **Build Next.js:** Menjalankan `NODE_OPTIONS="--max-old-space-size=768" npm run build` untuk mencegah crash RAM pada VPS kecil.
6. **Npm Prune Production:** Membersihkan `devDependencies` setelah build selesai untuk menghemat ruang disk VPS.
7. **PM2 Zero-Downtime Reload:** Memuat ulang service via `ecosystem.config.js` tanpa downtime bagi pengguna.

---

## 🖥️ 5. Perintah Pengelolaan PM2

```bash
# Simpan status PM2 agar otomatis hidup saat reboot server VPS
pm2 save
pm2 startup

# Monitoring aplikasi & penggunaan memori
pm2 status
pm2 monit

# Melihat log aplikasi real-time
pm2 logs pick-your-photo --lines 100

# Reload manual
pm2 reload ecosystem.config.js
```

---

## 🐳 6. Deployment via Docker (`deploy-docker.sh`)

```bash
chmod +x deploy-docker.sh
./deploy-docker.sh
```

Volume `data/` dan `public/vendor_logos/` akan di-mount ke container agar data database SQLite tetap persisten saat container diperbarui.

---

## 🔐 7. Setup Google OAuth Master & Worker Pool

1. Buka **Google Cloud Console** → Buat OAuth 2.0 Client ID (Web Application).
2. Tambahkan Authorized Redirect URIs:
   - Master Hub: `https://domain-anda.com/api/admin/auth/google/callback`
   - Worker Pool: `https://domain-anda.com/api/admin/auth/google/worker/callback`
3. Masukkan `Client ID` dan `Client Secret` di Admin Panel → Settings → Google OAuth.
4. Di Admin Panel → Hubungkan akun Master Hub & Worker Accounts.

---

## 🌐 8. Konfigurasi Nginx, Cloudflare SSL & Wildcard Subdomain

### A. Pengaturan Cloudflare Dashboard
1. **SSL/TLS Encryption Mode:** Set ke **`Full (Strict)`**.
2. **Origin Server Certificate:** Buat sertifikat Origin CA 15 Tahun mencakup hostname:
   - `photota.my.id`
   - `*.photota.my.id`
3. Simpan sertifikat ke server VPS:
   - Certificate: `/etc/nginx/ssl/photota_origin.pem`
   - Private Key: `/etc/nginx/ssl/photota_origin.key`

### B. Konfigurasi Blok Nginx (Nginx UI / Virtual Host)
```nginx
server {
    listen 80;
    server_name photota.my.id *.photota.my.id;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name photota.my.id *.photota.my.id;

    ssl_certificate /etc/nginx/ssl/photota_origin.pem;
    ssl_certificate_key /etc/nginx/ssl/photota_origin.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
*Catatan:* Header `proxy_set_header X-Forwarded-Host $host;` sangat penting agar `middleware.js` dapat mendeteksi nama subdomain vendor secara akurat.

