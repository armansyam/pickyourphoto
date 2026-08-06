# 📘 Blueprint Arsitektur V6.1: Enterprise Multi-Worker Storage Pool & Add-On Business Engine
**Aplikasi:** pick-your-photo (SaaS Galeri Seleksi Foto Klien)  
**Versi Dokumen:** 6.1 (Dynamic Add-On Plans, Co-Terming Prorata & Glassmorphism Lock Overlay)  
**Terakhir Diperbarui:** 07 Agustus 2026 — Status Audit Implementasi Lengkap (100% Selesai & Teruji)  

---

## 📑 1. Executive Summary & Visi Produk

Dokumen ini adalah cetak biru teknis dan spesifikasi arsitektur paling lengkap (*Master Blueprint & Implementation Roadmap*) untuk **Fitur Add-On Cloud Storage Mandiri** di platform **pick-your-photo**, yang telah menyelaraskan seluruh aturan dari **[`docs/05-STORAGE-ADDON-SPECIFICATION.md`](05-STORAGE-ADDON-SPECIFICATION.md)**.

### Strategi Pengerjaan & Audit Status
* **Pengerjaan Bertahap (Task-by-Task):** Seluruh modul dari Fase 1 hingga Fase 6 telah diselesaikan secara sistematis.
* **Pengujian Mandiri di Tiap Task:** Setiap fitur telah diuji dan diverifikasi lulus 100%.
* **Update Real-time Dokumen:** Dokumen ini menandai seluruh checklist pengerjaan resmi proyek secara akurat.

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
3. **Combined Renewal:** Invoice perpanjangan bulanan menggabungkan Paket Utama + Add-On Storage aktif dalam 1 transaksi Midtrans QRIS.

---

## 🔒 4. Lock Overlay & Grace Period 30 Hari

1. **Non-Payment / Expired Add-On:** Berkas foto **TIDAK DIHAPUS** selama 30 hari pertama. Galeri klien menampilkan **Glassmorphism Lock Overlay 🔒** (*"Galeri Terkunci Sementara"*).
2. **Instant Unlock:** Begitu vendor melunasi Add-On, galeri langsung terbuka normal tanpa re-upload.
3. **Grace Period Daemon (30 Hari):** Notifikasi email bertahap (H-15 & H-3). Penghapusan pembersihan otomatis setelah Hari ke-30+ di background daemon `lib/db.js`.
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

### 📍 FASE 3: Dynamic Add-On Plans CRUD & Vendor Storage Tab UI (SELESAI ✅)
- [x] **Task 3.1:** API Route `/api/admin/addon-plans` (CRUD Master Paket Add-On oleh Superadmin di `/admin#plans`). — *(Selesai & Teruji ✅)*
- [x] **Task 3.2:** Halaman Dashboard Tab Baru Vendor `/dashboard/storage` (Google Drive Clone UI & Widget Status Kuota). — *(Selesai & Teruji ✅)*
- [x] **Task 3.3:** Backend API Route `/api/storage/folders` (`GET`, `DELETE` Folder-Level Deletion & Quota Refund). — *(Selesai & Teruji ✅)*
- [x] **Task 3.4:** Isolasi Multi-Tenant Scope (`vendorId = session.vendorId`). — *(Selesai & Teruji ✅)*
- [x] **Task 3.5:** Pengujian UI Vendor Storage Tab. — *(Selesai & Teruji ✅)*

---

### 📍 FASE 4: Upload Engine: Zero-Storage & Stream Architecture (SELESAI ✅)
- [x] **Task 4.1:** Pemindaian Direct Stream Google Drive API v3 (`lib/gdrive-importer.js`). — *(Selesai & Teruji ✅)*
- [x] **Task 4.2:** Client-Side & Direct Stream Pipe Proxy (`/api/proxy/thumb/[fileId]`). — *(Selesai & Teruji ✅)*
- [x] **Task 4.3:** Direct Cloud Stream Storage Pipe (0 Byte Local Server Load). — *(Selesai & Teruji ✅)*
- [x] **Task 4.4:** Pengujian Stream foto galeri cepat & stabil. — *(Selesai & Teruji ✅)*

---

### 📍 FASE 5: Add-On Checkout (Prorata), Payment Gateway & Lock Overlay (SELESAI ✅)
- [x] **Task 5.1:** Alur Checkout Add-On Storage Prorata via Midtrans QRIS (`/api/payment/addon/create`). — *(Selesai & Teruji ✅)*
- [x] **Task 5.2:** Real-Time Status Polling & Auto-Activation Webhook Notification (`/api/payment/notification`). — *(Selesai & Teruji ✅)*
- [x] **Task 5.3:** Direct Link Navigasi 1-Klik dari Dashboard Utama ke `/dashboard/storage`. — *(Selesai & Teruji ✅)*
- [x] **Task 5.4:** Glassmorphism Lock Overlay 🔒 (`GALERI TERKUNCI SEMENTARA`) untuk Galeri Klien saat Expired di `/gallery/[projectId]`. — *(Selesai & Teruji ✅)*
- [x] **Task 5.5:** Penawaran Add-On Cloud Storage terpisah di Landing Page Publik (`/`). — *(Selesai & Teruji ✅)*

---

### 📍 FASE 6: Auto-Cleanup Daemon (Grace Period 30 Hari) & Final System Integration (SELESAI ✅)
- [x] **Task 6.1:** Grace Period Auto-Cleanup Daemon (30 Hari) di `lib/db.js` & Email Reminders H-15 & H-3 (`lib/mailer.js`). — *(Selesai & Teruji ✅)*
- [x] **Task 6.2:** Health Check OAuth Token & Session Cleanups. — *(Selesai & Teruji ✅)*
- [x] **Task 6.3:** Final End-to-End System Integration QA (Lulus 100%). — *(Selesai & Teruji ✅)*

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
