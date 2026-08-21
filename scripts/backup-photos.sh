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

# 2. Backup payment proofs jika folder ada
if [ -d "$PROJECT_DIR/data/payment_proofs" ]; then
    mkdir -p "$BACKUP_DIR/payment_proofs"
    rsync -a --delete "$PROJECT_DIR/data/payment_proofs/" "$BACKUP_DIR/payment_proofs/"
fi

echo "[$(date)] Backup asset persisten (Logo & Proofs) selesai dengan sukses."

