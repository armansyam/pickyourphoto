# 📌 Catatan Perancangan & Analisis Fitur Masa Depan (Long-Term Roadmap)

> **Dokumen Referensi Arsitektur untuk Implementasi Fitur Mendatang**  
> Lokasi: `docs/PLAN_FITUR_BARU.md`  
> **Tujuan:** Sebagai catatan teknis & panduan analisis saat fitur-fitur ini akan dikerjakan di masa mendatang.

---

## 🛠️ Panduan & Blueprint Teknis Implemetasi Fitur (Masa Depan)

### 🔴 1. Email Notifikasi Expiry H-3, H-1, H-0 (✅ SELESAI)
- **Status:** **Telah Diimplementasikan & Aktif (SaaS v2.0)**
- **Implementasi:**
  - Fungsi `sendSubscriptionExpiringWarningEmail` & `sendVendorAccountExpiredEmail` terpasang di `lib/mailer.js`.
  - Terkoneksi ke daemon background interval 60-detik `lib/db.js`.

---

### 🔴 2. Badge Status Visual & Filter Kartu Proyek (✅ SELESAI)
- **Status:** **Telah Diimplementasikan & Aktif (SaaS v2.0)**
- **Implementasi:**
  - Pemetaan warna badge di `app/dashboard/page.js`: `🟢 Aktif Seleksi`, `🔵 Selesai Dipilih`, `🔴 Diarsipkan`, `❌ Gagal`.

---

### 🔵 3. Google Drive Direct Scanner (Zero-Storage Architecture — SELESAI)
- **Status:** **Telah Diimplementasikan & Aktif (SaaS v2.0)**
- **Arsitektur:**
  - Pemindaian folder Google Drive dilakukan secara langsung & instan via OAuth 2.0 API (`lib/gdrive-importer.js`).
  - Menggunakan **Zero-Storage Direct Stream Pipe** (`/api/proxy/thumb/[fileId]`). File foto **0 Byte diunggah ke server**, sehingga tidak membutuhkan proses impor fisik di background maupun polling progres lama.

---

### 🟢 4. Email Notifikasi Pendaftaran Vendor ke Admin (Long-Term)
- **Tujuan:** Admin SaaS mendapat notifikasi email instant saat ada fotografer baru yang mendaftar atau melakukan pembayaran QRIS/Manual.
- **Konsep Arsitektur:**
  - Sisipkan pemicu `sendAdminNotificationEmail(newVendor)` di `app/api/auth/register/route.js` dan `app/api/payment/notification/route.js`.

---

### 🟢 5. Export Rekap Seleksi Klien ke CSV/Excel (Long-Term)
- **Tujuan:** Vendor studio foto dapat mengunduh daftar nama foto terpilih klien dalam bentuk file CSV untuk dibuka di Microsoft Excel atau Lightroom.
- **Konsep Arsitektur:**
  - Endpoint: `GET /api/projects/[projectId]/export-csv`
  - Response Header: `Content-Type: text/csv` & `Content-Disposition: attachment; filename="seleksi_nama_project.csv"`

---

*Dokumen ini disimpan sebagai panduan acuan teknis saat pengembangan fitur lanjutan dimulai.*
