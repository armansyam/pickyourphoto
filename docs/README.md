# 📚 Dokumentasi Resmi Pick Your Photo SaaS Platform

Selamat datang di pusat dokumentasi resmi arsitektur dan sistem platform **Pick Your Photo SaaS**. Seluruh dokumen di bawah ini selalu diperbarui secara berkala sesuai dengan standar pengembangan terkini.

---

## 📑 Daftar Dokumen Utama

1. [**`01-SYSTEM-SPECIFICATION.md`**](./01-SYSTEM-SPECIFICATION.md)  
   *Spesifikasi Arsitektur Sistem Utama, Fitur SaaS, Peran Pengguna (Admin vs Vendor), Order Bump Modal Add-On Storage, Sistem Email Notifikasi White-Label Invoice, dan Rules Expired 24 Jam Transfer Manual.*

2. [**`02-DATABASE-AND-SECURITY.md`**](./02-DATABASE-AND-SECURITY.md)  
   *Skema Basis Data SQLite3, Tabel Vendors & Payment Transactions (addonStorageQuotaBytes & pendingAddonQuotaBytes), Tabel SaaS Settings, dan Sistem Keamanan Authentication.*

3. [**`03-DEPLOYMENT-GUIDE.md`**](./03-DEPLOYMENT-GUIDE.md)  
   *Panduan Peluncuran Produksi (Deploy) Menggunakan Node.js, PM2, Nginx, dan Pengaturan Google Drive API Token.*

4. [**`04-MASTER-STORAGE-SPECIFICATION.md`**](./04-MASTER-STORAGE-SPECIFICATION.md)  
   *Spesifikasi Lengkap Infrastruktur Cloud Storage Pool: Enterprise Custom Storage (50-200GB), Auto Payment Activation, Live Google Drive API Move & Rename, Capacity Load Balancing, serta Dynamic Latency Governor (Turbo Upload 8-10 Thread).*

5. [**`API_DOCUMENTATION.md`**](./API_DOCUMENTATION.md)  
   *Dokumentasi Lengkap SELURUH API Endpoint (Auth, Admin, Storage, Payment Gateway QRIS, dan Project).*

---

> **Catatan Pengembang (Update 09 Agustus 2026):** Seluruh dokumen resmi telah diselaraskan 100% dengan basis kode produksi terkini, mencakup arsitektur Order Bump Add-On Storage, 5 jalur aktivasi Dual Payment Mode, sistem email notifikasi resmi, dan aturan auto-cleanup 24 jam transfer manual.
