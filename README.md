# Pick-Your-Photo: Self-Hosted SaaS

Pick-Your-Photo adalah platform SaaS mandiri (*self-hosted*) yang dirancang khusus untuk mempermudah fotografer (vendor) dalam mengelola proses seleksi foto bersama klien. Menggantikan alur kerja manual melalui chat WhatsApp atau spreadsheet, platform ini memproses foto berukuran besar ke server hosting sementara secara efisien menggunakan optimasi kompresi gambar otomatis.

---

## 🚀 Fitur Utama & Keunggulan

### 1. Panel Fotografer / Vendor Dashboard
* **Google Drive Integration:** Fotografer cukup memasukkan URL/Link folder Google Drive untuk mengimpor aset foto klien secara otomatis menggunakan Google Drive API.
* **Temporary Staging Storage:** Server mengunduh foto asli, menyimpannya secara lokal di folder aman `/public/staging_uploads`, dan secara otomatis menghasilkan file terkompresi beresolusi optimal menggunakan modul `sharp`.
* **Client Link Generation:** Setiap proyek secara dinamis menghasilkan URL galeri unik beserta kode akses acak (*access key*) untuk menjaga kerahasiaan foto klien.
* **Selection Management:** Melacak file mana saja yang dipilih oleh klien dan menyediakannya dalam daftar teks siap salin.

### 2. Galeri Seleksi Klien (Teroptimasi & Interaktif)
* **High-Speed Gallery:** Menampilkan foto hasil kompresi berukuran ringan, memastikan performa loading yang sangat responsif di perangkat mobile maupun desktop.
* **Visual Confirmation Preview:** Sebelum mengunci pilihan, klien disuguhkan modal konfirmasi interaktif yang menampilkan **grid thumbnail visual** dari foto yang dipilih (bukan hanya nama file teks), sehingga mencegah salah kirim.
* **Quick Deselect:** Klien dapat membatalkan pilihan foto secara langsung dengan mengklik tombol "×" di pojok kanan atas thumbnail pada modal konfirmasi tanpa harus kembali ke grid galeri utama.
* **Strict Selection Lock:** Setelah disubmit, galeri klien beralih ke mode **read-only permanen**. Tombol tinjau akan menampilkan ringkasan list terkunci tanpa opsi modifikasi/deselect secara tidak sengaja.
* **Watermark Floating Credit:** Menyertakan logo watermark transparan dinamis **AMS** di setiap gambar gallery untuk melindungi hak cipta fotografer.
* **Interactive Lightbox:** Mode preview gambar penuh dengan kontrol pemilihan, tombol navigasi keyboard, status indikator seleksi, dan status finalisasi (kunci pilihan).

### 3. Owner / Superadmin SaaS Dashboard
* **SaaS Analytics Engine:**
  * **Potential Monthly Revenue:** Akumulasi pendapatan kotor bulanan dari seluruh paket aktif milik vendor terdaftar.
  * **Client Selection Progress:** Visual progress bar dinamis yang melacak persentase penyelesaian seleksi foto klien di seluruh proyek.
  * **Project Funnel Breakdown:** Statistik jumlah proyek yang selesai diseleksi versus proyek yang masih menunggu input klien.
  * **Account Status Monitor:** Rekapitulasi jumlah akun berstatus *Active*, *Pending Approval*, dan *Suspended*.
* **Vendor Account Manager:** Menyetujui pendaftaran baru, mengubah status keanggotaan, mengubah paket berlangganan, serta mengatur tanggal kedaluwarsa akun (`expiresAt`).
* **Interactive Payment Verification:**
  * **Bukti Transfer Lightbox:** Membuka bukti transfer yang diunggah vendor baru saat registrasi secara visual.
  * **Kirim Invoice:** Tombol simulasi pengiriman tagihan virtual langsung setelah memverifikasi pembayaran.
* **Plan Tiers Manager (CRUD):** Membuat, membaca, memperbarui, dan menghapus paket berlangganan secara dinamis lengkap dengan pembatasan jumlah proyek maksimal.

---

## 🛠️ Tumpukan Teknologi (Tech Stack)

* **Framework Utama:** Next.js 14 (App Router)
* **Basis Data:** SQLite (menggunakan `better-sqlite3` untuk kecepatan query)
* **Pemrosesan Gambar:** `sharp` (melakukan optimasi gambar dan *watermarking* dinamis)
* **Autentikasi & Keamanan:** JSON Web Tokens (JWT) & bcryptjs
* **Deployment:** Docker & Docker Compose (siap dijalankan di VPS / server lokal)

---

## ⚙️ Konfigurasi Environment (`.env.local`)

Buat file bernama `.env.local` di folder root proyek dengan parameter berikut sebelum menjalankan aplikasi:

```env
# Secret key untuk menandatangani token JWT sesi login
JWT_SECRET=gunakan_string_acak_panjang_disini

# Kredensial akun Superadmin / Owner SaaS
ADMIN_EMAIL=amsdev@gmail.com
ADMIN_PASSWORD=amsdev123

# Kredensial Google Drive API Console (untuk fitur impor folder Drive)
GOOGLE_API_KEY=ganti_dengan_api_key_gdrive_anda
```

> [!NOTE]
> Database SQLite secara otomatis menyinkronkan data superadmin Anda dengan konfigurasi di atas pada saat aplikasi Next.js pertama kali dijalankan.

---

## 💻 Cara Menjalankan Aplikasi (Development)

### Opsi A: Menjalankan Secara Lokal (Native Node.js)
Gunakan opsi ini untuk performa pengembangan yang paling ringan tanpa *overhead* virtualisasi.
1. **Instal dependensi:**
   ```bash
   npm install
   ```
2. **Jalankan server pengembangan:**
   ```bash
   npm run dev
   ```
3. Buka browser dan akses **`http://localhost:3000`**.

### Opsi B: Menjalankan Menggunakan Docker Dev
1. Pastikan Docker dan Docker Compose sudah terpasang.
2. Jalankan perintah berikut di terminal:
   ```bash
   docker compose up -d
   ```
3. Aplikasi akan berjalan di latar belakang pada port `3000`. Akses melalui browser di **`http://localhost:3000`**.

---

## 🚀 Panduan Deployment & Produksi (Production)

Untuk deployment di server VPS produksi, Anda wajib mengonfigurasi penyimpanan lokal secara persisten (**Docker Volume** / **Bind Mount**) agar database dan berkas unggahan gambar klien tidak hilang saat container diperbarui.

Detail mengenai cara konfigurasi container produksi, penggunaan port, dan opsi bind mount telah didokumentasikan di berkas:
*   [DEPLOYMENT_GUIDE.md](file:///Users/armansyam/Documents/Project%20AmsDev/pick-your-photo/DEPLOYMENT_GUIDE.md)

---

## 🔄 Pemeliharaan & Migrasi Database SQLite

Proyek ini menggunakan database file tunggal SQLite dengan mekanisme migrasi otomatis saat inisialisasi aplikasi.
Untuk panduan lengkap mengenai cara memperbarui skema tabel, menambah kolom baru selama masa pengembangan, konsolidasi skema sebelum rilis, serta langkah pembaruan di server tanpa merusak data pengguna lama, silakan merujuk ke:
*   [DATABASE_GUIDE.md](file:///Users/armansyam/Documents/Project%20AmsDev/pick-your-photo/DATABASE_GUIDE.md)

---

## 📂 Struktur Direktori Proyek

```text
├── app/                  # Route handler dan komponen Next.js App Router
│   ├── (auth)/           # Route login, register, dan manajemen sesi
│   ├── admin/            # Dashboard Superadmin / SaaS Owner Panel
│   ├── api/              # API endpoints untuk auth, project, plans, dll.
│   ├── dashboard/        # Dashboard Vendor / Fotografer
│   ├── gallery/          # Halaman seleksi klien (visual grid & confirmation)
│   └── globals.css       # File css utama sistem
├── components/           # Komponen UI global (termasuk watermark AMS)
├── lib/                  # Library pembantu (database SQLite, Google Drive parser)
├── public/               # Asset statis, logo, dan file upload lokal
├── Dockerfile            # Blueprint image docker aplikasi
├── docker-compose.yml    # Konfigurasi container service port & mounting folder
├── jsconfig.json         # Path aliases resolver (@/*)
├── package.json          # Dependency list project
├── DEPLOYMENT_GUIDE.md   # Panduan konfigurasi server produksi dan Docker Volume
└── DATABASE_GUIDE.md     # SOP pemeliharaan skema database & migrasi data
```

---

## 👨‍💻 Developer Watermark Overlay
Setiap halaman dalam aplikasi ini menyertakan tombol watermark developer melayang **AMS** yang terintegrasi di sudut kanan bawah. Tombol ini menampilkan informasi release aktif, versi sistem, serta tautan langsung ke profil GitHub pengembang.