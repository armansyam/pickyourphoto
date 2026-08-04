# 📋 04. Status Implementasi & Roadmap Fitur (Pick Your Photo)

> **Dokumen Status Pengembangan & Rencana Fitur SaaS**  
> Lokasi: `docs/04-IMPLEMENTATION-PLAN.md`  
> **Terakhir diperbarui:** 2026-08-05 — mencerminkan status fitur aktual yang sudah berjalan

---

## ✅ 1. Fitur yang Sudah Berjalan di Produksi

### Onboarding & Autentikasi Vendor
- [x] Registrasi vendor via form (nama, email, password, WA, pilih paket, upload bukti bayar)
- [x] Status `pending` setelah daftar — tidak bisa login sebelum Admin approve
- [x] Admin approve → vendor aktif, dapat login
- [x] Free Trial 1x per vendor — lock via DB setelah digunakan
- [x] Login vendor via cookie JWT (HTTP-Only)
- [x] Login Admin via cookie JWT terpisah
- [x] Halaman `/register` dengan multi-step form (pilih paket → upload bukti → konfirmasi)
- [x] Redirect WA Admin dengan template pesan otomatis setelah registrasi

### Google Drive Integration (Master OAuth)
- [x] Setup Google OAuth Master di Admin Panel (tombol "Hubungkan Google Drive")
- [x] Callback route `GET /api/admin/auth/google/callback` — simpan token ke `saas_settings`
- [x] `lib/google-master-drive.js` — `getMasterDriveClient()` dengan cache 45 menit
- [x] Auto-refresh token OAuth via event `tokens`
- [x] `fetchFolderFilesMasterOAuth()` — rekursif subfolder hingga 5 level
- [x] Filter otomatis: hanya file gambar (jpeg, png, webp, raw, heic, dll.)

### Manajemen Proyek Vendor
- [x] Buat proyek baru: nama, URL folder GDrive, max seleksi, nomor telepon klien, tema galeri
- [x] Import metadata background (queue FIFO, max 1 concurrent)
- [x] Status proyek: `importing` → `pending_selection` → `selection_done` → `archived`
- [x] Stale import cleanup saat server start (reset `importing` → `failed`)
- [x] Retry import proyek yang gagal
- [x] Arsip proyek manual oleh vendor
- [x] Reaktivasi proyek terarsip (`POST /api/projects/[projectId]/reactivate`)
- [x] Bulk reaktivasi semua proyek terarsip (`POST /api/projects/reactivate-all`)

### Proxy Gambar (Zero-Storage, Zero RAM)
- [x] `GET /api/proxy/thumb/[fileId]?sz=w400` — thumbnail
- [x] `GET /api/proxy/thumb/[fileId]/[filename]?sz=w1200` — full preview
- [x] **True Pipe Stream** (`response.body`) — tidak ada `arrayBuffer()`, RAM ~0
- [x] Fallback URL: `lh3.googleusercontent.com` → `drive.google.com/thumbnail`
- [x] Cache-Control agresif: 7 hari browser, 30 hari Cloudflare CDN
- [x] Validasi File ID via regex — cegah injection

### Galeri Klien
- [x] Akses via `accessKey` unik — tanpa login
- [x] Grid foto dengan lazy loading
- [x] Lightbox preview resolusi tinggi
- [x] Seleksi foto dengan batas `maxSelection`
- [x] Filter per kategori (subfolder Google Drive)
- [x] Multiple tema galeri
- [x] White-label logo studio (paket Pro & Business)
- [x] Halaman konfirmasi setelah seleksi selesai
- [x] Review panel: daftar foto terpilih sebelum submit

### Fitur Salin Nama File (Lightroom Ready)
- [x] Salin semua nama file terpilih dalam satu klik
- [x] Konfigurasi delimiter: `, ` | ` ` | `\n` | custom
- [x] Toggle include/exclude ekstensi file
- [x] Sorting: nama A-Z, Z-A, urutan pilih, terbalik
- [x] Preferensi tersimpan per-vendor di DB

### Trial Galeri (Landing Page Demo)
- [x] `/trial-gallery/[slug]` — galeri demo publik
- [x] Konfigurasi limit trial di Admin Panel (`saas_settings`)
- [x] Pembatasan: `trial_max_photos`, `trial_max_selection`, `trial_max_subfolders`
- [x] Durasi trial dikonfigurasi Admin

### Panel Admin
- [x] Dashboard: statistik vendor, proyek, request pending
- [x] Kelola vendor: detail, approve/reject, suspend/activate
- [x] Kelola paket: tambah/edit/hapus paket
- [x] Kelola subscription requests (upgrade & perpanjangan)
- [x] Pengaturan SaaS: bank, WA, email, Google OAuth
- [x] System settings: toggle registrasi/trial, kuota vendor, threshold disk
- [x] Manajemen backup database
- [x] Analytics pendapatan & aktivitas

### Subscription & Pembayaran
- [x] Vendor request upgrade/perpanjangan via form (pilih paket + upload bukti)
- [x] Admin approve → vendor `expiresAt` diperpanjang 30 hari
- [x] Notifikasi expiry di dashboard vendor (banner peringatan)
- [x] Blokir buat proyek baru jika vendor expired

---

## 🔄 2. Alur Onboarding Vendor (Aktual)

```
/register
    │
    ├── Isi form: nama, email, password, WA
    │
    ├── Pilih paket (Starter / Pro Studio / Business Studio)
    │
    ├── Upload bukti transfer ATAU pilih Free Trial
    │
    ├── Submit → status vendor = 'pending'
    │
    ├── Redirect WA Admin dengan template pesan
    │
Admin Panel
    │
    └── Admin review → Klik "Setujui" → status = 'active', expiresAt = +30 hari
                                      → vendor bisa login ke /dashboard
```

---

## 🛣️ 3. Roadmap Fitur (Belum Diimplementasi)

### Prioritas Tinggi
- [ ] **Notifikasi email otomatis** H-7, H-3, H-0 sebelum `expiresAt` vendor (SMTP sudah siap di `saas_settings`)
- [ ] **Auto-archive project** saat vendor expired (saat ini hanya akses diblokir, status belum diubah ke `archived`)
- [ ] **Tombol "Aktifkan Kembali"** di kartu proyek berstatus `archived` pada dashboard vendor
- [ ] **Tombol "Refresh Link Galeri"** setelah reaktivasi proyek
- [ ] **Badge status visual** ("Aktif", "Kadaluarsa", "Diarsipkan") di kartu proyek dashboard vendor

### Prioritas Sedang
- [ ] **Notifikasi WhatsApp** via WA Business API (opsional, `contact_whatsapp` sudah tersedia)
- [ ] **Watermark on-the-fly** menggunakan `sharp` pada gambar sebelum dikirim ke klien yang belum bayar
- [ ] **Log audit reaktivasi** (siapa, kapan, project_id, status sebelum/sesudah)
- [ ] **Halaman status impor real-time** (SSE/WebSocket untuk notif import selesai)

### Prioritas Rendah (Enhancement)
- [ ] **Metrik monitoring** jumlah project archived vs active per hari
- [ ] **Swagger/OpenAPI** dokumentasi API lengkap
- [ ] **Bulk action** vendor di Admin Panel
- [ ] **Export data seleksi** per proyek (CSV)

---

## 🧪 4. Kriteria Verifikasi QA

| Skenario | Expected Result |
|---|---|
| Admin buka Kelola Paket | Tampil 3 paket, semua "30 hari", foto "Unlimited" |
| Vendor buat proyek + import folder besar | Tidak ada error kapasitas, import berhasil |
| Vendor expired → buat proyek | 403 "masa aktif berakhir" |
| Klien buka galeri expired | 403 "galeri diarsipkan/tidak aktif" |
| Renewal approved → reaktivasi proyek | Status `archived` → `pending_selection`, galeri bisa dibuka |
| Import file ID besar di proxy | RAM server tidak naik signifikan (pipe stream) |
| Registrasi Free Trial ke-2 | Diblokir sistem (1x only) |
