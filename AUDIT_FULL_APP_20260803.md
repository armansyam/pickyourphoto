# Audit Total Aplikasi PickYourPhoto

Tanggal: 2026-08-03
Commit HEAD: `0b12d07` (termasuk perbaikan payment gateway upgrade, QRIS, email notification)
Server: LXC 102 (192.168.100.83), port 3051, domain pick-your-photo.ammang.my.id

---

## 1. Ringkasan Eksekutif

Aplikasi PickYourPhoto (Next.js 14.2.3, SQLite, better-sqlite3) telah diaudit secara menyeluruh dari sisi **keamanan**, **kode mati/dead code**, dan **business logic**. Hasil:

- **3 HIGH severity** ditemukan (secrets hardcoded, endpoints admin tanpa auth middleware, rate limiting)
- **4 MED severity** ditemukan (JWT expiry terlalu panjang, cookie flags, CORS, data sensitive di response)
- **2 file dead code** teridentifikasi untuk dihapus
- **1 file partial dead code** perlu refactor
- **Business logic**: alur pembayaran QRIS aman (race condition handled), email aktivasi konsisten di 3 jalur, trial OAuth refresh token tidak efisien tapi berfungsi

---

## 2. Audit Keamanan

### 2.1 Secrets Hardcoded — HIGH
| File | Baris | Masalah | Rekomendasi |
|------|-------|---------|-------------|
| `lib/auth.js` | 5 | `JWT_SECRET` fallback hardcoded `'pick-your-photo-super-secret-key-2026'` | Hapus fallback, wajib `process.env.JWT_SECRET` tanpa default. Rotasi secret berkala. |

### 2.2 JWT Token Expiry — MED
| File | Baris | Masalah | Rekomendasi |
|------|-------|---------|-------------|
| `lib/auth.js` | `expiresIn: '7d'` | Lifetime token terlalu panjang (7 hari) | Kurangi menjadi 24 jam untuk sesi aktif. Implementasikan refresh token dengan rotasi. |

### 2.3 Cookie Flags — MED
| File | Baris | Masalah | Rekomendasi |
|------|-------|---------|-------------|
| `lib/auth.js` | `sameSite: 'strict'` | `sameSite: 'strict'` bisa memutus alur OAuth callback lintas site | Ubah ke `'lax'` untuk umum. Pastikan `secure: true` di produksi. |

### 2.4 Endpoints Tanpa Auth Admin/Vendor — HIGH
| File | Masalah | Rekomendasi |
|------|---------|-------------|
| `app/api/admin/**/route.js` (semua) | Tidak ada middleware auth yang memeriksa role admin | Implementasikan middleware auth yang memverifikasi JWT + role sebelum mengizinkan akses admin endpoint |

### 2.5 Missing Rate Limiting — MED
| File | Masalah | Rekomendasi |
|------|---------|-------------|
| `app/api/auth/login/route.js` | Tidak ada rate limiting pada login, register, payment | Batasi 5x per 60 menit untuk email/whatsapp. Gunakan in-memory atau Redis counter. |

### 2.6 CORS — MED
| File | Masalah | Rekomendasi |
|------|---------|-------------|
| (tidak ditemukan konfigurasi CORS eksplisit) | Tidak ada pembatasan origin untuk API | Konfigurasi CORS agar hanya menerima request dari domain yang terdaftar di GCP OAuth redirect URIs |

### 2.7 Sensitive Data di Response — MED
| File | Baris | Masalah | Rekomendasi |
|------|-------|---------|-------------|
| `app/api/auth/login/route.js` | `role: vendor.role` di response login | Field `role` bisa dieksploitasi untuk enumerasi | Hapus `role` dari response login. Pastikan tidak ada token/hashed password yang bocor. |

---

## 3. Audit Dead Code

| File / Fungsi | Status | Bukti | Rekomendasi |
|---------------|--------|-------|-------------|
| `lib/trial-scraper.js` | **DEAD** | Tidak ada `import`/`require` di seluruh codebase | **HAPUS** — sudah digantikan oleh GDrive API OAuth |
| `lib/storage-cleaner.js` | **DEAD** | Tidak ada referensi `grep` | **HAPUS** — arsitektur live-stream tidak menyimpan file di disk |
| `app/api/admin/vendors/over-limit/route.js` | **DEAD** | Tidak ada `fetch` dari frontend | **HAPUS** — fitur tidak pernah diimplementasikan di UI |
| `app/api/auth/logout/route.js` | **DEAD** | Tidak ada `fetch` dari frontend | **REFACTOR** — seharusnya ada tombol logout yang memanggil endpoint ini, atau hapus jika tidak dibutuhkan |
| `app/api/proxy/thumb/` | **DEAD** | Tidak ada penggunaan di `<img>` atau `fetch` frontend | **HAPUS** — frontend memuat thumbnail GDrive langsung |
| `hooks/useRawSorter.js` | **DEAD** | Tidak ada komponen yang merender RawSorter | **HAPUS** — fitur eksperimental |
| `components/RawSorterDrawer.jsx` | **DEAD** | Tidak ada komponen yang merender RawSorter | **HAPUS** — fitur eksperimental |
| `lib/vendor-status.js` (`autoCheckVendorSubscriptionExpiry`) | **PARTIAL DEAD** | Fungsi tidak dipanggil, tidak ada cron job | **HAPUS** fungsi jika tidak ada rencana cron |
| `app/dashboard/page.js` (`normalizeWhatsappNumber`) | **DUPLICATE** | Didefinisikan ulang di dashboard, bukan import dari `lib/vendor-status.js` | **REFACTOR** — hapus duplikat, import dari `lib/vendor-status.js` |

### File yang Tetap Dipertahankan (Dipakai)
| File | Status |
|------|--------|
| `lib/payment-gateway/midtrans.js` | DIPAKAI — implementasi nyata |
| `lib/payment-gateway/duitku.js` | DIPAKAI — stub untuk kompatibilitas |
| `lib/payment-gateway/tripay.js` | DIPAKAI — stub untuk kompatibilitas |
| `lib/payment-gateway/xendit.js` | DIPAKAI — stub untuk kompatibilitas |
| `lib/payment-gateway/index.js` | DIPAKAI — factory gateway |
| `lib/url.js` | DIPAKAI — `getRequestOrigin` dipakai di 6 file |
| `lib/vendor-status.js` (`getOverLimitVendors`) | DIPAKAI — dipakai di `api/admin/vendors/over-limit` (meskipun route-nya dead) |
| `app/route.js` | DIPAKAI — entry point utama |
| `lib/db.js` | DIPAKAI — skema DB |
| `lib/mailer.js` | DIPAKAI — SMTP config + email |
| `lib/google-master-drive.js` | DIPAKAI — OAuth flow |
| `lib/gdrive-importer.js` | DIPAKAI — trial folder import |

---

## 4. Audit Business Logic

### 4.1 Alur Pembayaran QRIS — ✅ AMAN
- **Webhook** (`/api/payment/notification`) dan **Polling** (`/api/payment/status`) keduanya menjalankan logika aktivasi vendor + kirim email yang identik.
- **Race condition prevented**: kedua jalur memeriksa `transaction.status !== 'paid'` sebelum aktivasi. Jika webhook sudah memproses, polling akan melewati blok aktivasi.
- **Tidak ada bug.**

### 4.2 Trial & Google Drive OAuth — ⚠️ RENDAH
- `lib/google-master-drive.js` menggunakan `refresh_token` untuk mendapatkan `access_token` baru setiap request.
- `oauth2Client.on('tokens', ...)` **tidak dipakai** — `access_token` baru tidak disimpan kembali ke DB `saas_settings`.
- **Dampak**: Setiap request berikutnya mengulangi proses refresh, kurang efisien dan berpotensi kena rate-limit Google.
- **Rekomendasi**: Tambahkan event listener `tokens` untuk menyimpan `access_token` baru ke DB.

### 4.3 Konsistensi Paket (Plans) — ✅ OK
- Semua 3 paket: `activePeriodDays=30`, `maxPhotosPerProject=0` (unlimited), `maxStorageMB=0` (live-stream).
- Sesuai keputusan bisnis: 30 hari, unlimited foto, no storage server.

### 4.4 Otomatisasi Project Archiving — ⚠️ SEDANG
- `autoCheckVendorSubscriptionExpiry` di `lib/vendor-status.js` hanya mengubah status vendor jadi `expired`, **tidak** mengubah status project jadi `archived`.
- Akses galeri klien diblokir (403) saat vendor expired, tapi project tetap `pending_selection`/`completed` di DB.
- **Rekomendasi**: Jika tujuannya auto-archive, tambahkan logika untuk mengubah `projects.status` jadi `archived` saat vendor expired. Atau jika hanya ingin client tidak bisa akses, biarkan seperti ini.

### 4.5 Konfigurasi Email (SMTP) — ✅ OK
- `sendVendorApprovalEmail` dipanggil konsisten di 3 jalur: manual admin, webhook Midtrans, polling Midtrans.
- Konfigurasi SMTP sepenuhnya dari DB `saas_settings`.

### 4.6 Alur Re-aktivasi Project — ✅ OK
- Baik `reactivate` (single) maupun `reactivate-all` (bulk) memeriksa `vendor.isExpired` dan mengembalikan 403 jika expired.
- Logika sudah benar.

---

## 5. Ringkasan Prioritas Perbaikan

| # | Severitas | Item | Tipe |
|---|-----------|------|------|
| 1 | HIGH | Hapus JWT_SECRET fallback hardcoded | Security |
| 2 | HIGH | Implementasikan middleware auth untuk endpoint admin | Security |
| 3 | HIGH | Tambah rate limiting pada endpoint auth/payment | Security |
| 4 | MED | Kurangi JWT token lifetime dari 7d ke 24h | Security |
| 5 | MED | Ubah `sameSite` cookie ke `'lax'` | Security |
| 6 | MED | Hapus `role` dari response login | Security |
| 7 | MED | Konfigurasi CORS pembatasan origin | Security |
| 8 | MED | Hapus dead code: `trial-scraper.js`, `storage-cleaner.js`, `over-limit` route, `logout` route, `proxy/thumb` routes, `RawSorter` | Cleanup |
| 9 | MED | Refactor duplikat `normalizeWhatsappNumber` | Cleanup |
| 10 | LOW | Tambahkan `oauth2Client.on('tokens')` handler untuk refresh token | Efficiency |
| 11 | LOW | Tambahkan auto-archive project saat vendor expired (jika diperlukan) | Business Logic |

---

## 6. Catatan

- Semua temuan ini **hanya untuk audit** — tidak ada kode yang diubah oleh assistant.
- Tim Antigravity dapat mengimplementasikan perbaikan berdasarkan laporan ini.
- Prioritaskan item HIGH dan MED terlebih dahulu.
