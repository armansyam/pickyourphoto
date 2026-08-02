# 🔒 02. Panduan Database & Strategi Keamanan (Pick Your Photo)

> **Dokumen Resmi Arsitektur Basis Data & Keamanan SaaS**  
> Lokasi: `docs/02-DATABASE-AND-SECURITY.md`

---

## 🗄️ 1. SOP Pemeliharaan & Migrasi Database SQLite

Dokumen ini adalah panduan standar (SOP) untuk memperbarui, memelihara, dan melakukan migrasi skema database SQLite baik pada fase pengembangan (*development*) maupun setelah rilis di server produksi (*production*).

### 🚨 Aturan Emas Pemeliharaan Database (Golden Rules)
1. **Jangan Pernah Menghapus Database Produksi (`database.db`)**: Kehilangan file ini berarti kehilangan seluruh akun pengguna, data plan, proyek, dan status seleksi klien.
2. **Gunakan Pengecekan Eksistensi Kolom Sebelum ALTER TABLE**: Jangan langsung menjalankan `ALTER TABLE ADD COLUMN` tanpa memeriksa apakah kolom tersebut sudah ada untuk mencegah crash SQLite "duplicate column name".
3. **Wajib Daftarkan Database di `.gitignore`**: Pastikan `database.db` lokal di komputer Anda tidak masuk ke repositori Git agar tidak menimpa database di server produksi.

---

### 🔄 Alur Kerja Migrasi SQLite

```text
+-------------------------------------------------------------+
|               FASE 1: MASA PENGEMBANGAN (DEV)               |
|  - Developer bebas menambah ALTER TABLE di lib/db.js        |
|  - Database lokal otomatis ter-update tanpa hapus data      |
+-------------------------------------------------------------+
                              │
                              ▼
+-------------------------------------------------------------+
|             FASE 2: KONSOLIDASI RILIS FINAL                 |
|  - Satukan seluruh kolom baru langsung ke CREATE TABLE dasar|
|  - Bersihkan skrip ALTER TABLE masa dev agar kode rapi      |
+-------------------------------------------------------------+
                              │
                              ▼
+-------------------------------------------------------------+
|             FASE 3: PEMBARUAN PASCA-RILIS (v1.1+)           |
|  - Setiap perubahan skema baru wajib ditulis menggunakan   |
|    blok pengecekan kolom pragma (Aman bagi User Lama & Baru)|
+-------------------------------------------------------------+
```

### 🛠️ Pengecekan Kolom Aman (`lib/db.js`)
```javascript
try {
    const columns = db.pragma('table_info(vendors)');
    const hasColumn = (colName) => columns.some(col => col.name === colName);

    if (!hasColumn('status_baru')) {
        db.exec("ALTER TABLE vendors ADD COLUMN status_baru TEXT DEFAULT 'active'");
        console.log("Migrasi Sukses: Kolom 'status_baru' ditambahkan.");
    }
} catch (err) {
    console.error("Gagal melakukan migrasi:", err);
}
```

---

## 🛡️ 2. Strategi Anti-Pembajakan & Proteksi Kode

Rencana taktis untuk melindungi kekayaan intelektual (IP) aplikasi SaaS dari penyalahgunaan atau penghapusan watermark secara ilegal.

```text
[Aplikasi Next.js]
       │
       ├──> Lapis 1: LICENSE_KEY Check (Kriptografi Lokal)
       │              Decrypt kunci untuk memastikan kecocokan dengan host domain.
       │
       ├──> Lapis 2: Call-Home Check (Validasi Whitelist Pusat)
       │              Silent API request mengirim domain host ke server pusat.
       │
       └──> Lapis 3: Dependency Interlocking (Keterikatan Sistem)
                      Jika skrip proteksi dihapus, login & import GDrive ikut rusak.
```

### Lapis 1: Verifikasi Kriptografi (`LICENSE_KEY`)
- Alih-alih menggunakan toggle boolean sederhana seperti `DISABLE_WATERMARK=true`, sistem menggunakan `LICENSE_KEY` yang diverifikasi secara kriptografis terhadap host domain.

### Lapis 2: Validasi Whitelist Domain (Call-Home)
- Setiap kali server Next.js booting, sistem backend melakukan `fetch` secara sunyi mengirimkan nama domain host ke endpoint whitelist terenkripsi.

### Lapis 3: Keterikatan Sistem (Dependency Interlocking)
- Fungsi validasi lisensi ditanamkan di modul vital seperti [lib/db.js](file:///Users/armansyam/Documents/Project%20AmsDev/pick-your-photo/lib/db.js) atau [lib/auth.js](file:///Users/armansyam/Documents/Project%20AmsDev/pick-your-photo/lib/auth.js). Jika baris pengecekan lisensi dihapus, fungsi database tidak akan merespon, sehingga aplikasi mati total.

---

## 🔒 3. Keamanan Galeri Klien & Akses API

1. **Galeri Access Key**: Klien mengakses galeri menggunakan token enkripsi unik pada URL tanpa login (`/gallery/[projectId]?key=...`).
2. **JWT Cookie Security**: Autentikasi vendor dan admin diproteksi oleh HTTP-Only Secure Cookie `token`.
3. **Isolasi Database (SQLite Lock Prevention)**:
   - Modul `lib/db.js` melewatkan inisialisasi tabel saat `phase-production-build` untuk menghindari bentrokan *lock* `SQLITE_BUSY` antar-worker Next.js.
