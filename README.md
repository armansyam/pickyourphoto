# Pick-Your-Photo: Self-Hosted SaaS

Pick-Your-Photo adalah platform SaaS mandiri yang dirancang khusus untuk mempermudah fotografer (vendor) dalam mengelola proses seleksi foto bersama klien.

## 🤝 ALUR KERJA TIM KROSS-SERVER: AUDIT (HERMES) ↔ IMPLEMENTASI (ANTIGRAVITY)

Aplikasi ini dikelola dengan ritme kerja dua arah lintas-server melalui kanal berkas **`REPORTS/`** di repositori GitHub dengan metode **Multi-Stage Progressive Audit**:

### 🎯 Protokol Pengujian Bertahap (Progressive Staged Audit):
1. **Tahap 1: Sanity & Build Verification**  
   Uji kompilasi (`npm run build`). Jika Tahap 1 GAGAL ➔ **STOP**, buat laporan & kirim rekomendasi solusi ke Antigravity.
2. **Tahap 2: Security & Authentication Gate**  
   Uji `JWT_SECRET` (wajib dari env tanpa fallback), token expiry `24h`, cookie `sameSite: 'lax'`, rate limiting di 3 endpoint, dan sanitasi response login. Jika GAGAL ➔ **STOP**, buat laporan & rekomendasi.
3. **Tahap 3: Business Logic & Payment Gate**  
   Uji status registrasi QRIS (`isGateway` ➔ `pending_payment`), alur Midtrans webhook/status polling, dan aturan paket berlangganan. Jika GAGAL ➔ **STOP**, buat laporan & rekomendasi.
4. **Tahap 4: Performance, OAuth & Subfolder Deep Scan**  
   Uji `oauth2Client.on('tokens')` di `lib/google-master-drive.js` dan penelusuran rekursif subfolder hingga 5 level kedalaman. Jika GAGAL ➔ **STOP**, buat laporan & rekomendasi.
5. **Tahap 5: Code Hygiene & Dead Code Cleanup**  
   Memastikan tidak ada file mati (`trial-scraper.js`, `storage-cleaner.js`, route over-limit), tidak ada duplikasi fungsi, dan warning static generation bersih.

### 📝 Kontinuitas Laporan Audit & Aturan Zero-Defect:
- **Setiap Iterasi Membuat Berkas Baru**: Nomor laporan terus meningkat secara sekuensial (`AUDIT_001`, `AUDIT_002`, `AUDIT_003`... `AUDIT_00X`) di folder `REPORTS/pending/`.
- **Verifikasi Berkas Lama**: Jika ada temuan lama yang belum 100% tuntas, Antigravity akan terus memperbaikinya hingga diverifikasi dan dipindahkan ke `REPORTS/verified/`.
- **Aturan Zero-Defect & Continuous Debugging**: Antigravity & Hermes tidak akan pernah berhenti menganalisis, memperbaiki, dan menguji sistem selama masih terdapat error sekecil apa pun. Pengujian dilakukan secara penuh hingga sistem 100% lulus tanpa error satupun.
- **Protokol Dialog & Justifikasi Rasional**: Setiap perbaikan atau penolakan rekomendasi oleh Antigravity wajib menyertakan alasan teknis yang jelas. Jika Antigravity memiliki solusi yang lebih baik, Antigravity akan memberikan penjelasan rasional di dokumen laporan dan meminta tanggapan/alasan teknis dari Hermes Agent di iterasi berikutnya.
- **Isolasi Commit**: Antigravity tidak akan meng-commit perubahan di tengah proses pengujian Hermes agar tidak mengganggu commit milik Hermes Agent.




## 🖥️ SPESIFIKASI DOKUMEN SERVER LXC 102 (PANDUAN HERMES AGENT)

Agar **Hermes Agent** tidak salah lokasi saat mengakses server audit/deploy, gunakan kredensial dan lokasi resmi berikut:

| Parameter Server | Nilai Resmi / Path |
|------------------|-------------------|
| **Nama Container LXC** | `LXC 102` |
| **IP Address LAN** | `192.168.100.83` |
| **Port Aplikasi** | `3051` |
| **Domain Publik Utama (Primary)** | `https://pilih.ammang.my.id` |
| **Domain Sekunder (Secondary)** | `https://pick-your-photo.ammang.my.id` |

| **Process Manager** | `PM2 (Node.js Direct Manager)` |
| **Direktori Proyek di LXC 102** | `/DATA/AppData/pickyourphoto` |
| **Watchdog Script** | `/opt/hermes/watchdog.sh` |
| **Log Audit Watchdog** | `/var/log/hermes-watchdog.log` |


> [!IMPORTANT]
> **Panduan untuk Hermes Agent**: Saat berpindah atau mengeksekusi script di LXC 102, selalu masuk ke direktori resmi `/DATA/AppData/pickyourphoto`. Jangan mengakses direktori `/tmp` atau folder lain!



