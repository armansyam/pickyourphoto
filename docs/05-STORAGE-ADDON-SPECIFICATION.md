# 📘 05. Spesifikasi Bisnis & Teknis Add-On Cloud Storage (Pick Your Photo SaaS)

> **Dokumen Resmi Aturan Bisnis, Pricing, & Logika Sistem Add-On Storage**  
> Lokasi Berkas: `docs/05-STORAGE-ADDON-SPECIFICATION.md`  
> **Terakhir Diperbarui:** 06 Agustus 2026 — Hasil Konsensus Arsitektur Produksi  

---

## 📑 1. Executive Summary & Visi Produk

Add-On Cloud Storage adalah fitur tambahan kapasitas penyimpanan mandiri yang memungkinkan vendor studio foto mengunggah dan mengelola berkas foto langsung di infrastruktur SaaS **Pick Your Photo** via Multi-Worker Storage Pool. 

Dokumen ini mendefinisikan secara presisi strategi harga, aturan masa aktif (*co-terming*), logika penguncian (*glassmorphism lock overlay*), serta manajemen pembersihan berkas tingkat folder (*folder-level deletion*).

---

## 💵 2. Struktur Harga Add-On Storage (Pricing Strategy)

Strategi penetapan harga disusun di atas modal *consumer pricing* Google Drive dan di bawah SaaS internasional (Pixieset/Pass), untuk memberikan marjin tinggi (~85%+) sekaligus mencegah penyalahgunaan *rate-limit* Google API:

| Nama Paket Add-On | Kapasitas Storage | Estimasi Kuota Foto | Harga Bulanan (IDR) | Target Pengguna |
|---|---|---|---|---|
| **Add-On Storage 25GB** | **25 GB** | ~5.000 Foto High-Res | **Rp 49.000 / bln** | Freelance / Event Skala Kecil |
| **Add-On Storage 50GB** | **50 GB** | ~10.000 Foto High-Res | **Rp 89.000 / bln** | Studio Wedding Medium |
| **Add-On Storage 100GB** | **100 GB** | ~20.000 Foto High-Res | **Rp 149.000 / bln** | Studio Sibuk & Dokumentasi |
| **Add-On Storage 200GB** | **200 GB** | ~40.000 Foto High-Res | **Rp 249.000 / bln** | Studio Komersial Skala Besar |

---

## 📅 3. Logika Masa Aktif & Tagihan (Single Expiry Date & Prorata)

Untuk menjaga UX tetap sederhana dan alur backend bebas bug, digunakan model **Single Expiry Date (Co-Terming)**:

1. **Membutuhkan Paket Utama Aktif:** Vendor hanya dapat membeli Add-On Storage jika Paket Utama (Starter/Pro/Business) dalam keadaan aktif.
2. **Single Expiry Date:** Masa aktif Add-On Storage menyatu dan sejajar 100% dengan tanggal kedaluwarsa Paket Utama (`vendor.expiresAt`).
3. **Kalkulasi Prorata Otomatis:**  
   Jika vendor membeli Add-On di pertengahan bulan (misal sisa 15 hari dari siklus 30 hari Paket Utama), tagihan Add-On dihitung secara prorata:
   $$\text{Tagihan Prorata} = \left( \frac{\text{Sisa Hari Masa Aktif}}{30} \right) \times \text{Harga Add-On Bulanan}$$
4. **Perpanjangan Gabungan (Combined Renewal):** Saat masa aktif berakhir, invoice perpanjangan bulanan langsung menggabungkan biaya Paket Utama + Add-On Storage aktif dalam 1 transaksi tunggal.

---

## 🔒 4. Strategi Penanganan Status Terkunci (Locking & Overlay Strategy)

### A. Skenario 1: Add-On Expired / Tidak Diperpanjang (Non-Payment)
Jika Paket Utama diperpanjang tetapi Add-On Storage dibatalkan/tidak dibayar (kuota storage kembali ke 0 GB):

* **Keamanan Data:** Berkas foto vendor **TIDAK DIHAPUS** dari server.
* **Tampilan Galeri Klien (Glassmorphism Lock Overlay):**  
  Saat klien membuka link galeri, latar belakang galeri diberi efek *blur* 12px dan muncul kartu gembok emas:
  > **🔒 GALERI TERKUNCI SEMENTARA**  
  > *Masa simpan cloud galeri foto ini sedang ditangguhkan. Foto Anda tersimpan aman. Silakan hubungi Studio Fotografer Anda untuk mengaktifkan kembali akses galeri.*
* **Instant Unlock:** Begitu vendor melunasi Add-On Storage, seluruh galeri **LANGSUNG TERBUKA INSTAN** tanpa perlu mengunggah ulang berkas.

#### 🤖 Auto-Cleanup Daemon & Masa Tenggang Toleransi (Grace Period)
Untuk mencegah penumpukan berkas usang dari vendor non-aktif sekaligus memberi kesempatan perpanjangan:
1. **Masa Tenggang 30 Hari:** Selama 30 hari pertama pasca-expired, berkas foto **TETAP DISIMPAN AMAN** di Worker Storage Pool (hanya galeri di-gembok).
2. **Notifikasi Bertahap (Email Reminders):**
   - **Hari ke-0:** Notification Email "*Akun & Storage Expired (Galeri Terkunci)*".
   - **Hari ke-15:** Peringatan H-15 "*Sisa 15 Hari Sebelum Berkas Dihapus Permanen*".
   - **Hari ke-27:** Peringatan Final H-3 "*Sisa 3 Hari Sebelum Berkas Dihapus Permanen*".
3. **Eksekusi Auto-Cleanup (Hari ke-30+):**  
   Jika tidak ada perpanjangan setelah 30 hari, System Daemon `lib/db.js` akan:
   - Menghapus berkas foto dari Worker Storage Pool via Google Drive API (`drive.files.delete`).
   - Menghapus catatan file dari database SQLite.
   - Mengembalikan kuota terpakai (*quota refund*) pada Worker Storage Pool.

---

### B. Skenario 2: Downgrade Add-On (Penggunaan > Kuota Baru)
Jika vendor memilih paket Add-On yang lebih kecil daripada total penggunaan data aktif (misal punya data 70 GB, lalu beli Add-On 25 GB):

* **Galeri Klien (TETAP TERBUKA NORMAL):** Link galeri klien **TIDAK DI-LOCK / TIDAK DI-BLUR** karena vendor tetap membayar Add-On Storage.
* **Fitur Upload (UPLOAD LOCKED):** Fitur mengunggah foto baru atau membuat folder baru di-lock total.
* **Instruksi Pembersihan:** Dashboard Vendor menampilkan banner merah:
  > ⚠️ **Kapasitas Penyimpanan Melampaui Batas (70 GB / 25 GB)**  
  > *Fitur upload foto baru dikunci. Harap hapus folder proyek lama sebesar **45 GB** atau lakukan upgrade paket storage.*

---

## 📁 5. Manajemen Pembersihan Berkas (Folder-Level Deletion UX)

Menghapus foto satu per satu tidak praktis bagi fotografer. Pembersihan storage dilakukan pada **Tingkat Folder Proyek Klien**:

1. **1-Click Folder Delete:** Di halaman `📁 Cloud Storage Manager`, vendor dapat mengklik tombol `[ 🗑️ Hapus Folder Proyek ]` (misal menghapus folder `📁 [2026] Wedding Budi & Ani (12.4 GB)`).
2. **Instant Quota Refund:** Mengkonfirmasi penghapusan folder akan menghapus seluruh foto di dalamnya secara atomik dan mengembalikan kuota terpakai (*refund*) secara instan.
3. **Auto-Unlock Upload:** Setelah penggunaan terpakai kembali di bawah kuota Add-On ($\le 25 \text{ GB}$), fitur upload foto baru **otomatis terbuka kembali**.

---

## ⚙️ 6. Skema Database Dinamis & Perubahan Tabel (`lib/db.js`)

Untuk memastikan **harga, nama paket, dan kapasitas Add-On TIDAK DI-HARDCODE**, dibuat tabel khusus `addon_plans` yang dapat dikelola secara fleksibel oleh Superadmin:

```sql
-- Tabel Master Paket Add-On Storage (Dinamis & Configurable via Admin)
CREATE TABLE IF NOT EXISTS addon_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  planKey TEXT NOT NULL UNIQUE, -- 'addon_25gb', 'addon_50gb', dll
  name TEXT NOT NULL,          -- 'Add-On Storage 25 GB'
  quotaBytes INTEGER NOT NULL,  -- 26843545600 (25 GB in Bytes)
  price REAL NOT NULL,          -- 49000
  status TEXT DEFAULT 'active', -- 'active', 'disabled'
  sortOrder INTEGER DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Penambahan Kolom Kuota & Status Add-On pada Tabel Vendors
ALTER TABLE vendors ADD COLUMN hasStorageAddon INTEGER DEFAULT 0;
ALTER TABLE vendors ADD COLUMN addonStorageQuotaBytes INTEGER DEFAULT 0;
ALTER TABLE vendors ADD COLUMN addonPlanId INTEGER REFERENCES addon_plans(id);

-- Tabel Transaksi & Histori Add-On Vendor
CREATE TABLE IF NOT EXISTS storage_addon_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendorId INTEGER NOT NULL,
  addonPlanId INTEGER NOT NULL,
  price REAL NOT NULL,
  proratedPrice REAL NOT NULL,
  status TEXT DEFAULT 'active', -- 'active', 'expired', 'downgraded'
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vendorId) REFERENCES vendors (id),
  FOREIGN KEY (addonPlanId) REFERENCES addon_plans (id)
);
```

---

## 🎨 7. Penempatan UI Card Add-On (Lokasi Tampilan Dinamis)

Card Add-On Storage dirender secara dinamis via API (`GET /api/addon-plans`) pada **3 Lokasi Strategis**:

### 1. Vendor Console (`/dashboard/storage` & `/dashboard/subscription`)
* **Widget Storage Header:** Menampilkan progress bar kapasitas (`24.5 GB / 50 GB`).
* **Modal / Section "📦 Tambah Kuota Storage":** Merender Card Paket Add-On dari database. Vendor tinggal memilih paket $\rightarrow$ checkout QRIS / Transfer Bank.

### 2. Admin Panel Console (`app/admin/AdminDashboard.js` — Tab Paket & Add-On)
* **CRUD Management:** Superadmin dapat menambah paket baru (misal *Add-On 500GB*), mengubah harga, atau menonaktifkan paket tertentu secara *real-time* tanpa mengedit kode kodingan.

### 3. Public Landing Page (`/pricing` / Section Pricing)
* Tab opsional *"Cloud Storage Add-Ons"* di halaman depan aplikasi yang merender daftar harga terbaru langsung dari database.

---

## 🧪 7. Matriks QA & Pengujian Verifikasi

| Skenario | Ekspektasi Hasil |
|---|---|
| Vendor beli Add-On 50GB di sisa 10 hari langganan | Bayar prorata 10/30 $\times$ Rp 89.000 = Rp 29.666. Tanggal expired sama dengan Paket Utama. |
| Vendor expired / Add-On mati | Klien buka link galeri $\rightarrow$ Tampil Glassmorphism Lock Overlay 🔒. |
| Vendor lunasi Add-On | Galeri klien langsung terbuka normal tanpa re-upload foto. |
| Vendor downgrade dari 100GB ke 25GB (isi 70GB) | Galeri klien tetap terbuka normal, Upload dikunci, tampil instruksi hapus folder 45GB. |
| Vendor hapus 1 folder proyek 50GB | Penggunaan menjadi 20GB ($\le 25\text{GB}$), fitur upload otomatis terbuka kembali. |

---

*Dokumen Spesifikasi ini disahkan sebagai acuan resmi implementasi fitur Add-On Cloud Storage Pick Your Photo SaaS.*
