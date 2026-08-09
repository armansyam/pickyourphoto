#!/bin/bash

# =============================================================================
# deploy.sh — Script Deploy Otomatis (Docker Compose) — Pick Your Photo SaaS
# Diperbarui: 10 Agustus 2026
# Gunakan: chmod +x deploy.sh && ./deploy.sh
# =============================================================================

# Keluar segera jika ada perintah yang gagal
set -e

echo "=========================================="
echo "🚀 MEMULAI PROSES DEPLOYMENT (DOCKER)..."
echo "=========================================="

# 1. Ambil kode terbaru dari Git
echo "📥 [1/5] Menarik pembaruan kode terbaru dari Git (main branch)..."
git pull origin main

# 2. Setup berkas .env & Validasi JWT_SECRET
echo "📄 [2/5] Memeriksa dan menyiapkan berkas .env..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo "   ↳ Salin dari template .env.example → .env"
        cp .env.example .env
    else
        echo "   ↳ Buat .env kosong (tidak ada .env.example)"
        touch .env
    fi
fi

# Otomasi JWT_SECRET jika belum ada, kosong, atau masih bernilai default
echo "🔑    Memvalidasi JWT_SECRET di .env..."
node -e "
  const fs = require('fs');
  const crypto = require('crypto');
  let content = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
  const defaultKeys = ['JWT_SECRET=isi_dengan_string_acak_panjang_dan_aman', 'JWT_SECRET=pick-your-photo-super-secret-key-2026'];
  const isDefault = defaultKeys.some(d => content.includes(d));
  if (!content.includes('JWT_SECRET=') || isDefault) {
    const secureKey = crypto.randomBytes(32).toString('hex');
    if (content.includes('JWT_SECRET=')) {
      content = content.replace(/JWT_SECRET=.*/g, 'JWT_SECRET=' + secureKey);
    } else {
      content += '\nJWT_SECRET=' + secureKey + '\n';
    }
    fs.writeFileSync('.env', content, 'utf8');
    console.log('   ✅ JWT_SECRET acak (64 hex chars) berhasil di-generate otomatis!');
  } else {
    console.log('   ✅ JWT_SECRET sudah terkonfigurasi dengan aman.');
  }
"

# 3. Build & Jalankan Container Docker baru
echo "📦 [3/5] Membangun ulang image Docker dan me-restart container..."
# --build  : paksa build image baru jika ada perubahan kode/dependensi
# --remove-orphans : bersihkan container lama yang tidak terpakai
docker compose up -d --build --remove-orphans

# 4. Bersihkan cache image Docker lama untuk hemat disk VPS
echo "🧹 [4/5] Membersihkan image Docker lama yang tidak terpakai (prune)..."
docker image prune -f

# 5. Tampilkan status container
echo "=========================================="
echo "📊 [5/5] STATUS CONTAINER SAAT INI:"
echo "=========================================="
docker compose ps

echo "=========================================="
echo "✅ DEPLOYMENT DOCKER SELESAI DENGAN SUKSES!"
echo "=========================================="
