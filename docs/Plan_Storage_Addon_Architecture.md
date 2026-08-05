# 📘 Blueprint Arsitektur V6.0: Enterprise Multi-Worker Storage Pool & Master Index Hub
**Aplikasi:** pick-your-photo (SaaS Galeri Seleksi Foto Klien)  
**Versi Dokumen:** 6.0 (Master Task List & Verification Gate Blueprint)  
**Tanggal:** 5 Agustus 2026  

---

## 📑 1. Executive Summary & Strategi Bisnis

Dokumen ini adalah cetak biru teknis dan spesifikasi arsitektur paling lengkap (*Master Task List & Verification Gate Blueprint*) untuk pengembangan **Fitur Add-On Cloud Storage Mandiri** di platform **pick-your-photo**.

### Strategi Pengerjaan (Strict Task Verification Gate Strategy)
* **Pengerjaan Bertahap (Task-by-Task):** Setiap task dikerjakan secara sistematis sesuai urutan roadmap.
* **Pengujian Mandiri di Tiap Task:** Setiap task **WAJIB diuji dan diverifikasi lulus 100%** sebelum menandai checklist `[x]` dan berpindah ke task berikutnya.
* **Update Real-time Dokumen:** Dokumen ini diperbarui secara berkala sebagai catatan kemajuan resmi pengerjaan proyek.

---

## 🎯 2. Master Task List & Progress Checklist

### 📍 FASE 1: Pondasi Database & Admin Operational Console (SELESAI ✅)
- [x] **Task 1.1:** Migrasi Skema Database (`master_drive_accounts`, kolom kuota `vendors` & `photos`) — *(Selesai & Teruji ✅)*
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

### 📍 FASE 3: Vendor Dedicated File Manager UI (`📁 Cloud Storage Manager`) (MANDIRI ⏳)
- [ ] **Task 3.1:** Halaman Dashboard Tab Baru Vendor `/dashboard/storage` (Google Drive Clone UI).
- [ ] **Task 3.2:** Backend API Route `/api/storage/folders` (`GET`, `POST`, `DELETE`).
- [ ] **Task 3.3:** Isolasi Multi-Tenant Scope (`vendorId = session.vendorId`).
- [ ] **Task 3.4:** Pengujian UI Vendor Storage Tab.

---

### 📍 FASE 4: Upload Engine: Round-Robin Queue & Mid-Upload Auto Failover (MANDIRI ⏳)
- [ ] **Task 4.1:** API Route `/api/storage/upload-ticket` (Round-Robin Worker Session URL Ticket).
- [ ] **Task 4.2:** Client-Side Upload Engine di browser Vendor.
- [ ] **Task 4.3:** Fitur Mid-Upload Auto Failover saat Worker Penuh (`storageQuotaExceeded`).
- [ ] **Task 4.4:** Pengujian Masal Upload 100+ Foto & Failover Test.

---

### 📍 FASE 5: Convert Project Card & Public Share Link Page (MANDIRI ⏳)
- [ ] **Task 5.1:** Fitur `[ 🏷️ Jadikan Proyek Seleksi ]` (`/api/storage/convert-to-project`).
- [ ] **Task 5.2:** Fitur `[ 🔗 Share Public Link ]` dengan Branded Domain (`pickyourphoto.com/share/[slug]`).
- [ ] **Task 5.3:** Direct CDN Single Download & Client-Side JSZip Packaging.
- [ ] **Task 5.4:** Pengujian Public Viewer & ZIP Download.

---

### 📍 FASE 6: Health Cron, Auto-Repair & Final QA Testing (MANDIRI ⏳)
- [ ] **Task 6.1:** Cron Job Health Check OAuth Token (Tiap 6 Jam).
- [ ] **Task 6.2:** Tombol `[ 🔧 Auto-Repair Permissions ]` di Admin Console.
- [ ] **Task 6.3:** Final End-to-End System Integration QA.

---

## 🗂️ 3. Arsitektur Penempatan Tab Operasional Sistem (Dedicated Tab Placement)

```text
[ MAIN SIDEBAR ADMIN CONSOLE ]
 ├── 📊 Ringkasan Analitik
 ├── 🏪 Kelola Vendor & Studio
 ├── 💳 Paket & Transaksi
 ├── 💾 OPERASIONAL STORAGE POOL  <─── [ TAB MANDIRI KHUSUS OPERASIONAL SISTEM ]
 └── ⚙️ Pengaturan (SMTP & Payment Gateway)

[ MAIN SIDEBAR VENDOR CONSOLE ]
 ├── 📊 Ringkasan Proyek
 ├── 🖼️ Galeri Seleksi Klien
 ├── 📁 CLOUD STORAGE MANAGER <─── [ TAB MANDIRI KHUSUS CLOUD STORAGE VENDOR ]
 └── 💳 Paket & Add-On
```

---

## 🏗️ 4. Arsitektur Master Index Hub & Parallel Worker Storage

```text
                        [Akun Master Index Hub]
         (Hanya membuat struktur folder -> Ukuran 0 Bytes Abadi)
                                   │
              ┌────────────────────┴────────────────────┐
              ▼ Share Access (Editor)                   ▼ Share Access (Editor)
    [Akun Worker Storage 1]                   [Akun Worker Storage 2]
(Penampung Kapasitas File 15GB)           (Penampung Kapasitas File 15GB)
```

---

## ⚙️ 5. Spesifikasi Alur Otomatis Penambahan Worker (Route API & Database)

```text
[ Admin Klik "➕ Tambah Worker" ] ──► [ Login Google OAuth ] ──► [ Callback Route API ]
                                                                        │
┌───────────────────────────────────────────────────────────────────────┘
▼
[ Alur 3 Langkah Otomatis di Backend Route API ]:
  1. Fetch Userinfo (Ambil Email & Storage Limit, misal: worker5@gmail.com, 15 GB).
  2. Database Insert: INSERT INTO master_drive_accounts (email, role, refreshToken...).
  3. Execute permissions.create: Memberikan akses Sharing Editor dari Master Hub ke worker5@gmail.com.
```

---

## ⚡ 6. Engine Upload: Round-Robin Worker Queue & Mid-Upload Auto Failover

```text
                                [Browser Vendor]
                     (Meng-upload 1.000 foto sekaligus)
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              ▼                              ▼
  [Worker 1 Token]               [Worker 2 Token]               [Worker 3 Token]
(Upload Foto 1, 4, 7...)       (Upload Foto 2, 5, 8...)       (Upload Foto 3, 6, 9...)
        │                              │                              │
        └──────────────────────────────┼──────────────────────────────┘
                                       │
                                       ▼
             [Masuk ke 1 Folder Sama di Akun Master Index Hub]
```

---

## 🗑️ 7. Logika Penghapusan File & Pengembalian Kuota (Quota Refund)

1. **Pencatatan ID Worker per Foto:** `photos` mencatat `googleFileId`, `workerAccountId`, dan `fileSizeBytes`.
2. **Alur Eksekusi Penghapusan:** `drive.files.delete` via token Worker / Master $\rightarrow$ pengembalian kuota (*refund*) instan di database.

---

## 🌐 8. Spesifikasi Public Share Link & Dedicated Public Viewer UI

```text
+------------------------------------------------------------------------------------+
| 📸 Studio AMS  •  Public Photo Drive                                               |
| 📁 [2026] Wedding Budi & Ani                                                      |
| 📅 5 Agustus 2026  •  350 Foto  •  12.4 GB           [ 📥 Download All (.ZIP) ]    |
+------------------------------------------------------------------------------------+
| [ 🔍 Cari Foto... ]                         [ 📱 Mode Grid ] [ 📋 Mode List ]      |
+------------------------------------------------------------------------------------+
|                                                                                    |
|  +--------------+  +--------------+  +--------------+  +--------------+        |
|  |              |  |              |  |              |  |              |        |
|  |  [ Foto 1 ]  |  |  [ Foto 2 ]  |  |  [ Foto 3 ]  |  |  [ Foto 4 ]  |        |
|  |              |  |              |  |              |  |              |        |
|  +--------------+  +--------------+  +--------------+  +--------------+        |
|   DSC0001.JPG       DSC0002.JPG       DSC0003.JPG       DSC0004.JPG              |
|                                                                                    |
+------------------------------------------------------------------------------------+
|  Powered by pickyourphoto.com  •  White-Label Studio Cloud                         |
+------------------------------------------------------------------------------------+
```

---

## ⚡ 9. Pengelolaan Limit API Google & CDN Caching Optimization

| Jenis Limit Google API | Kuota Resmi Google | Penanganan & Penggandaan di Sistem Kita |
| :--- | :--- | :--- |
| **Request Harian (QPD)** | **12.000.000 Req / Hari** | Cukup untuk melayani puluhan ribu fotografer. |
| **Request per Menit** | **12.000 Req / Menit / User** | **Multiplied via Multi-Worker:** 5 Worker = **60.000 req/menit**! |
| **Upload Harian** | **750 GB / Hari / User** | **Multiplied via Multi-Worker:** 5 Worker = **3.750 GB / Hari**! |

---

## 🖥️ 10. Spesifikasi Tampilan UI/UX Tab Operasional Sistem Admin (`💾 Storage Pool`)

```text
+---------------------------------------------------------------------------------------------------+
| 💾 TAB OPERASIONAL SISTEM: STORAGE POOL CLUSTER MANAGER                                          |
| Kelola Akun Master Index Hub & Monitor Kolam Penyimpanan Multi-Account Cloud Storage.             |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
| [ 👑 SEKSI 1: AKUN MASTER INDEX HUB (FOLDER MAPPER) ]                                             |
| Akun khusus pembuat & pemilik struktur folder utama (Kapasitas Terpakai: 0 Bytes Abadi).          |
| ------------------------------------------------------------------------------------------------- |
| Akun Master Active: master.hub@gmail.com                   [ 🟢 Master Active ]                   |
| Google Client ID: 733578075321-sie...                      Client Secret: ••••••••••••••••        |
| [ 🔄 Ganti Akun Master Hub ➔ ]                                                                    |
|                                                                                                   |
| ------------------------------------------------------------------------------------------------- |
|                                                                                                   |
| [ 📦 SEKSI 2: POOL AKUN WORKER STORAGE (PENAMPUNG FILE BUKTI FOTO) ]                               |
| Akun-akun Google penampung kapasitas file foto. (Total Capacity Pool: 45 GB / 3 Akun Worker).     |
| ------------------------------------------------------------------------------------------------- |
|  NO  EMAIL AKUN WORKER             KAPASITAS TERPAKAI          STATUS          AKSI               |
| ------------------------------------------------------------------------------------------------- |
|  1.  worker1.storage@gmail.com   12.4 GB / 15.0 GB [███████░] 🟢 Active        [ 🗑️ Hapus Akun ]  |
|  2.  worker2.storage@gmail.com    8.2 GB / 15.0 GB [████░░░░] 🟢 Active        [ 🗑️ Hapus Akun ]  |
|  3.  worker3.storage@gmail.com    0.0 GB / 15.0 GB [░░░░░░░░] 🟢 Standby       [ 🗑️ Hapus Akun ]  |
| ------------------------------------------------------------------------------------------------- |
| [ ➕ Tambah Akun Worker Storage Baru (+ Google OAuth) ]                                            |
+---------------------------------------------------------------------------------------------------+
```

---

## 🎨 11. Spesifikasi Tampilan UI/UX Tab Storage Vendor (`📁 Cloud Storage Manager`)

```text
+-----------------------------------------------------------------------------------------------------+
| 📁 MY CLOUD STORAGE MANAGER                                   [ 📊 Penggunaan: 24.5 GB / 100 GB ]   |
+-----------------------------------------------------------------------------------------------------+
| [ ➕ Buat Folder Baru ]  [ 📤 Upload Foto / Video ]                                                |
+-----------------------------------------------------------------------------------------------------+
| NAMA FOLDER / FILE                         UKURAN       ITEMS     AKSI & FITUR PINTAR               |
+-----------------------------------------------------------------------------------------------------+
| 📁 [2026] Wedding Budi & Ani               12.4 GB     350 Foto   [ 🏷️ Active Project ] [ 🔗 Share ] |
| 📁 [2026] Prewedding Doni & Elsa           8.1 GB      210 Foto   [ ➕ Jadikan Project ] [ 🔗 Share ] |
| 📁 Archive Foto Pribadi Studio             4.0 GB      45 Foto    [ 🔗 Share Link ]  [ ✏️ Edit/Delete]|
+-----------------------------------------------------------------------------------------------------+
```

---

## ⚙️ 12. Perancangan Database & Schema SQL (`lib/db.js`)

```sql
CREATE TABLE IF NOT EXISTS master_drive_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'worker', -- 'master_index' atau 'worker'
  refreshToken TEXT NOT NULL,
  accessToken TEXT,
  totalLimitBytes INTEGER DEFAULT 16106127360, -- Default 15 GB
  usedStorageBytes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'full', 'disabled'
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE vendors ADD COLUMN hasStorageAddon INTEGER DEFAULT 0;
ALTER TABLE vendors ADD COLUMN addonStorageQuotaBytes INTEGER DEFAULT 0;

ALTER TABLE photos ADD COLUMN googleFileId TEXT;
ALTER TABLE photos ADD COLUMN workerAccountId INTEGER REFERENCES master_drive_accounts(id);
```

---

## 🗺️ 13. Peta API Endpoints Sistem

| Endpoint | Method | Fungsi Utama |
| :--- | :--- | :--- |
| `/api/admin/drive-pool` | `GET / POST` | Mengambil daftar pool Worker & Menambah Worker baru via OAuth. |
| `/api/admin/auth/google/worker/callback` | `GET` | Callback OAuth 1-klik yang otomatis menyimpan Worker ke DB & menyetol izin sharing. |
| `/api/admin/drive-pool/[id]` | `DELETE` | Mencabut/menghapus akun Worker dari pool. |
| `/api/storage/folders` | `GET / POST` | Menampilkan & membuat folder baru di Tab Storage Vendor. |
| `/api/storage/upload-ticket` | `POST` | Mengeluarkan Session URL Direct Upload ber-token Worker. |
| `/api/storage/convert-to-project` | `POST` | Mengubah folder di Storage Tab menjadi Card Project Galeri Klien. |
| `/api/storage/share/[slug]` | `GET` | Menampilkan halaman publik viewer foto/folder yang dibagikan via link. |

---

## 🛡️ 14. Analisis Risiko Mendalam & Strategi Mitigasi Otomatis

### A. Risiko Kebijakan Google (*Google ToS & Abuse Detection*)
* **Mitigasi:** Health-Check Cron Job 6 Jam untuk auto-disable akun bermasalah dan mengalihkan antrean secara otomatis (*Auto Failover*).

### B. Risiko Invalidasi Token OAuth (*Invalid Grant*)
* **Mitigasi:** Visual badge `⚠️ Re-Auth Needed` di Admin Console dan fitur 1-klik Re-authorization.

### C. Risiko Terputusnya Sharing Permission
* **Mitigasi:** Eksekusi `permissions.create` otomatis via API dan tombol `[ 🔧 Auto-Repair Permissions ]` di Admin Console.

---

## 🚀 15. Dampak Sistemik & Kesimpulan Akhir

Blueprint V6.0 ini menyajikan **solusi Cloud Storage paling canggih, rapi, cepat, dan ekonomis** lengkap dengan **Strict Task Verification Gate**.

* **List Task Berurutan:** Terbagi menjadi 6 Fase dengan indikator status `[x] Selesai` dan `[ ] Upcoming`.
* **Prinsip Uji & Lulus:** Setiap task wajib dites dan dinyatakan lulus 100% sebelum beralih ke task berikutnya.
* **Isolasi UI/UX Tingkat Tinggi:** Modul Storage memiliki **Tab Mandiri Tersendiri** (`💾 Storage Pool` di Admin & `📁 Cloud Storage` di Vendor).
