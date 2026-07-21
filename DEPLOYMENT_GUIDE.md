# Panduan Deployment & Manajemen Database (Pick Your Photo)

Dokumen ini menjelaskan opsi deployment server (khususnya penanganan volume data pada Docker) serta alur kerja migrasi database SQLite selama fase pengembangan hingga rilis produksi.

---

## 📁 1. Manajemen Penyimpanan Data (Persistent Storage)

Untuk mencegah hilangnya data database (`database.db`) dan berkas unggahan gambar klien (`staging_uploads`) serta logo vendor (`vendor_logos`) saat server di-rebuild atau di-update, Anda dapat memilih salah satu dari dua opsi berikut:

### Opsi A: Menggunakan Docker Bind Mount (Sangat Direkomendasikan)
Metode ini mengikat langsung folder fisik di host VPS ke dalam container Docker. Sehingga, data tersimpan langsung di VPS dan tidak hilang saat container dihapus/rebuilt.

#### Langkah 1: Buat Folder Penyimpanan di Host VPS
Di server VPS Anda, buat folder khusus untuk menampung database dan gambar di luar direktori kode utama:
```bash
mkdir -p /var/www/pick-your-photo/data
mkdir -p /var/www/pick-your-photo/uploads/staging_uploads
mkdir -p /var/www/pick-your-photo/uploads/vendor_logos
```

#### Langkah 2: Konfigurasi `docker-compose.yml`
Petakan folder fisik tersebut ke dalam path container Docker:
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=ganti_dengan_jwt_secret_produksi_anda
      - GOOGLE_API_KEY=ganti_dengan_api_key_gdrive_anda
    volumes:
      # Peta database SQLite ke host VPS
      - /var/www/pick-your-photo/data:/app/data
      # Peta folder upload foto klien ke host VPS
      - /var/www/pick-your-photo/uploads/staging_uploads:/app/public/staging_uploads
      # Peta folder upload logo vendor ke host VPS
      - /var/www/pick-your-photo/uploads/vendor_logos:/app/public/vendor_logos
    restart: always
```

---

### Opsi B: Menggunakan Docker Named Volume
Jika Anda tidak ingin mengelola path folder fisik di VPS secara manual, Anda bisa membiarkan Docker mengelola penyimpanan secara otomatis menggunakan *Named Volume*.

#### Konfigurasi `docker-compose.yml` dengan Named Volume:
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=ganti_dengan_jwt_secret_produksi_anda
      - GOOGLE_API_KEY=ganti_dengan_api_key_gdrive_anda
    volumes:
      - db_data:/app/data
      - client_photos:/app/public/staging_uploads
      - vendor_logos:/app/public/vendor_logos
    restart: always

volumes:
  db_data:
  client_photos:
  vendor_logos:
```
*Catatan: Data akan tetap aman saat container diperbarui. Namun, backup data fisik harus diakses melalui direktori internal Docker (biasanya di `/var/lib/docker/volumes/`).*

---

## 🔄 2. Strategi Penggabungan Database & Migrasi (Dev vs Prod)

Selama masa pengembangan (*development*), tabel dan kolom database akan terus bertambah seiring bertambahnya fitur. Hal ini memicu banyak baris migrasi susulan (`ALTER TABLE`) di dalam file inisialisasi [db.js](file:///Users/armansyam/Documents/Project%20AmsDev/pick-your-photo/lib/db.js).

Berikut adalah alur terbaik untuk merapikan skema database saat rilis final:

### Fase 1: Pembersihan di Rilis Final (Final Release Consolidation)
Ketika aplikasi sudah siap dirilis (misal versi `v1.0.0`), seluruh skema awal yang dipecah-pecah selama fase dev akan **digabungkan (dikonsolidasikan)**.
*   **Sebelum Konsolidasi**:
    *   Tabel `vendors` dibuat minimalis di baris awal.
    *   Ada 10 baris query `ALTER TABLE` di bawahnya untuk menambah kolom `role`, `status`, `planId`, `expiresAt`, dll.
*   **Setelah Konsolidasi**:
    *   Query `CREATE TABLE vendors` utama langsung diperbarui untuk memuat seluruh kolom lengkap sejak awal (termasuk `role`, `status`, `planId`, `expiresAt`, dll.).
    *   Dengan demikian, **instalasi baru** tidak perlu menjalankan migrasi bertahap, melainkan langsung membuat database yang "sempurna" sejak awal.

### Fase 2: Mempertahankan Migrasi untuk Update Server Lama
Meskipun skema awal sudah disempurnakan di Fase 1, blok pengecekan migrasi (`try-catch ALTER TABLE`) **tetap wajib dipertahankan** di dalam kode.
*   **Mengapa?**
    Jika ada pengguna yang meng-update aplikasinya dari versi lama (misalnya dari `v0.9` ke `v1.0`), database mereka di VPS sudah terbentuk dengan struktur lama.
    Next.js tidak akan menjalankan query `CREATE TABLE` karena tabelnya sudah ada. Oleh karena itu, skrip migrasi `ALTER TABLE` tetap berjalan di latar belakang untuk menambahkan kolom-kolom baru ke database lama pengguna tanpa merusak data yang sudah tersimpan.

### Alur Siklus Hidup Database:
```text
[Fresh Install] ──> Jalankan CREATE TABLE (Skema Sempurna / Final)
                     │
                     └──> (Migrasi ALTER TABLE dilewati karena kolom sudah ada)

[Update App] ─────> Jalankan CREATE TABLE (Dilewati karena tabel sudah ada)
                     │
                     └──> Jalankan ALTER TABLE (Mendeteksi & menambah kolom baru)
```

---

---

## 💾 3. Strategi Cadangan Data (Backup Strategy)

Guna melindungi data vendor dari kerusakan basis data (SQLite corruption) akibat kepenuhan kapasitas disk, Anda wajib menerapkan pencadangan berkala di server VPS.

### A. Lokasi Skrip Cadangan
Aplikasi menyertakan dua skrip bash siap pakai di dalam folder `scripts/`:
1. **[`backup-db.sh`](file:///Users/armansyam/Documents/Project%20AmsDev/pick-your-photo/scripts/backup-db.sh):** Melakukan salinan database secara aman dengan fitur `.backup` SQLite (bebas lock contention) dan menghapus cadangan berusia > 7 hari.
2. **[`backup-photos.sh`](file:///Users/armansyam/Documents/Project%20AmsDev/pick-your-photo/scripts/backup-photos.sh):** Melakukan sinkronisasi foto vendor secara inkremental menggunakan `rsync`.

### B. Konfigurasi Path Produksi (VPS)
Sebelum mengaktifkan cron job, edit kedua file di folder `scripts/` untuk menyesuaikan path:
*   Ubah variabel `PROJECT_DIR` ke folder aplikasi Anda di server (contoh: `/var/www/pick-your-photo`).
*   **Sangat Direkomendasikan:** Ubah path tujuan backup (`BACKUP_DIR` dan `DEST_DIR`) agar mengarah ke **hard disk eksternal / volume terpisah** (misal `/mnt/volume-eksternal/saas-backups/`). Hal ini guna mencegah kegagalan backup saat disk utama VPS Anda terisi 100%.

### C. Mengaktifkan Otomatisasi dengan Cron Job di VPS
Jalankan perintah `crontab -e` di VPS host Anda dan tempel konfigurasi berikut:

```text
# Backup database SQLite setiap 6 jam
0 */6 * * * /var/www/pick-your-photo/scripts/backup-db.sh >> /var/www/pick-your-photo/backups/backup.log 2>&1

# Inkremental backup foto vendor setiap hari jam 2 dini hari
0 2 * * * /var/www/pick-your-photo/scripts/backup-photos.sh >> /var/www/pick-your-photo/backups/backup.log 2>&1
```

---

## 🔒 4. Berkas Keamanan Penting (`.gitignore`)
Pastikan berkas berikut telah terdaftar di `.gitignore` sebelum melakukan *push* ke repositori Git:
*   `database.db` (database lokal Anda saat development tidak boleh menimpa database produksi).
*   `public/staging_uploads/` (file gambar percobaan lokal).
*   `public/vendor_logos/` (logo uji coba).
*   `.env.local` (kredensial API Google & JWT Key).
*   `backups/` (cadangan data lokal tidak boleh masuk ke repositori).
