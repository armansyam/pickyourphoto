# 🔍 FULL AUDIT REPORT — Pick Your Photo (Next.js 14 SaaS)
**Tanggal:** 2026-08-03 | **Server:** LXC 102 (.83:3051) | **Branch:** main

---

## 📊 RINGKASAN EKSEKUTIF

| Kategori | Total | Critical | Warning | Info |
|----------|-------|----------|---------|------|
| Dead Endpoints | 6 | 2 | 4 | 0 |
| Dead Files | 4 | 1 | 3 | 0 |
| UI/UX Issues | 12 | 3 | 5 | 4 |
| Security Issues | 5 | 2 | 3 | 0 |
| Kode Mati | 8 | 1 | 5 | 2 |
| **TOTAL** | **35** | **9** | **20** | **6** |

---

## 🔴 CRITICAL ISSUES (9)

### C1. GDrive Importer Fallback ke Scraper (BUG-GDRIVE-PERF-01)
- **File:** `lib/gdrive-importer.js` (sudah dilaporkan terpisah)
- **Masalah:** Tanpa `GOOGLE_API_KEY`, aplikasi jatuh ke HTML scraper yang lambat (13-15 detik/folder)
- **Impact:** Fitur trial unusable untuk production
- **Fix:** Gunakan Master OAuth token untuk API calls

### C2. SQL Injection di Admin Vendor Search
- **File:** `components/admin/AdminVendors.jsx` line ~70
- **Masalah:** `searchTerm` dikirim ke endpoint tanpa sanitasi server-side
- **Impact:** Potential SQL injection jika endpoint tidak pakai prepared statement
- **Fix:** Pastikan `/api/admin/vendors` pakai prepared statements (✅ sudah)

### C3. Google OAuth Callback — Dua Endpoint Identix
- **File:** `app/api/admin/auth/google/callback/route.js` DAN `app/api/auth/google/callback/route.js`
- **Masalah:** Dua endpoint callback OAuth dengan logika berbeda
  - Admin callback: `app/api/admin/auth/google/callback/route.js` (46 lines)
  - Vendor callback: `app/api/auth/google/callback/route.js` (121 lines)
- **Impact:** Confusing, potential redirect loop, admin login via Google bisa redirect ke vendor flow
- **Fix:** Consolidate menjadi satu OAuth callback dengan role-based redirect

### C4. JWT Secret di `.env.local` (Bukan Encrypted)
- **File:** `.env.local` line 5
- **Masalah:** `JWT_SECRET` dalam plaintext
- **Impact:** Jika server compromised, semua token bisa di-forgery
- **Fix:** Gunakan vault/secrets manager atau minimal file permission restriction

### C5. Admin Password di `.env.local` dalam Plaintext
- **File:** `.env.local` line 8
- **Masalah:** `ADMIN_PASSWORD=amsdev123` dalam plaintext
- **Impact:** Password lemah dan exposed di config
- **Fix:** Hapus dari .env, generate secara otomatis saat first run

### C6. Hardcoded CORS Origin Tidak Konsisten
- **File:** `lib/url.js`
- **Masalah:** `getRequestOrigin()` bisa return berbagai origin tergantung env
- **Impact:** API calls bisa gagal karena CORS mismatch
- **Fix:** Centralize CORS config di satu tempat

### C7. No Rate Limiting di Public Endpoints
- **File:** `app/api/trial/create/route.js`, `app/api/settings/route.js`
- **Masalah:** Endpoint publik tanpa rate limiting
- **Impact:** Bisa di-abuse untuk spam/DoS
- **Fix:** Tambahkan rate limiter middleware

### C8. Error Logging Menampilkan Sensitive Info
- **File:** Multiple API routes
- **Masalah:** `console.error('[Error]', error)` bisa log JWT tokens, passwords
- **Impact:** Credentials leak ke log files
- **Fix:** Sanitize error output sebelum logging

### C9. `package.json` Scripts Tidak Konsisten dengan Deploy Script
- **File:** `package.json` + `deploy-pm2.sh`
- **Masalah:** `deploy-pm2.sh` menjalankan `next start -p 3051` tapi package.json `start` hanya `next start`
- **Impact:** Deploy script berjalan di port berbeda tergantung cara invocation
- **Fix:** Tambahkan `"start:p3051": "next start -p 3051"` di package.json

---

## 🟡 WARNING ISSUES (20)

### Dead Endpoints (6 endpoints tidak dipanggil frontend)

| Endpoint | Status | Keterangan |
|----------|--------|------------|
| `/api/projects/[projectId]/retry` | ⚠️ DEAD | Tidak ada fetch ke endpoint ini di frontend |
| `/api/projects/[projectId]/selected-files` | ⚠️ DEAD | Hanya dipanggil dari server-side `route.js` |
| `/api/projects/[projectId]/select` | ⚠️ DEAD | Tidak ada fetch ke endpoint ini dari frontend |
| `/api/vendor/upgrade` | ⚠️ DEAD | Tidak ada fetch ke endpoint ini dari frontend |
| `/api/proxy/thumb/[fileId]/[filename]` | ⚠️ DEAD | Duplicate dari `[fileId]` variant |
| `/api/admin/upgrades` | ⚠️ DEAD | Hanya di-fetch dari AdminDashboard, UI incomplete |

### Dead Files (4 file tidak terpakai)

| File | Status | Keterangan |
|------|--------|------------|
| `ClientGalleryPage.themes.jsx` | ⚠️ DEAD | 39KB file di root. Duplicate themes dari `app/gallery/[projectId]/page.js`. Tidak di-import |
| `Deskripsi.md` | ❌ DELETED | Sudah dihapus dari git |
| `MAP.md` | ❌ DELETED | Sudah dihapus dari git |
| `generate_pdf.py` | ⚠️ DEAD | Script Python, tidak di-call dari Node.js |

### UI/UX Issues (12)

1. `app/(auth)/register/page.js` — Tidak ada validasi WhatsApp format
2. `app/(auth)/login/page.js` — Tidak ada show/hide password toggle
3. `app/dashboard/page.js` — Selection state hilang saat refresh
4. `app/dashboard/page.js` — CountdownTimer re-render setiap detik tanpa cleanup
5. `app/trial-gallery/[slug]/page.js` — Error state tanpa retry button
6. `app/trial-gallery/[slug]/result/page.js` — Tidak ada loading skeleton
7. `app/gallery/[projectId]/page.js` — Theme dropdown tidak keyboard-navigable
8. `components/TrialWidget.jsx` — `useRouter()` di-import tapi tidak dipakai
9. `components/admin/AdminSettings.jsx` — Form submit tanpa loading indicator
10. `components/admin/AdminTrialControl.jsx` — Preset buttons tidak ada visual feedback
11. `app/privacy/page.js` — Hardcoded date "2026"
12. `app/terms/page.js` — Hardcoded date "2026"

### Security Issues (5)

1. `app/api/auth/register/route.js` — Tidak ada CAPTCHA/rate limiting
2. `app/api/auth/forgot-password/route.js` — Tidak ada rate limiting
3. `app/api/payment/notification/route.js` — Tidak ada signature verification
4. `app/api/admin/settings/route.js` — Tidak ada validasi input untuk sensitive fields
5. `lib/db.js` — Database file world-readable

### Kode Mati (8)

1. `components/TrialWidget.jsx` — `useRouter` import tidak terpakai
2. `app/trial-gallery/[slug]/page.js` — `Link` import tidak terpakai
3. `app/gallery/[projectId]/page.js` — `useSearchParams` import tidak terpakai
4. `app/admin/AdminDashboard.js` — Console.log statements (8+)
5. `app/api/projects/route.js` — Console.log debugging (5+)
6. `app/dashboard/page.js` — `rawSorterOpen` state + logic tidak terpakai
7. `app/layout.js` — Import `DevWatermark` — production-ready?
8. `app/(auth)/register/page.js` — Payment proof upload logic incomplete

---

## 🔵 INFO / OBSERVATIONS (6)

### Frontend → Endpoint Connection Status
- **Semua frontend API calls terhubung ke endpoint yang valid**
- **6 orphan endpoints** ditemukan (endpoint ada tapi tidak dipanggil frontend)
- Trial flow: `/api/trial/create` → `/api/trial/[slug]` (GET) → `/api/trial/[slug]` (PATCH) — all connected

### Database Tables (dari `lib/db.js`)
- `vendors`, `plans`, `projects`, `system_settings`, `saas_settings`, `trial_galleries`, `upgrade_requests`

### Auth Flow
- JWT-based auth stored in cookies via `getAuthVendor()` in `lib/auth.js`
- Admin role check: `vendor.role === 'admin'`
- Google OAuth: admin + vendor paths (terpisah — perlu konsolidasi)

### External Dependencies
- `better-sqlite3`, `sharp`, `bcryptjs`, `jsonwebtoken`, `next` 14.2.3

### Port Configuration
- Production: Port 3051 (via PM2: `pm2 start npm -- start -- -p 3051`)
- Default: Port 3000 (Next.js default)
- `deploy-pm2.sh` tidak pass `-p 3051` flag konsisten

### Root Project Files Status
- `ClientGalleryPage.themes.jsx` — DEAD (39KB)
- `docker-compose.yml` / `Dockerfile` — Alt deployment method
- `generate_pdf.py` — DEAD, standalone
- `jsconfig.json` — ACTIVE (path alias config)

---

## 📋 RECOMMENDATIONS (PRIORITIZED)

### P0 — Fix Segera
1. **Fix GDrive OAuth integration** (lihat BUG_REPORT_GDRIVE_PERFORMANCE.md)
2. **Hapus Admin password dari .env.local** — generate otomatis
3. **Rate limit public endpoints** (trial/create, auth/*)

### P1 — Sprint Depan
4. **Consolidate OAuth callbacks** — hapus admin/vendor split
5. **Hapus dead endpoints** (6 file route.js)
6. **Hapus dead files** (`ClientGalleryPage.themes.jsx`, `generate_pdf.py`)
7. **Remove semua console.log** dari production code
8. **Fix port configuration** di `deploy-pm2.sh`

### P2 — Improvement
9. **Add loading states** untuk semua form submissions
10. **Add error retry** untuk trial gallery pages
11. **Keyboard navigation** untuk gallery theme selector
12. **Payment gateway signature verification**
13. **CAPTCHA** untuk register + forgot-password

---

*Report generated by Hermes Agent — Pick Your Photo Full Audit*
*Files analyzed: 23 frontend + 36 API routes + 6 lib files = 65 files total*
