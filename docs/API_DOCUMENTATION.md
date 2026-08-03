# 📚 API Documentation — Pick Your Photo

Dokumentasi resmi API Endpoint untuk pengelolaan project, galeri, dan reaktivasi pada platform SaaS Pick Your Photo.

---

## 🔐 Autentikasi
Seluruh endpoint vendor memerlukan cookie autentikasi JWT valid yang diperoleh setelah login vendor.

---

## ⚡ Endpoint Reaktivasi Galeri (Gallery Reactivation API)

### 1. Reaktivasi Single Project
Mengaktifkan kembali 1 galeri foto terarsip yang telah melewati masa simpan 30 hari.

- **URL:** `/api/projects/[projectId]/reactivate`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Response Success (200 OK):**
```json
{
  "success": true,
  "message": "Galeri foto \"Wedding Anindya & Budi\" berhasil diaktifkan kembali hingga 30/9/2026!",
  "expiresAt": "2026-09-30T10:00:00.000Z"
}
```
- **Response Error (403 Forbidden - Subscription Expired):**
```json
{
  "message": "Masa aktif langganan Anda telah berakhir. Harap perpanjang paket berlangganan terlebih dahulu untuk mengaktifkan kembali galeri ini."
}
```

---

### 2. Bulk Reaktivasi Semua Project Terarsip
Mengaktifkan kembali seluruh galeri foto terarsip milik vendor secara bersamaan dalam 1 klik setelah melakukan perpanjangan paket (renewal).

- **URL:** `/api/projects/reactivate-all`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Response Success (200 OK):**
```json
{
  "success": true,
  "message": "Berhasil mengaktifkan kembali 3 galeri terarsip hingga 30/9/2026!",
  "count": 3,
  "expiresAt": "2026-09-30T10:00:00.000Z"
}
```

---

## 🖼️ Endpoint Proxy Gambar (Zero-Storage Drive Proxy)

### 3. Proxy Thumbnail Gambar
Menyajikan thumbnail foto langsung dari Google Drive dengan CDN Caching 30 Hari.

- **URL:** `/api/proxy/thumb/[fileId]`
- **Method:** `GET`
- **Query Params:** `sz` (opsional, default: `w400`)
- **Response Headers:**
  - `Content-Type: image/jpeg` (atau `image/webp`)
  - `Cache-Control: public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400`
  - `Cloudflare-CDN-Cache-Control: public, max-age=2592000`
