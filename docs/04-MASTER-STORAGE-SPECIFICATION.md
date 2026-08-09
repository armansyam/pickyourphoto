# 📦 Master Storage & Cloud Infrastructure Specification

> **Pick Your Photo SaaS Platform — Unified Storage Architecture**  
> Lokasi: `docs/04-MASTER-STORAGE-SPECIFICATION.md`  
> **Terakhir diperbarui:** 10 Agustus 2026 — *Konsolidasi GDrive BYOS, Dynamic Grace Period 30 Hari, & Hard Purge Policy*  
> **Status:** **100% SELESAI & AKTIF (PRODUCTION-READY)**

---

## 📑 Daftar Isi
1. [Ringkasan Ekosistem Storage](#1-ringkasan-ekosistem-storage)
2. [Seksi Master Cluster & Live GDrive API Rename](#2-seksi-master-cluster--live-gdrive-api-rename)
3. [Lokasi Custom Parent Folder & Pemindahan Live API](#3-lokasi-custom-parent-folder--pemindahan-live-api)
4. [Smart Capacity Load Balancing (Highest Free Storage First)](#4-smart-capacity-load-balancing)
5. [Enterprise Custom Storage (10 GB - 200 GB) & Automated Activation](#5-enterprise-custom-storage--automated-activation)
6. [Hardware Adaptive Concurrency & Turbo Upload Latency Governor](#6-hardware-adaptive-concurrency--turbo-upload-latency-governor)
7. [Corporate Batch Upload Modal & Minimalist 3D Toggle Switch](#7-corporate-batch-upload-modal--minimalist-3d-toggle-switch)
8. [Google Drive BYOS (Bring Your Own Storage)](#8-google-drive-byos-bring-your-own-storage)
9. [Grace Period 30 Hari & Hard Purge Policy](#9-grace-period-30-hari--hard-purge-policy)

---

## 1. Ringkasan Ekosistem Storage

Platform **Pick Your Photo** menggunakan arsitektur *Multi-Account Cloud Storage Pool* berbasis Google Drive API yang memisahkan peran **Akun Master Index Hub** (pemilik hirarki folder) dan **Akun Worker** (penyimpan data fisik). 

Seluruh berkas yang diunggah oleh vendor ditransmisikan secara *Pass-Through Streaming* (0% penggunaan disk lokal server VPS) dari browser vendor ke Google Drive API secara *real-time*.

---

## 2. Seksi Master Cluster & Live GDrive API Rename

### A. Pengaturan Naming Dinamis
- **Default Master Cluster Folder:** `[PICK-YOUR-PHOTO] Platform Master Storage Cluster A`
- **Vendor Root Folder Template:** `📁 [STORAGE DEDICATED] {vendor_name} ({vendor_email})`
- **Live GDrive API Rename:** Mengubah nama folder di Admin Panel Seksi 1 langsung mengeksekusi `drive.files.update({ fileId: clusterId, resource: { name: newName } })` secara *live* di Google Drive Web.

### B. Display Mode & Edit Mode UX Toggle
- **Default State (View Mode):** Menampilkan rincian detail 3 kolom yang bersih dan ringkas.
- **Edit Mode:** Dikendalikan oleh tombol `[ ✏️ Ubah Pengaturan Lokasi & Penamaan ]`. Setelah tombol simpan diklik, form otomatis menutup dan kembali ke mode tampilan detail.

---

## 3. Lokasi Custom Parent Folder & Pemindahan Live API

- **Bawaan Default (`root`):** Google Drive API meletakkan folder Master Cluster di My Drive Utama.
- **Custom Parent Folder ID:** Admin dapat memasukkan Folder ID khusus untuk menyimpan Master Cluster di dalam sub-folder tertentu.
- **Live GDrive Move API:** Mengubah Parent ID langsung mengeksekusi `drive.files.update({ fileId: clusterId, addParents: newParentId, removeParents: oldParentId })` untuk memindahkan lokasi folder di Google Drive Web.

---

## 4. Smart Capacity Load Balancing

Mesin pemilih akun worker memilih lokasi penyimpanan berdasarkan kueri **Sisa Kapasitas Terbanyak Pertama (*Highest Remaining Storage First*)**:

```sql
SELECT * FROM master_drive_accounts 
WHERE role = 'worker' AND status = 'active' AND usedStorageBytes < totalLimitBytes 
ORDER BY (totalLimitBytes - usedStorageBytes) DESC, id ASC
```

- **Keuntungan:** Beban penyimpanan terdistribusi secara optimal ke akun yang paling longgar. Akun berstatus `disabled` (OFF) otomatis dikecualikan 100%.

---

## 5. Enterprise Custom Storage & Automated Activation

- **Rentang Kuota:** 10 GB hingga 200 GB (Kalkulasi dinamis Rp 1.250 / GB untuk paket Custom Enterprise).
- **Kalkulasi Prorata:** Upgrade dari paket aktif hanya membayar selisih GB tambahan.
- **Aktivasi Otomatis:** Webhook Payment Gateway (`/api/payment/notification`) dan Polling `check-pending` secara otomatis mengaktifkan kuota tambahan di database saat transaksi `settlement` / `capture` / `paid`.

---

## 6. Hardware Adaptive Concurrency & Turbo Upload Latency Governor

- **Psikologi UX Zero-Banner untuk Perangkat Rendah:** Perangkat spesifikasi standar (≤4 Core / ≤4GB RAM) disesuaikan secara senyap di latar belakang (2-3 thread) tanpa menampilkan banner peringatan.
- **Banner POSITIF Turbo Upload (Khusus High-Spec):** Banner rekomendasi interaktif hanya muncul untuk perangkat tinggi (≥8 Core / ≥8GB RAM) dengan opsi **8 Thread Paralel**.
- **🔥 PC Overpower Workstation Mode (10 Thread):** Perangkat monster (≥12 Core / ≥16GB RAM) membuka mode **10 Thread Paralel**.
- **🌡️ Dynamic Event-Loop Latency Governor:** Mengukur lag browser setiap 1.5 detik. Jika vendor membuka aplikasi berat (Photoshop/Lightroom), thread diturunkan secara halus (`10 ➔ 8 ➔ 6 ➔ 4`) agar komputer tidak macet. Setelah CPU santai, kecepatan kembali melesat!

---

## 7. Corporate Batch Upload Modal & Minimalist 3D Toggle Switch

- **Batch Upload Confirmation Modal:** Menampilkan 4 kartu ringkasan (Folder Utama, Total File, Total Sub-Folder, Estimasi Ukuran) dan rincian hirarki sub-folder sebelum pengunggahan dimulai.
- **Minimalist 3D Toggle Switch:** Sakelar status akun worker dengan pembaruan *Instant Optimistic UI* (0ms delay, tanpa konfirmasi popup), dilengkapi timer notifikasi otomatis hilang 3 detik.

---

## 8. Google Drive BYOS (Bring Your Own Storage)

- **Integrasi Mandiri:** Vendor dapat menghubungkan Google Drive pribadi sebagai penyedia cloud storage dedicated.
- **Dynamic Grace Period & Expiry:** Apabila langganan atau lisensi vendor kedaluwarsa, akses galeri diuji secara dinamis dan dikunci dengan **Glassmorphism Lock Overlay 🔒**.

---

## 9. Grace Period 30 Hari & Hard Purge Policy

- **Masa Tenggang (Grace Period 30 Hari):** Ketika berlangganan kedaluwarsa, foto fisik **TIDAK DIHAPUS** selama 30 hari. Galeri hanya dikunci sementara untuk memberi kesempatan vendor memperbarui langganan.
- **Peringatan Otomatis:** Sistem mengirimkan email peringatan pada H-15 dan H-3 sebelum pembersihan permanen.
- **Hard Purge Policy:** Setelah melewati batas 30 hari grace period tanpa perpanjangan, background daemon mengeksekusi penghapusan permanen file fisik dari Google Drive storage pool.
