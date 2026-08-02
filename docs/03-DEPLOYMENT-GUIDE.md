# 🚀 03. Panduan Deployment, PM2 & Maintenance (Pick Your Photo)

> **Dokumen Panduan Production Deployment & Optimasi Performa Server**  
> Lokasi: `docs/03-DEPLOYMENT-GUIDE.md`

---

## 🛠️ 1. Persyaratan Server Produksi

* **OS:** Ubuntu 20.04 / 22.04 LTS (atau Mac/Linux server)
* **Node.js:** v18.x / v20.x LTS
* **Process Manager:** PM2 (`npm install -g pm2`)
* **Reverse Proxy:** Nginx (opsional, disarankan untuk SSL Let's Encrypt)
* **Storage:** Disk SSD minimal 10GB

---

## ⚙️ 2. Optimasi Alokasi Memori & Build Production

Untuk mencegah *Out Of Memory (OOM) Killer* pada VPS/Server berspesifikasi rendah (RAM 1GB-2GB), gunakan strategi skrip `deploy-pm2.sh`:

### 1. Batasan Memori Node.js (`--max-old-space-size`)
Jalankan proses build Next.js dengan batasan memori 768MB:
```bash
NODE_OPTIONS="--max-old-space-size=768" npm run build
```

### 2. Leperkan ESLint saat Build Produksi (`next.config.js`)
Pengecekan ESLint dilewati saat build produksi untuk menghemat RAM & CPU:
```javascript
module.exports = {
    reactStrictMode: true,
    eslint: {
        ignoreDuringBuilds: true,
    },
};
```

### 3. Pembersihan DevDependencies (`npm prune`)
Setelah build produksi selesai, bersihkan paket devDependencies agar hemat ruang disk VPS:
```bash
npm prune --production
```

---

## 📦 3. Alur Skrip Deployment Otomatis (`deploy-pm2.sh`)

Gunakan skrip `deploy-pm2.sh` untuk deployment 1-klik:

```bash
#!/bin/bash
set -e

echo "🚀 Memulai deployment Pick Your Photo..."

# 1. Update kode terbaru
git pull origin main

# 2. Install dependensi
npm install

# 3. Hapus cache build lama & Build Next.js dengan batas memori
rm -rf .next
NODE_OPTIONS="--max-old-space-size=768" npm run build

# 4. Prune devDependencies
npm prune --production

# 5. Restart PM2
pm2 restart pick-your-photo || pm2 start npm --name "pick-your-photo" -- start

echo "✅ Deployment Selesai!"
```

---

## 🐳 4. Deployment Alternatif via Docker Compose

Jika menggunakan Docker:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - ./public/staging_uploads:/app/public/staging_uploads
    environment:
      - NODE_ENV=production
    restart: always
```

Perintah:
```bash
docker compose up -d --build
```

---

## 🧹 5. Pemeliharaan & Monitoring Disk Space

* **Pembersihan Otomatis Vendor Expired (> 5 hari)**: Sistem background sweeper secara otomatis menghapus berkas foto fisik di `public/staging_uploads/vendor_[id]/` untuk vendor yang habis masa berlangganannya.
* **Pembersihan Log PM2**:
  ```bash
  pm2 flush
  ```
