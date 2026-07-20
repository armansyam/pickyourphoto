# Panduan Model Berlangganan & Manajemen Penyimpanan (SaaS Plans)

Platform **Pick Your Photo** mendukung sistem berlangganan multi-tenant dengan dua tipe paket langganan yang fleksibel bagi fotografer (vendor). Superadmin dapat mengelola paket ini langsung dari panel admin.

---

## 📋 1. Tipe Paket Berlangganan

### A. Paket Berbasis Proyek & Foto (Limit-Based)
Paket ini ditujukan bagi fotografer yang memiliki alur kerja dengan volume foto terprediksi. Kuota diatur berdasarkan jumlah maksimal proyek aktif dan jumlah foto yang diizinkan untuk diimpor ke setiap galeri proyek.

*   **Batasan Utama:**
    1.  **Max Allowed Projects:** Jumlah proyek aktif maksimum yang dapat dikelola secara bersamaan (misal: maksimal 5 proyek aktif untuk Paket Basic).
    2.  **Max Photos Per Project:** Batas maksimum jumlah foto yang diimpor dari folder Google Drive untuk satu proyek (misal: maksimal 100 foto per proyek).
*   **Masa Aktif Proyek:**
    *   Proyek individual **tidak memiliki masa kedaluwarsa** (selama masa berlangganan vendor masih aktif, galeri klien tetap dapat diakses selamanya).
*   **Pembersihan Data (Auto-Cleanup):**
    *   Jika masa aktif langganan vendor kedaluwarsa dan tidak diperpanjang melewati **5 hari masa tenggang (grace period)**, seluruh file foto fisik proyek milik vendor tersebut akan dihapus secara otomatis dari server untuk menghemat penyimpanan.

---

### B. Paket Berbasis Kapasitas Penyimpanan (Storage-Based)
Paket ini didesain untuk fotografer bervolume tinggi yang ingin mengimpor proyek dalam jumlah tak terbatas tanpa khawatir tentang batas jumlah foto per proyek, melainkan hanya dibatasi oleh total kapasitas penyimpanan (Megabytes/Gigabytes) yang disewa.

*   **Batasan Utama:**
    *   **Max Storage Limit (MB):** Total kapasitas penyimpanan maksimum yang dialokasikan untuk seluruh proyek aktif vendor (misal: 5,000 MB atau sekitar 5 GB).
    *   **Proyek & Foto Tanpa Batas:** Vendor bebas membuat proyek sebanyak apa pun dan mengunduh ribuan foto per proyek selama kapasitas penyimpanan masih mencukupi.
*   **Sistem Proteksi Penyimpanan (Storage Safeguards):**
    *   **Pre-Check Ketersediaan:** Sebelum proses impor folder Google Drive dijalankan, sistem secara otomatis memeriksa sisa kapasitas penyimpanan vendor. Jika sudah penuh, impor akan diblokir sejak awal.
    *   **Real-time Storage Tracker:** Dashboard vendor menampilkan visual progress bar penyimpanan dinamis:
        *   *Contoh:* **📦 3.4 GB dari 5 GB digunakan (68%)**
    *   **Jaring Pengaman Impor (Storage Rollback):** Jika di tengah proses impor data foto dari Google Drive penyimpanan tiba-tiba habis/penuh, sistem akan menghentikan proses pengunduhan secara instan, menghapus seluruh file foto parsial yang baru diunduh, mereset kembali sisa kuota penyimpanan, dan mengubah status proyek menjadi **"failed" (Penyimpanan Penuh)** agar penyimpanan tetap utuh dan stabil.
*   **Pembersihan Data (Auto-Cleanup):**
    *   Jika akun berlangganan vendor kedaluwarsa melewati **5 hari masa tenggang**, seluruh file foto fisik milik vendor dihapus permanen, dan kuota penyimpanan terpakai disetel kembali ke `0`.

---

## 🔄 2. Matriks Pembeda Layanan (Perbandingan Fitur)

| Fitur / Parameter | Paket Limit-Based (Tipe A) | Paket Storage-Based (Tipe B) |
| :--- | :---: | :---: |
| **Pemicu Batasan** | Jumlah Proyek & Jumlah Foto | Kapasitas Disk (Megabytes) |
| **Limit Proyek Aktif** | Dibatasi (misal: 5 proyek) | **Tanpa Batas** (Unlimited) |
| **Limit Foto per Proyek** | Dibatasi (misal: 100 foto) | **Tanpa Batas** (Unlimited) |
| **Pengukuran Storage** | Tidak Ditampilkan di Dashboard | **Progress Bar Real-time (MB/GB)** |
| **Masa Aktif Galeri Klien** | Mengikuti masa langganan vendor | Mengikuti masa langganan vendor |
| **Rollback saat Disk Penuh** | - | **Aktif** (Auto-clean sisa impor jika penuh) |
| **Masa Tenggang Akun Expired** | 5 Hari sebelum auto-delete | 5 Hari sebelum auto-delete |

---

## 🛠️ 3. Konfigurasi Default Sistem

Saat database pertama kali diinisialisasi, sistem akan mendaftarkan 3 paket bawaan berikut secara otomatis:

1.  **Free Trial (Limit-Based):**
    *   *Harga:* Rp 0
    *   *Masa Aktif Akun:* 30 Hari
    *   *Limit Proyek:* 1 Proyek Aktif
    *   *Limit Foto per Proyek:* 30 Foto
2.  **Basic (Limit-Based):**
    *   *Harga:* Rp 100.000 / bln
    *   *Masa Aktif Akun:* 30 Hari
    *   *Limit Proyek:* 5 Proyek Aktif
    *   *Limit Foto per Proyek:* 100 Foto
3.  **Pro Storage (Storage-Based):**
    *   *Harga:* Rp 250.000 / bln
    *   *Masa Aktif Akun:* 30 Hari
    *   *Limit Proyek:* Tidak Terbatas (99.999)
    *   *Limit Foto per Proyek:* Tidak Terbatas (99.999)
    *   *Kapasitas Penyimpanan:* 5,000 MB (5 GB)
