# 📌 Catatan Perancangan & Analisis Fitur Masa Depan (Long-Term Roadmap)

> **Dokumen Referensi Arsitektur untuk Implementasi Fitur Mendatang**  
> Lokasi: `docs/PLAN_FITUR_BARU.md`  
> **Tujuan:** Sebagai catatan teknis & panduan analisis saat fitur-fitur ini akan dikerjakan di masa mendatang.

---

## 🛠️ Panduan & Blueprint Teknis Implemetasi Fitur (Masa Depan)

### 🔴 1. Email Notifikasi Expiry H-7, H-3, H-0 (Long-Term)
- **Tujuan:** Mengingatkan vendor sebelum paket berlangganannya berakhir agar tidak terjadi *churn* tidak disengaja.
- **Konsep Arsitektur:**
  - Menggunakan helper Nodemailer yang sudah siap di `lib/mailer.js`.
  - **Mencegah Email Duplikat:** Tambahkan tabel/kolom pelacak seperti `lastExpiryNoticeSentAt` atau `expiryNoticeStage` ('H-7', 'H-3', 'H-0') pada tabel `vendors`.
  - **Pemicu (Trigger):** Dipanggil di dalam `setInterval` 24 jam atau cron job server (`scripts/cron-expiry-reminder.js`).
- **Contoh Pseudocode Blueprint:**
  ```javascript
  // lib/mailer.js
  export async function sendExpiryReminderEmail(vendor, daysLeft) {
      // Build HTML template sesuai daysLeft (7, 3, atau 0 hari)
      // Kirim via transporter.sendMail()
  }
  ```

---

### 🔴 2. Badge Status Visual & Filter Kartu Proyek (Long-Term)
- **Tujuan:** Mempermudah vendor membedakan status proyek di Dashboard secara cepat.
- **Konsep Arsitektur:**
  - Pemetaan warna badge di `app/dashboard/page.js`:
    - `pending_selection` ──► `🟢 Aktif Seleksi` (`bg-emerald-500/10 text-emerald-400`)
    - `completed` ──────────► `🔵 Selesai Dipilih` (`bg-blue-500/10 text-blue-400`)
    - `archived` ───────────► `🔴 Diarsipkan` (`bg-rose-500/10 text-rose-400`)
    - `importing` ──────────► `🟡 Mengimpor...` (`bg-amber-500/10 text-amber-400`)
    - `failed` ─────────────► `❌ Gagal Import` (`bg-red-500/10 text-red-400`)
  - **Filter Tab UI:** Tambahkan state tab filter di Dashboard (`Semua`, `Aktif`, `Selesai`, `Arsip`).

---

### 🟡 3. Polling Progres Import Real-Time (Long-Term)
- **Tujuan:** Memberikan indikator progres saat impor folder Google Drive berukuran besar (500+ foto).
- **Konsep Arsitektur:**
  - Opsi A: Polling `GET /api/projects` setiap 3-5 detik saat ada proyek bermenu status `importing`.
  - Opsi B: SSE (Server-Sent Events) di `/api/projects/[id]/stream-progress` jika ingin real-time tanpa polling.

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
