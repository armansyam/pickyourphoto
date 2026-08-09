# 📚 Dokumentasi Resmi Pick Your Photo SaaS Platform

Selamat datang di pusat dokumentasi resmi arsitektur dan sistem platform **Pick Your Photo SaaS**. Seluruh dokumen di bawah ini selalu diperbarui secara berkala sesuai dengan standar pengembangan terkini.

---

## 📑 Daftar Dokumen Utama

1. [**`01-SYSTEM-SPECIFICATION.md`**](./01-SYSTEM-SPECIFICATION.md)  
   *Spesifikasi Arsitektur Sistem Utama, Fitur SaaS, Peran Pengguna (Superadmin / Sub-Admin / Vendor / Klien), Order Bump Modal Add-On Storage, Multi-Provider Payment Gateway (Midtrans/Xendit/Tripay/Duitku), Sistem Email Notifikasi White-Label Invoice, dan Rules Expired 24 Jam Transfer Manual.*

2. [**`02-DATABASE-AND-SECURITY.md`**](./02-DATABASE-AND-SECURITY.md)  
   *Skema Basis Data SQLite3 lengkap: Tabel `vendors`, `payment_transactions`, `payment_sessions`, `addon_plans`, `master_drive_accounts`, `subscription_requests` (kolom `addonPlanId` & `requestType`), `saas_settings`, `system_settings` — serta Sistem Keamanan JWT, Proxy Image, dan Google OAuth Master.*

3. [**`03-DEPLOYMENT-GUIDE.md`**](./03-DEPLOYMENT-GUIDE.md)  
   *Panduan Peluncuran Produksi (Deploy) Menggunakan Node.js v18+/v24 LTS, PM2, Nginx SSL, Docker Compose, Environment Variables lengkap (termasuk Google Drive BYOS), dan Setup Google OAuth Master.*

4. [**`04-MASTER-STORAGE-SPECIFICATION.md`**](./04-MASTER-STORAGE-SPECIFICATION.md)  
   *Spesifikasi Lengkap Infrastruktur Cloud Storage Pool: Google Drive BYOS (Bring Your Own Storage), Enterprise Custom Storage (50–200 GB), Auto Payment Activation, Live Google Drive API Move & Rename, Capacity Load Balancing, Dynamic Latency Governor (Turbo Upload 8–10 Thread), serta Grace Period 30 Hari & Hard Purge Policy.*

5. [**`API_DOCUMENTATION.md`**](./API_DOCUMENTATION.md)  
   *Dokumentasi Lengkap SELURUH API Endpoint: Auth, Admin (Vendors, Plans, Admins, Upgrades, Analytics, Disk Stats), Storage Add-On, Payment Gateway Multi-Provider (QRIS & Manual), RAW Selector, serta Galeri Klien.*

---

> **Catatan Pengembang (Update 10 Agustus 2026):** Seluruh dokumen resmi telah diselaraskan 100% dengan basis kode produksi terkini, mencakup arsitektur Order Bump Add-On Storage, perbaikan 23 bug dari sesi audit forensik lintas-lapisan, Multi-Provider Payment Gateway, Google Drive BYOS, sistem email notifikasi 5-jalur aktivasi dual payment mode, Sub-Admin Team Management, dan Grace Period 30 Hari dengan Hard Purge Policy otomatis.
