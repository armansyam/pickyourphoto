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

# 2. Rebuild & Jalankan Container baru
echo "📦 2. Membangun ulang dan me-restart container Docker..."
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
