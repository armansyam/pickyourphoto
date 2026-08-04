# 📘 01. Spesifikasi Sistem, Visi & Arsitektur (Pick Your Photo)

> **Dokumen Resmi Spesifikasi Platform SaaS Pick Your Photo**  
> Lokasi: `docs/01-SYSTEM-SPECIFICATION.md`  
> **Terakhir diperbarui:** 2026-08-05 — disesuaikan dengan kode produksi aktual

---

## 🎯 1. Visi & Misi

### Visi
Menjadi platform SaaS (Software as a Service) nomor satu bagi fotografer profesional untuk berkolaborasi dengan klien dalam memilih foto terbaik secara instan, aman, dan elegan, sekaligus meningkatkan nilai profesionalisme brand mereka di mata klien.

### Misi
1. **Menghilangkan Kerumitan Manual:** Mengeliminasi proses manual pemilihan foto melalui chat WhatsApp atau spreadsheet yang melelahkan dan memakan waktu berjam-jam.
2. **Arsitektur Zero-Storage Kilat:** Menyediakan fitur impor metadata langsung dari Google Drive melalui **Master OAuth 2.0** tanpa menyimpan berkas fisik foto di disk server (0 byte storage overhead).
3. **Keamanan & Privasi:** Memberikan keamanan galeri klien dengan proteksi kunci akses unik (*Access Key*) sehingga privasi foto klien tetap terjaga.
4. **Skalabilitas Bisnis Fotografer:** Membantu fotografer mengelola banyak proyek foto secara rapi dengan otomatisasi masa berlaku galeri 30 hari per siklus berlangganan.

---

## 👥 2. Segmentasi Pengguna (Target Audiens)
1. **Wedding & Event Photographer:** Fotografer pernikahan/acara yang menghasilkan ribuan foto sekali jepret dan membutuhkan klien memilih beberapa puluh foto terbaik untuk diedit/dicetak.
2. **Studio & Portrait Photographer:** Fotografer studio/keluarga/wisuda yang membutuhkan seleksi foto cepat untuk proses cetak album.
3. **Product & Commercial Photographer:** Fotografer produk yang bekerja sama dengan brand/klien korporasi untuk memilih aset foto yang disetujui.

---

## ⚡ 3. Fitur Utama Platform (Core Features)

### 1. Sistem Keanggotaan Fotografer (SaaS Multi-Tier Subscription)

**3 Paket Aktif (semua berlangganan 30 hari):**

| Paket | Maks. Proyek | Harga/Bulan | Custom Logo | RAW Selector |
|---|---|---|---|---|
| **Starter Plan** | 5 proyek | Rp 49.000 | ❌ | ❌ |
| **Pro Studio Plan** | 20 proyek | Rp 129.000 | ✅ | ✅ |
| **Business Studio Plan** | 50 proyek | Rp 249.000 | ✅ | ✅ |

> **Catatan Penting:** Semua paket menggunakan tipe `limit` (bukan storage-based). Foto **unlimited** per proyek karena tidak ada file yang disimpan di server. Batas Storage (`maxStorageMB`) = 0 (tidak relevan).

- **Registrasi:** Vendor mendaftar via form, upload bukti transfer, tunggu approval Admin.
- **Trial Gratis (1x):** Vendor trial mendapat akses terbatas (maks. 10 seleksi, 50 foto, 1 subfolder, durasi dikonfigurasi Admin).
- **Perpanjangan:** Via form `subscription_requests` — Admin approve → masa aktif vendor diperpanjang 30 hari.
- **Upgrade Paket:** Vendor bisa request upgrade paket antar tier, Admin approve di panel.

### 2. Google Drive Importer (Zero-Storage Architecture — Master OAuth)

- **Metode Autentikasi:** **Google OAuth 2.0 Master** — satu akun Google "Studio Master" milik Admin SaaS yang tersimpan di `saas_settings` (bukan OAuth per-vendor).
- **Alur Import:**
  1. Vendor paste URL folder Google Drive di form buat proyek.
  2. Server memanggil `fetchFolderFilesMasterOAuth()` via `googleapis` (Drive API v3).
  3. API mendapatkan daftar file (ID, nama, mimeType) — termasuk subfolder rekursif hingga 5 level.
  4. Hanya metadata yang disimpan ke DB SQLite: `thumbnailPath = /api/proxy/thumb/{fileId}/{name}?sz=w400`.
  5. Tidak ada byte foto yang tersimpan di disk server.
- **Background Processing:** Import berjalan di background (un-awaited), project status = `importing` → `pending_selection` (sukses) atau `failed` (error).
- **Concurrency Queue:** Maksimal 1 import berjalan bersamaan (queue FIFO in-memory).

### 3. Proxy Gambar (True Pipe Stream — Zero RAM Buffering)

- **Route:** `GET /api/proxy/thumb/[fileId]?sz=w400`
- **Metode:** Server meneruskan response dari Google CDN (`lh3.googleusercontent.com`) langsung ke browser menggunakan `ReadableStream` (`response.body`) — **tanpa `arrayBuffer()`**.
- **Keunggulan:**
  - RAM server ~0 per request (tidak ada buffering gambar di memori)
  - TTFB cepat (byte pertama langsung dikirim saat koneksi Google CDN terbuka)
  - URL Google **tidak terekspos** ke browser client (domain tetap `pickyourphoto.com`)
  - Cloudflare cache 30 hari (`s-maxage=2592000`) — request berulang tidak menyentuh server

### 4. Galeri Klien Interaktif & Aman (Client Selection Portal)

- **Akses Tanpa Login:** Klien membuka link galeri via `accessKey` unik (32 hex char) di URL — tidak perlu daftar akun.
- **Galeri Tema:** Vendor dapat memilih tema galeri (`galleryTheme`) saat buat proyek.
- **Batas Seleksi:** Fotografer menentukan `maxSelection` (maks. foto boleh dipilih).
- **Lightbox Preview:** Klik foto → tampil preview resolusi tinggi (`?sz=w1200`).
- **Fitur Satu Klik Salin Nama File (Lightroom Ready):** Setelah seleksi selesai, vendor menyalin daftar nama file dengan format delimiter yang bisa dikonfigurasi (`, ` default), dengan/tanpa ekstensi file, dengan urutan sorting pilihan.
- **RAW Selector:** Pada paket Pro & Business — vendor dapat mengaktifkan tampilan file RAW (`.cr2`, `.arw`, `.dng`, dll.) di galeri.

### 5. Trial Galeri Publik (Landing Page Demo)

- **Route:** `/trial-gallery/[slug]` — demo galeri untuk pengunjung landing page.
- **Batas Trial:** Dikonfigurasi di `saas_settings`: `trial_max_selection`, `trial_max_photos`, `trial_max_subfolders`.
- **Durasi:** `trial_expiration_hours` atau `trial_expiration_minutes` (dikonfigurasi Admin).
- **Pembatasan:** Hanya bisa dipakai **1x** per vendor (lock di DB).

### 6. Panel Superadmin

- **Kelola Vendor:** Approve/reject/suspend vendor, lihat detail paket & masa aktif.
- **Kelola Paket:** Edit nama, harga, maks. proyek, masa aktif paket.
- **Kelola Subscription Requests:** Approve/reject request upgrade & perpanjangan.
- **Pengaturan SaaS:** Bank transfer, nomor WA, email, koneksi Google OAuth Master, SMTP email.
- **Sistem Settings:** Toggle registrasi, toggle trial, maks. kuota vendor, threshold disk.
- **Analytics:** Statistik pendapatan, vendor aktif, project, foto, request pending.

---

## 🔄 4. Cara Kerja Sistem (User Journey Flow)

```
Fotografer (Vendor)                    Server                     Google
       │                                  │                           │
       │── Daftar + Upload Bukti Bayar ──>│                           │
       │                                  │── Admin Approve ─────────>│
       │<─── Akun Aktif (30 hari) ────────│                           │
       │                                  │                           │
       │── Buat Proyek + URL Folder GDrive│                           │
       │                                  │──── Drive API OAuth ─────>│
       │                                  │<─── Daftar File ID ───────│
       │                                  │── Simpan ke SQLite (0 byte)
       │<─── "Import Berhasil!" ──────────│                           │
       │                                  │                           │
       │── Kirim Link Galeri ke Klien     │                           │
       │                                  │                           │
Klien Galeri                              │                           │
       │── Buka /gallery/[id]?key=xxx ───>│                           │
       │<─── HTML Galeri ────────────────│                           │
       │── Minta Thumbnail <img> ─────────>│                           │
       │                                  │── Pipe Stream ──────────>│
       │<─── Gambar di-stream ─────────────│<── lh3.google CDN ───────│
       │                                  │                           │
       │── Pilih Foto + Klik Selesai ─────>│                           │
       │                                  │── Simpan Seleksi ke DB   │
       │<─── Konfirmasi Seleksi ───────────│                           │
Fotografer                                │                           │
       │── Buka Dashboard + Salin Nama ──>│                           │
       │<─── Daftar Nama File (CSV-ready) ─│                           │
```

---

## 💎 5. Nilai Jual Utama (USP)

- **Zero-Storage Architecture:** 0 byte file foto di server — tidak pernah ada disk full karena foto.
- **Master OAuth Terpusat:** Satu akun Google Master untuk semua vendor — vendor tidak perlu setup OAuth sendiri.
- **True Pipe Stream Proxy:** RAM server mendekati 0 saat melayani ribuan foto concurrent — tidak ada `arrayBuffer()`.
- **Lightroom Ready:** Vendor cukup salin nama file hasil seleksi klien → filter langsung di Adobe Lightroom.
- **Galeri Bertema:** Multiple tema galeri yang bisa dipilih vendor per proyek.
- **White-Label Branding:** Paket Pro & Business mendukung logo studio di halaman galeri klien.

---

## 🔧 6. Stack Teknologi

| Layer | Teknologi |
|---|---|
| **Framework** | Next.js 14.2.3 (App Router) |
| **Runtime** | Node.js v18/v20 LTS |
| **Database** | SQLite via `better-sqlite3` |
| **Auth** | JWT (`jsonwebtoken`) + HTTP-Only Cookie |
| **Google API** | `googleapis` v140 — Drive API v3 |
| **Password** | `bcryptjs` |
| **Email** | `nodemailer` (SMTP via `saas_settings`) |
| **Process Manager** | PM2 |
| **Containerisasi** | Docker + docker-compose |
| **CDN/Proxy** | Cloudflare (cache header agresif 30 hari) |
