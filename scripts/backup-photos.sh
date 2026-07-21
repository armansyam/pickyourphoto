#!/bin/bash
# backup-photos.sh — Jalankan via cron (misal: tiap 24 jam)
# Contoh entri crontab: 0 2 * * * /Users/armansyam/Documents/Project\ AmsDev/pick-your-photo/scripts/backup-photos.sh

# Path direktori proyek
PROJECT_DIR="/Users/armansyam/Documents/Project AmsDev/pick-your-photo"
SRC_DIR="$PROJECT_DIR/public/staging_uploads/"
# Tempat penyimpanan cadangan eksternal (idealnya di disk fisik yang berbeda)
DEST_DIR="$PROJECT_DIR/backups/staging_uploads_backup/"

# Pastikan direktori cadangan eksternal telah dibuat
mkdir -p "$DEST_DIR"

# Jalankan rsync incremental backup untuk menyalin seluruh folder unggahan
# --delete akan memastikan file yang dihapus di live juga terhapus di backup jika sinkron
rsync -av --delete "$SRC_DIR" "$DEST_DIR"

if [ $? -eq 0 ]; then
    echo "[$(date)] Incremental backup foto selesai dengan sukses."
else
    echo "[$(date)] Incremental backup foto GAGAL." >&2
    exit 1
fi
