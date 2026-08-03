# Pick-Your-Photo: Self-Hosted SaaS

Pick-Your-Photo adalah platform SaaS mandiri yang dirancang khusus untuk mempermudah fotografer (vendor) dalam mengelola proses seleksi foto bersama klien.

## 🤝 ALUR KERJA TIM KROSS-SERVER: AUDIT (HERMES) ↔ IMPLEMENTASI (ANTIGRAVITY)

Aplikasi ini dikelola dengan ritme kerja dua arah lintas-server melalui kanal berkas **`REPORTS/`** di repositori GitHub:

- **Server Auditor (Hermes Agent @ LXC 102)**:
  1. Mengunduh commit perbaikan terbaru (`git pull origin main`).
  2. Melakukan audit komprehensif (Keamanan, Dead Code, Business Logic, QRIS, & Build).
  3. Mem-push berkas laporan temuan baru ke folder **`REPORTS/pending/AUDIT_XXX.md`**.

- **Server Implementasi (Antigravity Agent @ Local IDE / Dev)**:
  1. Membaca laporan di **`REPORTS/pending/`**.
  2. Memperbaiki kode, me-run `npm run build`, dan memindahkan status berkas ke **`REPORTS/verified/AUDIT_XXX.md`**.
  3. Mem-push commit perbaikan kembali ke GitHub `origin/main`.

- **Loop Lintas Server**: Hermes Agent di LXC 102 mendeteksi push dari Antigravity, lalu melakukan audit verifikasi ulang hingga 100% lulus audit production.


