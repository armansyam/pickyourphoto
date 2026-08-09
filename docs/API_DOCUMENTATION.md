# 📚 API Documentation — Pick Your Photo

> **Dokumentasi Resmi API Endpoint Platform SaaS Pick Your Photo**  
> Lokasi: `docs/API_DOCUMENTATION.md`  
> **Terakhir diperbarui:** 2026-08-09 — disesuaikan dengan audit forensik & perbaikan 9 bug Payment Gateway & Storage Add-On

---

## 🔐 Autentikasi & Keamanan

Seluruh endpoint **vendor** memerlukan cookie JWT `token` yang valid (diperoleh setelah login).  
Seluruh endpoint **admin** memerlukan cookie JWT `token` dengan role `admin` yang valid.  
Endpoint **klien galeri** menggunakan query param `key=[accessKey]`.  
Endpoint **payment status** (`/api/payment/status`) dilindungi dengan verifikasi token pengguna aktif ATAU kecocokan `vendorId` transaksi internal untuk mencegah eksploitasi unauthenticated request.

---

## 📁 Daftar Endpoint

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| `POST` | `/api/auth/login` | — | Login vendor/admin |
| `POST` | `/api/auth/logout` | — | Logout (hapus cookie) |
| `POST` | `/api/register` | — | Registrasi vendor baru |
| `GET` | `/api/projects` | Vendor | List semua proyek vendor |
| `POST` | `/api/projects` | Vendor | Buat proyek baru + import GDrive |
| `GET` | `/api/projects/[projectId]` | Client Key | Data galeri klien |
| `PUT` | `/api/projects/[projectId]` | Vendor | Update proyek |
| `DELETE` | `/api/projects/[projectId]` | Vendor | Hapus proyek |
| `POST` | `/api/projects/[projectId]/reactivate` | Vendor | Reaktivasi proyek terarsip |
| `POST` | `/api/projects/reactivate-all` | Vendor | Bulk reaktivasi semua proyek arsip |
| `GET` | `/api/proxy/thumb/[fileId]` | — | Stream thumbnail gambar |
| `GET` | `/api/proxy/thumb/[fileId]/[filename]` | — | Stream gambar (dengan nama file) |
| `GET` | `/api/plans` | — | List paket berlangganan publik |
| `GET` | `/api/vendor/profile` | Vendor | Profil vendor + pengaturan salin |
| `PUT` | `/api/vendor/profile` | Vendor | Update preferensi salin nama file |
| `POST` | `/api/vendor/upgrade` | Vendor | Request upgrade/perpanjangan paket |
| `GET` | `/api/settings` | Vendor | Pengaturan SaaS publik (bank, WA) |
| `POST` | `/api/trial` | — | Buat sesi trial galeri |
| `GET` | `/api/admin/*` | Admin | Semua endpoint admin panel |

---

## 🖼️ Proxy Gambar — Zero Storage Stream

### Thumbnail Foto

```
GET /api/proxy/thumb/{fileId}?sz={size}
GET /api/proxy/thumb/{fileId}/{filename}?sz={size}
```

**Parameter:**
- `fileId` — Google Drive File ID (regex: `/^[a-zA-Z0-9_-]{10,}$/`)
- `sz` — ukuran gambar (default: `w400`). Contoh: `w200`, `w400`, `w800`, `w1200`
- `filename` — nama file (opsional, hanya untuk route wrapper)

**Response sukses (200):**
```
Content-Type: image/jpeg (atau image/webp)
Cache-Control: public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400
CDN-Cache-Control: public, max-age=2592000
Cloudflare-CDN-Cache-Control: public, max-age=2592000
X-Proxy-Source: drive-pipe
[body: ReadableStream — pipe langsung dari Google CDN]
```

**Implementasi:** True Pipe Stream (`response.body`) — tanpa `arrayBuffer()`, RAM ~0 per request.  
**Sumber gambar:** `lh3.googleusercontent.com/d/{fileId}={sz}` (primer) atau `drive.google.com/thumbnail?id={fileId}&sz={sz}` (fallback).

---

## 📂 Proyek (Vendor)

### GET /api/projects — List Proyek Vendor

```
GET /api/projects
Authorization: Cookie token=[jwt]
```

**Response (200):**
```json
{
  "projects": [
    {
      "id": 1,
      "name": "Wedding Anindya & Budi",
      "slug": "wedding-anindya-budi",
      "status": "pending_selection",
      "maxSelection": 50,
      "expiresAt": "2026-09-04T10:00:00.000Z",
      "folderUrl": "https://drive.google.com/drive/folders/xxx",
      "galleryTheme": "default",
      "totalPhotos": 312,
      "selectedPhotosCount": 0,
      "clientAccessKey": "a1b2c3d4...",
      "clientPhone": "081234567890",
      "isProjectExpired": false,
      "createdAt": "2026-08-05T07:00:00.000Z"
    }
  ],
  "vendor": {
    "id": 1,
    "name": "Studio Amsyar",
    "email": "vendor@example.com",
    "planName": "Pro Studio Plan",
    "maxProjects": 20,
    "expiresAt": "2026-09-04T10:00:00.000Z",
    "isExpired": false,
    "brandName": "Studio Amsyar Photography",
    "brandLogo": "/vendor_logos/logo.png",
    "allowCustomLogo": 1,
    "allowRawSelector": 1,
    "copyDelimiter": ", ",
    "copyIncludeExt": 0,
    "copySortOrder": "name_asc"
  }
}
```

---

### POST /api/projects — Buat Proyek Baru

```
POST /api/projects
Authorization: Cookie token=[jwt]
Content-Type: application/json
```

**Request body:**
```json
{
  "name": "Wedding Anindya & Budi",
  "folderUrl": "https://drive.google.com/drive/folders/1BxK9abc123",
  "maxSelection": 50,
  "galleryTheme": "default",
  "clientPhone": "081234567890"
}
```

**Response sukses (201):**
```json
{
  "message": "Project berhasil dibuat! Foto-foto sedang diimpor di background.",
  "projectId": 42,
  "slug": "wedding-anindya-budi"
}
```

**Response error (403 — limit project):**
```json
{
  "message": "Batas jumlah project tercapai. Anda telah menggunakan 5 dari 5 project yang diperbolehkan. Silakan upgrade paket Anda."
}
```

**Response error (403 — expired):**
```json
{
  "message": "Masa aktif langganan Anda telah berakhir pada 04/08/2026. Silakan hubungi administrator untuk melakukan perpanjangan."
}
```

---

## 🔄 Reaktivasi Proyek

### POST /api/projects/[projectId]/reactivate

Mengaktifkan kembali 1 proyek terarsip.

```
POST /api/projects/42/reactivate
Authorization: Cookie token=[jwt]
```

**Response sukses (200):**
```json
{
  "success": true,
  "message": "Galeri foto \"Wedding Anindya & Budi\" berhasil diaktifkan kembali hingga 04/09/2026!",
  "expiresAt": "2026-09-04T10:00:00.000Z"
}
```

**Response error (403 — vendor expired):**
```json
{
  "message": "Masa aktif langganan Anda telah berakhir. Harap perpanjang paket berlangganan terlebih dahulu untuk mengaktifkan kembali galeri ini."
}
```

---

### POST /api/projects/reactivate-all

Bulk reaktivasi semua proyek terarsip milik vendor.

```
POST /api/projects/reactivate-all
Authorization: Cookie token=[jwt]
```

**Response sukses (200):**
```json
{
  "success": true,
  "message": "Berhasil mengaktifkan kembali 3 galeri terarsip hingga 04/09/2026!",
  "count": 3,
  "expiresAt": "2026-09-04T10:00:00.000Z"
}
```

---

## 🎨 Galeri Klien

### GET /api/projects/[projectId]?key=[accessKey]

Mengambil data galeri untuk client.

```
GET /api/projects/42?key=a1b2c3d4e5f6...
```

**Response sukses (200):**
```json
{
  "project": {
    "id": 42,
    "name": "Wedding Anindya & Budi",
    "status": "pending_selection",
    "maxSelection": 50,
    "galleryTheme": "default"
  },
  "photos": [
    {
      "id": 1,
      "thumbnailPath": "/api/proxy/thumb/1BxK9abc/foto001.jpg?sz=w400",
      "originalPath": "/api/proxy/thumb/1BxK9abc/foto001.jpg?sz=w1200",
      "category": "Akad"
    }
  ],
  "selections": [],
  "branding": {
    "brandName": "Studio Amsyar Photography",
    "brandLogo": "/vendor_logos/logo.png",
    "allowCustomLogo": 1
  }
}
```

**Response error (403 — galeri expired):**
```json
{
  "message": "Akses galeri ini telah berakhir atau dinonaktifkan.",
  "status": "archived"
}
```

---

## 📦 Paket Berlangganan

### GET /api/plans — List Paket Publik

```
GET /api/plans
```

**Response (200):**
```json
{
  "plans": [
    {
      "id": 1,
      "name": "Starter Plan",
      "maxProjects": 5,
      "price": 49000,
      "activePeriodDays": 30,
      "allowCustomLogo": 0,
      "allowRawSelector": 0
    },
    {
      "id": 2,
      "name": "Pro Studio Plan",
      "maxProjects": 20,
      "price": 129000,
      "activePeriodDays": 30,
      "allowCustomLogo": 1,
      "allowRawSelector": 1
    },
    {
      "id": 3,
      "name": "Business Studio Plan",
      "maxProjects": 50,
      "price": 249000,
      "activePeriodDays": 30,
      "allowCustomLogo": 1,
      "allowRawSelector": 1
    }
  ]
}
```

---

## ⚙️ Pengaturan Vendor

### PUT /api/vendor/profile — Update Preferensi Salin

```
PUT /api/vendor/profile
Authorization: Cookie token=[jwt]
Content-Type: application/json
```

**Request body:**
```json
{
  "copyDelimiter": ", ",
  "copyIncludeExt": 0,
  "copySortOrder": "name_asc"
}
```

**`copySortOrder` values:**
- `name_asc` — nama file A-Z
- `name_desc` — nama file Z-A
- `select_order` — urutan dipilih
- `select_order_desc` — urutan dipilih terbalik

---

## 🛡️ Admin Endpoints

Semua endpoint `/api/admin/*` memerlukan cookie `adminToken`.

| Endpoint | Method | Deskripsi |
|---|---|---|
| `/api/admin/vendors` | GET | List semua vendor |
| `/api/admin/vendors/[id]` | GET/PUT/DELETE | Detail/edit/hapus vendor |
| `/api/admin/plans` | GET/POST | List/tambah paket |
| `/api/admin/plans/[id]` | PUT/DELETE | Edit/hapus paket |
| `/api/admin/upgrades` | GET | List subscription requests |
| `/api/admin/upgrades/[id]/approve` | POST | Approve request |
| `/api/admin/upgrades/[id]/reject` | POST | Reject request |
| `/api/admin/analytics` | GET | Statistik platform |
| `/api/admin/settings` | GET/PUT | Baca/update `saas_settings` |
| `/api/admin/auth/google` | GET | Redirect ke Google OAuth |
| `/api/admin/auth/google/callback` | GET | Callback OAuth, simpan token |

---

## 💳 Payment Gateway QRIS

### Arsitektur Multi-Provider

Platform mendukung 4 payment gateway yang bisa dikonfigurasi Admin secara dinamis via `saas_settings`:

| Provider | Metode Pembayaran | Driver |
|---|---|---|
| **Midtrans** (default) | QRIS + GoPay (Snap API) | `lib/payment-gateway/midtrans.js` |
| **Xendit** | Invoice / Virtual Account | `lib/payment-gateway/xendit.js` |
| **Tripay** | QRIS + VA | `lib/payment-gateway/tripay.js` |
| **Duitku** | QRIS + VA | `lib/payment-gateway/duitku.js` |

**Dispatcher terpusat:** `lib/payment-gateway/index.js` — semua API route memanggil `createPayment()` dan `verifyPaymentWebhook()` tanpa perlu tahu provider aktif.

**Konfigurasi `saas_settings` untuk Payment Gateway:**

| Key | Deskripsi |
|---|---|
| `enable_payment_gateway` | `'1'` = aktif, `'0'` = nonaktif |
| `payment_gateway_provider` | `'midtrans'` / `'xendit'` / `'tripay'` / `'duitku'` |
| `payment_gateway_server_key` | Server key / API key provider |
| `payment_gateway_client_key` | Client key (untuk Midtrans Snap embed) |
| `payment_gateway_merchant_code` | Merchant code (untuk Duitku) |
| `payment_gateway_is_production` | `'1'` = production, `'0'` = sandbox |
| `qris_expiration_minutes` | Durasi kedaluwarsa QRIS (default: `15` menit) |

---

### Tabel Database Payment

#### `payment_transactions` — Log Transaksi

```sql
CREATE TABLE payment_transactions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  orderId      TEXT NOT NULL UNIQUE,   -- ORDER-{timestamp}-{vendorId}-{random}
  vendorId     INTEGER NOT NULL,
  planId       INTEGER NOT NULL,
  amount       REAL NOT NULL,
  provider     TEXT NOT NULL,          -- 'midtrans' | 'xendit' | 'tripay' | 'duitku'
  status       TEXT DEFAULT 'pending', -- 'pending'|'paid'|'expired'|'failed'|'cancelled'
  paymentUrl   TEXT,
  rawResponse  TEXT,                   -- JSON response mentah dari provider
  paidAt       DATETIME,
  createdAt    DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

#### `payment_sessions` — Sesi QRIS Aktif

```sql
CREATE TABLE payment_sessions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  orderId       TEXT NOT NULL UNIQUE,
  vendorId      INTEGER NOT NULL,
  planId        INTEGER NOT NULL,
  amount        REAL NOT NULL,
  status        TEXT DEFAULT 'pending', -- 'pending'|'paid'|'expired'|'replaced'|'cancelled'
  paymentMethod TEXT DEFAULT 'qris',
  qrUrl         TEXT,                   -- URL gambar QR code / redirect Snap
  expiresAt     TEXT,                   -- ISO8601 waktu kedaluwarsa QRIS
  rawResponse   TEXT,
  paidAt        DATETIME,
  createdAt     DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

---

### POST /api/payment/create — Buat Transaksi QRIS

Membuat sesi pembayaran baru untuk vendor yang mendaftar/upgrade.

```
POST /api/payment/create
Content-Type: application/json
```

**Rate limit:** 5 request / 60 detik per IP.

**Request body:**
```json
{
  "vendorId": 42,
  "planId": 2,
  "customAmount": 129000
}
```

**Response sukses (200):**
```json
{
  "success": true,
  "orderId": "ORDER-1722844800000-42-1234",
  "provider": "midtrans",
  "token": "snap-token-xxx",
  "qrUrl": "https://api.midtrans.com/v2/qris/...",
  "expiresAt": "2026-08-05T08:15:00.000Z"
}
```

**Efek samping:**
- Vendor status diubah ke `pending_payment`
- Record disimpan di `payment_transactions` dan `payment_sessions`
- Sesi pending lama yang expired → status `replaced`

---

### GET /api/payment/status — Cek Status Pembayaran

Polling status transaksi. Jika sudah lunas, cookie JWT otomatis di-set dan vendor bisa langsung masuk dashboard.

```
GET /api/payment/status?orderId=ORDER-xxx
GET /api/payment/status?vendorId=42  (ambil transaksi terbaru vendor)
```

**Response — belum bayar (200):**
```json
{
  "paid": false,
  "status": "pending",
  "expiresAt": "2026-08-05T08:15:00.000Z"
}
```

**Response — sudah bayar (200):**
```json
{
  "paid": true,
  "status": "paid",
  "redirectUrl": "/dashboard",
  "message": "Pembayaran lunas. Mengarahkan ke Dashboard..."
}
```
> ✅ Response ini juga menyertakan `Set-Cookie: token=[jwt]` — vendor langsung ter-autentikasi.

**Response — expired (200):**
```json
{
  "paid": false,
  "status": "expired",
  "expired": true,
  "message": "Transaksi QRIS ini telah KEDALUWARSA (Expired) oleh Midtrans."
}
```

**Logika live-check Midtrans:**  
Jika status di DB masih `pending`, endpoint ini melakukan `GET /v2/{orderId}/status` ke Midtrans API secara real-time. Jika terbukti `settlement/capture` → vendor otomatis diaktivasi + email dikirim.

---

### POST /api/payment/notification — Webhook dari Provider

Endpoint yang dipanggil oleh payment gateway saat status transaksi berubah. **Tidak memerlukan autentikasi client** — diverifikasi via signature.

```
POST /api/payment/notification
Content-Type: application/json
[Body dari provider — Midtrans/Xendit/Tripay/Duitku]
```

**Alur verifikasi Midtrans:**
```
SHA512(orderId + statusCode + grossAmount + ServerKey) === signature_key
```

**Jika pembayaran lunas (`settlement` / `capture`):**
1. `payment_transactions.status` → `paid`
2. `payment_sessions.status` → `paid`
3. `vendors.status` → `active`
4. `vendors.expiresAt` → `today + activePeriodDays`
5. Email notifikasi aktivasi dikirim ke vendor

**Jika gagal/expired (`deny` / `cancel` / `expire`):**
1. `payment_transactions.status` → `expired` / `failed`
2. `vendors.status` → `expired_draft` (expired) / `cancelled` (cancel/deny)
3. Vendor dipindahkan ke tab Arsip di Admin Panel

**Response (200):**
```json
{ "success": true, "message": "Notification processed" }
```

---

### POST /api/payment/cancel — Batalkan Sesi QRIS

Membatalkan sesi QRIS yang masih `pending`.

```
POST /api/payment/cancel
Content-Type: application/json
```

**Request body (salah satu):**
```json
{ "orderId": "ORDER-xxx", "vendorId": 42 }
{ "orderId": "ORDER-xxx", "email": "vendor@example.com" }
```

**Otorisasi:** Vendor yang login (cookie JWT), atau matching `vendorId`/`email` di body.

**Response sukses (200):**
```json
{
  "success": true,
  "message": "Sesi pembayaran berhasil dibatalkan dan dipindahkan ke arsip."
}
```

---

### GET /api/payment/check-pending — Cek Sesi Pending Aktif

Cek apakah vendor punya sesi QRIS yang masih aktif (belum expired dan belum bayar).

```
GET /api/payment/check-pending?vendorId=42
```

**Response — ada sesi aktif (200):**
```json
{
  "hasPending": true,
  "orderId": "ORDER-xxx",
  "expiresAt": "2026-08-05T08:15:00.000Z",
  "qrUrl": "https://...",
  "amount": 129000
}
```

**Response — tidak ada (200):**
```json
{ "hasPending": false }
```

---

### POST /api/payment/regenerate — Buat Ulang QRIS Baru

Jika sesi QRIS sudah expired, vendor bisa minta generate QRIS baru tanpa perlu input ulang data.

```
POST /api/payment/regenerate
Content-Type: application/json

{ "vendorId": 42, "planId": 2 }
```

**Response:** Sama dengan `/api/payment/create`.

---

### GET /api/payment/qr-image — Proxy Gambar QR Code

Proxy image QR code dari URL provider agar tidak ada CORS issue di browser.

```
GET /api/payment/qr-image?url=https://qris.provider.com/xxx.png
```

**Response:** Binary image stream (`image/png` atau `image/jpeg`).

---

### 🔄 Alur Lengkap Pembayaran QRIS

```
Vendor buka /register
    │
    ├── Pilih Paket Utama + Add-On Cloud Storage (Opsional via Order Bump Modal)
    ├── Pilih Metode Pembayaran: QRIS atau Transfer Bank Manual
    │
    ▼
POST /api/payment/create (jika QRIS) / POST /api/auth/register (jika Manual)
    │── Buat orderId unik bundel (Paket + Add-On Storage)
    │── Panggil createMidtransTransaction() → dapat QR code
    │── Simpan ke payment_transactions (addonPlanId & addonQuotaBytes)
    │── Simpan vendor.pendingAddonPlanId & pendingAddonQuotaBytes
    │── Kirim Email Pending Instructions (Instruksi QRIS / Transfer Manual 24 Jam)
    │
    ▼
UI Tampilkan QR Code / Bukti Transfer
    │
    ├── Mode QRIS: Webhook / Status Polling mendeteksi paid ──→ Auto Activate (Plan + Add-On)
    │                                                    ──→ Send Email Invoice Lunas (QRIS)
    │
    └── Mode Manual: Vendor Upload Bukti ──→ Status pending_manual 
                                         ──→ Send Email Pendaftaran Diterima
                                         ──→ Admin klik Approve di Kelola Vendor 
                                         ──→ Auto Activate (Plan + Add-On)
                                         ──→ Send Email Invoice Lunas (Transfer Bank Manual)
```

---

## 📁 RAW Selector (Sortir File RAW Lokal)

### Arsitektur: 100% Client-Side, 0 Upload ke Server

RAW Selector adalah fitur yang memungkinkan vendor/fotografer **memindahkan atau menyalin file RAW** (`.cr2`, `.cr3`, `.arw`, `.nef`, `.dng`, `.raw`, dll.) dari folder lokal komputer mereka secara otomatis — berdasarkan nama file yang dipilih klien di galeri.

> ⚠️ **File RAW tidak pernah diunggah ke server.** Seluruh operasi baca/salin/pindah terjadi di browser menggunakan **File System Access API** (browser modern — Chrome/Edge).

**Komponen utama:**
| File | Peran |
|---|---|
| `hooks/useRawSorter.js` | Logic engine: scan folder, match nama file, copy/move via FSAPI |
| `components/RawSorterDrawer.jsx` | UI drawer slide-in, log terminal, progress bar |
| `app/api/projects/[projectId]/selected-files` | API endpoint — ambil daftar nama file terpilih klien dari DB |

---

### Akses Berdasarkan Paket

| Paket | Akses RAW Selector |
|---|---|
| **Starter Plan** | ❌ Terkunci — tombol tampil tapi klik diarahkan ke halaman upgrade |
| **Pro Studio Plan** | ✅ Penuh |
| **Business Studio Plan** | ✅ Penuh |
| **Free Trial** | ✅ Terbatas (maks. N file sesuai `raw_sorter_trial_limit` di `saas_settings`, default: 5) |

Flag di DB: `plans.allowRawSelector` (`1` = aktif, `0` = nonaktif).  
Flag vendor: `vendors.allowRawSelector` diwarisi dari paket saat login.

---

### GET /api/projects/[projectId]/selected-files

Mengambil daftar **nama file** dari foto yang sudah dipilih klien — untuk dicocokan dengan file RAW di folder lokal vendor.

```
GET /api/projects/42/selected-files
Authorization: Cookie token=[jwt]
```

**Response (200):**
```json
{
  "projectName": "Wedding Anindya & Budi",
  "totalSelected": 47,
  "fileNames": [
    "DSC_0001.jpg",
    "DSC_0047.jpg",
    "IMG_2831.jpg"
  ]
}
```

> **Catatan:** Nama file diambil dari kolom `photos.originalPath` — di-extract dari URL proxy (`/api/proxy/thumb/{fileId}/{filename}?sz=w1200`). Nama file ini **cocok 1:1** dengan nama file RAW di folder lokal jika vendor menggunakan nama file yang sama (hanya beda ekstensi: `.jpg` vs `.cr2`, `.arw`, dll.).

---

### Alur Kerja RAW Selector

```
Vendor buka Dashboard
    │
    ├── Klik tombol "📁 Sortir RAW" di kartu proyek
    │   (jika allowRawSelector = 0 → tampil "🔒 Upgrade Pro")
    │
    ▼
RawSorterDrawer terbuka (drawer slide-in)
    │
    ├── [1] Fetch nama file terpilih dari GET /api/projects/[id]/selected-files
    │       → Dapatkan array fileNames dari DB (nama file foto yang dipilih klien)
    │
    ├── [2] Vendor klik "Pilih Folder Sumber"
    │       → window.showDirectoryPicker({ mode: 'read' })
    │       → Scan rekursif semua file di folder → Map<basename, FileHandle>
    │
    ├── [3] Vendor klik "Pilih Folder Tujuan"
    │       → window.showDirectoryPicker({ mode: 'readwrite' })
    │
    ├── [4] Vendor pilih mode: Copy atau Move
    │
    └── [5] Klik "Mulai Sortir"
            │
            ├── Loop setiap nama file dari seleksi klien
            │   ├── Strip ekstensi → cari cocok di source Map (basename match)
            │   ├── Cocok → salin/pindah ke folder tujuan
            │   └── Tidak cocok → log warning
            │
            ├── Progress bar real-time
            ├── Log terminal dengan timestamp
            └── Summary: berhasil / tidak ditemukan / gagal
```

---

### Logika Pencocokan Nama File

```
Nama file dari galeri: "DSC_0001.jpg"
    ↓ strip ekstensi → "DSC_0001"
    ↓ cocokkan (case-insensitive) dengan file di folder sumber

File di folder sumber:
  - DSC_0001.CR2  ← ✅ COCOK → copy/move
  - DSC_0001.ARW  ← ✅ COCOK → copy/move (jika ada duplikat nama)
  - DSC_0002.CR2  ← ❌ tidak cocok
```

---

### Batasan Trial (`free_trial`)

Jika `vendorPlan === 'free_trial'`, drawer membatasi jumlah file yang bisa diproses:

```javascript
// Fetch limit dari Admin Settings
fetch('/api/settings') → raw_sorter_trial_limit (default: 5)

// Jika fileNames.length > TRIAL_LIMIT:
// Hanya proses TRIAL_LIMIT file pertama
// Tampilkan pesan "Upgrade ke Pro untuk sortir semua X file"
```

**Konfigurasi di Admin Panel → System Settings:**
- `raw_sorter_trial_limit` — maks. file yang bisa disortir saat trial (default: `5`)

---

### Kompatibilitas Browser

| Browser | File System Access API | RAW Selector |
|---|---|---|
| **Chrome 86+** | ✅ | ✅ |
| **Edge 86+** | ✅ | ✅ |
| **Firefox** | ❌ (tidak support) | ❌ Tampil pesan tidak didukung |
| **Safari** | ❌ (tidak support) | ❌ Tampil pesan tidak didukung |
| **Mobile** | ❌ | ❌ |

> Jika browser tidak mendukung `window.showDirectoryPicker`, komponen menampilkan pesan "Browser Anda tidak mendukung fitur ini. Gunakan Chrome atau Edge versi terbaru."
