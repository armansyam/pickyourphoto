# Laporan Perbaikan: Logika Paket (Plan), Limit Storage & Masa Aktif

**Proyek:** Pick Your Photo (SaaS galeri foto wedding)
**Tanggal:** 2026-08-03
**Penulis:** Hermes (QA/Analyst)
**Status:** Menunggu eksekusi tim developer
**Prioritas:** TINGGI (miss-logika antar modul, storage limit tidak relevan dengan arsitektur live-stream)

---

## 1. Ringkasan Eksekutif

Arsitektur aplikasi **tidak menyimpan foto di server** — semua foto di-stream langsung dari Google Drive (OAuth Master, tanpa unduh ke disk server; "0 Bytes disk server"). Namun **logika lama berbasis-storage masih tersisa** di beberapa modul (DB, API, UI), menyebabkan:

1. Field **"Max Foto per Project"** & **"Batas Storage"** muncul di UI Edit Plan — padahal harus **Unlimited** karena tidak memakan storage server.
2. **Masa Simpan Galeri Klien** (`projectExpireDays`) di-force `99999` (permanen) oleh seed DB — tidak mengikuti masa aktif paket, sehingga galeri tidak pernah otomatis diarsipkan.
3. **Keputusan bisnis baru:** semua paket berlangganan **per 30 hari** (bulanan), tidak ada paket 180/365 hari.
4. Logika **arsip otomatis saat masa aktif habis** sudah ada sebagian (client-access check), tapi belum lengkap (belum ada auto-archive project + refresh-link setelah renewal).

---

## 2. Temuan Audit (Bukti di Kode & DB)

### 2.1 Tabel `plans` di DB — data saat ini

```sql
SELECT id, name, maxProjects, price, activePeriodDays, maxStorageMB, projectExpireDays, maxPhotosPerProject, allowCustomLogo FROM plans;

-- Hasil:
1|Starter Plan|5|49000|30|51200|99999|0|0
2|Pro Studio Plan|20|129000|180|51200|99999|0|1
3|Business Studio Plan|50|249000|365|51200|99999|0|1
```

**Masalah:**
- `maxStorageMB = 51200` (50 GB) — **tidak relevan**, aplikasi tidak menyimpan foto di server.
- `projectExpireDays = 99999` — **dipaksa permanen** oleh `lib/db.js:248` (`UPDATE plans SET projectExpireDays = 99999 WHERE projectExpireDays < 99999`), sehingga arsip otomatis tidak pernah aktif.
- `activePeriodDays` tidak seragam (30/180/365) — keputusan baru: **semua 30 hari**.

### 2.2 Skema & seed `lib/db.js`

| Baris | Isi | Status |
|-------|-----|--------|
| 44 | `maxStorageMB INTEGER DEFAULT 0` | Kolom usang, hapus |
| 45 | `projectExpireDays INTEGER DEFAULT 0` | Pertahankan, ubah perilaku |
| 46 | `maxPhotosPerProject INTEGER DEFAULT 0` | Kolom usang, hapus |
| 246–248 | Force `maxPhotosPerProject = 0` & `projectExpireDays = 99999` | **Miss-logika**: 99999 permanen → harus = `activePeriodDays` |
| 254–260 | Seed 3 plan: `51200` MB, `99999` hari, `180/365` hari | Update nilai |

### 2.3 Referensi `maxStorageMB` yang masih dipakai (harus dibersihkan)

| File | Baris | Fungsi |
|------|-------|--------|
| `app/api/plans/route.js` | 6 | SELECT kolom storage |
| `app/api/admin/plans/route.js` | 13, 31, 42–43 | SELECT/INSERT storage |
| `app/api/admin/plans/[planId]/route.js` | 14, 30–31 | UPDATE storage |
| `app/api/admin/analytics/route.js` | 32 | SELECT storage |
| `app/api/admin/upgrades/route.js` | 20 | SELECT storage |
| `app/api/projects/route.js` | 68–69, 87–102 | **Check kapasitas storage saat create project** — salah satu penyebab blokir project |
| `app/api/projects/[projectId]/retry/route.js` | 59–60 | Enforce `maxPhotosPerProject` — harus dihapus |
| `lib/auth.js` | 37–40, 59–66 | Join plan → vendor, hitung limit foto |
| `app/dashboard/page.js` | 822–832, 865 | **UI storage bar** + "∞ foto" |
| `app/dashboard/page.js` | 2147, 2153, 2239 | UI paket di halaman upgrade |
| `app/(auth)/register/page.js` | 102, 110–111, 425–426, 532–535 | UI paket di halaman registrasi |
| `app/admin/AdminDashboard.js` | 375–382, 411–418 | **State & submit modal Edit Plan** |
| `components/admin/AdminPlans.jsx` | 90–92 | **UI kartu paket** (menampilkan limit) |

### 2.4 Logika expiry yang SUDAH ADA (berfungsi sebagian)

| File | Baris | Perilaku |
|------|-------|----------|
| `app/api/projects/route.js` | 110 | Blokir create project jika masa aktif vendor habis |
| `app/api/projects/[projectId]/route.js` | 46–54 | **Blokir akses galeri klien** jika vendor expired (`new Date() > vendor.expiresAt`) |
| `app/api/projects/[projectId]/route.js` | 224–232 | Status `archived` + blokir akses |
| `app/dashboard/page.js` | 733 | Banner peringatan "Masa Aktif Paket Habis" |
| `app/dashboard/page.js` | 484–514 | Tombol arsip manual per project |

**Yang BELUM ada:**
- ⛔ **Auto-archive** project saat vendor expired (saat ini hanya akses galeri diblokir, status project belum diubah ke `archived`).
- ⛔ **Tombol "Aktifkan Kembali" / refresh link** setelah vendor renewal (harus manual re-pull URL).
- ⛔ **Notifikasi email/WA** H-7, H-3, H-0 (hanya banner di dashboard).
- ⛔ **Masa tenggang (grace period)**.

---

## 3. Keputusan Bisnis (yang disepakati)

| No | Keputusan | Nilai |
|----|-----------|-------|
| 1 | Semua paket **berlangganan per 30 hari** | `activePeriodDays = 30` |
| 2 | **Max Foto per Project = Unlimited** (tidak makan storage server) | `maxPhotosPerProject = 0` / hapus kolom |
| 3 | **Storage limit dihapus total** — karena live-stream dari Google Drive | Hapus `maxStorageMB` |
| 4 | **Masa Simpan Galeri = mengikuti masa aktif paket** | `projectExpireDays = activePeriodDays` (30 hari) |
| 5 | Jika masa aktif habis → galeri **nonaktif**, project **diarsipkan** | Status `archived` |
| 6 | Setelah vendor **renewal** → vendor **mengaktifkan kembali project** & **refresh link** galeri | Fitur baru |

---

## 4. Rencana Perbaikan (untuk tim developer)

### Fase 1 — Skema DB & Seed (`lib/db.js`)
- [ ] Hapus kolom `maxStorageMB` & `maxPhotosPerProject` dari tabel `plans` (migrasi: `ALTER TABLE plans DROP COLUMN ...`).
- [ ] Ubah seed: `projectExpireDays = activePeriodDays` (bukan 99999), semua plan `activePeriodDays = 30`.
- [ ] Hapus force-update `projectExpireDays = 99999` di baris 248.
- [ ] Hapus kolom `usedStorageBytes` di tabel `vendors` jika tidak ada logika lain yang memakainya (cek `payment_transactions`/analytics dulu).

### Fase 2 — API
- [ ] `app/api/projects/route.js`: hapus branch `planType === 'storage'` + check `maxStorageMB` (baris 98–102) dan kolom di SELECT.
- [ ] `app/api/projects/[projectId]/retry/route.js`: hapus enforce `maxPhotosPerProject` (baris 59–60).
- [ ] `app/api/admin/plans/route.js` & `[planId]/route.js`: hapus field `maxStorageMB`/`maxPhotosPerProject` dari SELECT/INSERT/UPDATE.
- [ ] `app/api/admin/analytics/route.js`, `app/api/admin/upgrades/route.js`, `app/api/plans/route.js`, `lib/auth.js`: hapus referensi storage.
- [ ] **Fitur baru**: endpoint `POST /api/projects/[id]/reactivate` — ubah status `archived → pending_selection` + `expiresAt = now + sisa masa aktif`, hanya jika vendor aktif.

### Fase 3 — UI
- [ ] `app/admin/AdminDashboard.js` (modal Edit Plan): hapus field "Max Foto per Project", "Batas Storage"; label "Masa Simpan Galeri" → **"Masa Simpan Galeri (mengikuti masa aktif paket, 30 hari)"**, readonly.
- [ ] `components/admin/AdminPlans.jsx`: kartu paket tampilkan "Foto Unlimited • Streaming" & "Galeri 30 Hari" — tanpa baris storage.
- [ ] `app/dashboard/page.js`: hapus storage bar (baris 822–832); ganti "∞ foto" statis; tambah tombol **"Aktifkan Kembali"** per project arsip + **"Refresh Link Galeri"**.
- [ ] `app/(auth)/register/page.js`: hapus teks "Storage Lega (hingga X GB)".

### Fase 4 — Alur Expiry-Renewal (fitur baru, prioritas sedang)
- [ ] Cron/init check: saat server start, set project vendor expired → `archived` (reuse pola stale-importing di `lib/db.js:233–240`).
- [ ] Setelah renewal disetujui admin (`subscription_requests` approved): otomatis set semua project vendor `archived → pending_selection` + perbarui `expiresAt`.
- [ ] Banner dashboard: daftar project yang perlu "refresh link" setelah renewal.
- [ ] (Opsional) Notifikasi H-7/H-3/H-0 via email/WA — butuh SMTP aktif (`smtp_enable` sudah ada di `saas_settings`).

---

## 5. Risiko & Catatan

- **Risiko migrasi DB:** `DROP COLUMN` didukung SQLite ≥ 3.35. Verifikasi versi SQLite server (`sqlite3 --version`) sebelum eksekusi. Alternatif aman: buat tabel baru + copy data.
- **Jangan** menghapus `projectExpireDays` — dipakai di `app/api/projects/route.js:244–254` untuk set `expiresAt` project.
- **Data existing:** 3 paket yang ada harus di-update nilainya (30 hari, tanpa storage), bukan cuma skema.
- `app/api/admin/upgrades/route.js:20` membaca `projectExpireDays as planExpireDays` untuk proration upgrade — sesuaikan perhitungan agar memakai `activePeriodDays`.

---

## 6. Kriteria Verifikasi (QA setelah perbaikan)

1. Admin buka **Kelola Paket** → semua plan tampil "30 hari", tanpa field storage, foto "Unlimited".
2. Create project dengan folder Drive besar → **tidak ada** error "Kapasitas penyimpanan penuh".
3. Vendor dengan `expiresAt` di masa lalu → akses galeri klien 403 "diarsipkan", dashboard tampil banner.
4. Simulasi renewal (approve `subscription_requests`) → project kembali aktif, link galeri bisa dibuka setelah refresh.
5. Registrasi vendor baru → halaman paket tidak menyebut storage.


---

## 7. Rekomendasi Lanjutan (Hasil Verifikasi Produksi)

Berikut rekomendasi yang ditemukan selama verifikasi end-to-end di server produksi (LXC 102) setelah implementasi perbaikan utama (commit `5966438`).

### 7.1 UI Admin & Dashboard Vendor
- [ ] **Tombol "Aktifkan Kembali"** di dashboard vendor (kartu project berstatus `archived`). Memanggil `POST /api/projects/[id]/reactivate`.
- [ ] **Tombol "Refresh Link Galeri"** — setelah reaktivasi, vendor perlu link galeri baru/aktif untuk dibagikan ke klien.
- [ ] **Indikator visual masa aktif** — badge "Aktif", "Kadaluarsa", "Diarsipkan" di setiap kartu project.
- [ ] **Bulk reaktivasi** — tombol "Aktifkan Semua Project" setelah vendor perpanjangan paket.

### 7.2 Notifikasi Otomatis (Email / WhatsApp)
- [ ] Cron job H-7, H-3, H-0 sebelum `expiresAt` vendor:
  - Template email: "Masa aktif paket Anda berakhir dalam X hari. Perpanjang sekarang untuk menjaga galeri klien tetap aktif."
  - Butuh `saas_settings.smtp_enable = true` (sudah ada di DB) + konfigurasi SMTP valid.
- [ ] Integrasi WhatsApp (opsional) via `saas_settings.contact_whatsapp` / provider WA Business API.

### 7.3 Migrasi Database (Maintenance Window)
- [ ] `ALTER TABLE plans DROP COLUMN maxStorageMB;` — kolom sudah bernilai 0, tidak dipakai.
- [ ] `ALTER TABLE plans DROP COLUMN maxPhotosPerProject;` — default 0 = unlimited, logic sudah di application layer.
- [ ] Pertahankan `projectExpireDays` — dipakai di `app/api/projects/route.js:244-254` untuk set `expiresAt` project.
- [ ] Backup DB sebelum migrasi; verifikasi SQLite version ≥ 3.35 untuk `DROP COLUMN` support.

### 7.4 Dokumentasi API
- [ ] Tambah endpoint `POST /api/projects/[projectId]/reactivate` ke dokumentasi vendor (Swagger/OpenAPI atau markdown di repo).
- [ ] Contoh request/response:
```json
POST /api/projects/123/reactivate
Authorization: Bearer <token>
Response 200:
{
  "success": true,
  "message": "Galeri foto \"Project Name\" berhasil diaktifkan kembali hingga 2026-09-02!",
  "expiresAt": "2026-09-02T15:30:00.000Z"
}
```

### 7.5 Uji Regresi End-to-End
- [ ] Login vendor → buat project → arsipkan project → perpanjang paket → klik "Aktifkan Kembali" → verifikasi galeri accessible.
- [ ] Test matrix:
  | Paket | Max Projects | Foto Unlimited | Galeri Expire |
  |-------|--------------|----------------|---------------|
  | Starter | 5 | Ya | 30 hari |
  | Pro | 20 | Ya | 30 hari |
  | Business | 50 | Ya | 30 hari |
- [ ] Negative case: vendor expired → coba create project (403) → coba reactivate (403) → perpanjang → coba lagi (200).

### 7.6 Monitoring & Observabilitas
- [ ] Log audit reaktivasi: siapa, kapan, project_id, status_before/after.
- [ ] Metrik: jumlah project archived vs active per hari (Grafana/Prometheus jika ada).

---

**Catatan:** Rekomendasi ini bersifat **penyempurnaan (enhancement)**, bukan blocker rilis. Prioritaskan UI tombol reaktivasi (7.1) agar vendor bisa self-service.
