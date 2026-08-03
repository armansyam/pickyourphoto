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

# Cek & Otomatisasi JWT_SECRET jika belum ada, kosong, atau default
echo "🔑 Memeriksa dan mengamankan JWT_SECRET di .env.local..."
node -e "
  const fs = require('fs');
  const crypto = require('crypto');
  let content = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '';
  if (!content.includes('JWT_SECRET=') || content.includes('JWT_SECRET=isi_dengan_string_acak_panjang_dan_aman') || content.includes('JWT_SECRET=pick-your-photo-super-secret-key-2026')) {
    const secureKey = crypto.randomBytes(32).toString('hex');
    if (content.includes('JWT_SECRET=')) {
      content = content.replace(/JWT_SECRET=.*/g, 'JWT_SECRET=' + secureKey);
    } else {
      content += '\nJWT_SECRET=' + secureKey + '\n';
    }
    fs.writeFileSync('.env.local', content, 'utf8');
    console.log('✅ JWT_SECRET acak (64 hex characters) berhasil di-generate otomatis!');
  } else {
    console.log('✅ JWT_SECRET sudah terkonfigurasi dengan aman.');
  }
"




# 3. Install all dependencies (including devDependencies needed for build, like ESLint)
echo "📦 3. Menginstal semua dependensi (termasuk devDependencies)..."
npm install

echo "🏗️ 4. Membangun aplikasi Next.js (npm run build)..."
# Hapus cache build lama jika ada
rm -rf .next
# Jalankan build dengan batasan memori Node.js agar tidak memicu OOM Killer di VPS kecil
NODE_OPTIONS="--max-old-space-size=768" npm run build

# Bersihkan devDependencies setelah build selesai agar hemat space disk di VPS
echo "🧹 5. Membersihkan devDependencies (npm prune)..."
npm prune --production

# 4. Restart/Reload aplikasi di PM2
echo "🔄 6. Melakukan reload service di PM2..."
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
