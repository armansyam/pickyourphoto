#!/bin/bash

# Script deploy otomatis untuk Pick Your Photo
# Mencegah error dan memastikan proses rebuild berjalan bersih

# Keluar jika ada perintah yang gagal
set -e

echo "=========================================="
echo "🚀 MEMULAI PROSES DEPLOYMENT..."
echo "=========================================="

# 1. Ambil kode terbaru dari Git
echo "📥 1. Menarik pembaruan kode terbaru dari Git (main branch)..."
git pull origin main

# 2. Setup berkas .env untuk Docker & Otomatisasi JWT_SECRET
ENV_CREATED=0
if [ ! -f .env ]; then
    echo "📄 Pembuatan .env otomatis dari template .env.example..."
    cp .env.example .env
    ENV_CREATED=1
fi

# Cek & Otomatisasi JWT_SECRET jika belum ada, kosong, atau default
echo "🔑 Memeriksa dan mengamankan JWT_SECRET di .env..."
node -e "
  const fs = require('fs');
  const crypto = require('crypto');
  let content = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
  if (!content.includes('JWT_SECRET=') || content.includes('JWT_SECRET=isi_dengan_string_acak_panjang_dan_aman') || content.includes('JWT_SECRET=pick-your-photo-super-secret-key-2026')) {
    const secureKey = crypto.randomBytes(32).toString('hex');
    if (content.includes('JWT_SECRET=')) {
      content = content.replace(/JWT_SECRET=.*/g, 'JWT_SECRET=' + secureKey);
    } else {
      content += '\nJWT_SECRET=' + secureKey + '\n';
    }
    fs.writeFileSync('.env', content, 'utf8');
    console.log('✅ JWT_SECRET acak (64 hex characters) berhasil di-generate otomatis!');
  } else {
    console.log('✅ JWT_SECRET sudah terkonfigurasi dengan aman.');
  }
"




# 3. Rebuild & Jalankan Container baru
echo "📦 3. Membangun ulang dan me-restart container Docker..."
# --build memaksa pembuatan image baru jika ada perubahan kode/dependensi
# --remove-orphans membersihkan container lama yang sudah tidak terpakai
docker compose up -d --build --remove-orphans

# 3. Bersihkan sisa image lama (prune) untuk menghemat space disk VPS
echo "🧹 3. Membersihkan cache Docker image yang tidak terpakai (prune)..."
docker image prune -f

echo "=========================================="
echo "📊 STATUS CONTAINER SAAT INI:"
echo "=========================================="
docker compose ps

echo "=========================================="
echo "✅ DEPLOYMENT SELESAI DENGAN SUKSES!"
echo "=========================================="
