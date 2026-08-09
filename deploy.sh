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

# Otomasi JWT_SECRET secara murni di Bash (menggunakan OpenSSL / urandom)
# Tidak membutuhkan Node.js di Host OS (cocok untuk server murni Docker)
echo "🔑    Memvalidasi JWT_SECRET di .env..."
if grep -q "JWT_SECRET=isi_dengan_string_acak_panjang_dan_aman" .env || \
   grep -q "JWT_SECRET=pick-your-photo-super-secret-key-2026" .env || \
   ! grep -q "JWT_SECRET=" .env || \
   grep -q "JWT_SECRET=$" .env; then

    # Generate 64 hex characters acak
    NEW_SECRET=$(openssl rand -hex 32 2>/dev/null || LC_ALL=C tr -dc 'a-f0-9' < /dev/urandom | head -c 64)

    if grep -q "JWT_SECRET=" .env; then
        # Replace baris JWT_SECRET yang ada
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$NEW_SECRET/" .env
        else
            sed -i "s/JWT_SECRET=.*/JWT_SECRET=$NEW_SECRET/" .env
        fi
    else
        # Tambahkan di baris baru
        echo "" >> .env
        echo "JWT_SECRET=$NEW_SECRET" >> .env
    fi
    echo "   ✅ JWT_SECRET acak (64 hex chars) berhasil di-generate otomatis!"
else
    echo "   ✅ JWT_SECRET sudah terkonfigurasi dengan aman."
fi

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
