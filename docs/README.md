# 📚 Dokumentasi Resmi Pick Your Photo (Photota) SaaS Platform

Selamat datang di pusat dokumentasi resmi arsitektur dan sistem platform **Pick Your Photo (Photota) SaaS**. Seluruh dokumen di bawah ini telah diverifikasi dan disinkronkan secara langsung dengan seluruh basis kode produksi (*Source Code*) terkini.

---

## 📑 Daftar Dokumen Utama

1. [**`01-SYSTEM-SPECIFICATION.md`**](./01-SYSTEM-SPECIFICATION.md)  
   *Spesifikasi Arsitektur Sistem Utama, Fitur SaaS, Multi-Tenant Subdomain Studio Routing (`[subdomain].[domain]`), Official Studio Portal Landing & Portofolio Google Drive, Peran Pengguna (Superadmin / Sub-Admin / Vendor / Klien), Dynamic Slider Add-On Storage (0–200 GB), Multi-Provider Payment Gateway (QRIS & Manual), Dedicated Storage Pool Engine, dan Sistem White-Label.*

2. [**`02-DATABASE-AND-SECURITY.md`**](./02-DATABASE-AND-SECURITY.md)  
   *Skema Basis Data SQLite Triad Pattern (`master.db`, `vendor.db`, `trial.db`) lengkap: Tabel `vendors`, `subdomain_history`, `plans`, `payment_sessions`, `addon_plans`, `storage_folders`, `saas_settings` — serta Sistem Keamanan Enkripsi Kunci Rahasia AES-256-CBC (`crypto-vault.js`), Cloudflare Full (Strict) SSL + Origin CA Wildcard 15 Tahun, Proteksi SQL Injection 100% Parameterized, dan Zero-Storage Media Stream.*

3. [**`03-DEPLOYMENT-GUIDE.md`**](./03-DEPLOYMENT-GUIDE.md)  
   *Panduan Peluncuran Produksi (Deploy) Menggunakan Node.js v18+/v24 LTS, PM2 (`deploy.sh` zero-downtime & auto-generating secrets), Nginx UI Reverse Proxy dengan Wildcard Subdomain & Cloudflare Origin SSL, Docker Compose (`deploy-docker.sh`), Environment Variables lengkap, dan Setup Google OAuth Master & Worker Pool.*

4. [**`04-MASTER-STORAGE-SPECIFICATION.md`**](./04-MASTER-STORAGE-SPECIFICATION.md)  
   *Spesifikasi Lengkap Infrastruktur Cloud Storage Pool: Google Drive Master Hub + Worker Pool, Integrasi Google Drive Pribadi (BYOS), Enterprise Custom Storage (10–200 GB), Auto Payment Activation, Capacity Load Balancing, Dynamic Latency Governor (Turbo Upload Concurrency), serta Grace Period 30 Hari & Hard Purge Policy.*

5. [**`API_DOCUMENTATION.md`**](./API_DOCUMENTATION.md)  
   *Dokumentasi Lengkap 80+ API Endpoint: Auth, Subdomain Studio Claim/Update/Check, Vendor Profile & Google Drive Portofolio, Admin Console, Storage Pool & BYOS, Payment Gateway Multi-Provider (QRIS & Manual), RAW Selector, Galeri Klien, dan Public Version.*

---

> **Status Sistem (Update 23 Agustus 2026):** Seluruh dokumen resmi telah diselaraskan 100% dengan basis kode produksi aktif, mencakup Multi-Tenant Dynamic Subdomain Studio, Cloudflare Full (Strict) Origin CA SSL, AES-256-CBC Secret Encryption, Triad SQLite Database, dan Real-Time Google Drive Portfolio Streaming.

