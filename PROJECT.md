# Product Requirements Document (PRD): Pick-Your-Photo SaaS

**Versi:** 1.0
**Tanggal:** 18 Juli 2026
**Status:** Final - Menunggu Persetujuan untuk Eksekusi

---

### 1. Visi & Misi

*   **Visi Produk:** Menjadi platform SaaS pilihan bagi fotografer lokal untuk menyederhanakan dan mempercepat alur kerja seleksi foto oleh klien.
*   **Misi Produk:** Menyediakan sebuah alat yang andal, cepat, dan hemat biaya yang mengubah proses seleksi foto yang manual dan rentan kesalahan menjadi sebuah pengalaman digital yang profesional dan efisien.

---

### 2. Latar Belakang & Masalah

Fotografer, terutama di segmen wisuda dan acara, menghadapi inefisiensi signifikan dalam proses pasca-produksi. Klien memilih foto dari ribuan file JPG, seringkali dengan metode manual seperti mencatat nama file. Hal ini menciptakan pekerjaan administratif tambahan bagi fotografer untuk mencocokkan nama file pilihan dengan file RAW asli, membuang waktu berharga dan meningkatkan risiko kesalahan.

---

### 3. Arsitektur Inti & Filosofi

Keputusan strategis telah dibuat untuk mengadopsi arsitektur **"Self-Hosted Staging (Panggung Sementara)"**.

*   **Platform:** 100% Self-Hosted pada server tunggal yang dikelola oleh pemilik.
*   **Logika Inti:** Aplikasi akan berfungsi sebagai "panggung" sementara untuk proses seleksi. Vendor akan mengimpor foto dari link Google Drive. Sistem akan menyalin foto-foto ini ke server, melakukan kompresi, dan menyajikannya dalam galeri yang cepat.
*   **Siklus Hidup Data:** Untuk menjaga efisiensi penyimpanan dan biaya, foto-foto yang disalin (di-staging) akan **bersifat sementara**. Mereka akan dihapus secara otomatis (atau melalui aksi manual) setelah sebuah proyek selesai atau setelah periode waktu yang ditentukan (misalnya, 30 hari), hanya menyisakan data nama file yang dipilih.

---

### 4. Tumpukan Teknologi (Technology Stack)

*   **Containerization:** **Docker & Docker Compose** untuk memastikan deployment dan pengelolaan yang mudah di server self-hosted.
*   **Framework Aplikasi (Monolitik):** **Next.js** akan digunakan untuk menangani logika backend (API, pemrosesan file, interaksi DB) dan frontend (UI) dalam satu basis kode yang terpadu.
*   **Database:** **SQLite** akan digunakan karena kesederhanaannya, performa yang solid, dan kemudahan pengelolaan sebagai file tunggal, sangat cocok untuk skala target awal.
*   **Pemrosesan Gambar:** Pustaka **`sharp`** akan diimplementasikan untuk melakukan kompresi gambar secara otomatis saat proses impor. Ini krusial untuk mengurangi ukuran file, menghemat ruang penyimpanan, dan mempercepat waktu muat galeri bagi klien.
*   **Penyimpanan File:** Penyimpanan lokal (SSD direkomendasikan) pada server self-hosted.

---

### 5. Fitur Minimum Viable Product (MVP)

#### 5.1. Sistem Akun Vendor (Multi-Tenancy)
*   **F-1.1:** Halaman pendaftaran untuk fotografer/vendor baru.
*   **F-1.2:** Halaman login yang aman.
*   **F-1.3:** Isolasi data yang ketat. Vendor hanya dapat melihat dan mengelola proyek dan data mereka sendiri.

#### 5.2. Dashboard Vendor
*   **F-2.1:** Halaman utama yang menampilkan daftar semua "Proyek" (galeri) yang sedang aktif.
*   **F-2.2:** Kemampuan untuk membuat Proyek baru melalui fitur unggulan **"Impor dari Google Drive"** dengan menempelkan link.
*   **F-2.3:** Melihat status setiap proyek (misalnya, "Menunggu Seleksi", "Selesai Dipilih").
*   **F-2.4 (Fitur Nilai Jual Utama):** Di dalam proyek yang sudah selesai, harus ada tombol **"Salin Nama File ke Clipboard"**. Ini akan menyalin daftar nama file (tanpa ekstensi) yang dipilih klien, siap untuk ditempelkan ke software editing (Lightroom, dll.).
*   **F-2.5:** Kemampuan untuk menghapus/mengarsipkan proyek yang sudah selesai, yang akan memicu proses penghapusan file dari panggung sementara.

#### 5.3. Galeri Seleksi Klien
*   **F-3.1:** Setiap proyek menghasilkan sebuah link unik yang aman untuk dibagikan kepada klien.
*   **F-3.2:** Tampilan galeri yang bersih, cepat, dan responsif di perangkat mobile maupun desktop.
*   **F-3.3:** Fungsi `klik untuk memilih/batal memilih` yang intuitif pada setiap foto.
*   **F-3.4:** Penghitung yang menunjukkan jumlah foto yang telah dipilih (misalnya, "7 dari 10 dipilih").
*   **F-3.5:** Tombol "Kirim Pilihan" untuk memfinalisasi seleksi.

---

### 6. Model Bisnis (SaaS Multi-Tier Subscription)

Model bisnis platform ini berbasis langganan bulanan (*monthly/periodical subscription*) yang terbagi menjadi dua kelompok paket utama:
1. **Paket Berbasis Proyek (Limit-Based):**
   * Dibatasi oleh jumlah proyek aktif maksimal dan jumlah foto maksimal per proyek (misal: Paket Basic dengan limit 5 proyek aktif dan 100 foto/proyek).
   * File foto proyek akan di-cleansed (dihapus fisiknya) dari server jika akun keanggotaan vendor kedaluwarsa melewati masa tenggang 5 hari.
2. **Paket Berbasis Penyimpanan (Storage-Based):**
   * Mengizinkan pembuatan proyek dan jumlah foto per proyek tanpa batasan.
   * Dibatasi oleh kapasitas penyimpanan total yang disewa (misal: Paket Pro Storage dengan batas 5,000 MB / 5 GB).
   * Dashboard dilengkapi dengan real-time progress bar pemantau sisa kuota storage.
   * Dilengkapi sistem rollback otomatis jika ruang penyimpanan habis/penuh di tengah-tengah pemrosesan impor Google Drive.

---

**Persetujuan:**
Dokumen ini merangkum semua keputusan strategis dan teknis. Dengan persetujuan ini, fase perencanaan dinyatakan selesai. Fase eksekusi akan dimulai berdasarkan spesifikasi yang tertulis di sini.