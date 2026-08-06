# 📘 Blueprint Arsitektur V6.1: Enterprise Multi-Worker Storage Pool & Add-On Business Engine
**Aplikasi:** pick-your-photo (SaaS Galeri Seleksi Foto Klien)  
**Versi Dokumen:** 6.1 (Dynamic Add-On Plans, Co-Terming Prorata & Glassmorphism Lock Overlay)  
**Terakhir Diperbarui:** 06 Agustus 2026  

---

## 📑 1. Executive Summary & Visi Produk

Dokumen ini adalah cetak biru teknis dan spesifikasi arsitektur paling lengkap (*Master Blueprint & Implementation Roadmap*) untuk **Fitur Add-On Cloud Storage Mandiri** di platform **pick-your-photo**, yang telah menyelaraskan seluruh aturan dari **[`docs/05-STORAGE-ADDON-SPECIFICATION.md`](05-STORAGE-ADDON-SPECIFICATION.md)**.

### Strategi Pengerjaan (Strict Task Verification Gate Strategy)
* **Pengerjaan Bertahap (Task-by-Task):** Setiap task dikerjakan secara sistematis sesuai urutan roadmap.
* **Pengujian Mandiri di Tiap Task:** Setiap task **WAJIB diuji dan diverifikasi lulus 100%** sebelum menandai checklist `[x]` dan berpindah ke task berikutnya.
* **Update Real-time Dokumen:** Dokumen ini diperbarui secara berkala sebagai catatan kemajuan resmi pengerjaan proyek.

---

## 💵 2. Struktur Harga Add-On Storage (Dynamic `addon_plans` Table)

Tabel `addon_plans` dikelola secara dinamis via Admin Console (tanpa *hardcode*):

| Nama Paket Add-On | Plan Key | Kapasitas Storage | Harga Bulanan (IDR) |
|---|---|---|---|
| **Add-On Storage 25GB** | `addon_25gb` | **25 GB** (26.843.545.600 bytes) | **Rp 49.000 / bln** |
| **Add-On Storage 50GB** | `addon_50gb` | **50 GB** (53.687.091.200 bytes) | **Rp 89.000 / bln** |
| **Add-On Storage 100GB** | `addon_100gb` | **100 GB** (107.374.182.400 bytes) | **Rp 149.000 / bln** |
| **Add-On Storage 200GB** | `addon_200gb` | **200 GB** (214.748.364.800 bytes) | **Rp 249.000 / bln** |

---

## 📅 3. Single Expiry Date (Co-Terming) & Tagihan Prorata

1. **Co-Terming Alignment:** Masa aktif Add-On Storage menyatu 100% dengan tanggal kedaluwarsa Paket Utama (`vendor.expiresAt`).
2. **Kalkulasi Prorata:**
   $$\text{Tagihan Prorata} = \left( \frac{\text{Sisa Hari Masa Aktif}}{30} \right) \times \text{Harga Add-On Bulanan}$$
3. **Combined Renewal:** Invoice perpanjangan bulanan menggabungkan Paket Utama + Add-On Storage aktif dalam 1 transaksi tunggal.

---

## 🔒 4. Lock Overlay & Grace Period 30 Hari

1. **Non-Payment / Expired Add-On:** Berkas foto **TIDAK DIHAPUS** selama 30 hari pertama. Galeri klien menampilkan **Glassmorphism Lock Overlay 🔒** (*"Galeri Terkunci Sementara"*).
2. **Instant Unlock:** Begitu vendor melunasi Add-On, galeri langsung terbuka normal tanpa re-upload.
3. **Grace Period Daemon (30 Hari):** Notifikasi bertahap H-0, H-15, H-27. Penghapusan permanen via API `drive.files.delete` setelah Hari ke-30+.
4. **Downgrade Over-Quota:** Galeri klien tetap TERBUKA, namun fitur upload foto baru DIKUNCI sampai vendor menghapus folder lama (*Folder-Level Deletion*).

---

## 🎯 5. Master Task List & Progress Checklist

### 📍 FASE 1: Pondasi Database & Admin Operational Console (SELESAI ✅)
- [x] **Task 1.1:** Migrasi Skema Database (`master_drive_accounts`, `addon_plans`, `storage_addon_subscriptions`, kolom kuota `vendors` & `photos`) — *(Selesai & Teruji ✅)*
- [x] **Task 1.2:** Auto-Migrasi Akun Master OAuth (`amsvisualphotography@gmail.com` ke `role = 'master_index'`) — *(Selesai & Teruji ✅)*
- [x] **Task 1.3:** Backend API Route Manager (`/api/admin/drive-pool` & `/api/admin/drive-pool/[id]`) — *(Selesai & Teruji ✅)*
- [x] **Task 1.4:** UI Tab Mandiri Admin Console (`💾 Operasional Storage Pool`) — *(Selesai & Teruji ✅)*
- [x] **Task 1.5:** Verifikasi Build Next.js (`npm run build` PASS 100%) — *(Selesai & Teruji ✅)*

---

### 📍 FASE 2: Alur Penambahan Worker Accounts via 1-Click OAuth Popup (SELESAI ✅)
- [x] **Task 2.1:** Callback Route API khusus Worker OAuth (`/api/admin/auth/google/worker/callback`) yang otomatis menyimpan Worker ke DB & menyetol izin sharing. — *(Selesai & Teruji ✅)*
- [x] **Task 2.2:** Integrasi tombol `[ ➕ Tambah Akun Worker Storage Baru ]` ke OAuth Callback. — *(Selesai & Teruji ✅)*
- [x] **Task 2.3:** Pengujian & Verifikasi Tambah Worker Baru (1-Click OAuth Test). — *(Selesai & Teruji ✅)*

---

### 📍 FASE 3: Dynamic Add-On Plans CRUD & Vendor Storage Tab UI (SELANJUTNYA ⏳)
- [ ] **Task 3.1:** API Route `/api/admin/addon-plans` (CRUD Master Paket Add-On oleh Superadmin).
- [ ] **Task 3.2:** Halaman Dashboard Tab Baru Vendor `/dashboard/storage` (Google Drive Clone UI & Widget Status Kuota).
- [ ] **Task 3.3:** Backend API Route `/api/storage/folders` (`GET`, `POST`, `DELETE` Folder-Level Deletion).
- [ ] **Task 3.4:** Isolasi Multi-Tenant Scope (`vendorId = session.vendorId`).
- [ ] **Task 3.5:** Pengujian UI Vendor Storage Tab.

---

### 📍 FASE 4: Upload Engine: Round-Robin Queue & Mid-Upload Auto Failover (MANDIRI ⏳)
- [ ] **Task 4.1:** API Route `/api/storage/upload-ticket` (Round-Robin Worker Session URL Ticket).
- [ ] **Task 4.2:** Client-Side Upload Engine di browser Vendor.
- [ ] **Task 4.3:** Fitur Mid-Upload Auto Failover saat Worker Penuh (`storageQuotaExceeded`).
- [ ] **Task 4.4:** Pengujian Masal Upload 100+ Foto & Failover Test.

---

### 📍 FASE 5: Add-On Checkout (Prorata), Convert Project & Public Link (MANDIRI ⏳)
- [ ] **Task 5.1:** Alur Checkout Add-On Storage Prorata (Integration dengan Payment Gateway).
- [ ] **Task 5.2:** Fitur `[ 🏷️ Jadikan Proyek Seleksi ]` (`/api/storage/convert-to-project`).
- [ ] **Task 5.3:** Fitur `[ 🔗 Share Public Link ]` dengan Branded Domain (`pickyourphoto.com/share/[slug]`).
- [ ] **Task 5.4:** Glassmorphism Lock Overlay 🔒 untuk Galeri Klien saat Expired.
- [ ] **Task 5.5:** Direct CDN Single Download & Client-Side JSZip Packaging.

---

### 📍 FASE 6: Auto-Cleanup Daemon (Grace Period 30 Hari) & Final QA Testing (MANDIRI ⏳)
- [ ] **Task 6.1:** Grace Period Auto-Cleanup Daemon & Email Reminders (H-0, H-15, H-27, H-30).
- [ ] **Task 6.2:** Cron Job Health Check OAuth Token (Tiap 6 Jam) & Tombol `[ 🔧 Auto-Repair Permissions ]`.
- [ ] **Task 6.3:** Final End-to-End System Integration QA.

---

## 🗂️ 6. Arsitektur Penempatan Tab Operasional Sistem (Dedicated Tab Placement)

```text
[ MAIN SIDEBAR ADMIN CONSOLE ]
 ├── 📊 Ringkasan Analitik
 ├── 🏪 Kelola Vendor & Studio
 ├── 💳 Paket & Transaksi (Termasuk CRUD Dynamic Add-On Plans)
 ├── 💾 OPERASIONAL STORAGE POOL  <─── [ TAB MANDIRI KHUSUS OPERASIONAL SISTEM ]
 └── ⚙️ Pengaturan (SMTP & Payment Gateway)

[ MAIN SIDEBAR VENDOR CONSOLE ]
 ├── 📊 Ringkasan Proyek
 ├── 🖼️ Galeri Seleksi Klien
 ├── 📁 CLOUD STORAGE MANAGER <─── [ TAB MANDIRI KHUSUS CLOUD STORAGE VENDOR ]
 └── 💳 Paket & Add-On (Widget Upgrade & Checkout Add-On Prorata)
```
