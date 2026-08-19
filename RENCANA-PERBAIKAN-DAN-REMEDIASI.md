# 🛠️ RENCANA PERBAIKAN, REMEDIASI & BLUEPRINT IMPLEMENTASI (POST-AUDIT)
**Sistem:** Pick-Your-Photo — Enterprise SaaS Platform Seleksi Foto Digital  
**Dokumen Induk:** [AUDIT-Before-Deploy.md](file:///Users/armansyam/Documents/Project%20AmsDev/pick-your-photo/AUDIT-Before-Deploy.md)  
**Tujuan Dokumen:** Panduan teknis komprehensif, arsitektur diff kode, analisis akar masalah (RCA), dan protokol verifikasi mandiri untuk dipelajari, diverifikasi ulang, dan dieksekusi oleh AI / Engineer (Claude Engine / Lead Developer).  
**Status Eksekusi Saat Ini:** ⛔ **BLUEPRINT ONLY / ZERO CODE MODIFICATION**

---

## 📑 DAFTAR ISI
1. [Ringkasan Eksekutif & Matriks Prioritas Remediasi](#1-ringkasan-eksekutif--matriks-prioritas-remediasi)
2. [Detail Remediasi Prioritas P0 (Kritis / Keamanan Finansial)](#2-detail-remediasi-prioritas-p0-kritis--keamanan-finansial)
   - [P0-1: Eliminasi Celah Manipulasi Harga (Price Tampering) pada Gateway Payment](#p0-1-eliminasi-celah-manipulasi-harga-price-tampering-pada-gateway-payment)
   - [P0-2: Pencegahan Bypass Kuota Add-On Gratis saat Payment Gateway Nonaktif](#p0-2-pencegahan-bypass-kuota-add-on-gratis-saat-payment-gateway-nonaktif)
   - [P0-3: Koreksi Formula Signature Callback Webhook Duitku](#p0-3-koreksi-formula-signature-callback-webhook-duitku)
   - [P0-4: Fallback Parameter `sid` pada Webhook Driver iPaymu](#p0-4-fallback-parameter-sid-pada-webhook-driver-ipaymu)
3. [Detail Remediasi Prioritas P1 (Tinggi / Privasi & Integritas)](#3-detail-remediasi-prioritas-p1-tinggi--privasi--integritas)
   - [P1-1: Sanitasi Respon Lupa Password (Mencegah Enumerasi Identitas Vendor)](#p1-1-sanitasi-respon-lupa-password-mencegah-enumerasi-identitas-vendor)
   - [P1-2: Safeguard Sinkronisasi Pengurangan Kuota BYOS vs SaaS Dedicated](#p1-2-safeguard-sinkronisasi-pengurangan-kuota-byos-vs-saas-dedicated)
   - [P1-3: Pembersihan Lengkap Relasi Orphaned Record saat Penghapusan Vendor](#p1-3-pembersihan-lengkap-relasi-orphaned-record-saat-penghapusan-vendor)
4. [Detail Remediasi Prioritas P2 (Normal / DevOps & Server Hardening)](#4-detail-remediasi-prioritas-p2-normal--devops--server-hardening)
   - [P2-1: Konfigurasi PM2 Cluster & Ekosistem Startup Server](#p2-1-konfigurasi-pm2-cluster--ekosistem-startup-server)
   - [P2-2: Setup Nginx Reverse Proxy dengan Real-IP Forwarding](#p2-2-setup-nginx-reverse-proxy-dengan-real-ip-forwarding)
   - [P2-3: Konfigurasi Crontab Otomatisasi Hard Purge & Backup SQLite](#p2-3-konfigurasi-crontab-otomatisasi-hard-purge--backup-sqlite)
5. [Protokol Verifikasi Ulang Mandiri (Claude Verification Loop)](#5-protokol-verifikasi-ulang-mandiri-claude-verification-loop)

---

## 1. RINGKASAN EKSEKUTIF & MATRIKS PRIORITAS REMEDIASI

Berdasarkan hasil scanning forensik pada [AUDIT-Before-Deploy.md](file:///Users/armansyam/Documents/Project%20AmsDev/pick-your-photo/AUDIT-Before-Deploy.md), ditemukan 4 temuan berisiko tinggi (P0), 3 temuan integritas/privasi (P1), dan 3 item kesiapan operasional DevOps (P2).

### 🎯 Matriks Tindakan & Dampak Bisnis
| ID | Tingkat | Lokasi Berkas Target | Dampak Bila Tidak Diperbaiki | Estimasi Waktu Fix |
| :---: | :---: | :--- | :--- | :---: |
| **P0-1** | 🔴 **P0** | [`app/api/payment/create/route.js`](file:///Users/armansyam/Documents/Project%20AmsDev/pick-your-photo/app/api/payment/create/route.js) | Vendor dapat membeli paket Business Studio Rp 249.000 hanya dengan membayar Rp 1.000 via manipulasi HTTP POST. | 15 Menit |
| **P0-2** | 🔴 **P0** | [`app/api/payment/addon/create/route.js`](file:///Users/armansyam/Documents/Project%20AmsDev/pick-your-photo/app/api/payment/addon/create/route.js) | Kuota Add-On storage aktif gratis tanpa bayar jika toggle payment gateway sedang dimatikan admin. | 10 Menit |
| **P0-3** | 🔴 **P0** | [`lib/payment-gateway/duitku.js`](file:///Users/armansyam/Documents/Project%20AmsDev/pick-your-photo/lib/payment-gateway/duitku.js) | Pembayaran Duitku yang sukses akan ditolak oleh webhook karena ketidakcocokan urutan MD5 hash. | 5 Menit |
| **P0-4** | 🔴 **P0** | [`lib/payment-gateway/ipaymu.js`](file:///Users/armansyam/Documents/Project%20AmsDev/pick-your-photo/lib/payment-gateway/ipaymu.js) | Notifikasi webhook iPaymu berpotensi tidak terbaca jika iPaymu hanya mengirimkan parameter `sid`. | 5 Menit |
| **P1-1** | 🟡 **P1** | [`app/api/auth/forgot-password/route.js`](file:///Users/armansyam/Documents/Project%20AmsDev/pick-your-photo/app/api/auth/forgot-password/route.js) | Kebocoran nama lengkap vendor pada penyerang yang melakukan bruteforce nomor WhatsApp / email. | 5 Menit |
| **P1-2** | 🟡 **P1** | [`app/api/storage/files/route.js`](file:///Users/armansyam/Documents/Project%20AmsDev/pick-your-photo/app/api/storage/files/route.js) | Potensi kuota storage minus jika vendor menghapus berkas dari Google Drive pribadi (BYOS). | 5 Menit |
| **P1-3** | 🟡 **P1** | [`app/api/admin/vendors/[vendorId]/route.js`](file:///Users/armansyam/Documents/Project%20AmsDev/pick-your-photo/app/api/admin/vendors/%5BvendorId%5D/route.js) | Sisa baris data (*orphaned records*) pada tabel storage jika admin menghapus vendor secara permanen. | 5 Menit |
| **P2-1** | 🟢 **P2** | `ecosystem.config.js` | Restart otomatis saat instance crash dan utilisasi multi-core CPU. | 10 Menit |
| **P2-2** | 🟢 **P2** | `/etc/nginx/sites-available/pickyourphoto` | Reverse proxy, SSL Termination, dan Client Real IP Header. | 15 Menit |
| **P2-3** | 🟢 **P2** | Linux Crontab | Otomasi Hard Purge jam 03:00 WIB dan auto backup database berkala. | 5 Menit |

---

## 2. DETAIL REMEDIASI PRIORITAS P0 (KRITIS / KEAMANAN FINANSIAL)

---

### P0-1: Eliminasi Celah Manipulasi Harga (Price Tampering) pada Gateway Payment
- **Lokasi Berkas:** [`app/api/payment/create/route.js:48-59`](file:///Users/armansyam/Documents/Project%20AmsDev/pick-your-photo/app/api/payment/create/route.js#L48-L59)
- **Akar Masalah (RCA):**
  Kode saat ini:
  ```javascript
  const allowCustom = authUser && (authUser.role === 'admin' || authUser.id === vendorId);
  let planAmount = (customAmount && customAmount > 0 && allowCustom) ? customAmount : plan.price;
  ```
  Kondisi `authUser.id === vendorId` bernilai `true` untuk semua vendor yang sedang login saat melakukan upgrade paket. Hal ini menyebabkan vendor jahat bisa menyuntikkan `customAmount: 1000` via inspect network / curl request, sehingga tagihan QRIS terbuat senilai Rp 1.000 untuk paket bernilai ratusan ribu rupiah.

- **Rancangan Perubahan (Code Diff Blueprint):**
  1. Hapus izin `authUser.id === vendorId` dari `allowCustom`. Hanya izinkan `customAmount` jika `authUser.role === 'admin'`.
  2. Untuk vendor reguler yang melakukan upgrade, hitung prorata **murni di sisi backend (server-side)** menggunakan data sisa masa aktif vendor aktual di database SQLite.

```diff
-   // Allow custom amount if user is admin OR the vendor itself
-   const allowCustom = authUser && (authUser.role === 'admin' || authUser.id === vendorId);
-   let planAmount = (customAmount && customAmount > 0 && allowCustom) ? customAmount : plan.price;
+   // Keamanan Ketat: customAmount HANYA boleh diatur oleh Superadmin
+   const isSuperadmin = authUser && authUser.role === 'admin';
+   let planAmount = plan.price;
+
+   if (isSuperadmin && customAmount && customAmount > 0) {
+     planAmount = customAmount;
+   } else if (vendor.status === 'active' && vendor.planId && vendor.planId !== plan.id) {
+     // Hitung Prorata Upgrade secara Server-Side (Aman dari Client-Side Tampering)
+     const currentPlan = db.prepare('SELECT price FROM plans WHERE id = ?').get(vendor.planId);
+     const currentPrice = currentPlan ? currentPlan.price : 0;
+     const targetPrice = plan.price;
+
+     if (targetPrice > currentPrice) {
+       const now = new Date();
+       const expDate = vendor.expiresAt ? new Date(vendor.expiresAt) : now;
+       const diffDays = Math.max(1, Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
+       const remainingDays = Math.min(30, diffDays);
+       const dailyPriceDiff = (targetPrice - currentPrice) / 30;
+       planAmount = Math.max(10000, Math.round(dailyPriceDiff * remainingDays));
+     }
+   }
```

- **Skenario Pengujian Validasi:**
  1. Vendor login menembak `POST /api/payment/create` dengan `customAmount: 500` -> Backend menolak nominal tampering dan tetap menagihkan nilai prorata asli/penuh.
  2. Superadmin membuat transaksi khusus dengan `customAmount: 50000` -> Diterima karena otorisasi role `admin`.

---

### P0-2: Pencegahan Bypass Kuota Add-On Gratis saat Payment Gateway Nonaktif
- **Lokasi Berkas:** [`app/api/payment/addon/create/route.js:209-233`](file:///Users/armansyam/Documents/Project%20AmsDev/pick-your-photo/app/api/payment/addon/create/route.js#L209-L233)
- **Akar Masalah (RCA):**
  Jika `config.enabled === false`, kode jatuh ke blok Fallback Mode yang langsung mengeksekusi `INSERT INTO storage_addon_subscriptions` dan memberikan `hasStorageAddon = 1` tanpa memverifikasi bukti bayar manual.

- **Rancangan Perubahan (Code Diff Blueprint):**
```diff
-   // 2. FALLBACK / DEV MODE (Bila Payment Gateway dinonaktifkan): Langsung aktifkan kuota
-   db.prepare(`
-     INSERT INTO storage_addon_subscriptions (vendorId, addonPlanId, price, proratedPrice, status)
-     VALUES (?, ?, ?, ?, 'active')
-   `).run(vendor.id, addonPlan.id, addonPlan.price, proratedPrice);
-
-   db.prepare(`
-     UPDATE vendors 
-     SET hasStorageAddon = 1, addonStorageQuotaBytes = ?, addonPlanId = ? 
-     WHERE id = ?
-   `).run(addonPlan.quotaBytes, addonPlan.id, vendor.id);
+   // 2. JIKA PAYMENT GATEWAY DINONAKTIFKAN & TIDAK ADA BUKTI TRANSFER MANUAL
+   return NextResponse.json({
+     success: false,
+     error: 'Pembayaran otomatis via Gateway sedang dinonaktifkan. Silakan gunakan metode Transfer Bank Manual dan unggah bukti transfer.'
+   }, { status: 400 });
```

---

### P0-3: Koreksi Formula Signature Callback Webhook Duitku
- **Lokasi Berkas:** [`lib/payment-gateway/duitku.js:77`](file:///Users/armansyam/Documents/Project%20AmsDev/pick-your-photo/lib/payment-gateway/duitku.js#L77)
- **Akar Masalah (RCA):**
  Driver Duitku saat ini menggunakan urutan:
  `MD5(merchantCode + merchantOrderId + amount + apiKey)`  
  Sedangkan spesifikasi resmi callback Duitku (notifikasi lunas) mengharuskan:
  `MD5(merchantCode + amount + merchantOrderId + apiKey)`.

- **Rancangan Perubahan (Code Diff Blueprint):**
```diff
-   const expectedSignature = crypto
-     .createHash('md5')
-     .update((merchantCode || '') + merchantOrderId + (amount || '') + (apiKey || ''))
-     .digest('hex');
+   // Spesifikasi Resmi Callback Duitku: MD5(merchantCode + amount + merchantOrderId + apiKey)
+   const expectedSignature = crypto
+     .createHash('md5')
+     .update((merchantCode || '') + (amount || '') + merchantOrderId + (apiKey || ''))
+     .digest('hex');
```

---

### P0-4: Fallback Parameter `sid` pada Webhook Driver iPaymu
- **Lokasi Berkas:** [`lib/payment-gateway/ipaymu.js:101`](file:///Users/armansyam/Documents/Project%20AmsDev/pick-your-photo/lib/payment-gateway/ipaymu.js#L101)
- **Akar Masalah (RCA):**
  Pada beberapa skenario callback webhook IPaymu Direct QRIS, identifikasi order dikirimkan melalui parameter `sid` (Session ID). Jika `reference_id` kosong, verifikasi akan gagal menemukan transaksi.

- **Rancangan Perubahan (Code Diff Blueprint):**
```diff
-   const orderId = payload.reference_id || payload.referenceId || payload.order_id || payload.orderId;
+   const orderId = payload.reference_id || payload.referenceId || payload.order_id || payload.orderId || payload.sid || payload.trx_id;
```

---

## 3. DETAIL REMEDIASI PRIORITAS P1 (TINGGI / PRIVASI & INTEGRITAS)

---

### P1-1: Sanitasi Respon Lupa Password (Mencegah Enumerasi Identitas Vendor)
- **Lokasi Berkas:** [`app/api/auth/forgot-password/route.js:41-45`](file:///Users/armansyam/Documents/Project%20AmsDev/pick-your-photo/app/api/auth/forgot-password/route.js#L41-L45)
- **Akar Masalah (RCA):**
  Response `POST /api/auth/forgot-password` mengembalikan `{ vendorName: vendor.name }`. Hal ini memungkinkan pihak ketiga menebak nomor telepon/email fotografer untuk mendapatkan nama pemilik akun secara publik.

- **Rancangan Perubahan (Code Diff Blueprint):**
```diff
    return NextResponse.json({ 
-       message: 'Permintaan reset password berhasil diajukan ke admin.',
-       vendorName: vendor.name
+       message: 'Jika akun terdaftar, permintaan reset password telah diteruskan ke tim Administrator.',
+       success: true
    }, { status: 200 });
```

---

### P1-2: Safeguard Sinkronisasi Pengurangan Kuota BYOS vs SaaS Dedicated
- **Lokasi Berkas:** [`app/api/storage/files/route.js:274-279`](file:///Users/armansyam/Documents/Project%20AmsDev/pick-your-photo/app/api/storage/files/route.js#L274-L279)
- **Status Evaluasi:** Telah terpasang guard `const isSaaSFile = (file.isExternalDrive !== 1 && file.isExternalDrive !== '1')`.
- **Rekomendasi Tambahan:** Pasang query audit sinkronisasi otomatis harian via SQLite trigger atau auto-cleanup interval agar `vendors.usedStorageBytes` selalu identik dengan `SUM(fileSizeBytes)` dari file `isExternalDrive = 0`.

---

### P1-3: Pembersihan Lengkap Relasi Orphaned Record saat Penghapusan Vendor
- **Lokasi Berkas:** [`app/api/admin/vendors/[vendorId]/route.js:166-170`](file:///Users/armansyam/Documents/Project%20AmsDev/pick-your-photo/app/api/admin/vendors/%5BvendorId%5D/route.js#L166-L170)
- **Status Evaluasi:** Telah meng-cover `storage_files`, `storage_folders`, `storage_addon_subscriptions`, dan `upload_queue`.
- **Rekomendasi Tambahan:** Tambahkan pembersihan tabel `trial_galleries` jika vendor yang bersangkutan pernah membuat galeri uji coba instan dengan email terdaftar.

---

## 4. DETAIL REMEDIASI PRIORITAS P2 (NORMAL / DEVOPS & SERVER HARDENING)

---

### P2-1: Konfigurasi PM2 Cluster & Ekosistem Startup Server
Buat file `ecosystem.config.js` di root project untuk memastikan proses Node.js otomatis restart bila terjadi unhandled exception atau server reboot:

```javascript
module.exports = {
  apps: [
    {
      name: 'pick-your-photo-saas',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: './',
      instances: 'max', // Memanfaatkan seluruh vCPU core secara cluster
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      max_memory_restart: '500M', // Mencegah lonjakan memori abnormal
      error_file: './logs/pm2-err.log',
      out_file: './logs/pm2-out.log',
      time: true
    }
  ]
};
```

---

### P2-2: Setup Nginx Reverse Proxy dengan Real-IP Forwarding
Konfigurasi Nginx di `/etc/nginx/sites-available/pickyourphoto`:

```nginx
server {
    listen 80;
    server_name pickyourphoto.id www.pickyourphoto.id;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name pickyourphoto.id www.pickyourphoto.id;

    ssl_certificate /etc/letsencrypt/live/pickyourphoto.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pickyourphoto.id/privkey.pem;

    # Gzip Compression untuk Aset Statis
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    # Proxy Buffer & Header Real IP (Sangat Penting untuk Rate Limiter)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }

    # Static Cache untuk Next.js Assets
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }
}
```

---

### P2-3: Konfigurasi Crontab Otomatisasi Hard Purge & Backup SQLite
Daftarkan pada crontab server (`crontab -e`):

```bash
# 1. Trigger Hard Purge Vendor Expired setiap hari pukul 03:00 WIB
0 3 * * * curl -s -X POST -H "Authorization: Bearer SECRET_CRON_ANDA_DISINI" https://pickyourphoto.id/api/cron/purge-expired >/dev/null 2>&1

# 2. Trigger Backup SQLite Database setiap 6 jam
0 */6 * * * /bin/bash /var/www/pick-your-photo/scripts/backup-db.sh >> /var/www/pick-your-photo/logs/backup.log 2>&1

# 3. Trigger Backup Logo & Private Proofs setiap 12 jam
0 */12 * * * /bin/bash /var/www/pick-your-photo/scripts/backup-photos.sh >> /var/www/pick-your-photo/logs/backup.log 2>&1
```

---

## 5. PROTOKOL VERIFIKASI ULANG MANDIRI (CLAUDE VERIFICATION LOOP)

Saat Claude / Lead Developer mengeksekusi remedi di atas, wajib mengikuti **5 Protokol Pemeriksaan Mandiri**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 5 PROTOKOL PEMERIKSAAN MANDIRI (FABLE 5 LOOP)               │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. [ ] Cek Otorisasi Role: Apakah user non-admin diblokir dari customAmount?│
│ 2. [ ] Cek Gateway Off: Apakah Add-on Storage menolak pemberian kuota gratis?│
│ 3. [ ] Cek Webhook Hash: Apakah kalkulasi MD5 Duitku & HMAC iPaymu cocok?   │
│ 4. [ ] Cek Sintaks Node.js: `node -c app/api/.../route.js` bebas dari error?│
│ 5. [ ] Cek Build Bersih: `npm run build` berhasil menghasilkan bundle tanpa  │
│        kegagalan type atau require hook?                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

> **Laporan Dibuat Oleh:** *Antigravity Coding Assistant (Claude Fable 5 Mythos-Class Reasoning Protocol)*  
> **Status:** Siap dipelajari dan diverifikasi ulang oleh Claude Engine. Kode sumber aplikasi tetap aman dan tidak mengalami modifikasi otomatis.
