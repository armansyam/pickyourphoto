#!/bin/bash
# backup-photos.sh — Backup lokal untuk asset persisten (Logo Vendor & Bukti Transfer)
# Diperbarui: 19 Agustus 2026

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$(dirname "$SCRIPT_DIR")}"
BACKUP_DIR="$PROJECT_DIR/backups/assets_backup"

mkdir -p "$BACKUP_DIR"

# 1. Backup logo vendor jika folder ada
if [ -d "$PROJECT_DIR/public/vendor_logos" ]; then
    mkdir -p "$BACKUP_DIR/vendor_logos"
    rsync -a --delete "$PROJECT_DIR/public/vendor_logos/" "$BACKUP_DIR/vendor_logos/"
fi

# 2. Backup private storage proofs jika folder ada
if [ -d "$PROJECT_DIR/data/private_storage" ]; then
    mkdir -p "$BACKUP_DIR/private_storage"
    rsync -a --delete "$PROJECT_DIR/data/private_storage/" "$BACKUP_DIR/private_storage/"
fi

echo "[$(date)] Backup asset persisten (Logo & Proofs) selesai dengan sukses."

