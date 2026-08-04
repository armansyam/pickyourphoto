# 📚 API Documentation — Pick Your Photo

> **Dokumentasi Resmi API Endpoint Platform SaaS Pick Your Photo**  
> Lokasi: `docs/API_DOCUMENTATION.md`  
> **Terakhir diperbarui:** 2026-08-05 — disesuaikan dengan route aktual di `app/api/`

---

## 🔐 Autentikasi

Seluruh endpoint **vendor** memerlukan cookie JWT `token` yang valid (diperoleh setelah login).  
Seluruh endpoint **admin** memerlukan cookie JWT `adminToken` yang valid.  
Endpoint **klien galeri** menggunakan query param `key=[accessKey]`.

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
