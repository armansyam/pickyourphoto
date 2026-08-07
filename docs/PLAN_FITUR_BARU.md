# 📌 Catatan Perancangan Fitur Tambahan & Laporan Keuangan

> **Dokumen Referensi Arsitektur untuk Fitur Tambahan Admin**  
> Lokasi: `docs/PLAN_FITUR_BARU.md`  
> **Terakhir diperbarui:** 07 Agustus 2026

---

## 🛠️ Ringkasan Status & Evaluasi Fitur

### 🟢 1. Laporan Keuangan Admin CSV / Excel (✅ SELESAI & AKTIF)
- **Status:** **Telah Diimplementasikan & Aktif**
- **Deskripsi:** Superadmin dapat mengunduh berkas laporan transaksi pendapatan langganan paket utama dan Add-On Storage dalam format `.csv` untuk dibuka di Microsoft Excel atau Google Sheets.
- **Endpoint:** `GET /api/admin/financial-report/export-csv`
- **Tombol:** Tombol **`📊 Unduh Laporan Keuangan (CSV)`** tersedia di Admin Dashboard (`/admin#analytics`).

---

### ❌ 2. Email Alert Pendaftaran ke Admin (DIBATALKAN / TIDAK DIPERLUKAN)
- **Status:** **Dibatalkan (Sesuai Arahan)**
- **Alasan:** Admin SaaS telah memiliki widget notifikasi real-time langsung di Admin Control Panel (`/admin`), sehingga notifikasi email tambahan tidak diperlukan untuk menghindari penumpukan email (*inbox clutter*).

---

### ❌ 3. Ekspor Rekap Seleksi Klien untuk Vendor (DIBATALKAN / TIDAK DIPERLUKAN)
- **Status:** **Dibatalkan (Sesuai Arahan)**
- **Alasan:** Fitur Auto-Sorter / Selector File RAW lokal (`components/RawSorterDrawer.jsx`) serta fungsi 1-klik copy nama file terpilih pada galeri sudah mencukupi kebutuhan workflow fotografer tanpa perlu mengunduh file rekap CSV terpisah.

---

*Dokumen ini diperbarui sebagai catatan evaluasi keputusan fitur platform Pick Your Photo SaaS.*
