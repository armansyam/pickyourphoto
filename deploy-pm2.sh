#!/bin/bash

# Script deploy otomatis menggunakan PM2 untuk VPS resource minim
# Mengotomatiskan penarikan Git, inisialisasi JWT_SECRET, build, dan reload PM2.

# Keluar jika ada perintah yang gagal
set -e

echo "=========================================="
echo "🚀 MEMULAI DEPLOYMENT PM2..."
echo "=========================================="

# 1. Ambil kode terbaru dari Git
echo "📥 1. Menarik pembaruan kode terbaru dari Git (main branch)..."
git pull origin main

# 2. Setup berkas .env.local & Otomatisasi JWT_SECRET
ENV_CREATED=0
if [ ! -f .env.local ]; then
    echo "📄 Pembuatan .env.local otomatis dari template .env.example..."
    cp .env.example .env.local
    ENV_CREATED=1
fi

# Cek apakah JWT_SECRET masih menggunakan nilai default template
if grep -q "JWT_SECRET=isi_dengan_string_acak_panjang_dan_aman" .env.local; then
    echo "🔑 Menghasilkan JWT_SECRET acak yang aman (cryptographically secure)..."
    # Gunakan Node.js bawaan untuk generate string secure hex & replace untuk menghindari masalah perbedaan sed MacOS/Linux
    node -e "
      const fs = require('fs');
      const crypto = require('crypto');
      const secureKey = crypto.randomBytes(32).toString('hex');
      let content = fs.readFileSync('.env.local', 'utf8');
      content = content.replace('JWT_SECRET=isi_dengan_string_acak_panjang_dan_aman', 'JWT_SECRET=' + secureKey);
      fs.writeFileSync('.env.local', content, 'utf8');
    "
    echo "✅ JWT_SECRET aman berhasil di-generate dan disimpan ke .env.local!"
fi

# Jika berkas baru dibuat, hentikan sementara agar pengguna bisa mengisi GOOGLE_API_KEY
if [ $ENV_CREATED -eq 1 ]; then
    echo ""
    echo "⚠️  [PENTING] Berkas .env.local baru saja dibuat otomatis dengan JWT_SECRET yang aman."
    echo "👉 Silakan edit berkas tersebut sekarang dengan perintah: nano .env.local"
    echo "👉 Masukkan GOOGLE_API_KEY Anda, lalu jalankan kembali script ./deploy-pm2.sh ini."
    echo ""
    exit 0
fi

# 3. Install dependencies & Build
echo "📦 3. Menginstal dependensi produksi..."
npm install --production

echo "🏗️ 4. Membangun aplikasi Next.js (npm run build)..."
npm run build

# 4. Restart/Reload aplikasi di PM2
echo "🔄 5. Melakukan reload service di PM2..."
# Cek apakah PM2 dengan nama "pick-your-photo" sudah terdaftar
if pm2 describe "pick-your-photo" > /dev/null 2>&1; then
    echo "⚡ Service ditemukan. Melakukan zero-downtime reload..."
    pm2 reload "pick-your-photo"
else
    echo "🆕 Service belum terdaftar. Mendaftarkan dan menjalankan baru..."
    pm2 start npm --name "pick-your-photo" -- start
fi

# Simpan state PM2
pm2 save

echo "=========================================="
echo "✅ DEPLOYMENT PM2 SELESAI DENGAN SUKSES!"
echo "=========================================="
