# 📋 04. Status Implementasi & Roadmap (Pick Your Photo)

> **Dokumen Status Pengembangan & Rencana Fitur SaaS**  
> Lokasi: `docs/04-IMPLEMENTATION-PLAN.md`  
> **Terakhir diperbarui:** 2026-08-05 — evaluasi menyeluruh per fitur berdasarkan kode produksi

---

## ✅ 1. Fitur yang Sudah Berjalan di Produksi

### Auth & Onboarding Vendor
- [x] Registrasi via form (nama, email, WA, password, pilih paket, upload bukti transfer)
- [x] Registrasi via QRIS — vendor `pending_payment`, aktivasi otomatis via webhook
- [x] Rate limit registrasi: 5 percobaan/60 detik per IP
- [x] Re-register vendor non-aktif: update data tanpa buat akun baru
- [x] Blokir WA duplikat (`active`/`pending_payment`)
- [x] Blokir harga 0 di form registrasi (trial hanya via landing page)
- [x] Status `pending_manual` → Admin approve → `active`
- [x] Status `pending_payment` → webhook QRIS → `active` + email notifikasi

### Email Notifikasi (SMTP via `lib/mailer.js`)
- [x] Email aktivasi akun (`sendVendorApprovalEmail`) — HTML premium, dark mode
- [x] Email penolakan akun (`sendVendorRejectionEmail`) — dengan keterangan alasan
- [x] Email uji coba SMTP (`sendTestEmail`) — bisa dikirim dari Admin Panel Settings
- [x] SMTP dikonfigurasi di Admin Panel → tersimpan di `saas_settings`
- [x] Trigger email: webhook payment lunas + Admin manual approve

### Google Drive Integration (Master OAuth)
- [x] Koneksi Google OAuth Master dari Admin Panel (tombol hubungkan → callback)
- [x] `getMasterDriveClient()` — cache 45 menit, auto-refresh token
- [x] `fetchFolderFilesMasterOAuth()` — rekursif 5 level subfolder, filter gambar + RAW
- [x] Import queue FIFO in-memory (max 1 concurrent)
- [x] Reset proyek stuck `importing` → `failed` saat server restart
- [x] Retry import dari dashboard vendor (proyek `failed` saja)

### Proxy Gambar (True Pipe Stream)
- [x] `GET /api/proxy/thumb/[fileId]?sz=w400` — thumbnail
- [x] `GET /api/proxy/thumb/[fileId]/[filename]?sz=w1200` — preview full
- [x] ReadableStream pipe (`response.body`) — RAM ~0, tanpa `arrayBuffer()`
- [x] Fallback URL (lh3 → drive.google.com/thumbnail)
- [x] Cache-Control agresif 7 hari browser, 30 hari Cloudflare
- [x] Validasi File ID (regex mencegah injection)

### Manajemen Proyek Vendor
- [x] Buat proyek: nama, URL folder GDrive, max seleksi, tema galeri, nomor telepon klien
- [x] Slug unik otomatis (URL-friendly, collision-safe)
- [x] Import background + antrian
- [x] Arsip proyek (vendor expired → auto via `autoCheckVendorSubscriptionExpiry`)
- [x] Reaktivasi proyek: `POST /api/projects/[id]/reactivate`
- [x] Bulk reaktivasi: `POST /api/projects/reactivate-all`

### Galeri Klien
- [x] Akses via `accessKey` tanpa login
- [x] Blokir jika proyek `archived` atau vendor expired
- [x] Seleksi foto + validasi `maxSelection` dan kepemilikan `photoId`
- [x] Clear + save seleksi baru (atomic SQLite transaction)
- [x] Update status proyek → `completed`
- [x] Branding vendor (logo + nama studio) di halaman galeri
- [x] Beragam tema galeri (`galleryTheme`)

### Salin Nama File (Lightroom Ready)
- [x] Salin semua nama file seleksi dalam satu klik
- [x] Konfigurasi: delimiter, include/exclude ekstensi, sort order
- [x] Preferensi tersimpan per-vendor di DB

### RAW Selector
- [x] `hooks/useRawSorter.js` — client-side scan + match + copy/move via FSAPI
- [x] `components/RawSorterDrawer.jsx` — log terminal, progress bar, mode copy/move
- [x] `GET /api/projects/[id]/selected-files` — nama file terpilih klien
- [x] Gating per paket: Starter dikunci, Pro/Business penuh, Trial terbatas
- [x] Trial limit dari `saas_settings.raw_sorter_trial_limit`
- [x] Fallback browser incompatible (Chrome/Edge only)

### Payment Gateway QRIS
- [x] Multi-provider dispatcher: Midtrans, Xendit, Tripay, Duitku
- [x] `POST /api/payment/create` — buat transaksi, rate limit 5/60s/IP
- [x] `GET /api/payment/status` — polling + live-check Midtrans + auto-aktivasi
- [x] `POST /api/payment/notification` — webhook verifikasi signature + aktivasi vendor
- [x] `POST /api/payment/cancel` — batalkan sesi pending
- [x] `POST /api/payment/regenerate` — QRIS baru tanpa re-input data
- [x] `GET /api/payment/check-pending` — cek sesi aktif
- [x] `GET /api/payment/qr-image` — proxy QR code image (anti-CORS)
- [x] Auto-cleanup 60 detik: expire sesi + archive vendor expired_draft
- [x] Auto-delete leads `draft_plan` > 48 jam
- [x] Set cookie JWT otomatis saat status berhasil bayar (login langsung)

### Trial Galeri (Landing Page)
- [x] `POST /api/trial/create` — buat trial dari URL GDrive publik
- [x] Konfigurasi limit dari `saas_settings`
- [x] Grup file per subfolder, tab locked/unlocked
- [x] Logo studio di galeri trial (base64)
- [x] Expiry dikonfigurasi Admin (`trial_expiration_minutes`)
- [x] Toggle trial aktif/nonaktif (`enable_free_trial`)

### Panel Superadmin
- [x] Analytics: MRR/ARR, trend 6 bulan, trial stats, top vendor, activity feed
- [x] Auto-backup: trigger `scripts/backup-db.sh` + `scripts/backup-photos.sh`
- [x] Kelola vendor: list, approve, suspend, detail, status Midtrans auto-sync
- [x] Kelola paket: CRUD + `allowCustomLogo`, `allowRawSelector`
- [x] Kelola upgrade: approve/reject `subscription_requests`, proration
- [x] Pengaturan sistem: registrasi/trial toggle, kuota vendor, backup interval
- [x] Pengaturan SaaS: bank, WA admin, email, Google OAuth, SMTP, payment gateway
- [x] Trial Control: preset konfigurasi trial (5 preset)

### Subscription & Proration
- [x] Request upgrade via form upload bukti transfer
- [x] Proration cerdas: faktor 100%/85%/70% tergantung tier dan hari terpakai
- [x] Blokir renewal > H-10 sebelum expired (paket sama)
- [x] Blokir downgrade jika proyek aktif melebihi batas paket tujuan
- [x] Approve → `expiresAt` akumulatif (tambah dari expired sebelumnya jika belum lewat)

---

## 🛣️ 2. Roadmap — Fitur Belum Diimplementasi

> Setiap item diberi label prioritas dan **catatan apakah DIBUTUHKAN atau OPSIONAL** berdasarkan kebutuhan operasional platform.

---

### 🔴 PRIORITAS TINGGI — Diperlukan untuk Operasional Lancar

#### 1. Email Notifikasi Expiry H-7, H-3, H-0
> **STATUS: ⚠️ DIBUTUHKAN**  
> SMTP sudah siap di `lib/mailer.js`. Tinggal buat cron job atau trigger di `lib/vendor-status.js`.  
> **Dampak:** Vendor tidak sadar expired → churn tinggi, tiba-tiba tidak bisa akses dashboard.

**Yang perlu dibuat:**
- Fungsi `sendExpiryReminderEmail(vendor, daysLeft)` di `lib/mailer.js`
- Cron job atau pemanggilan berkala di server (PM2 cron / `setInterval`)
- Query vendor yang `expiresAt` dalam 7, 3, 0 hari ke depan

---

#### 2. Badge Status Visual di Kartu Proyek Dashboard
> **STATUS: ⚠️ DIBUTUHKAN**  
> Saat ini vendor tidak tahu dengan jelas mana proyek `archived` vs `pending_selection`.  
> **Dampak:** UX membingungkan, vendor tidak tahu apa yang harus dilakukan.

**Yang perlu dibuat:**
- Badge warna per status: "Aktif", "Selesai Dipilih", "Diarsipkan", "Gagal Import", "Sedang Import"
- Tombol "Aktifkan Kembali" visible hanya pada status `archived`

---

#### 3. Auto-Archive Project saat Vendor Expired
> **STATUS: ⚠️ DIBUTUHKAN** (sudah ada di `autoCheckVendorSubscriptionExpiry`, tapi hanya untuk proyek `!= 'completed'`)  
> **Catatan:** Perlu dipastikan proyek `completed` juga diarsipkan saat vendor expired, agar galeri klien tidak bisa diakses.  
> **Dampak:** Galeri klien vendor expired bisa tetap dibuka padahal tidak seharusnya.

**Yang perlu dicek:**
- Di `lib/vendor-status.js` baris 28: `AND status != 'completed'` → apakah ini intentional?
- Jika iya, buat blokir akses galeri by `vendor.expiresAt` saja (sudah ada di `/api/projects/[id]/route.js`)

---

### 🟡 PRIORITAS SEDANG — Memperbaiki Pengalaman Pengguna

#### 4. Tombol "Refresh/Update Galeri" setelah Reaktivasi
> **STATUS: 🔧 DIBUTUHKAN (minor)**  
> Setelah reaktivasi, vendor harus reload manual untuk melihat status proyek berubah.  
> **Dampak:** UX kurang responsif, vendor bingung apakah reaktivasi berhasil.

**Yang perlu dibuat:**
- Setelah `reactivate` success → auto-refresh daftar proyek di dashboard
- Atau tambahkan feedback toast "Galeri berhasil diaktifkan!"

---

#### 5. Halaman Status Import Real-Time
> **STATUS: 🔧 BERGUNA (opsional)**  
> Import berjalan di background, vendor tidak tahu selesai/gagal kecuali refresh manual.  
> **Dampak:** Jika folder besar (500+ foto), vendor menunggu tanpa tahu progres.

**Yang bisa dibuat:**
- Polling `GET /api/projects` setiap 5 detik selama ada proyek `importing`
- Atau tambahkan badge "Mengimpor..." yang auto-update

---

#### 6. Log Audit Reaktivasi Proyek
> **STATUS: 🔧 OPSIONAL**  
> Saat ini tidak ada pencatatan kapan/siapa yang mereaktivasi proyek mana.  
> **Dampak:** Tidak kritis untuk operasi, tapi berguna untuk debugging dan audit admin.

**Yang bisa dibuat:**
- Tabel baru `project_activity_logs` (projectId, action, actorId, timestamp)
- Atau tambahkan kolom `reactivatedAt` + `reactivatedCount` di tabel `projects`

---

### 🟢 PRIORITAS RENDAH — Nice-to-Have

#### 7. Notifikasi Aktivasi via Email ke Admin
> **STATUS: 🔧 OPSIONAL**  
> Saat vendor baru mendaftar, Admin hanya tahu dari WhatsApp manual atau cek admin panel.  
> SMTP sudah tersedia — bisa tambahkan email `"Vendor baru mendaftar: Nama"` ke email Admin.  
> **Dampak:** Low — Admin sudah punya panel untuk cek, notifikasi email hanya memperlancar alur.

---

#### 8. Export Seleksi per Proyek ke CSV
> **STATUS: 🟡 BERGUNA (opsional)**  
> Fotografer dengan ratusan klien butuh rekap seleksi dalam format yang bisa dibuka di Excel.  
> **Dampak:** Medium untuk fotografer skala besar.

**Yang bisa dibuat:**
- `GET /api/projects/[id]/export?format=csv` → download CSV nama file terpilih
- Di dashboard, tombol "📥 Export CSV" di proyek `completed`

---

#### 9. Bulk Action Vendor di Admin Panel
> **STATUS: 🟡 OPSIONAL**  
> Saat ini approve/suspend dilakukan satu per satu.  
> **Dampak:** Rendah untuk skala kecil — mulai relevan saat vendor > 50.

---

#### 10. Swagger / OpenAPI Documentation
> **STATUS: ❌ TIDAK DIPERLUKAN SEGERA**  
> Docs ini (`docs/API_DOCUMENTATION.md`) sudah cukup sebagai referensi internal.  
> Swagger baru relevan jika ada integrasi third-party atau API publik.

---

#### 11. Metrik Monitoring (Project Archived vs Active per Hari)
> **STATUS: ❌ TIDAK DIPERLUKAN SEGERA**  
> Analytics di Admin Panel sudah cukup untuk monitoring operasional.  
> Ini baru relevan untuk scale-up ke ratusan vendor.

---

## ❌ 3. Fitur yang TIDAK Akan Diimplementasi

| Fitur | Alasan |
|---|---|
| **WhatsApp Business API** | ❌ **Dihapus dari roadmap** — Platform sudah menggunakan SMTP Email (`nodemailer`) yang lebih handal, bebas biaya per pesan, dan tidak bergantung pada approval Meta/WA Business |
| **Storage-Based Plans** | ❌ Sudah dihapus — Platform menggunakan Zero-Storage Architecture (tidak ada file di server) |
| **Watermark on-the-fly (sharp)** | ❌ Tidak prioritas saat ini — Proxy stream tidak menyimpan gambar di buffer, watermark memerlukan buffer. Pertimbangkan ulang saat ada kebutuhan spesifik |

---

## 📊 4. Prioritas Eksekusi (Ranking)

| # | Fitur | Prioritas | Estimasi Effort |
|---|---|---|---|
| 1 | Email notifikasi expiry H-7/H-3/H-0 | 🔴 Tinggi | ~2 jam (SMTP sudah siap) |
| 2 | Badge status + tombol reaktivasi visual | 🔴 Tinggi | ~3 jam |
| 3 | Polling status import real-time di dashboard | 🟡 Sedang | ~2 jam |
| 4 | Email notifikasi ke Admin saat vendor baru daftar | 🟢 Rendah | ~1 jam |
| 5 | Export CSV seleksi | 🟢 Rendah | ~2 jam |
| 6 | Log audit reaktivasi | 🟢 Rendah | ~1 jam |
| 7 | Bulk action vendor di Admin Panel | 🟢 Rendah | ~3 jam |

---

## 🧪 5. Kriteria Verifikasi QA

| Skenario | Expected Result |
|---|---|
| Admin buka Kelola Paket | Tampil 3 paket, semua "30 hari", "Unlimited foto" |
| Vendor import folder 500 foto | Import background selesai tanpa error, RAM tidak naik signifikan |
| Vendor expired → buat proyek | 403 "masa aktif berakhir" |
| Klien buka galeri vendor expired | 403 "galeri tidak aktif" |
| Renewal diapprove → reaktivasi proyek | `archived` → `pending_selection`, galeri bisa dibuka klien |
| QRIS dibayar → polling status | Cookie JWT di-set → redirect `/dashboard` |
| Email SMTP aktif + vendor baru diapprove | Email masuk ke inbox vendor dalam <30 detik |
| Registrasi ke-6 dalam 60 detik (1 IP) | 429 rate limit |
| RAW Selector trial > 5 file | Proses berhenti di file ke-5, tampil pesan upgrade |
| Trial galeri expired diakses | Tampil pesan "Galeri ini telah kedaluwarsa" |
