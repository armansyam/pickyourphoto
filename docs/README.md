# 📚 Dokumentasi Resmi Pick Your Photo SaaS Platform

Selamat datang di pusat dokumentasi resmi arsitektur dan sistem platform **Pick Your Photo SaaS**. Seluruh dokumen di bawah ini telah diverifikasi dan disinkronkan secara langsung dengan seluruh basis kode produksi (Source Code) terkini.

---

## 📑 Daftar Dokumen Utama

1. [**`01-SYSTEM-SPECIFICATION.md`**](./01-SYSTEM-SPECIFICATION.md)  
   *Spesifikasi Arsitektur Sistem Utama, Fitur SaaS, Peran Pengguna (Superadmin / Sub-Admin / Vendor / Klien), Order Bump Modal Add-On Storage, Multi-Provider Payment Gateway (Midtrans/Xendit/Tripay/Duitku), Dedicated Storage Pool Engine, Sistem Email Notifikasi White-Label Invoice, dan Rules Expired 24 Jam Transfer Manual.*

2. [**`02-DATABASE-AND-SECURITY.md`**](./02-DATABASE-AND-SECURITY.md)  
   *Skema Basis Data SQLite3 lengkap: Tabel `vendors`, `payment_transactions`, `payment_sessions`, `addon_plans`, `master_drive_accounts`, `subscription_requests`, `storage_folders`, `storage_files`, `saas_settings`, `system_settings` — serta Sistem Keamanan JWT, Non-Blocking Version Endpoint, Rate Limiting, Proxy Image Stream, dan Google OAuth Master/Worker.*

3. [**`03-DEPLOYMENT-GUIDE.md`**](./03-DEPLOYMENT-GUIDE.md)  
   *Panduan Peluncuran Produksi (Deploy) Menggunakan Node.js v18+/v24 LTS, PM2 (`deploy.sh` zero-downtime & auto-generating secrets), Nginx SSL, Docker Compose (`deploy-docker.sh`), Environment Variables lengkap, dan Setup Google OAuth Master & Worker Pool.*

4. [**`04-MASTER-STORAGE-SPECIFICATION.md`**](./04-MASTER-STORAGE-SPECIFICATION.md)  
   *Spesifikasi Lengkap Infrastruktur Cloud Storage Pool: Google Drive Master Hub + Worker Pool, Enterprise Custom Storage (10–200 GB), Auto Payment Activation, Live Google Drive API Move & Rename, Capacity Load Balancing, Dynamic Latency Governor (Turbo Upload Concurrency), serta Grace Period 30 Hari & Hard Purge Policy.*

5. [**`API_DOCUMENTATION.md`**](./API_DOCUMENTATION.md)  
   *Dokumentasi Lengkap SELURUH 70+ API Endpoint: Auth, Admin (Vendors, Plans, Admins, Upgrades, Drive Pool, Analytics, Disk Stats, Financial CSV, SMTP/Payment Tester), Storage (Folders, Files, Direct/Ticket Upload, Batch-Tree, BYOS), Payment Gateway Multi-Provider (QRIS & Manual), RAW Selector, Galeri Klien, dan Public Version.*

---

> **Status Sistem (Update 20 Agustus 2026):** Seluruh dokumen resmi telah diselaraskan 100% dengan basis kode produksi aktif, mencakup arsitektur Multi-Account Drive Pool, Direct Streaming Upload Tickets, Hardened Versioning Endpoint, Multi-Provider Payment Gateway, dan Zero-Storage Media Streaming Proxy.
