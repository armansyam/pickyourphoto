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

# Cek apakah JWT_SECRET masih menggunakan nilai default template
if grep -q "JWT_SECRET=isi_dengan_string_acak_panjang_dan_aman" .env; then
    echo "🔑 Menghasilkan JWT_SECRET acak yang aman (cryptographically secure)..."
    # Gunakan Node.js bawaan untuk generate string secure hex & replace untuk menghindari masalah perbedaan sed MacOS/Linux
    node -e "
      const fs = require('fs');
      const crypto = require('crypto');
      const secureKey = crypto.randomBytes(32).toString('hex');
      let content = fs.readFileSync('.env', 'utf8');
      content = content.replace('JWT_SECRET=isi_dengan_string_acak_panjang_dan_aman', 'JWT_SECRET=' + secureKey);
      fs.writeFileSync('.env', content, 'utf8');
    "
    echo "✅ JWT_SECRET aman berhasil di-generate dan disimpan ke .env!"
fi

# Jika berkas baru dibuat, hentikan sementara agar pengguna bisa mengisi GOOGLE_API_KEY
if [ $ENV_CREATED -eq 1 ]; then
    echo ""
    echo "⚠️  [PENTING] Berkas .env baru saja dibuat otomatis dengan JWT_SECRET yang aman."
    echo "👉 Silakan edit berkas tersebut sekarang dengan perintah: nano .env"
    echo "👉 Masukkan GOOGLE_API_KEY Anda, lalu jalankan kembali script ./deploy.sh ini."
    echo ""
    exit 0
fi

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
