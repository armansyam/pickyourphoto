# 🚀 Plan Fitur Baru & Roadmap Pengembangan — Pick Your Photo

> **Dokumen Rencana Fitur Baru Platform SaaS Pick Your Photo**  
> Lokasi: `docs/Plan fitur baru`  
> **Terakhir diperbarui:** 2026-08-05

---

## 🎯 Prioritas Roadmap Fitur Mendatang

### 🔴 1. Email Notifikasi Expiry H-7, H-3, H-0 (Prioritas Tinggi)
- **Deskripsi:** Pengiriman email pengingat otomatis ke vendor sebelum masa berlaku paket berakhir.
- **Kesiapan:** Engine SMTP sudah 100% aktif via `lib/mailer.js`.
- **Implementasi:**
  - Fungsi `sendExpiryReminderEmail(vendor, daysLeft)` di `lib/mailer.js`.
  - Cron job / check otomatis setiap 24 jam via `lib/vendor-status.js`.

### 🔴 2. Badge Status Visual & Filter Proyek Dashboard (Prioritas Tinggi)
- **Deskripsi:** Visualisasi warna badge status pada setiap kartu proyek di Dashboard Vendor.
- **Implementasi:**
  - `pending_selection` 🟢 (Aktif Seleksi)
  - `completed` 🔵 (Seleksi Selesai)
  - `archived` 🔴 (Diarsipkan)
  - `importing` 🟡 (Mengimpor)
  - `failed` ❌ (Gagal Import)

### 🟡 3. Polling Progres Import Real-Time (Prioritas Sedang)
- **Deskripsi:** Indikator progres impor folder Google Drive secara real-time di UI Dashboard.
- **Implementasi:** Polling `GET /api/projects` otomatis saat status proyek `importing`.

### 🟢 4. Email Notifikasi Pendaftaran Vendor ke Admin (Prioritas Rendah)
- **Deskripsi:** Email otomatis ke Admin SaaS saat ada vendor baru mendaftar (manual transfer / QRIS).

### 🟢 5. Export Rekap Seleksi Klien ke CSV (Prioritas Rendah)
- **Deskripsi:** Fitur unduh daftar nama foto terpilih klien dalam format CSV/Excel untuk kemudahan alur kerja studio.
