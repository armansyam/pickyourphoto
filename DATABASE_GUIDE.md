# SOP Pemeliharaan & Migrasi Database SQLite (Pick Your Photo)

Dokumen ini adalah panduan standar (SOP) untuk tim pengembang dalam memperbarui, memelihara, dan melakukan migrasi skema database SQLite baik pada fase pengembangan (*development*) maupun setelah rilis di server produksi (*production*).

---

## 🚨 1. Aturan Emas Pemeliharaan Database (Golden Rules)

1.  **Jangan Pernah Menghapus Database Produksi (`database.db`)**: Kehilangan file ini berarti kehilangan seluruh akun pengguna, data plan, proyek, dan status seleksi klien.
2.  **Gunakan Pengecekan Eksistensi Kolom Sebelum ALTER TABLE**: Jangan langsung menjalankan `ALTER TABLE ADD COLUMN` tanpa memeriksa apakah kolom tersebut sudah ada. Hal ini akan menyebabkan aplikasi *crash* karena error SQLite "duplicate column name".
3.  **Wajib Daftarkan Database di `.gitignore`**: Pastikan `database.db` lokal di komputer Anda tidak masuk ke repositori Git agar tidak menimpa database di server produksi saat proses `git pull`.

---

## 🔄 2. Alur Kerja Siklus Database (Development vs Production)

Untuk menjaga kode tetap bersih namun tetap aman bagi pengguna lama, kita membagi penanganan database ke dalam 3 fase berikut:

```text
+-------------------------------------------------------------+
|               FASE 1: MASA PENGEMBANGAN (DEV)               |
|  - Developer bebas menambah ALTER TABLE di lib/db.js        |
|  - Database lokal otomatis ter-update tanpa hapus data      |
+-------------------------------------------------------------+
                              │
                              ▼
+-------------------------------------------------------------+
|             FASE 2: KONSOLIDASI RILIS FINAL (v1.0)          |
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

---

## 🛠️ 3. Panduan Teknis Penulisan Migrasi yang Aman

Setiap kali Anda ingin menambahkan kolom baru pada file [lib/db.js](file:///Users/armansyam/Documents/Project%20AmsDev/pick-your-photo/lib/db.js), gunakan pola pemeriksaan di bawah ini untuk mencegah kegagalan inisialisasi aplikasi.

### Contoh Implementasi Kode untuk Menambah Kolom Baru:
```javascript
try {
    // 1. Ambil informasi seluruh kolom dari tabel tujuan (misal: tabel vendors)
    const columns = db.pragma('table_info(vendors)');
    const hasColumn = (colName) => columns.some(col => col.name === colName);

    // 2. Lakukan pemeriksaan sebelum menambah kolom baru
    if (!hasColumn('status_baru')) {
        db.exec("ALTER TABLE vendors ADD COLUMN status_baru TEXT DEFAULT 'active'");
        console.log("Migrasi Sukses: Kolom 'status_baru' ditambahkan ke tabel vendors.");
    }
} catch (err) {
    console.error("Gagal melakukan migrasi tabel vendors:", err);
}
```

---

## 📋 4. Langkah Detil Melakukan Update di Server Produksi

Saat Anda merilis fitur baru yang memerlukan perubahan database ke server produksi, ikuti langkah-langkah berikut:

1.  **Backup Database Lama**: 
    Sebelum melakukan update/pull kode baru, salin file database produksi Anda sebagai cadangan:
    ```bash
    cp /var/www/pick-your-photo/data/database.db /var/www/pick-your-photo/data/database_backup_$(date +%F).db
    ```
2.  **Pull Kode Baru**: 
    Lakukan git pull untuk menarik kode terbaru dari repositori:
    ```bash
    git pull origin main
    ```
3.  **Rebuild / Restart Container**: 
    Jalankan docker-compose untuk memperbarui aplikasi Next.js:
    ```bash
    docker compose down
    docker compose up -d --build
    ```
4.  **Verifikasi Otomatis**:
    Ketika aplikasi Next.js pertama kali aktif pasca-update, fungsi `initDb()` di [lib/db.js](file:///Users/armansyam/Documents/Project%20AmsDev/pick-your-photo/lib/db.js) akan otomatis terpanggil. Fungsi tersebut akan:
    *   Mendeteksi database yang sudah ada di folder volume.
    *   Melewati bagian `CREATE TABLE` karena tabel sudah ada.
    *   Mendeteksi kolom baru yang belum ada menggunakan fungsi `hasColumn` dan menambahkannya lewat `ALTER TABLE`.
    *   Data lama pengguna tetap aman 100%!
