# 📘 01. Spesifikasi Master Sistem, Visi & Arsitektur (Pick Your Photo)

> **Dokumen Resmi Spesifikasi Terpadu Platform SaaS Pick Your Photo**  
> Lokasi: `docs/01-SYSTEM-SPECIFICATION.md`  
> **Terakhir diperbarui:** 20 Agustus 2026 — *Audit Menyeluruh Seluruh Basis Kode Sumber (Frontend, Backend, UX/UI)*

---

## 🎯 1. Visi, Misi & Arsitektur Utama

### Visi
Menjadi platform SaaS nomor satu bagi fotografer profesional untuk berkolaborasi dengan klien dalam memilih foto terbaik secara instan, aman, dan elegan — sekaligus meningkatkan nilai profesionalisme brand mereka di mata klien.

### Misi & Pilar Utama Arsitektur
1. **Menghilangkan Kerumitan Manual:** Mengotomatisasi proses seleksi foto yang sebelumnya dilakukan via WhatsApp/spreadsheet.
2. **Zero-Storage Direct Stream Architecture:** Import metadata foto dan streaming foto secara langsung dari Google Drive tanpa membebani disk lokal atau RAM server VPS (`ReadableStream`).
3. **Multi-Account Cloud Storage Pool:** Menyediakan penyimpanan dedicated terdistribusi (Master Index Hub + Worker Accounts) dengan auto-balancing kapasitas.
4. **Keamanan & Privasi:** Galeri klien diproteksi access key unik; URL Google CDN tidak pernah terekspos ke browser client.
5. **Skalabilitas:** Pengelolaan multi-proyek dengan antrean import background, Cloudflare CDN caching 30-hari, dan True Pipe Stream.

---

## 👥 2. Segmentasi Pengguna

| Peran | Akses | Deskripsi |
|---|---|---|
| **Superadmin** | `/admin` | Pemilik SaaS — kelola vendor, paket utama, Add-On storage, 6 payment gateway, Google Drive Pool, sub-admin team, & export laporan keuangan CSV |
| **Sub-Admin** | `/admin` | Anggota tim admin — akses operasional sesuai role yang ditetapkan Superadmin |
| **Vendor (Fotografer)** | `/dashboard` & `/dashboard/storage` | Pelanggan aktif — buat galeri, kelola cloud storage dedicated, upload foto batch, perpanjang langganan, bagikan link galeri ke klien |
| **Klien** | `/gallery/[id]?key=xxx` | Penerima galeri — pilih foto favorit secara instan tanpa perlu mendaftar akun |
| **Pengunjung Trial** | `/trial` & `/trial-gallery/[slug]` | Demo galeri publik dari landing page dengan batasan seleksi dan durasi kedaluwarsa otomatis |

---

## ⚡ 3. Spesifikasi Fitur Utama (Core Features)

### 3.1. Sistem Langganan SaaS Utama (Multi-Tier Subscription)

**3 Paket Utama Aktif (Masa Aktif 30 Hari):**

| Paket Utama | Maks. Proyek | Harga / Bulan | Custom Logo | RAW Selector |
|---|---|---|---|---|
| **Starter Plan** | 5 Proyek | Rp 49.000 | ❌ | ❌ |
| **Pro Studio Plan** | 20 Proyek | Rp 129.000 | ✅ | ✅ |
| **Business Studio Plan** | 50 Proyek | Rp 249.000 | ✅ | ✅ |

**Vendor Status Lifecycle:**
```
draft_plan → pending_payment (QRIS) ──→ active (webhook paid)
           → pending_manual (transfer) ──→ active (Admin approve)
expired_draft / cancelled / suspended
expired (otomatis via autoCheckVendorSubscriptionExpiry saat login/request)
```

**Aturan Akumulasi Renewal & Prorata Upgrade:**
- **Perpanjangan Paket Sama (Renewal):** Hari diakumulasikan dari tanggal kedaluwarsa lama jika belum lewat (`expiresAt = oldExpiresAt + activePeriodDays`), sehingga sisa hari vendor **tidak pernah hangus**.
- **Upgrade Paket Utama:** Harga dikurangi sisa nilai prorata harian paket lama.

---

### 3.2. Add-On Cloud Storage Engine & Order Bump Modal (10 GB – 200 GB)

Sistem Add-On Cloud Storage bersifat dinamis dan dapat disesuaikan kebutuhan fotografer:

**Paket Add-On Storage Aktif (`addon_plans` & Custom Storage Enterprise):**
| Nama Paket Add-On | Kapasitas Storage | Harga / Bulan |
|---|---|---|
| **Drive 10 GB** | 10 GB | Rp 29.000 |
| **Drive 25 GB** | 25 GB | Rp 49.000 |
| **Drive 50 GB** | 50 GB | Rp 89.000 |
| **Custom Enterprise (50–200 GB)** | 50 GB – 200 GB | Rp 1.250 / GB |

**Strategi Order Bump & Pembayaran:**
- **Clean Checkout:** Halaman checkout registrasi awal menampilkan total biaya default Paket Utama, dengan opsi tombol order bump Add-On Storage.
- **Dynamic Re-calculation:** Memilih paket pada modal akan menambahkan line item Add-On di rincian order dan menjumlahkan total tagihan secara instan.
- **Bundled QRIS Payment:** Payment gateway membuat 1 transaksi tunggal dengan `item_details` berisi Paket Utama & Add-On Storage.
- **Automated Instant Setup:** Webhook notification payment gateway mengaktifkan status vendor (`status = 'active'`) dan mengisi `addonStorageQuotaBytes` di database secara serentak (*co-terminous* dengan `expiresAt`).

---

### 3.3. Multi-Provider Payment Gateway (Zero-Code Switch)

Platform mendukung **6 Gateway Pembayaran Indonesia** yang dapat dipilih dan dikonfigurasi dinamis via Admin Panel (`saas_settings`):

| Provider | Driver File | Fitur Utama / Metode | Algoritma Signature Webhook |
|---|---|---|---|
| **IPaymu** (Rekomendasi) | `lib/payment-gateway/ipaymu.js` | Direct QRIS API (Bebas Iframe/Popup, Render Langsung di UI) | HMAC-SHA256 (API Key + VA) |
| **Midtrans** | `lib/payment-gateway/midtrans.js` | Snap Embed / Direct QRIS / GoPay | SHA512 (OrderId + StatusCode + GrossAmount + ServerKey) |
| **Xendit** | `lib/payment-gateway/xendit.js` | Xendit Invoice API, VA, QRIS | Token Header / Webhook Verification Token |
| **Tripay** | `lib/payment-gateway/tripay.js` | Closed Payment QRIS & Virtual Account | HMAC-SHA256 (JSON Body + Private Key) |
| **Duitku** | `lib/payment-gateway/duitku.js` | Duitku Pop / Direct QRIS | MD5 (MerchantCode + OrderId + Amount + ApiKey) |
| **DOKU** | `lib/payment-gateway/doku.js` | DOKU Checkout / Direct Pay | HMAC-SHA256 (Component Signature Header) |

- **Dispatcher Terpusat:** `lib/payment-gateway/index.js` mengelola alur pembuatan pembayaran `createPayment()` dan validasi `verifyPaymentWebhook()` secara transparan.
- **Pengujian Live Gateway:** Endpoint `/api/admin/payment/test` untuk verifikasi koneksi dan kredensial API secara instan.

---

### 3.4. Dedicated Storage Pool & Direct Upload Tickets

- **Multi-Account Storage Pool:** Mengelola Google Drive Master Hub dan Worker Accounts terdaftar di tabel `master_drive_accounts`.
- **Smart Capacity Load Balancing:** Sistem memilih akun worker aktif dengan sisa kapasitas terbanyak (*Highest Free Space First*).
- **Direct Upload Ticket (`/api/storage/upload/ticket`):** Vendor mengunggah berkas foto berukuran besar secara langsung melalui tiket otorisasi berdurasi terbatas ke worker account terpilih tanpa membebani disk server utama.
- **Hardware Adaptive Concurrency & Latency Governor:** Kecepatan unggah paralel disesuaikan secara dinamis dengan spesifikasi CPU/RAM vendor (4 hingga 10 thread paralel) dan lag event-loop browser.

---

### 3.5. Proteksi Galeri Klien: Glassmorphism Lock Overlay 🔒 & Grace Period 30 Hari

- **Proteksi Galeri Klien:**  
  Saat vendor/storage kedaluwarsa, galeri klien di `/gallery/[projectId]` menampilkan efek **Glassmorphism Lock Overlay 🔒** dengan pesan *"GALERI TERKUNCI SEMENTARA"* dan tombol hubungi studio via WhatsApp.
- **Garansi Keamanan Berkas Foto (Grace Period 30 Hari):** Berkas foto **TIDAK DIHAPUS** selama masa tenggang 30 hari. Saat vendor memperpanjang storage, galeri otomatis terbuka instan.
- **Hard Purge Policy (`/api/cron/purge-expired`):** Setelah 30 hari masa tenggang terlampaui, daemon pembersih menghapus metadata dan berkas foto fisik dari Google Drive storage pool.

---

### 3.6. Sistem Email Notifikasi White-Label (`lib/mailer.js`)

1. **Email Tagihan QRIS Pending:** Instruksi pembayaran dengan QRIS dinamis dan tombol pelunasan instan.
2. **Email Instruksi Transfer Manual (24 Jam):** Rincian nomor rekening, nominal, dan batas waktu 24 jam.
3. **Email Bukti Transfer Diterima:** Konfirmasi penerimaan bukti transfer yang menunggu verifikasi admin.
4. **Email Invoice Lunas Resmi:** Invoice HTML resmi dengan nomor `INV-xxx` dan rincian paket + storage.
5. **Email Konfirmasi Upgrade:** Konfirmasi penambahan kuota storage atau kenaikan paket aktif.
6. **Tester SMTP:** Endpoint `/api/admin/smtp/test` untuk pengujian koneksi email langsung dari dashboard admin.

---

### 3.7. RAW Selector — Sortir File RAW Lokal (100% Client-Side)

- **Teknologi:** File System Access API di browser vendor (Chrome/Edge 86+).
- **Fungsi:** Menyalin/memindahkan file RAW asli (`.cr2`, `.cr3`, `.arw`, `.nef`, `.dng`, `.heic`) dari folder sumber lokal ke folder seleksi berdasarkan pilihan klien secara otomatis.
- **Keamanan:** 100% client-side tanpa ada file RAW yang diunggah ke server.

---

### 3.8. Hardened Version Endpoint & Developer Signature

- **Endpoint Publik Aman:** `GET /api/public/version` menyajikan informasi versi sistem (`release`, `version`, `updateAvailable`) secara *asynchronous* dan *non-blocking*.
- **CI/CD Awareness:** Otomatis membaca variabel lingkungan build-time (`VERCEL_GIT_COMMIT_SHA`, `GIT_COMMIT_SHA`) dengan timeout 2 detik untuk git CLI lokal.
- **Anti-Reconnaissance:** Pesan commit internal dan metadata sensitif tidak diekspos ke publik.
