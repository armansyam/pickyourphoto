# Peta Struktur Proyek: Pick-Your-Photo

Dokumen ini memvisualisasikan struktur direktori dan file untuk aplikasi SaaS Pick-Your-Photo.

```
/pick-your-photo
|
|-- 🐳 docker-compose.yml       # Mengatur bagaimana aplikasi dan volume data berjalan
|-- 🐳 Dockerfile               # Instruksi untuk membangun image aplikasi Next.js
|
|-- 📁 app/                     # Direktori utama Next.js 13+ App Router
|   |-- 🖼️ favicon.ico
|   |-- 📄 layout.js            # Layout utama aplikasi
|   |-- 📄 page.js              # Halaman utama (bisa landing page atau redirect ke login)
|   |
|   |-- 📁 (auth)/              # Grup route untuk autentikasi (tidak mempengaruhi URL)
|   |   |-- 📁 login/
|   |   |   `-- 📄 page.js      # Halaman UI untuk Login Vendor
|   |   `-- 📁 register/
|   |       `-- 📄 page.js      # Halaman UI untuk Registrasi Vendor
|   |
|   |-- 📁 dashboard/           # Rute yang terproteksi, hanya untuk vendor yang sudah login
|   |   |-- 📄 layout.js         # Layout spesifik untuk dashboard
|   |   `-- 📄 page.js          # Tampilan utama dashboard, daftar semua proyek
|   |
|   |-- 📁 gallery/[projectId]/ # Rute dinamis untuk galeri klien
|   |   `-- 📄 page.js          # Halaman galeri foto publik untuk seleksi
|   |
|   `-- 📁 api/                  # ENDPOINT BACKEND (Route Handlers)
|       |-- 📁 auth/             # API untuk proses login & registrasi
|       |   `-- 📄 route.js
|       |-- 📁 projects/         # API untuk membuat, melihat, dan mengelola proyek
|       |   `-- 📄 route.js
|       `-- 📁 import/           # API untuk menangani import dari Google Drive & kompresi gambar
|           `-- 📄 route.js
|
|-- 📁 components/              # Komponen UI React yang dapat digunakan kembali
|   |-- 📁 ui/                   # Komponen UI dasar (e.g., Button, Input, Card)
|   `-- 📁 project/              # Komponen spesifik proyek (e.g., ProjectCard, GalleryImage)
|
|-- 📁 lib/                     # Pustaka & fungsi pembantu
|   |-- 📄 auth.js              # Fungsi autentikasi & JWT untuk vendor
|   |-- 📄 db.js                # Inisialisasi koneksi dan fungsi query ke database SQLite
|   |-- 📄 gdrive-importer.js   # Logika untuk mengunduh file dari Google Drive saat impor
|   `-- 📄 storage-cleaner.js   # Fungsi pembersihan file fisik proyek setelah selesai/kedaluwarsa
|
|-- 📁 public/                  # Aset statis yang diakses publik (logo, panduan, dll.)
|   |-- 🖼️ ams-logo.png         # Logo watermark pengembang (AMS)
|   |-- 📄 guide.html           # File panduan penggunaan
|   |-- 📄 landing.html         # File halaman landing awal
|   |-- 📁 staging_uploads/     # Tempat penyimpanan sementara file JPG foto yang disalin
|   `-- 📁 vendor_logos/        # Folder penyimpanan logo kustom milik vendor
|
|-- 🗃️ database.db             # File database SQLite utama aplikasi (dibuat otomatis)
|-- 📄 .env.local               # Variabel lingkungan (kunci API, konfigurasi, dll.)
|-- 📄 .dockerignore            # Daftar file/folder yang diabaikan oleh Docker
|-- 📄 .gitignore               # Daftar file/folder yang diabaikan oleh Git
|-- 📄 next.config.js           # Konfigurasi Next.js
|-- 📄 package.json             # Daftar dependensi dan skrip proyek
|-- 📄 package-lock.json        # Lock file dependensi npm
|-- 📄 Deskripsi.md             # Deskripsi singkat aplikasi
|-- 📄 PROJECT.md               # Dokumen Persyaratan Produk (PRD)
|-- 📄 README.md                # Dokumentasi teknis & cara menjalankan
`-- 📄 MAP.md                   # Peta struktur proyek ini
```
---
**Persetujuan Akhir:**
Ini adalah peta terakhir dari rencana kita. Semua jalan, kota, dan tujuan telah dipetakan. Tidak ada lagi yang perlu digambar.

Fase Perencanaan **SELESAI**.