

# 📘 Blueprint Arsitektur Sistem Sewa Storage Google Drive 5TB

Dokumen ini berisi rangkuman pasti mengenai arsitektur, alur kerja, metode teknis, dan manajemen risiko untuk sistem penyewaan kapasitas penyimpanan (*storage*) berbasis website dengan integrasi Google Drive API v3.

---

## 📂 1. Struktur Hierarki Penyimpanan (Di Drive 5 TB Admin)

Semua data user tertata rapi di dalam akun Google Drive 5 TB milik Admin dengan struktur dinamis (Sistem Kluster) untuk menghindari batas maksimal item dari Google.

```text
[Akun Google Drive 5 TB Admin]
    └── 📁 Folder Induk Utama (Master_Cluster_A)
         ├── 📁 Folder Sewa User A (Status: Read-Only untuk Email User A)
         │    ├── 📄 Video1.mp4 (Hasil upload dari web)
         │    └── 📁 Folder Anak Buatan User A (Lewat web)
         └── 📁 Folder Sewa User B (Status: Read-Only untuk Email User B)
```

---

## 🔄 2. Tiga Alur Kerja Utama Sistem

### A. Alur Pembelian & Pembuatan Storage (Pendaftaran)
1. **User Login & Pilih Paket:** User login ke website menggunakan Gmail pribadi mereka, lalu memilih paket sewa (Misal: 100 GB, 200 GB, atau 300 GB).
2. **Pembuatan Folder:** Backend server mendeteksi pembayaran sukses, lalu memerintahkan Google Drive API untuk membuat satu folder baru di dalam Drive 5 TB Admin.
3. **Kunci Hak Akses Luar:** Backend otomatis memberikan akses **Reader (Read-Only)** pada folder tersebut ke email Gmail si user.
4. **Pencatatan Database:** Server mencatat `folderId`, `webViewLink` (link Drive), dan limit kuota user tersebut di database website.

### B. Alur Upload File (Wajib Lewat Website — Tanpa Beban Server)
1. **User Memilih File:** User membuka website, masuk ke dashboard storagenya, lalu memilih file video berukuran besar (Misal: 5 GB).
2. **Validasi Kuota Global & Pribadi:** Browser lapor ke backend. Backend memeriksa database: apakah sisa kuota sewa User A masih cukup? Dan apakah total upload harian website belum menyentuh batas aman (720 GB)?
3. **Pembuatan Tiket:** Jika lolos validasi, backend meminta **Tiket Upload (Session URL)** ke Google API menggunakan kredensial 5 TB Admin.
4. **Direct Upload:** Backend mengirim Tiket Upload ke browser. Browser user mengupload file **langsung ke server Google** via HTTP `PUT`. (Bandwidth server Anda 0% atau tidak terbebani).
5. **Penyelesaian:** Google mengembalikan `File ID`. Browser mengirim `File ID` dan ukuran file asli ke backend Anda.
6. **Set Publik & Potong Kuota:** Backend mengubah izin `File ID` menjadi publik (agar bisa tampil di galeri web) dan langsung memotong kuota sewa User A di database Anda.

### C. Alur Menghapus File (Wajib Lewat Website)
1. **Request Hapus:** User masuk ke galeri website dan mengklik tombol **Hapus** pada foto/video tertentu.
2. **Validasi Pemilik:** Backend memvalidasi di database apakah file tersebut benar-benar milik user yang sedang login.
3. **Eksekusi Cloud:** Backend menembak Google Drive API menggunakan hak akses Admin 5 TB untuk menghapus file secara permanen dari cloud.
4. **Kembalikan Kuota:** Setelah sukses, backend mengurangi total penyimpanan terpakai si user di database. Kuota sewa user otomatis kembali lega.

---

## 🛠️ 3. Metode Teknis yang Digunakan

* **Google Drive API v3 (`googleapis`):** Library utama di backend server untuk mengontrol dan mengelola akun Drive 5 TB Admin.
* **Resumable Upload (Session URL):** Metode pembuatan tiket upload sekali pakai untuk memindahkan beban bandwidth file besar dari server Anda langsung ke Google.
* **Client-Side HTTP `PUT` Fetch:** Perintah di browser user untuk mengirimkan data binary file langsung ke server Google menggunakan tiket khusus dari backend.
* **API Permissions (Create & Delete):** Mengubah hak akses file/folder (set menjadi *Reader* untuk user, set *Anyone* untuk publik, atau menghapus izin publik).

---

## 🚨 4. Manajemen Risiko Operasional & Solusi Backend

| Nama Risiko | Batasan Google | Dampak pada Web | Solusi Pasti di Backend Anda |
| :--- | :--- | :--- | :--- |
| **Banjir Data Harian** | Maksimal 750 GB / hari per akun | Upload macet massal untuk seluruh user jika kuota harian jebol. | Buat sistem pencatatan total upload global harian di DB. Batasi maksimal 720 GB/hari. Jika penuh, tampilkan antrean (*queue*). |
| **Spam Klik / Traffic Padat** | Maksimal 3 Perintah Tulis (*Write*) / detik | Muncul eror `403/429 Rate Limit Exceeded`. | Implementasikan kode **Exponential Backoff** (sistem otomatis menunggu 1s, 2s, 4s, dst., lalu mencoba ulang request jika Google eror). |
| **Kelebihan Kapasitas Item** | Maksimal 500.000 file/folder di dalam satu folder | Gagal membuat folder sewa untuk user baru karena folder induk penuh. | **Sistem Kluster:** Pecah folder induk utama. Jika `Master_Cluster_A` sudah menampung 500 user, otomatis buat `Master_Cluster_B` di Drive Admin. |
| **Banned Akun Massal** | Pelanggaran Konten (*Terms of Service* Google) | Seluruh Drive 5 TB ditutup permanen oleh Google karena ada file ilegal. | Pasang filter format file di web. Hanya izinkan format media asli (`.mp4, .png, .jpg`). **Blokir total** file arsip terselubung seperti `.zip` atau `.rar`. |

---

## 🔒 5. Status Keamanan Akhir (Di Luar Website)

Jika user mencoba membuka link folder sewa tersebut langsung melalui aplikasi resmi Google Drive di HP atau laptop mereka:
* **Melihat & Mendownload:** **BISA.** Mereka bisa menikmati dokumen/media mereka dengan rapi karena status email mereka terdaftar sebagai *Reader*.
* **Mengupload / Menghapus / Membuat Folder:** **TIDAK BISA.** Google Drive akan langsung memblokir tindakan ini karena hak akses mereka di luar web dikunci total sebagai *Read-Only*. Mereka dipaksa patuh menggunakan fitur di dalam website Anda agar kuota dan database tetap sinkron.
