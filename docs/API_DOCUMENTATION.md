# 📚 API Documentation — Pick Your Photo

> **Dokumentasi Resmi API Endpoint Platform SaaS Pick Your Photo**  
> Lokasi: `docs/API_DOCUMENTATION.md`  
> **Terakhir diperbarui:** 20 Agustus 2026 — *Daftar Lengkap 70+ Endpoint Aktif Berbasis Kode Sumber*

---

## 🔐 Autentikasi & Otorisasi

- **Vendor Endpoints:** Memerlukan HTTP-only Cookie `token` (JWT).
- **Admin Endpoints:** Memerlukan HTTP-only Cookie `adminToken` (JWT dengan role `admin` atau `superadmin`).
- **Galeri Klien:** Menggunakan query string `key=[accessKey]` 32-hex unik per proyek.
- **Payment Polling:** Menggunakan session token aktif atau pencocokan `vendorId` internal.

---

## 📁 Katalog Endpoint Lengkap

### 1. Autentikasi & Registrasi (`/api/auth/*` & `/api/register/*`)
| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Login vendor (menghasilkan cookie `token`) |
| `POST` | `/api/auth/logout` | Public | Logout vendor / admin |
| `POST` | `/api/auth/register` | Public | Registrasi akun vendor baru |
| `POST` | `/api/auth/validate-register` | Public | Validasi data awal form registrasi |
| `POST` | `/api/auth/forgot-password` | Public | Request reset password via email |
| `GET` | `/api/auth/google` | Public | Inisiasi login Google OAuth vendor |
| `GET` | `/api/auth/google/callback` | Public | Callback Google OAuth vendor |
| `GET` | `/api/register/status` | Public | Polling status aktivasi akun vendor baru |

---

### 2. Proyek & Galeri Vendor (`/api/projects/*`)
| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/api/projects` | Vendor | Mengambil daftar semua proyek vendor |
| `POST` | `/api/projects` | Vendor | Membuat proyek baru & trigger background import Google Drive |
| `GET` | `/api/projects/[projectId]` | Client Key / Vendor | Mengambil data galeri foto untuk klien atau vendor |
| `PUT` | `/api/projects/[projectId]` | Vendor | Memperbarui nama/pengaturan proyek |
| `DELETE` | `/api/projects/[projectId]` | Vendor | Menghapus proyek dan membebaskan kuota storage |
| `POST` | `/api/projects/[projectId]/select` | Client Key | Menyimpan pilihan foto klien |
| `POST` | `/api/projects/[projectId]/reactivate` | Vendor | Reaktivasi proyek yang terarsip |
| `POST` | `/api/projects/reactivate-all` | Vendor | Bulk reaktivasi seluruh proyek arsip |
| `POST` | `/api/projects/[projectId]/retry` | Vendor | Mengulang proses import yang gagal |
| `GET` | `/api/projects/[projectId]/selected-files` | Vendor | Mengambil daftar nama file terpilih untuk RAW Selector |

---

### 3. Dedicated Cloud Storage Pool (`/api/storage/*`)
| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/api/storage/folders` | Vendor | Mengambil daftar folder cloud storage vendor |
| `POST` | `/api/storage/folders/create` | Vendor | Membuat subfolder baru di cloud storage |
| `POST` | `/api/storage/folders/batch-tree` | Vendor | Membuat struktur pohon folder batch sekaligus |
| `GET` | `/api/storage/files` | Vendor | Mengambil daftar berkas foto di dalam folder |
| `DELETE` | `/api/storage/files` | Vendor | Menghapus berkas foto dari storage pool |
| `POST` | `/api/storage/upload/ticket` | Vendor | Menghasilkan tiket otorisasi upload ke worker account |
| `POST` | `/api/storage/upload/direct` | Vendor | Direct stream upload ke Google Drive worker |
| `GET` | `/api/storage/gallery/[folderId]` | Public/Key | Menampilkan galeri foto langsung dari folder storage |
| `POST` | `/api/storage/toggle-mode` | Vendor | Mengubah mode storage (Dedicated vs BYOS) |
| `POST` | `/api/storage/migrate-folder` | Vendor | Memindahkan folder antar worker account |
| `GET` | `/api/storage/external/connect` | Vendor | Inisiasi koneksi Google Drive pribadi (BYOS) |
| `GET` | `/api/storage/external/callback` | Vendor | Callback OAuth Google Drive BYOS |
| `POST` | `/api/storage/external/disconnect` | Vendor | Memutuskan koneksi Google Drive pribadi |
| `GET` | `/api/storage/external/quota` | Vendor | Cek kapasitas dan sisa kuota Google Drive BYOS |
| `POST` | `/api/storage/external/sync` | Vendor | Sinkronisasi folder Google Drive BYOS |
| `GET` | `/api/storage/external/check-updates` | Vendor | Cek perubahan folder Google Drive BYOS |

---

### 4. Transaksi & Multi-Provider Payment Gateway (`/api/payment/*`)
| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `POST` | `/api/payment/create` | Public/Vendor | Membuat transaksi pembayaran (IPaymu, Midtrans, Xendit, Tripay, Duitku, DOKU, atau Manual) |
| `POST` | `/api/payment/addon/create` | Vendor | Membuat invoice pembayaran Add-On Storage |
| `GET` | `/api/payment/status` | Auth/Polling | Cek status transaksi pembayaran secara real-time |
| `POST` | `/api/payment/notification` | Webhook | Unified Webhook callback dari Payment Gateway aktif |
| `POST` | `/api/payment/cancel` | Vendor/Auth | Membatalkan sesi pembayaran pending |
| `GET` | `/api/payment/check-pending` | Vendor | Memeriksa transaksi pembayaran pending milik vendor |
| `POST` | `/api/payment/regenerate` | Vendor | Generate ulang QRIS baru dari transaksi kedaluwarsa |
| `GET` | `/api/payment/qr-image` | Public | Proxy render QR code bypass CORS |

---

### 5. Media Proxy & Versioning (`/api/proxy/*` & `/api/public/*`)
| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/api/proxy/thumb/[fileId]` | Public | Streaming thumbnail foto (Direct Stream Pipe, Zero RAM) |
| `GET` | `/api/proxy/thumb/[fileId]/[filename]` | Public | Streaming foto dengan nama file deskriptif |
| `GET` | `/api/public/version` | Public | Status versi sistem, rilis, dan ketersediaan update non-blocking |

---

### 6. Superadmin & Sub-Admin Operations (`/api/admin/*`)
| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `POST` | `/api/admin/auth/login` | Public | Login akun admin / superadmin |
| `GET` | `/api/admin/vendors` | Admin | Daftar seluruh vendor & auto-check status kedaluwarsa |
| `GET` | `/api/admin/vendors/[vendorId]` | Admin | Detail profil vendor & kuota storage |
| `DELETE` | `/api/admin/vendors/[vendorId]` | Superadmin | Menghapus akun vendor beserta seluruh proyeknya |
| `POST` | `/api/admin/vendors/[vendorId]/reject` | Admin | Menolak pendaftaran manual vendor |
| `GET` | `/api/admin/plans` | Admin | Mengambil daftar paket berlangganan utama |
| `POST` | `/api/admin/plans` | Superadmin | Menambah paket langganan baru |
| `PUT` | `/api/admin/plans/[planId]` | Superadmin | Memperbarui harga/kuota paket langganan |
| `GET` | `/api/admin/addon-plans` | Admin | Mengambil daftar paket Add-On Storage |
| `GET` | `/api/admin/admins` | Superadmin | Daftar akun Superadmin & Sub-Admin |
| `POST` | `/api/admin/admins` | Superadmin | Menambahkan akun Sub-Admin baru |
| `GET` | `/api/admin/drive-pool` | Superadmin | Mengambil status seluruh akun Google Drive Pool |
| `POST` | `/api/admin/drive-pool` | Superadmin | Menambahkan / memperbarui akun worker drive pool |
| `DELETE` | `/api/admin/drive-pool/[id]` | Superadmin | Menghapus akun worker dari drive pool |
| `GET` | `/api/admin/auth/google/worker` | Superadmin | Inisiasi OAuth Google Drive Worker Account |
| `GET` | `/api/admin/auth/google/worker/callback` | Superadmin | Callback OAuth Worker Account |
| `GET` | `/api/admin/analytics` | Admin | Data statistik pendapatan, vendor aktif, & grafik |
| `GET` | `/api/admin/disk-stats` | Admin | Real-time monitoring kapasitas disk server VPS |
| `GET` | `/api/admin/financial-report/export-csv` | Superadmin | Unduh laporan keuangan format CSV |
| `POST` | `/api/admin/smtp/test` | Admin | Menguji konektivitas server email SMTP |
| `POST` | `/api/admin/payment/test` | Admin | Menguji konektivitas & kredensial Payment Gateway aktif |
| `GET` | `/api/admin/settings` | Admin | Membaca konfigurasi `saas_settings` & `system_settings` |
| `POST` | `/api/admin/settings` | Superadmin | Menyimpan konfigurasi platform |
| `GET` | `/api/admin/upgrades` | Admin | Daftar pengajuan perpanjangan/upgrade manual |
| `GET` | `/api/admin/backups` | Superadmin | Daftar berkas backup database & media |
| `GET` | `/api/admin/backups/[filename]` | Superadmin | Mengunduh berkas backup |
| `POST` | `/api/admin/reset-data` | Superadmin | Reset data dummy/pengujian platform |

---

### 7. Instant Free Trial & Daemon Cron (`/api/trial/*` & `/api/cron/*`)
| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `POST` | `/api/trial/create` | Public | Membuat sesi galeri trial publik tanpa akun |
| `GET` | `/api/trial/[slug]` | Public | Mengambil data galeri trial publik |
| `GET` | `/api/cron/purge-expired` | Cron Secret | Hard purge pembersihan file foto vendor kedaluwarsa (>30 hari) |

---

### 8. Subdomain Studio & Profil Vendor (`/api/subdomain/*` & `/api/vendor/*`)
| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `POST` | `/api/subdomain/claim` | Vendor | Mendaftarkan subdomain eksklusif studio untuk pertama kali |
| `PUT` | `/api/subdomain/update` | Vendor | Memperbarui nama subdomain studio (dengan validasi cooldown & Pro tier) |
| `GET` | `/api/subdomain/check` | Public | Memeriksa ketersediaan nama subdomain dan alternatif nama |
| `GET` | `/api/vendor/profile` | Vendor | Mengambil data profil, logo brand, preferensi copy, dan konfigurasi subdomain |
| `PUT` | `/api/vendor/profile` | Vendor | Memperbarui nama brand studio, logo studio, nomor WhatsApp, dan link Google Drive portofolio |
| `POST` | `/api/vendor/setup` | Vendor | Menyimpan setup wizard awal (`/setup`) & aktivasi subdomain |
| `GET` | `/api/studio/[subdomain]/lookup` | Public | Endpoint lookup identitas studio dan portofolio foto |

