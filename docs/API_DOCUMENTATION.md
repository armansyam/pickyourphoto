# 📚 API Documentation — Pick Your Photo

> **Dokumentasi Resmi API Endpoint Platform SaaS Pick Your Photo**  
> Lokasi: `docs/API_DOCUMENTATION.md`  
> **Terakhir diperbarui:** 10 Agustus 2026 — *Konsolidasi Endpoint Add-On Storage, Payment Gateway Multi-Provider, Sub-Admin Team, Analytics, & Disk Stats*

---

## 🔐 Autentikasi & Keamanan

- Seluruh endpoint **vendor** memerlukan cookie JWT `token` yang valid.  
- Seluruh endpoint **admin** memerlukan cookie JWT `adminToken` dengan role `admin` atau `superadmin` yang valid.  
- Endpoint **klien galeri** menggunakan query param `key=[accessKey]`.  
- Endpoint **payment status** (`/api/payment/status`) dilindungi dengan verifikasi token pengguna aktif ATAU kecocokan `vendorId` transaksi internal.

---

## 📁 Daftar Endpoint Terlengkap

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| `POST` | `/api/auth/login` | — | Login vendor |
| `POST` | `/api/auth/logout` | — | Logout (hapus cookie) |
| `POST` | `/api/register` | — | Registrasi vendor baru |
| `GET` | `/api/projects` | Vendor | List semua proyek vendor |
| `POST` | `/api/projects` | Vendor | Buat proyek baru + import GDrive |
| `GET` | `/api/projects/[projectId]` | Client Key | Data galeri klien |
| `PUT` | `/api/projects/[projectId]` | Vendor | Update proyek |
| `DELETE` | `/api/projects/[projectId]` | Vendor | Hapus proyek |
| `POST` | `/api/projects/[projectId]/reactivate` | Vendor | Reaktivasi proyek terarsip |
| `POST` | `/api/projects/reactivate-all` | Vendor | Bulk reaktivasi semua proyek arsip |
| `GET` | `/api/projects/[projectId]/selected-files` | Vendor | Ambil daftar nama file terpilih untuk RAW Selector |
| `GET` | `/api/proxy/thumb/[fileId]` | — | Stream thumbnail gambar (pipe stream) |
| `GET` | `/api/proxy/thumb/[fileId]/[filename]` | — | Stream gambar (dengan nama file) |
| `GET` | `/api/plans` | — | List paket berlangganan publik |
| `GET` | `/api/vendor/profile` | Vendor | Profil vendor + pengaturan salin |
| `PUT` | `/api/vendor/profile` | Vendor | Update preferensi salin nama file |
| `POST` | `/api/vendor/upgrade` | Vendor | Request upgrade/perpanjangan manual |
| `POST` | `/api/payment/create` | Public/Vendor | Buat transaksi bayar QRIS / Gateway |
| `POST` | `/api/payment/addon/create` | Vendor | Buat invoice QRIS Add-On Storage |
| `GET` | `/api/payment/status` | Auth/Internal | Polling & live check status pembayaran |
| `POST` | `/api/payment/notification` | Webhook | Webhook callback dari Payment Gateway |
| `POST` | `/api/payment/cancel` | Auth/Vendor | Batalkan sesi QRIS pending |
| `GET` | `/api/payment/check-pending` | Vendor | Cek transaksi QRIS pending vendor |
| `POST` | `/api/payment/regenerate` | Vendor | Regenerate QRIS baru dari transaksi expired |
| `GET` | `/api/payment/qr-image` | Public | Proxy gambar QR code (bypass CORS) |
| `GET` | `/api/settings` | Vendor | Pengaturan SaaS publik (bank, WA, trial limit) |
| `POST` | `/api/trial` | — | Buat sesi trial galeri |
| `GET` | `/api/admin/vendors` | Admin | List & auto-sync status vendor |
| `GET` | `/api/admin/vendors/[id]` | Admin | Detail/edit/hapus vendor |
| `GET` | `/api/admin/plans` | Admin | List paket langganan |
| `POST` | `/api/admin/plans` | Admin | Tambah/edit paket |
| `GET` | `/api/admin/upgrades` | Admin | List pengajuan perpanjangan & Add-On manual |
| `POST` | `/api/admin/upgrades/[id]/approve` | Admin | Setujui upgrade/perpanjangan & Add-On |
| `POST` | `/api/admin/upgrades/[id]/reject` | Admin | Tolak upgrade/perpanjangan |
| `GET` | `/api/admin/admins` | Superadmin | List & kelola akun Sub-Admin |
| `POST` | `/api/admin/admins` | Superadmin | Tambah Sub-Admin baru |
| `DELETE` | `/api/admin/admins/[id]` | Superadmin | Hapus Sub-Admin |
| `GET` | `/api/admin/analytics` | Admin | Statistik & laporan keuangan SaaS |
| `GET` | `/api/admin/disk-stats` | Admin | Real-time monitoring penggunaan disk server |
| `GET` | `/api/admin/settings` | Admin | Baca/update `saas_settings` |
| `GET` | `/api/admin/auth/google` | Admin | Redirect ke Google OAuth Master |
| `GET` | `/api/admin/auth/google/callback` | Admin | Callback OAuth, simpan token |

---

## 🖼️ Proxy Gambar — Zero Storage Stream

### Thumbnail & Original Photo

```
GET /api/proxy/thumb/{fileId}?sz={size}
GET /api/proxy/thumb/{fileId}/{filename}?sz={size}
```

- **Parameters:** `fileId` (Google Drive File ID), `sz` (misal `w400`, `w1200`), `filename` (opsional).
- **Implementation:** Direct Pipe Stream (`response.body`), RAM ~0 MB per request.

---

## 💾 Add-On Storage Payment API

### POST /api/payment/addon/create — Buat Transaksi Add-On QRIS

```json
{
  "vendorId": 42,
  "addonPlanId": "addon-25gb",
  "customQuotaGB": 25
}
```

- **Response:** `orderId`, `qrUrl`, `expiresAt`, `amount`.
- **Note:** Mengunci `pendingAddonPlanId` di basis data vendor hingga pembayaran lunas atau expired.

---

## 🛡️ Admin & Sub-Admin Management

### GET & POST /api/admin/admins

- **GET:** Menampilkan daftar akun admin & sub-admin.
- **POST:** Menambahkan sub-admin baru dengan hashing password `bcrypt`.
- **Otorisasi:** Khusus `role = 'superadmin'`.

---

## 📊 Analytics & Disk Stats

### GET /api/admin/analytics
Mengembalikan statistik total pendapatan, jumlah vendor aktif, persentase penggunaan storage pool, dan riwayat transaksi.

### GET /api/admin/disk-stats
Mengembalikan status kapasitas disk VPS server fisik beserta warning threshold status.
