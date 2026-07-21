#!/bin/bash
# backup-db.sh — Jalankan via cron (misal: tiap 6 jam)
# Contoh entri crontab: 0 */6 * * * /Users/armansyam/Documents/Project\ AmsDev/pick-your-photo/scripts/backup-db.sh

# Path direktori proyek (sesuaikan jika deploy di server VPS)
PROJECT_DIR="/Users/armansyam/Documents/Project AmsDev/pick-your-photo"
DB_FILE="$PROJECT_DIR/data/database.db"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_$TIMESTAMP.db"

# Pastikan direktori cadangan telah dibuat
mkdir -p "$BACKUP_DIR"

# Lakukan backup SQLite secara aman menggunakan perintah API online .backup
sqlite3 "$DB_FILE" ".backup '$BACKUP_FILE'"

if [ $? -eq 0 ]; then
    echo "[$(date)] Database backup sukses: $BACKUP_FILE"
    
    # Hapus file cadangan yang berusia lebih dari 7 hari (kebijakan retensi)
    find "$BACKUP_DIR" -name "db_*.db" -mtime +7 -delete
    echo "[$(date)] Pembersihan cadangan lama selesai."
else
    echo "[$(date)] Database backup GAGAL." >&2
    exit 1
fi
