# 📘 01. Spesifikasi Sistem, Visi & Arsitektur (Pick Your Photo)

> **Dokumen Resmi Spesifikasi Platform SaaS Pick Your Photo**  
> Lokasi: `docs/01-SYSTEM-SPECIFICATION.md`  
> **Terakhir diperbarui:** 2026-08-05 — berdasarkan pembacaan menyeluruh seluruh kode produksi

---

## 🎯 1. Visi & Misi

### Visi
Menjadi platform SaaS nomor satu bagi fotografer profesional untuk berkolaborasi dengan klien dalam memilih foto terbaik secara instan, aman, dan elegan — sekaligus meningkatkan nilai profesionalisme brand mereka di mata klien.

### Misi
1. **Menghilangkan Kerumitan Manual:** Mengotomatisasi proses seleksi foto yang sebelumnya dilakukan via WhatsApp/spreadsheet.
2. **Zero-Storage Architecture:** Import metadata langsung dari Google Drive tanpa menyimpan byte foto di disk server.
3. **Keamanan & Privasi:** Galeri klien diproteksi access key unik; URL Google CDN tidak pernah terekspos ke browser.
4. **Skalabilitas:** Pengelolaan banyak proyek dengan antrian import, Cloudflare CDN caching, dan True Pipe Stream.

---

## 👥 2. Segmentasi Pengguna

| Peran | Akses | Deskripsi |
|---|---|---|
| **Superadmin** | `/admin` | Pemilik SaaS — kelola vendor, paket, pembayaran, setting sistem |
| **Vendor (Fotografer)** | `/dashboard` | Pelanggan aktif — buat galeri, import GDrive, bagikan ke klien |
| **Klien** | `/gallery/[id]?key=xxx` | Penerima galeri — pilih foto, tidak perlu daftar akun |
| **Pengunjung Trial** | `/trial-gallery/[slug]` | Demo galeri publik dari landing page, tanpa akun |

---

## ⚡ 3. Fitur Utama (Core Features)

### 3.1. Sistem Langganan SaaS (Multi-Tier Subscription)

**3 Paket Aktif (semua 30 hari, foto unlimited):**

| Paket | Maks. Proyek | Harga/Bulan | Custom Logo | RAW Selector |
|---|---|---|---|---|
| **Starter Plan** | 5 | Rp 49.000 | ❌ | ❌ |
| **Pro Studio Plan** | 20 | Rp 129.000 | ✅ | ❌ |
| **Business Studio Plan** | 50 | Rp 249.000 | ✅ | ✅ |

**Vendor Status Lifecycle:**
```
draft_plan → pending_payment (QRIS) → active
           → pending_manual (transfer) → active (Admin approve)
expired_draft / cancelled / suspended
expired (otomatis via autoCheckVendorSubscriptionExpiry)
```

**Aturan Registrasi:**
- Rate limit: 5 percobaan / 60 detik per IP
- Duplikat email: jika status bukan `active` → data diupdate (re-register)
- Duplikat WA: blokir jika WA sudah terdaftar di akun `active` atau `pending_payment`
- Harga = 0 diblokir dari registrasi (trial hanya via landing page)
- Quota vendor: `max_vendor_quota` di `system_settings` (NULL = unlimited)
- Registrasi bisa ditutup: `enable_registration = 0`

**Proration Upgrade:**
- Upgrade ke paket lebih tinggi → harga dikurangi sisa nilai paket saat ini
- Faktor diskon: 100% (top tier), 85% (dipakai ≤7 hari), 70% (standar)
- Perpanjangan paket sama: hanya bisa H-10 sebelum expired
- Renewal yang disetujui Admin → `expiresAt` akumulatif (tambah dari tanggal expired sebelumnya jika belum lewat)

**Auto-Expire (lib/vendor-status.js):**
- `autoCheckVendorSubscriptionExpiry()` dipanggil tiap login/request auth
- Vendor `active` yang `expiresAt < now` → status `expired`
- Project aktif vendor expired → status `archived`

### 3.2. Google Drive Importer (Zero-Storage, Master OAuth)

**Metode:** Google OAuth 2.0 Master — satu akun Google "Studio Master" Admin SaaS.

**Alur Import Background:**
1. Vendor paste URL folder GDrive → `parseFolderId()` ekstrak ID
2. Project dibuat dengan status `importing`, client record dibuat
3. `processImagesInBackground()` → `addToImportQueue()` (FIFO, max 1 concurrent)
4. `runImportTask()` → `fetchFolderFilesMasterOAuth(folderId, category, depth)`:
   - Rekursif hingga **depth 5** (subfolder bertingkat)
   - Filter file: `image/*` MIME type + ekstensi RAW (`.cr2`, `.cr3`, `.arw`, `.nef`, `.dng`, `.raw`, `.heic`, dll.)
   - Pagination: `pageSize=200` per request
5. Metadata disimpan ke `photos`: `originalPath` = `/api/proxy/thumb/{id}/{name}?sz=w1200`, `thumbnailPath` = `?sz=w400`
6. Project status → `pending_selection` (sukses) / `failed` (error)
7. Saat server restart: project stuck di `importing` → otomatis direset ke `failed`

**Error handling OAuth:**
- 404 → "Folder tidak ditemukan"
- 403 → "Akses ditolak, folder harus publik"
- 401 → "OAuth kadaluarsa, hubungkan ulang di Admin Panel"

**GDrive client caching:** `getMasterDriveClient()` cache 45 menit dalam memory (`cachedDriveClient`). Token baru otomatis disimpan ke `saas_settings` via event `tokens`.

### 3.3. Proxy Gambar — True Pipe Stream (Zero RAM)

**Route:** `GET /api/proxy/thumb/[fileId]?sz={size}` dan `/api/proxy/thumb/[fileId]/[filename]?sz={size}`

**Implementasi:**
- Source URL: `https://lh3.googleusercontent.com/d/{fileId}={sz}` (primer)
- Fallback: `https://drive.google.com/thumbnail?id={fileId}&sz={sz}`
- Response body: `ReadableStream` (`response.body`) langsung ke client — **tidak ada `arrayBuffer()`**
- RAM server: ~0 MB per gambar (streaming pipe)
- URL Google tidak pernah terekspos ke browser client

**Cache headers:**
```
Cache-Control: public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400
CDN-Cache-Control: public, max-age=2592000
Cloudflare-CDN-Cache-Control: public, max-age=2592000
X-Proxy-Source: drive-pipe
```

**Validasi:** File ID divalidasi regex `/^[a-zA-Z0-9_-]{10,}$/` sebelum diproses.

### 3.4. Galeri Klien (Client Selection Portal)

- **Akses:** Via `accessKey` (32 hex random) di URL — tanpa login
- **Blokir akses klien jika:** project `archived` ATAU vendor `expiresAt < now`
- **Foto:** Semua foto proyek ditampilkan + tanda `isSelected` per klien
- **Seleksi:** `POST /api/projects/[id]/select?key=xxx` — atomic transaction SQLite
  - Validasi: `maxSelection` limit, project tidak expired, semua `photoId` milik project
  - Clear seleksi lama → insert seleksi baru → update status project → `completed`
- **Branding:** `brandName`, `brandLogo` dari vendor (tampil jika `allowCustomLogo = 1`)
- **Tema galeri:** Kolom `galleryTheme` di `projects` table

### 3.5. Trial Galeri Publik (Landing Page Demo)

**Route:** `POST /api/trial/create` → buat trial gallery  
**Route:** `GET /trial-gallery/[slug]` → tampil trial gallery  

**Alur:**
1. Pengunjung input URL GDrive + judul di landing page
2. Server panggil `fetchFolderFiles()` (bukan Master OAuth — endpoint publik)
3. File dikelompokkan per subfolder/kategori
4. **Tab terbuka** (jumlah = `trial_max_subfolders`): foto asli hingga `trial_max_photos` per tab
5. **Tab terkunci** (sisanya): entry marker `{ _isLocked: true, _count: N }` — tanpa file ID asli
6. Disimpan ke `trial_galleries` table, dengan `expiresAt = now + trial_expiration_minutes`
7. Logo studio bisa diupload (base64, maks 2MB encoded)
8. Slug unik: `{judul-slug}-{4-hex-random}`

**Batasan dikonfigurasi Admin (`saas_settings`):**
- `trial_max_photos` — maks. foto per tab terbuka (default: 50)
- `trial_max_selection` — maks. foto bisa dipilih (default: 10)
- `trial_max_subfolders` — maks. tab terbuka (default: 1)
- `trial_expiration_minutes` — durasi trial (default: dari `system_settings`)

### 3.6. RAW Selector (Sortir File RAW Lokal)

**Arsitektur: 100% client-side, 0 upload ke server.**

- **Hook:** `hooks/useRawSorter.js` — engine scan + match + copy/move via **File System Access API**
- **Komponen:** `components/RawSorterDrawer.jsx` — drawer slide-in dengan log terminal & progress bar
- **API:** `GET /api/projects/[id]/selected-files` → array nama file terpilih klien

**Akses per paket:**
- Starter: ❌ Tombol terkunci (upgrade prompt)
- Pro & Business: ✅ Penuh
- Trial: ✅ Terbatas (`raw_sorter_trial_limit` file pertama saja)

**Logika pencocokan:** Strip ekstensi dari nama file galeri → match case-insensitive dengan file di folder lokal → copy/move RAW ke folder tujuan.

**Browser support:** Chrome 86+ / Edge 86+ saja (File System Access API).

### 3.7. Payment Gateway QRIS

**Arsitektur:** Multi-provider dispatcher terpusat di `lib/payment-gateway/index.js`.

| Provider | Driver |
|---|---|
| **Midtrans** (default) | Snap API + Core API status check |
| **Xendit** | Invoice API |
| **Tripay** | Channel API |
| **Duitku** | Payment API |

**Alur pembayaran:**
1. `POST /api/payment/create` → buat transaksi, simpan ke `payment_transactions` + `payment_sessions`
2. Vendor status → `pending_payment`
3. UI polling `GET /api/payment/status` setiap 3-5 detik
4. Payment gateway kirim webhook ke `POST /api/payment/notification`
5. Verifikasi signature (SHA512 untuk Midtrans) → aktivasi vendor otomatis
6. `GET /api/payment/status` mendeteksi `paid` → set cookie JWT → redirect `/dashboard`

**Auto-cleanup (setInterval 60 detik di `lib/db.js`):**
- Session `pending` yang `expiresAt < now` → status `expired`
- Vendor `pending_payment` tanpa session `paid/pending` → `expired_draft`
- `draft_plan` leads lebih dari 48 jam → dihapus otomatis

**Rate limit `/api/payment/create`:** 5 request / 60 detik per IP.

### 3.8. Panel Superadmin

**Tab-tab di Admin Panel:**
- **Dashboard/Analytics:** MRR, ARR, vendor aktif/pending/expired, proyek, seleksi, trend 6-bulan, trial stats, top vendor by photos
- **Kelola Vendor:** List semua vendor + auto-sync status Midtrans untuk `pending_payment`, approve/suspend/detail
- **Kelola Paket:** CRUD paket (nama, harga, maks. proyek, `allowCustomLogo`, `allowRawSelector`)
- **Kelola Upgrade:** Approve/reject `subscription_requests`, lihat bukti transfer, ringkasan pending total
- **Pengaturan:** Bank, WA, email, Google OAuth Master connect, SMTP, payment gateway config
- **System Settings:** Toggle registrasi, toggle trial, kuota vendor, threshold disk, auto backup
- **Trial Control:** Preset konfigurasi trial (Relaxed/Standard/Aggressive/Ultra/Disabled)

**Auto-backup (triggered dari analytics route):**
- Jika `enable_auto_backup = 1` dan interval elapsed → jalankan `bash scripts/backup-db.sh` dan `bash scripts/backup-photos.sh`

---

## 🔄 4. Lifecycle Status Lengkap

### Vendor Status
```
draft_plan (pilih paket di form) 
    ├── pending_payment (QRIS) ──→ active (webhook paid)
    │                          ──→ expired_draft (QRIS timeout/cancel)
    │                          ──→ cancelled (dibatalkan)
    ├── pending_manual (transfer) ──→ active (Admin approve)
    └── [setelah aktif]
           active ──→ expired (autoCheckVendorSubscriptionExpiry)
           active ──→ suspended (Admin suspend manual)
```

### Project Status
```
importing ──→ pending_selection ──→ selection_done (alias completed)
                                ──→ archived (vendor expired / manual)
failed (import GDrive gagal → bisa retry)
```

### Payment Session Status
```
pending ──→ paid (webhook/polling)
        ──→ expired (auto-cleanup 60s / Midtrans status expire)
        ──→ cancelled (user cancel)
        ──→ replaced (sesi lama saat vendor re-register)
```

---

## 🔧 5. Stack Teknologi

| Layer | Teknologi | Versi |
|---|---|---|
| **Framework** | Next.js (App Router) | 14.2.3 |
| **Runtime** | Node.js | v18/v20 LTS |
| **Database** | SQLite via `better-sqlite3` | 11.x |
| **Auth** | JWT via `jsonwebtoken` | 9.x |
| **Google API** | `googleapis` (Drive API v3) | 140.x |
| **Password** | `bcryptjs` | 3.x |
| **Email** | `nodemailer` (SMTP) | 9.x |
| **Process Manager** | PM2 | — |
| **Container** | Docker + docker-compose | — |
| **CDN** | Cloudflare (cache 30 hari) | — |
| **Payment Gateway** | Midtrans Snap + Core API | — |

---

## 💎 6. Nilai Jual Utama (USP)

| USP | Detail Teknis |
|---|---|
| **Zero-Storage** | 0 byte foto di server — hanya metadata di SQLite |
| **Master OAuth** | Satu akun Google untuk semua vendor |
| **True Pipe Stream** | RAM ~0 saat ribuan foto concurrent |
| **Lightroom Ready** | Salin nama file → filter langsung di Lightroom |
| **RAW Selector** | Match & pindah file RAW lokal tanpa upload ke server |
| **QRIS Otomatis** | Aktivasi vendor instan via payment webhook |
| **White-Label** | Logo studio di halaman galeri klien (Pro/Business) |
