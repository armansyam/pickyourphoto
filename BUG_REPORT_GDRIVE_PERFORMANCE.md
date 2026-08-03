# Laporan Bug: Impor Trial Google Drive Sangat Lambat Karena Fallback ke Scraper

- **ID:** BUG-GDRIVE-PERF-01
- **Tanggal:** 2026-08-03
- **Status:** Open
- **Prioritas:** Tinggi (Fungsi inti terganggu, menyebabkan pengalaman pengguna yang buruk)

## Ringkasan Masalah

Fitur Instant Trial berjalan sangat lambat, membutuhkan waktu 13-15 detik untuk memproses folder Google Drive meskipun hanya berisi sedikit file (contoh: 63 foto). Performa lambat ini terjadi bahkan ketika aplikasi sudah terintegrasi dengan Google OAuth 2.0 melalui panel admin.

Seharusnya, proses impor selesai dalam 1-3 detik dengan menggunakan Google Drive API. Kenyataannya, aplikasi menggunakan metode *scraping* HTML yang lambat.

## Analisis Akar Masalah

Penyebab utama masalah ini ada di file , spesifiknya pada fungsi .



Logika kode di atas hanya memeriksa keberadaan . Jika variabel ini tidak ada, kode **langsung beralih ke metode  yang lambat.**

Kode ini **gagal memanfaatkan kredensial OAuth 2.0 (access token)** yang seharusnya sudah ada dari hasil integrasi Google di panel admin. Aplikasi seharusnya bisa menggunakan token ini untuk melakukan panggilan API yang cepat, tetapi malah memilih jalur *scraping* yang tidak efisien.

## Langkah-langkah Reproduksi Bug

1.  Jalankan aplikasi tanpa  di file .
2.  Pastikan integrasi Google OAuth 2.0 sudah dikonfigurasi dengan benar di panel admin.
3.  Buka halaman .
4.  Masukkan URL folder publik Google Drive.
5.  Klik Buat Galeri Trial.
6.  Amati waktu proses yang sangat lama (10+ detik).

## Solusi yang Disarankan

Fungsi  perlu direfaktor untuk memprioritaskan metode otentikasi dengan benar:

1.  **Prioritas 1: API Key.** Jika  ada, gunakan itu.
2.  **Prioritas 2: OAuth 2.0 Access Token.** Jika API Key tidak ada, periksa apakah ada token OAuth yang valid dari integrasi admin. Gunakan token ini untuk otentikasi. Ini adalah **bagian yang hilang**.
3.  **Prioritas 3: HTML Scraper.** Gunakan ini hanya sebagai pilihan terakhir jika tidak ada kredensial sama sekali.

### Contoh Perbaikan Kode (Pseudo-code):



Perubahan ini akan memastikan aplikasi selalu menggunakan Google Drive API yang cepat selama kredensial yang layak (API Key atau OAuth) tersedia, sehingga menyelesaikan masalah performa.
