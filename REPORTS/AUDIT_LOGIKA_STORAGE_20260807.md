# 🔍 LAPORAN AUDIT LOGIKA & POTENSI MISSLIDING SISTEM (SaaS Pick Your Photo)

**Tanggal Audit:** 07 Agustus 2026  
**Lokasi Berkas:** `REPORTS/AUDIT_LOGIKA_STORAGE_20260807.md`  
**Status Penilaian:** ⚠️ **Terdapat Logic Mismatches (Bukan Syntax Error)**

---

## 🎯 1. Deskripsi Singkat Temuan
Setelah melakukan penelusuran mendalam (*logic tracing*) pada kode backend, ditemukan beberapa potensi ketidaksesuaian logika (*logic mismatches/missliding*) yang tidak menyebabkan error kompilasi Next.js (`npm run build` tetap sukses), namun dapat membuat fitur pembatasan kuota storage tidak bekerja dengan semestinya atau merugikan vendor saat memperpanjang akun.

---

## 🚨 2. Analisis Potensi Mismatches & Alur Kerja Seharusnya

### 1. 🔴 [Tingkat Kritis: TINGGI] Quota Storage Terpakai (`usedStorageBytes`) Selalu 0 Bytes & Bypass Limit
- **Lokasi Masalah:** 
  - `lib/google-master-drive.js` ([Line 94](file:///Users/armansyam/Documents/Project%20AmsDev/pick-your-photo/lib/google-master-drive.js#L94))
  - `app/api/projects/route.js` ([Line 232](file:///Users/armansyam/Documents/Project%20AmsDev/pick-your-photo/app/api/projects/route.js#L232))
- **Deskripsi Masalah:**
  - Saat mengimpor foto dari Google Drive, kueri API Drive hanya memanggil kolom `id, name, mimeType` dan **melewatkan pemanggilan kolom `size`**.
  - Akibatnya, pada database, ukuran berkas foto dimasukkan sebagai `0` (`fileSizeBytes = 0`).
  - Selain itu, sistem **tidak pernah menambahkan** ukuran total project yang diimpor ke dalam kolom `usedStorageBytes` milik vendor di tabel `vendors`.
  - Sistem hanya melakukan pengurangan (`usedStorageBytes - totalBytes`) saat folder dihapus.
- **Dampak:**
  - Penggunaan storage di dashboard vendor akan selalu tertulis **`0 Bytes`**, tidak peduli seberapa banyak foto yang diimpor.
  - Vendor dapat mengimpor ribuan foto besar tanpa pernah terkena limit kuota storage paket Add-On mereka.
- **Alur Kerja yang Seharusnya:**
  1. Kueri Google Drive API menyertakan kolom `size`: `fields: 'nextPageToken, files(id, name, mimeType, size)'`.
  2. Saat penyimpanan foto ke database, gunakan ukuran asli: `fileSizeBytes = file.size`.
  3. Setelah tugas impor selesai, update `usedStorageBytes` vendor: `usedStorageBytes = usedStorageBytes + totalNewBytes`.

---

### 2. 🟠 [Tingkat Kritis: SEDANG] Hilangnya Sisa Hari Berlangganan Saat Vendor Memperpanjang Paket Lebih Awal (Subscription Renewal)
- **Lokasi Masalah:**
  - `app/api/payment/notification/route.js` ([Line 76-78](file:///Users/armansyam/Documents/Project%20AmsDev/pick-your-photo/app/api/payment/notification/route.js#L76-L78))
- **Deskripsi Masalah:**
  - Ketika vendor melakukan perpanjangan paket utama lebih awal (misalnya paket masih tersisa 5 hari), sistem langsung menghitung tanggal kedaluwarsa baru dari hari ini: `new Date() + activePeriodDays`.
- **Dampak:**
  - Vendor akan kehilangan sisa 5 hari masa aktif mereka yang sudah dibayar sebelumnya karena tanggal kedaluwarsa baru ditimpa dari hari ini, bukan diakumulasikan.
- **Alur Kerja yang Seharusnya:**
  - Jika tanggal kedaluwarsa vendor saat ini masih di masa depan (`currentExpiresAt > now`), maka tanggal kedaluwarsa baru dihitung dari `currentExpiresAt + activePeriodDays`.
  - Jika sudah kedaluwarsa, baru dihitung dari `now + activePeriodDays`.

---

### 🟡 3. [Tingkat Kritis: RENDAH] Sinkronisasi Status Transaksi Pending Manual
- **Lokasi Masalah:**
  - `app/api/payment/cancel/route.js`
- **Deskripsi Masalah:**
  - Pembatalan transaksi melalui klik tombol `Tutup Sesi Pembayaran` membatalkan status di Midtrans, namun status transaksi di SQLite vendor bisa tetap menggantung jika tidak disinkronkan secara atomik.
- **Alur Kerja yang Seharusnya:**
  - Memastikan API `/api/payment/cancel` memperbarui status di tabel `payment_sessions` dan `payment_transactions` menjadi `cancelled` secara instan.

---

## 💡 3. Saran Rekomendasi Tindakan Lanjutan

Berikut adalah rekomendasi perubahan kode jika disetujui untuk dikerjakan:

```diff
# Rencana Perbaikan untuk Google Drive Size & usedStorageBytes:

# 1. Di lib/google-master-drive.js:
- fields: 'nextPageToken, files(id, name, mimeType)'
+ fields: 'nextPageToken, files(id, name, mimeType, size)'
...
- .map(file => ({ id: file.id, name: file.name, category: categoryName }));
+ .map(file => ({ id: file.id, name: file.name, category: categoryName, size: parseInt(file.size) || 0 }));

# 2. Di app/api/projects/route.js (runImportTask):
- insertPhoto.run(projectId, origPath, thumbPath, origPath, 0, categoryName);
+ insertPhoto.run(projectId, origPath, thumbPath, origPath, parseInt(file.size) || 0, categoryName);
...
+ const totalBytes = files.reduce((acc, f) => acc + (parseInt(f.size) || 0), 0);
+ db.prepare('UPDATE vendors SET usedStorageBytes = usedStorageBytes + ? WHERE id = ?').run(totalBytes, project.vendorId);
```

Apakah Anda ingin kita eksekusi perbaikan logika ini sekarang agar sistem kuota storage berjalan 100% akurat?
