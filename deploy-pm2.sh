#!/bin/bash

# =============================================================================
# deploy-pm2.sh — Script Deploy Otomatis (PM2) — Pick Your Photo SaaS
# Cocok untuk: VPS resource minim tanpa Docker (RAM ≥ 1 GB)
# Diperbarui: 10 Agustus 2026
# Gunakan: chmod +x deploy-pm2.sh && ./deploy-pm2.sh
# =============================================================================

# Keluar segera jika ada perintah yang gagal
set -e

echo "=========================================="
echo "🚀 MEMULAI DEPLOYMENT PM2..."
echo "=========================================="

# Cek versi Node.js minimum (v18+)
NODE_MAJOR=$(node -e "process.stdout.write(String(process.version.split('.')[0].slice(1)))")
if [ "$NODE_MAJOR" -lt 18 ]; then
    echo "❌ Node.js v${NODE_MAJOR} terdeteksi. Minimum yang dibutuhkan: v18.x LTS."
    echo "   Install via: https://nodejs.org atau gunakan nvm: nvm install 20"
    exit 1
fi
echo "✅ Node.js v$(node --version) — OK"

# 1. Ambil kode terbaru dari Git
echo "📥 [1/6] Menarik pembaruan kode terbaru dari Git (main branch)..."
git pull origin main

# 2. Setup berkas .env.local & Validasi JWT_SECRET
echo "📄 [2/6] Memeriksa dan menyiapkan berkas .env.local..."
if [ ! -f .env.local ]; then
    if [ -f .env.example ]; then
        echo "   ↳ Salin dari template .env.example → .env.local"
        cp .env.example .env.local
    else
        echo "   ↳ Buat .env.local kosong (tidak ada .env.example)"
        touch .env.local
    fi
fi

# Otomasi JWT_SECRET jika belum ada, kosong, atau masih bernilai default
echo "🔑    Memvalidasi JWT_SECRET di .env.local..."
node -e "
  const fs = require('fs');
  const crypto = require('crypto');
  let content = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '';
  const defaultKeys = ['JWT_SECRET=isi_dengan_string_acak_panjang_dan_aman', 'JWT_SECRET=pick-your-photo-super-secret-key-2026'];
  const isDefault = defaultKeys.some(d => content.includes(d));
  if (!content.includes('JWT_SECRET=') || isDefault) {
    const secureKey = crypto.randomBytes(32).toString('hex');
    if (content.includes('JWT_SECRET=')) {
      content = content.replace(/JWT_SECRET=.*/g, 'JWT_SECRET=' + secureKey);
    } else {
      content += '\nJWT_SECRET=' + secureKey + '\n';
    }
    fs.writeFileSync('.env.local', content, 'utf8');
    console.log('   ✅ JWT_SECRET acak (64 hex chars) berhasil di-generate otomatis!');
  } else {
    console.log('   ✅ JWT_SECRET sudah terkonfigurasi dengan aman.');
  }
"

# 3. Install semua dependensi (termasuk devDependencies untuk build)
echo "📦 [3/6] Menginstal semua dependensi (termasuk devDependencies)..."
npm install

# 4. Build aplikasi Next.js
echo "🏗️  [4/6] Membangun aplikasi Next.js..."
# Hapus cache build lama agar hasil selalu bersih
rm -rf .next
# Batasi memori Node.js agar aman di VPS kecil (768 MB)
NODE_OPTIONS="--max-old-space-size=768" npm run build

# 5. Bersihkan devDependencies setelah build (hemat disk)
echo "🧹 [5/6] Membersihkan devDependencies setelah build (npm prune)..."
npm prune --production

# 6. Reload/Start aplikasi di PM2 (zero-downtime)
echo "🔄 [6/6] Melakukan reload service di PM2..."
if pm2 describe "pick-your-photo" > /dev/null 2>&1; then
    echo "   ⚡ Service ditemukan → zero-downtime reload..."
    pm2 reload "pick-your-photo"
else
    echo "   🆕 Service belum terdaftar → mendaftarkan dan menjalankan baru..."
    pm2 start npm --name "pick-your-photo" -- start
    echo ""
    echo "   ⚠️  CATATAN: Jalankan perintah berikut agar PM2 auto-start saat reboot:"
    echo "   pm2 save && pm2 startup"
fi

# Simpan state PM2 terkini
pm2 save

echo ""
echo "=========================================="
echo "✅ DEPLOYMENT PM2 SELESAI DENGAN SUKSES!"
echo "=========================================="
echo ""
echo "📊 Monitor: pm2 monit"
echo "📋 Logs   : pm2 logs pick-your-photo"
echo "🔄 Restart: pm2 restart pick-your-photo"
echo "=========================================="
