# 📸 Pick Your Photo — SaaS Platform Fotografer & Galeri Klien Enterprise

> **Platform Web SaaS Manajemen Galeri Foto, Seleksi Foto Klien, dan Cloud Storage Dedicated Berkecepatan Tinggi untuk Studio Fotografi.**

---

## 🚀 Fitur Utama Platform

- **👑 Admin Control Hub & Storage Pool:** Kelola kolam akun penyimpanan cloud multi-account berbasis Google Drive API dengan penyeimbang beban kapasitas (*Capacity Load Balancing*).
- **📁 Dynamic Master Cluster Naming & Live GDrive API Rename:** Ubah nama dan lokasi folder induk master cluster secara dinamis dan dipindahkan secara *live* di Google Drive Web via API.
- **💾 Enterprise Custom Storage Addons (50 GB - 200 GB):** Kalkulator kuota penyewaan storage interaktif dengan pembayaran otomatis Midtrans Payment Gateway dan aktivasi instan tanpa verifikasi manual.
- **⚡ Hardware Adaptive Concurrency & Turbo Upload Latency Governor:** Pengunggah foto pintar otomatis (hingga 8-10 thread paralel di PC Overpower) dengan proteksi *Event Loop Latency Governor* yang menurunkan kecepatan secara bertahap jika pengguna membuka aplikasi berat studio (Photoshop/Lightroom).
- **📂 Custom Corporate Batch Upload Modal:** Pratinjau batch unggah dengan 4 kartu statistik dan rincian hirarki sub-folder.
- **📊 Admin Financial Report CSV Export:** Ekspor laporan keuangan pendapatan langganan dalam format CSV 1-klik.

---

## 📚 Dokumentasi Lengkap

Seluruh dokumen arsitektur teknis dan panduan peluncuran tersedia di folder [`docs/`](./docs):

- 📄 [**Spesifikasi Sistem SaaS**](./docs/01-SYSTEM-SPECIFICATION.md)
- 📄 [**Skema Basis Data & Keamanan**](./docs/02-DATABASE-AND-SECURITY.md)
- 📄 [**Panduan Deployment Produksi**](./docs/03-DEPLOYMENT-GUIDE.md)
- 📄 [**Spesifikasi Master Cloud Storage & Turbo Engine**](./docs/04-MASTER-STORAGE-SPECIFICATION.md)
- 📄 [**Dokumentasi API Endpoints**](./docs/API_DOCUMENTATION.md)

---

## 🛠️ Cara Menjalankan Secara Lokal

```bash
# 1. Install dependencies
npm install

# 2. Jalankan server pengembangan
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

© 2026 Pick Your Photo SaaS Platform. All rights reserved.
