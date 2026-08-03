# BUG-GDRIVE-OAUTH-02: Trial Importer Tidak Menggunakan OAuth Master yang Sudah Tersedia

**Tanggal:** 2026-08-03  
**Status:** Open  
**Prioritas:** CRITICAL  
**File Terkait:** `lib/gdrive-importer.js`, `lib/google-master-drive.js`, `app/api/trial/create/route.js`

---

## 🔍 Ringkasan Masalah

Aplikasi sudah memiliki **OAuth Master Drive** yang lengkap dan fungsional di `lib/google-master-drive.js` (menggunakan `googleapis` + refresh token dari DB `saas_settings`). Namun, **endpoint trial `/api/trial/create` menggunakan `lib/gdrive-importer.js` yang TIDAK memanggil `fetchFolderFilesMasterOAuth`**, melainkan fallback ke HTML scraper yang sangat lambat (13-15 detik).

---

## 🔧 Kode yang Sudah Ada & Berfungsi (Tapi Tidak Dipakai)

### `lib/google-master-drive.js` — ✅ SUDAH SIAP
```javascript
export function getMasterDriveClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID || getSaasSetting('google_client_id');
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || getSaasSetting('google_client_secret');
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || getSaasSetting('google_refresh_token');
  // ... return google.drive({ version: 'v3', auth: oauth2Client });
}

export async function fetchFolderFilesMasterOAuth(folderId) {
  const drive = getMasterDriveClient();
  if (!drive) return null;  // ← returns null jika kredensial tidak lengkap
  // ... drive.files.list() via Google Drive API v3 (CEPAT)
}
```
- Mengambil kredensial dari `saas_settings` (DB) ✅
- Sudah handle refresh token otomatis via `googleapis` ✅
- Menggunakan Drive API v3 resmi (cepat, tidak scrape) ✅
- **Sudah dipakai** di endpoint admin analytics (`app/api/admin/analytics/route.js`) ✅

---

## 🐛 Kode yang Bermasalah

### `lib/gdrive-importer.js` — ❌ TIDAK PAKAI OAUTH MASTER
```javascript
async function fetchFolderFiles(folderId) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (apiKey) {
    return await fetchFolderFilesAPI(folderId, '', apiKey);  // API Key only
  }
  return await scanFolderScraper(folderId, '');  // ← SCRAPER (LAMBAT)
}
```
**Masalah:**
1. Hanya cek `GOOGLE_API_KEY` (env var) — **tidak cek DB OAuth**
2. Tidak impor `fetchFolderFilesMasterOAuth` dari `google-master-drive.js`
3. Langsung fallback ke `scanFolderScraper` (HTML parsing) jika tidak ada API Key

### `app/api/trial/create/route.js` — ❌ PAKAI IMPORTER YANG SALAH
```javascript
import { parseFolderId, fetchFolderFiles } from '@/lib/gdrive-importer';  // ← import yang salah
// ...
files = await fetchFolderFiles(folderId);  // ← panggil yang pakai scraper
```

---

## 📊 Dampak Nyata

| Metrik | Sebelum (Scraper) | Sesudah (Master OAuth) |
|--------|-------------------|------------------------|
| Waktu respons | 13-15 detik | 1-3 detik |
| Reliabilitas | Raghu (HTML parsing) | Tinggi (API resmi) |
| Batas file | Terbatas oleh HTML | 1000+ file per folder |
| Maintenance | Sulit (DOM Google berubah) | Stabil (API versioned) |

---

## 🛠️ Solusi Minimal (1 File Perlu Diubah)

### `lib/gdrive-importer.js` — Tambahkan Jalur OAuth Master

```javascript
// TAMBAHKAN IMPORT
import { fetchFolderFilesMasterOAuth } from './google-master-drive';

async function fetchFolderFiles(folderId) {
  // 1. Coba API Key (jika ada)
  const apiKey = process.env.GOOGLE_API_KEY;
  if (apiKey) {
    return await fetchFolderFilesAPI(folderId, '', apiKey);
  }

  // 2. BARU: Coba OAuth Master (dari DB saas_settings)
  const masterFiles = await fetchFolderFilesMasterOAuth(folderId);
  if (masterFiles !== null) {
    return masterFiles.map(f => ({ ...f, category: '' }));  // normalize format
  }

  // 3. Fallback terakhir: Scraper (warning log)
  console.warn('[GDrive Importer] Fallback ke HTML scraper — konfigurasi OAuth Master belum lengkap');
  return await scanFolderScraper(folderId, '');
}
```

---

## 📋 Root Cause Analysis

| Layer | Status | Keterangan |
|-------|--------|------------|
| **Admin Panel** | ✅ | Simpan Client ID/Secret/Refresh Token ke `saas_settings` |
| **OAuth Callback** | ✅ | Simpan `google_access_token` + `google_refresh_token` ke DB |
| **Master Drive Helper** | ✅ | `google-master-drive.js` lengkap & dipakai admin analytics |
| **Trial Importer** | ❌ | `gdrive-importer.js` **tidak memanggil** helper OAuth Master |
| **Trial Endpoint** | ❌ | `/api/trial/create` pakai importer yang salah |

**Kesimpulan:** Bukan kurangnya integrasi OAuth, tapi **ketidaksesuaian antar modul** — tim backend sudah siapkan OAuth Master, tapi modul trial tidak "terhubung" dengannya.

---

## ✅ Verifikasi Pasca-Fix

1. Deploy ulang → `pm2 restart pick-your-photo`
2. Buka `/trial` → submit folder Google Drive publik
3. Waktu respons harus **< 3 detik** (sebelum 13-15 detik)
4. Log server tidak lagi ada `[GDrive Importer] Fallback ke HTML scraper`

---

**Dibuat oleh:** Hermes Agent  
**Referensi:** Audit lengkap di `AUDIT_FULL_PICKYOURPHOTO.md`  
**Related:** `BUG_REPORT_GDRIVE_PERFORMANCE.md` (bug performa umum)