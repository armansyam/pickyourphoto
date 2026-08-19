#!/bin/bash

# =============================================================================
# restore-db.sh — Script Pemulihan Database SQLite (Pick Your Photo SaaS)
# Dikembangkan oleh: AMS DEV
# Gunakan: chmod +x scripts/restore-db.sh && ./scripts/restore-db.sh
# =============================================================================

set -e

# Format Warna Terminal ANSI
CYAN='\033[1;36m'
GOLD='\033[1;33m'
GREEN='\033[1;32m'
BLUE='\033[1;34m'
PURPLE='\033[1;35m'
RED='\033[1;31m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$(dirname "$SCRIPT_DIR")}"
BACKUP_DIR="$PROJECT_DIR/backups"
DB_DIR="$PROJECT_DIR/data"
DB_FILE="$DB_DIR/database.db"

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
echo -e " 🗄️  ${BOLD}RESTORE DATABASE SQLITE — Pick Your Photo SaaS${NC}"
echo -e " ⚡ ${GREEN}Developed by${NC} : ${BOLD}AMS DEV${NC}"
echo -e " 🛡️  ${BLUE}License${NC}      : Proprietary & Non-Commercial License"
echo -e "${GOLD}=============================================================================${NC}"
echo ""

if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
fi

# Cari semua file cadangan .db di folder backups (urutkan dari yang terbaru)
BACKUP_FILES=()
while IFS= read -r f; do
    if [ -n "$f" ]; then
        BACKUP_FILES+=("$f")
    fi
done < <(find "$BACKUP_DIR" -maxdepth 1 -name "db_*.db" -type f -exec stat -f "%m %N" {} + 2>/dev/null | sort -nr | cut -d' ' -f2- || ls -t "$BACKUP_DIR"/db_*.db 2>/dev/null)

if [ ${#BACKUP_FILES[@]} -eq 0 ]; then
    echo -e "${RED}❌ Tidak ditemukan file cadangan (.db) di folder:${NC} $BACKUP_DIR"
    echo ""
    echo -e "💡 ${BOLD}Anda dapat menyalin file backup dari laptop/server lain ke folder ini:${NC}"
    echo -e "   cp /path/ke/file_backup.db $BACKUP_DIR/"
    echo ""
    exit 1
fi

echo -e "${BOLD}Daftar Berkas Cadangan yang Tersedia di Server:${NC}"
echo -e "-----------------------------------------------------------------------------"

idx=1
for f in "${BACKUP_FILES[@]}"; do
    fname=$(basename "$f")
    fsize=$(ls -lh "$f" | awk '{print $5}')
    if [[ "$OSTYPE" == "darwin"* ]]; then
        fdate=$(stat -f "%Sm" -t "%d %b %Y, %H:%M:%S" "$f" 2>/dev/null || date "+%d %b %Y")
    else
        fdate=$(date -r "$f" "+%d %b %Y, %H:%M:%S" 2>/dev/null || date "+%d %b %Y")
    fi
    
    if [[ "$fname" == *"pre_restore"* ]]; then
        tag="${PURPLE}[Safety Snapshot]${NC}"
    elif [[ "$fname" == *"uploaded"* ]]; then
        tag="${BLUE}[Uploaded File]${NC}"
    else
        tag="${GREEN}[Auto Backup]${NC}"
    fi

    echo -e " [${CYAN}$idx${NC}] $tag ${BOLD}$fname${NC} ($fsize) — $fdate"
    ((idx++))
done
echo -e " [${RED}q${NC}] Batalkan proses restore"
echo -e "-----------------------------------------------------------------------------"
echo ""

read -p "👉 Masukkan nomor berkas yang ingin dipulihkan [1-${#BACKUP_FILES[@]}]: " choice

if [[ "$choice" == "q" || "$choice" == "Q" || -z "$choice" ]]; then
    echo -e "${YELLOW}Proses restore dibatalkan.${NC}"
    exit 0
fi

if ! [[ "$choice" =~ ^[0-9]+$ ]] || [ "$choice" -lt 1 ] || [ "$choice" -gt ${#BACKUP_FILES[@]} ]; then
    echo -e "${RED}❌ Pilihan tidak valid. Harap masukkan nomor 1 sampai ${#BACKUP_FILES[@]}.${NC}"
    exit 1
fi

SELECTED_FILE="${BACKUP_FILES[$((choice-1))]}"
SELECTED_NAME=$(basename "$SELECTED_FILE")

echo ""
echo -e "${GOLD}⚠️  PERINGATAN KONFIRMASI:${NC}"
echo -e " Database utama saat ini akan digantikan oleh: ${BOLD}$SELECTED_NAME${NC}"
read -p " Apakah Anda yakin ingin melanjutkan? (y/N): " confirm

if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo -e "${YELLOW}Proses restore dibatalkan oleh pengguna.${NC}"
    exit 0
fi

echo ""
echo -e "${CYAN}🚀 Memulai proses pemulihan database...${NC}"

# 1. Buat Emergency Safety Backup dari database saat ini
NOW_STR=$(date +%Y%m%d_%H%M%S)
if [ -f "$DB_FILE" ]; then
    EMERGENCY_FILE="$BACKUP_DIR/db_pre_restore_$NOW_STR.db"
    cp "$DB_FILE" "$EMERGENCY_FILE"
    echo -e " 🛡️  [1/4] Snapshot cadangan darurat dibuat: ${BOLD}$(basename "$EMERGENCY_FILE")${NC}"
fi

# 2. Hentikan service PM2 jika sedang berjalan untuk melepaskan file lock
echo -e " ⏸️  [2/4] Melepaskan koneksi aktif & membersihkan file WAL..."
if command -v pm2 >/dev/null 2>&1; then
    pm2 stop "pick-your-photo" >/dev/null 2>&1 || true
fi

# Bersihkan file WAL & SHM lama
rm -f "$DB_DIR/database.db-wal" "$DB_DIR/database.db-shm"

# 3. Salin berkas backup ke database.db
echo -e " 📦 [3/4] Menyalin berkas database baru..."
mkdir -p "$DB_DIR"
cp -f "$SELECTED_FILE" "$DB_FILE"

# 4. Jalankan ulang service di PM2
echo -e " 🔄 [4/4] Menjalankan kembali service di PM2..."
if command -v pm2 >/dev/null 2>&1; then
    if pm2 describe "pick-your-photo" >/dev/null 2>&1; then
        pm2 restart "pick-your-photo" >/dev/null 2>&1 || pm2 start "pick-your-photo" >/dev/null 2>&1
    fi
fi

echo ""
echo -e "${GOLD}=============================================================================${NC}"
echo -e "${GREEN}✅ PEMULIHAN DATABASE SELESAI DENGAN SUKSES!${NC}"
echo -e " Berkas aktif sekarang: ${BOLD}$SELECTED_NAME${NC}"
echo -e "${GOLD}=============================================================================${NC}"
echo ""
