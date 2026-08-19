#!/bin/bash

# =============================================================================
# deploy.sh — Script Deploy Otomatis (PM2) — Pick Your Photo SaaS
# Cocok untuk: VPS resource minim / LXC (RAM ≥ 1 GB)
# Diperbarui: 19 Agustus 2026
# Gunakan: chmod +x deploy.sh && ./deploy.sh
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
echo -e "${GREEN}🚀 MEMULAI PROSES DEPLOYMENT (PM2)...${NC}"
echo ""

# Cek versi Node.js minimum (v18+)
NODE_MAJOR=$(node -e "process.stdout.write(String(process.version.split('.')[0].slice(1)))" 2>/dev/null || echo "0")
if [ "$NODE_MAJOR" -lt 18 ]; then
    echo "❌ Node.js v${NODE_MAJOR} terdeteksi. Minimum yang dibutuhkan: v18.x LTS."
    echo "   Install via: https://nodejs.org atau gunakan nvm: nvm install 20"
    exit 1
fi
echo "✅ Node.js v$(node --version) — OK"

# 1. Ambil kode terbaru dari Git
echo "📥 [1/6] Menarik pembaruan kode terbaru dari Git (main branch)..."
git pull origin main

# 2. Setup & Garansi Lengkap Berkas .env.local dan .env dari .env.example
echo "📄 [2/6] Memeriksa dan menyiapkan berkas .env.local dan .env..."

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

# 3. Install semua dependensi
echo "📦 [3/6] Menginstal semua dependensi..."
npm install

# 4. Build aplikasi Next.js
echo "🏗️  [4/6] Membangun aplikasi Next.js..."
rm -rf .next
NODE_OPTIONS="--max-old-space-size=768" npm run build

# 5. Bersihkan devDependencies setelah build
echo "🧹 [5/6] Membersihkan devDependencies setelah build..."
npm prune --production

# 6. Reload/Start aplikasi di PM2
echo "🔄 [6/6] Melakukan reload service di PM2..."
mkdir -p logs
if pm2 describe "pick-your-photo" > /dev/null 2>&1; then
    echo "   ⚡ Service ditemukan → zero-downtime reload via ecosystem.config.js..."
    pm2 reload ecosystem.config.js --update-env
else
    echo "   🆕 Service belum terdaftar → mendaftarkan dan menjalankan via ecosystem.config.js..."
    pm2 start ecosystem.config.js
    echo ""
    echo "   ⚠️  CATATAN: Jalankan perintah berikut agar PM2 auto-start saat reboot server:"
    echo "   pm2 save && pm2 startup"
fi

# Simpan state PM2 terkini
pm2 save

echo ""
echo "=========================================="
echo "✅ DEPLOYMENT PM2 SELESAI DENGAN SUKSES!"
echo "=========================================="
