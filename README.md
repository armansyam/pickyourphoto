# Pick-Your-Photo: Self-Hosted SaaS

Pick-Your-Photo adalah platform SaaS mandiri yang dirancang khusus untuk mempermudah fotografer (vendor) dalam mengelola proses seleksi foto bersama klien.

## 🤝 ALUR KERJA TIM: AUDIT ↔ IMPLEMENTASI
Aplikasi ini dikelola dengan ritme kerja dua arah antara **Tim Audit (Hermes Agent)** dan **Tim Implementasi (Antigravity)**.
1. **Hermes Agent** pull  → build → audit → push laporan.
2. **Tim Antigravity** baca laporan, kerjakan perbaikan, commit, push.
3. **Hermes Agent** loop otomatis. Jika ada commit baru → audit ulang dan push laporan baru.

