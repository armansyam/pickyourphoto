---
name: claude-reasoning-engine
description: Terapkan metodologi penalaran mendalam, analisis akar masalah (Root Cause Analysis), verifikasi empiris, dan pengeditan kode presisi bergaya Claude 3.5 Sonnet & Claude Code Agent.
---

# 🧠 Claude Reasoning & Agentic Coding Engine

Instruksi ini mengadopsi standar penalaran, metode investigasi, dan disiplin pengkodean tingkat tinggi bergaya **Claude 3.5 Sonnet / Claude Code**.

---

## 1. Mendasari Setiap Tindakan dengan Root Cause Analysis (RCA) Mendalam
- **Dilarang Menembak / Menebak Kode:** Sebelum mengedit satu baris pun, lakukan pencarian (`grep_search`) dan pembacaan berkas (`view_file`) untuk menemukan definisi simbol, variabel, dan alur kueri yang sebenarnya.
- **Traceback Lintas Lapisan:** Telusuri alur data dari antarmuka pengguna (UI/Client), API Route (Next.js), hingga kueri database (SQLite/PostgreSQL) dan callback pihak ketiga (Midtrans/Payment Gateway/Drive API).
- **Anti Symptom Patching:** Dilarang menutup bug dengan `try-catch` kosong, mengubah `if-else` secara asal untuk sekadar meloloskan pengujian, atau mengembalikan `success: true` palsu.

---

## 2. Metodologi Eksekusi Presisi (Surgical Code Edits)
- **Edit Terisolasi & Minimal:** Hanya ubah baris kode yang relevan dengan tugas. Pertahankan komentar, fungsi pendukung, dan struktur berkas yang tidak berhubungan.
- **Gunakan Alat Edit Yang Tepat:** Gunakan `replace_file_content` untuk perubahan tunggal dan `multi_replace_file_content` untuk perubahan non-kontigu pada berkas yang sama.
- **Strict Constraint Enforcement:** Taati aturan tata letak UI, branding white-label (tanpa membawa merk pihak ketiga di UI), dan urutan alur data secara mutlak.

---

## 3. Protokol Verifikasi Empiris (Empirical Testing First)
- **Jangan Pernah Mengklaim Sukses Tanpa Pengujian:** Setelah mengedit berkas, jalankan skrip verifikasi sintaks/runtime (misalnya parser Acorn `node -e ...` atau skrip audit otomatis).
- **Inspeksi Log Un-truncated:** Bila terjadi kegagalan/keterlambatan, baca log error secara utuh dari log uri sebelum mendiagnosis ulang.
- **Cek Skenario Ujung-ke-Ujung (End-to-End Edge Cases):**
  - Alur pendaftar baru (*New Signup*) vs Vendor Aktif (*Existing Upgrade*).
  - Alur pembayaran otomatis (QRIS) vs Manual (Transfer Bank + Bukti Foto).
  - Invalidasi memori cache lokal (`window._cache = null`) agar UI tidak menampilkan data usang (*stale data*).
  - Pemicu email notifikasi resmi pada setiap transaksi lunas.

---

## 4. Siklus Pengecekan Mandiri (Self-Correction Checklist)
Sebelum menyatakan tugas selesai, periksa 5 poin wajib:
1. **Aturan Bisnis:** Apakah alur logika sudah masuk akal bagi pengguna/admin dan tidak saling bertabrakan?
2. **Branding:** Apakah ada nama brand gateway/vendor pihak ketiga yang bocor di UI? (Pastikan 100% White-Label).
3. **Database & Audit:** Apakah seluruh kolom target di database SQLite ter-update presisi?
4. **Email & Notifikasi:** Apakah pemicu email konfirmasi terpasang di endpoint pembaca status?
5. **Kualitas Sintaks:** Apakah kode bebas dari `syntax error` atau kesalahan pengulangan kata di UI?
