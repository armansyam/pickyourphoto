import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

function getBackupsDir() {
    const dir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

// GET /api/admin/backups — List all available database backups
export async function GET() {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        const backupsDir = getBackupsDir();
        const files = fs.readdirSync(backupsDir)
            .filter(f => f.endsWith('.db'))
            .map(f => {
                const fullPath = path.join(backupsDir, f);
                const stat = fs.statSync(fullPath);
                const dateObj = new Date(stat.mtimeMs);
                return {
                    fileName: f,
                    sizeBytes: stat.size,
                    sizeFormatted: (stat.size / 1024).toFixed(1) + ' KB',
                    createdAt: stat.mtimeMs,
                    dateFormatted: dateObj.toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                    }),
                    timeFormatted: dateObj.toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    }) + ' WIB',
                    isPreRestore: f.includes('pre_restore'),
                    isUploaded: f.includes('uploaded')
                };
            })
            .sort((a, b) => b.createdAt - a.createdAt);

        return NextResponse.json({
            backups: files,
            totalCount: files.length
        });
    } catch (err) {
        console.error('[Admin Backups API] List error:', err);
        return NextResponse.json({ message: 'Gagal memuat daftar berkas backup.' }, { status: 500 });
    }
}

// POST /api/admin/backups — Create manual snapshot OR Upload & Restore .db file
export async function POST(request) {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        const contentType = request.headers.get('content-type') || '';
        const backupsDir = getBackupsDir();
        const dbDir = path.join(process.cwd(), 'data');
        const dbFile = path.join(dbDir, 'database.db');

        // CASE A: Upload & Restore via FormData (.db file)
        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            const file = formData.get('file');

            if (!file || typeof file === 'string') {
                return NextResponse.json({ message: 'Pilih file database (.db) yang valid.' }, { status: 400 });
            }

            const fileName = file.name || 'uploaded.db';
            if (!fileName.endsWith('.db')) {
                return NextResponse.json({ message: 'Format file tidak didukung. Harap unggah file SQLite (.db).' }, { status: 400 });
            }

            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            // Validasi SQLite header signature: "SQLite format 3\0"
            const headerString = buffer.slice(0, 16).toString('ascii');
            if (!headerString.startsWith('SQLite format 3')) {
                return NextResponse.json({ message: 'Berkas yang diunggah bukan database SQLite 3 yang valid.' }, { status: 400 });
            }

            const nowStr = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
            const targetUploadName = `db_uploaded_${nowStr}.db`;
            const targetUploadPath = path.join(backupsDir, targetUploadName);

            // Simpan file yang diunggah ke folder backups
            fs.writeFileSync(targetUploadPath, buffer);

            // 1. Safety Step: Buat emergency pre-restore snapshot dari database saat ini
            if (fs.existsSync(dbFile)) {
                const emergencyBackupPath = path.join(backupsDir, `db_pre_restore_${nowStr}.db`);
                try {
                    fs.copyFileSync(dbFile, emergencyBackupPath);
                    console.log(`[Admin Restore API] Emergency snapshot dibuat: ${emergencyBackupPath}`);
                } catch (snapErr) {
                    console.warn('[Admin Restore API] Warning pre-restore snapshot:', snapErr.message);
                }
            }

            // 2. Bersihkan file WAL & SHM lama
            const walFile = path.join(dbDir, 'database.db-wal');
            const shmFile = path.join(dbDir, 'database.db-shm');
            if (fs.existsSync(walFile)) { try { fs.unlinkSync(walFile); } catch (_) {} }
            if (fs.existsSync(shmFile)) { try { fs.unlinkSync(shmFile); } catch (_) {} }

            // 3. Timpa database utama dengan file yang diunggah
            fs.copyFileSync(targetUploadPath, dbFile);

            // 4. Jadwalkan background reload PM2 secara graceful
            setTimeout(() => {
                exec('pm2 reload pick-your-photo || pm2 restart pick-your-photo', (err, stdout) => {
                    if (err) console.log('[PM2 Reload Output]:', err.message);
                    else console.log('[PM2 Reload Success]:', stdout.trim());
                });
            }, 800);

            return NextResponse.json({
                success: true,
                message: `Database berhasil dipulihkan dari file unggahan (${fileName}). Sistem sedang memuat ulang...`,
                restoredFile: targetUploadName,
                reloadDelayMs: 3000
            });
        }

        // CASE B: Buat Manual Snapshot saat ini via JSON request
        let body = {};
        try { body = await request.json(); } catch (_) {}

        const nowStr = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
        const newBackupFileName = `db_${nowStr}.db`;
        const newBackupPath = path.join(backupsDir, newBackupFileName);

        // Eksekusi online backup SQLite aman via fs.copyFileSync
        try {
            if (fs.existsSync(dbFile)) {
                fs.copyFileSync(dbFile, newBackupPath);
            } else {
                return NextResponse.json({ message: 'Database file tidak ditemukan di server.' }, { status: 404 });
            }
        } catch (copyErr) {
            await new Promise((resolve, reject) => {
                exec(`sqlite3 "${dbFile}" ".backup '${newBackupPath}'"`, (err, stdout, stderr) => {
                    if (err) return reject(new Error(stderr || err.message));
                    resolve(stdout);
                });
            });
        }

        // Jalankan pembersihan aset lokal juga
        exec('bash scripts/backup-photos.sh', () => {});

        const stat = fs.statSync(newBackupPath);

        return NextResponse.json({
            success: true,
            message: `Snapshot database berhasil dibuat: ${newBackupFileName}`,
            fileName: newBackupFileName,
            sizeFormatted: (stat.size / 1024).toFixed(1) + ' KB'
        });

    } catch (err) {
        console.error('[Admin Backups API] POST error:', err);
        return NextResponse.json({ message: err.message || 'Gagal memproses permintaan backup.' }, { status: 500 });
    }
}
