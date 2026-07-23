# 🛡️ Standar Penanganan Timeout Jaringan & Rate Limit Google Drive (Impor Resilient Engine)

**Dokumen Acuan Teknis**: Standar Ketahanan Koneksi Jaringan & Pemrosesan Impor Gambar Latar Belakang Platform Pick Your Photo.  
**Tanggal Diperbarui**: 23 Juli 2026  
**Status**: ✅ Aktif & Diterapkan di Kode Produksi  

---

## 🎯 1. Akar Permasalahan (Root Cause Analysis)

Pada sistem impor gambar otomatis dari akun Google Drive publik/vendor, terdapat 3 risiko jaringan utama yang menyebabkan kegagalan impor pada aplikasi biasa:

1. **HTTP 504 Gateway Timeout / Browser Disconnect**:
   - Terjadi bila penarikan ratusan foto dilakukan secara *synchronous* (blocking HTTP request). Reverse Proxy (Nginx/Cloudflare) atau browser akan memutus koneksi setelah 60 detik.
2. **Google Drive Rate Limiting & Bot Protection (HTTP 429 & 403)**:
   - Terjadi saat ratusan *request* HTTP dikirimkan secara beruntun (*burst mode*) dari 1 IP server tanpa jeda. Anti-bot Google mendeteksi ini sebagai serangan DDoS/Automated Scraping.
3. **Stalled Socket / Frozen Network Connection**:
   - Koneksi internet server menggantung saat mengunduh berkas tanpa batas waktu (*no fetch timeout*), membekukan antrean *looping* impor selamanya.

---

## ⚙️ 2. Arsitektur Solusi 4-Lapis (4-Layer Resilient System)

Sistem **Pick Your Photo** mengimplementasikan kombinasi 4 lapis perlindungan mutakhir untuk menjamin keandalan proses impor:

```
[ Frontend Client ]
       │  (1. Request Import -> Langsung Respon < 1s)
       ▼
[ API Route /api/projects ] ───► [ Background Worker Node.js ]
                                            │
                                            ├─► Base Throttle Delay (250ms per foto)
                                            ├─► Hard Timeout (30s per fetch attempt)
                                            ├─► Auto Exponential Retry (1.5s -> 3s -> 6s)
                                            └─► Resumable Import (Skip foto yang sudah diunduh)
```

### 🔹 Lapis 1: Asynchronous Background Processing (Bebas 504 Timeout)
- **Mekanisme**: API `POST /api/projects` langsung mengembalikan respon HTTP `200/201` dalam waktu `< 1 detik` (*instant response*), merilis koneksi browser.
- **Eksekusi**: Fungsi `processImagesInBackground(...)` berjalan mandiri di *event loop* Node.js.
- **Keuntungan**: Fotografer dapat menutup tab browser / mematikan laptop tanpa membatalkan proses impor yang sedang berjalan di server.

### 🔹 Lapis 2: Hard Network Timeout (`AbortSignal.timeout(30000)`)
- **Mekanisme**: Setiap percobaan penarikan 1 foto dibatasi batas waktu keras **30 detik**.
- **Kode**: `fetch(url, { signal: AbortSignal.timeout(30000) })`
- **Keuntungan**: Mencegah proses pengunduhan menggantung selamanya bila jaringan server sempat kehilangan paket data (*packet loss*).

### 🔹 Lapis 3: Exponential Backoff & Retry Automatis (Anti Rate Limit)
- **Mekanisme**: Jika Google merespon dengan HTTP `429` (Rate Limit), `403` (Quota Exceeded), atau `500+` (Server Error), sistem tidak *crash*, melainkan melakukan *retry* otomatis dengan jeda eksponensial:
  - **Percobaan #1**: Tunggu `1,5 detik` (1.500 ms) ➔ Retry
  - **Percobaan #2**: Tunggu `3,0 detik` (3.000 ms) ➔ Retry
  - **Percobaan #3**: Tunggu `6,0 detik` (6.000 ms) ➔ Retry
- **Base Throttling**: Terdapat jeda `250ms` antar-foto untuk meniru pola akses manusia (*human-like request pattern*).

### 🔹 Lapis 4: Resumable Import & Automatic Stale Recovery
- **Pembersihan Otomatis**: Projek yang tertahan di status `importing` > 30 menit akibat server mati mendadak (*crash/reboot*) akan otomatis diubah statusnya menjadi `failed` oleh `cleanStaleImportingProjects()`.
- **1-Click Retry**: Tombol **Impor Ulang (Retry)** pada dashboard memungkinkan fotografer mengulang impor tanpa mengunduh kembali foto yang sudah berhasil tersimpan di disk/DB.

---

## 📊 3. Perbandingan Efisiensi & Ketahanan

| Skenario Penarikan Data | Tanpa Proteksi (Standar) | Dengan Resilient Engine (Pick Your Photo) | Status Ketahanan |
| :--- | :---: | :---: | :---: |
| **Impor 300+ Foto** | ❌ Timeout 504 (Koneksi Putus) | ✅ **Lancar di Background (< 1s Response)** | ⚡ Resilient |
| **Serangan Rate Limit Google (HTTP 429)** | ❌ Proses Batal & Gagal | ✅ **Auto Retry (Jedanya Naik 1.5s ➔ 3s ➔ 6s)** | 🛡️ Anti-Block |
| **Koneksi Jaringan Kedip / Stalled Socket** | ❌ Hanging Selamanya | ✅ **Auto Abort Timeout 30s & Retry** | 🔄 Self-Healing |
| **Browser Ditutup Fotografer** | ❌ Impor Terhenti | ✅ **Tetap Berjalan di Server VPS** | 💎 Enterprise Grade |

---

## 🛠️ 4. Lokasi Berkas Kode Terintegrasi

- 📁 `lib/gdrive-importer.js` (`downloadFileBuffer` dengan Exponential Backoff & AbortSignal Timeout 30s)
- 📁 `app/api/projects/route.js` (`processImagesInBackground` dengan Base Throttle 250ms & Sharp WebP Engine)
- 📁 `lib/db.js` (`cleanStaleImportingProjects` untuk auto-recovery projek terhenti)
- 📁 `app/api/projects/[projectId]/retry/route.js` (Handler 1-Click Resumable Retry Import)

---

*Dokumen ini dibuat otomatis sebagai panduan standar keandalan sistem penarikan media platform Pick Your Photo.*
