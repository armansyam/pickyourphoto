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

# 2. Setup berkas .env & .env.local
echo "📄 [2/5] Memeriksa dan menyiapkan berkas .env dan .env.local..."

# Buat .env.local dari template jika belum ada
if [ ! -f .env.local ]; then
    if [ -f .env.example ]; then
        echo "   ↳ Salin dari template .env.example → .env.local"
        cp .env.example .env.local
    else
        echo "   ↳ Buat .env.local kosong"
        touch .env.local
    fi
fi

# Buat .env dari .env.local jika .env belum ada (untuk Docker Compose)
if [ ! -f .env ]; then
    echo "   ↳ Menyinkronkan .env.local → .env untuk Docker"
    cp .env.local .env
fi

# Fungsi helper untuk update JWT_SECRET di berkas env
update_jwt_secret() {
    local target_file="$1"
    if grep -q "JWT_SECRET=isi_dengan_string_acak_panjang_dan_aman" "$target_file" || \
       grep -q "JWT_SECRET=pick-your-photo-super-secret-key-2026" "$target_file" || \
       ! grep -q "JWT_SECRET=" "$target_file" || \
       grep -q "JWT_SECRET=$" "$target_file"; then

        NEW_SECRET=$(openssl rand -hex 32 2>/dev/null || LC_ALL=C tr -dc 'a-f0-9' < /dev/urandom | head -c 64)

        if grep -q "JWT_SECRET=" "$target_file"; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$NEW_SECRET/" "$target_file"
            else
                sed -i "s/JWT_SECRET=.*/JWT_SECRET=$NEW_SECRET/" "$target_file"
            fi
        else
            echo "" >> "$target_file"
            echo "JWT_SECRET=$NEW_SECRET" >> "$target_file"
        fi
        echo "   ✅ JWT_SECRET acak (64 hex chars) berhasil di-generate otomatis di $target_file!"
    else
        echo "   ✅ JWT_SECRET di $target_file sudah terkonfigurasi dengan aman."
    fi
}

echo "🔑    Memvalidasi JWT_SECRET di .env.local & .env..."
update_jwt_secret ".env.local"
update_jwt_secret ".env"

# 3. Build & Jalankan Container Docker baru
echo "📦 [3/5] Membangun ulang image Docker dan me-restart container..."
docker compose up -d --build --remove-orphans

# 4. Bersihkan cache image Docker lama
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
