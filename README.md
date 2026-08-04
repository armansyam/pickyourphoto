# Pick-Your-Photo — Self-Hosted SaaS Platform for Photographers

**Pick-Your-Photo** adalah platform SaaS mandiri yang dirancang khusus untuk memudahkan fotografer (vendor) mengelola proses seleksi foto bersama klien secara online, dengan sistem berlangganan berbasis paket, manajemen galeri, dan integrasi Google Drive.

---

## 🏗️ Arsitektur Sistem

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Database | SQLite via `better-sqlite3` |
| Autentikasi | JWT (cookie `httpOnly`) + bcrypt |
| Payment Gateway | Midtrans (QRIS + Snap) |
| File Storage | Google Drive OAuth2 (Master Drive) |
| Process Manager | PM2 (Server LXC 102) |
| Email | Nodemailer (SMTP) |

---

## 🖥️ Spesifikasi Server Deployment (LXC 102)

| Parameter | Nilai |
|-----------|-------|
| **Container Deploy** | LXC 102 |
| **IP Address LAN Deploy** | `192.168.100.83` |
| **Port Aplikasi** | `3051` |
| **Domain Utama (Primary)** | `https://pilih.ammang.my.id` |
| **Domain Sekunder** | `https://pick-your-photo.ammang.my.id` |
| **Process Manager** | PM2 (Node.js) |
| **Direktori Proyek di LXC 102** | `/DATA/AppData/pickyourphoto` |

---

## ⚙️ Environment Variables Wajib

```env
JWT_SECRET=          # String acak panjang & aman (WAJIB, tidak boleh kosong)
ADMIN_EMAIL=         # Email akun admin
ADMIN_PASSWORD=      # Password akun admin
MIDTRANS_SERVER_KEY= # Server Key Midtrans
MIDTRANS_CLIENT_KEY= # Client Key Midtrans
MIDTRANS_IS_PRODUCTION=false
NODE_ENV=production
```

---

## 🚀 Menjalankan Aplikasi

```bash
# Development
npm run dev

# Production Build & Start
npm run build
pm2 restart pickyourphoto
```

---

## 📊 Alur Registrasi Vendor

```
Vendor mengisi form registrasi
        │
        ├─ Paket Gratis ──────────────► Status: active (langsung aktif)
        │
        ├─ Paket Berbayar (Manual)────► Status: pending_manual
        │                               Admin approve → active + email notifikasi
        │
        └─ Paket Berbayar (QRIS) ────► Status: pending_payment
                                        Midtrans webhook/polling → active + email notifikasi
                                        (Sesi QRIS kedaluwarsa dalam 2 jam)
```

---

*Dikelola oleh: **AGY (Antigravity)** — Tim AMS Development*
