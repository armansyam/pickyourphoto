#!/bin/bash

# =============================================================================
# deploy-docker.sh — Script Deploy Otomatis (Docker Compose) — Pick Your Photo SaaS
# Diperbarui: 19 Agustus 2026
# Gunakan: chmod +x deploy-docker.sh && ./deploy-docker.sh
# =============================================================================

# Keluar segera jika ada perintah yang gagal
set -e

# Format Warna Terminal ANSI
CYAN='\033[1;36m'
GOLD='\033[1;33m'
GREEN='\033[1;32m'
BLUE='\033[1;34m'
PURPLE='\033[1;35m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}"
cat << "EOF"
    ___    __  ________      ____  _______ _    __
   /   |  /  |/  / ___/     / __ \/ ____/ | |  / /
  / /| | / /|_/ /\__ \     / / / / __/  | | / / 
 / ___ |/ /  / /___/ /    / /_/ / /___  | |/ /  
/_/  |_/_/  /_//____/____/_____/_____/  |___/   
                    /_____/                      
EOF
echo -e "${NC}"
echo -e "${GOLD}=============================================================================${NC}"
echo -e " 📸 ${BOLD}PICK YOUR PHOTO — SaaS Platform for Photographers${NC}"
echo -e " ⚡ ${GREEN}Developed by${NC} : ${BOLD}AMS DEV${NC}"
echo -e " 🛡️  ${BLUE}License${NC}      : Proprietary & Non-Commercial License"
echo -e " 🌐 ${PURPLE}GitHub${NC}       : https://github.com/armansyam"
echo -e "${GOLD}=============================================================================${NC}"
echo ""
echo -e "${GREEN}🚀 MEMULAI PROSES DEPLOYMENT (DOCKER)...${NC}"
echo ""

# 1. Ambil kode terbaru dari Git
echo "📥 [1/5] Menarik pembaruan kode terbaru dari Git (main branch)..."
git pull origin main

# 2. Setup & Garansi Lengkap Berkas .env.local dan .env dari .env.example
echo "📄 [2/5] Memeriksa dan menyiapkan berkas .env.local dan .env..."

ensure_env_file() {
    local target_file="$1"

    # A. Jika file belum ada atau ukurannya 0 bytes, salin penuh dari .env.example
    if [ ! -f "$target_file" ] || [ ! -s "$target_file" ]; then
        if [ -f .env.example ]; then
            echo "   ↳ Berkas $target_file belum ada / kosong. Menyalin penuh dari .env.example..."
            cp .env.example "$target_file"
        else
            touch "$target_file"
        fi
    fi

    # B. Pastikan semua variabel dari .env.example ada di $target_file
    if [ -f .env.example ]; then
        while IFS= read -r line || [ -n "$line" ]; do
            # Skip baris komentar dan baris kosong
            if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "$line" ]]; then
                continue
            fi
            key=$(echo "$line" | cut -d'=' -f1 | xargs)
            if [ -n "$key" ] && ! grep -q "^[[:space:]]*${key}=" "$target_file"; then
                echo "   ↳ Menambahkan variabel missing '$key' ke $target_file..."
                echo "$line" >> "$target_file"
            fi
        done < .env.example
    fi

    # C. Otomasi JWT_SECRET acak jika masih default atau kosong
    if grep -q "JWT_SECRET=isi_dengan_string_acak_panjang_dan_aman" "$target_file" || \
       grep -q "JWT_SECRET=pick-your-photo-super-secret-key-2026" "$target_file" || \
       grep -q "^[[:space:]]*JWT_SECRET=[[:space:]]*$" "$target_file" || \
       ! grep -q "^[[:space:]]*JWT_SECRET=" "$target_file"; then

        NEW_SECRET=$(openssl rand -hex 32 2>/dev/null || LC_ALL=C tr -dc 'a-f0-9' < /dev/urandom | head -c 64)

        if grep -q "^[[:space:]]*JWT_SECRET=" "$target_file"; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s/^[[:space:]]*JWT_SECRET=.*/JWT_SECRET=$NEW_SECRET/" "$target_file"
            else
                sed -i "s/^[[:space:]]*JWT_SECRET=.*/JWT_SECRET=$NEW_SECRET/" "$target_file"
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

echo "🔑    Memvalidasi .env.local & .env..."
ensure_env_file ".env.local"
ensure_env_file ".env"

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
