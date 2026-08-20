import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

function validateFilename(filename) {
    if (!filename || typeof filename !== 'string') return false;
    // Strict path traversal prevention: must end with .db and contain only safe alphanumeric and _ - characters
    const safeRegex = /^db_[a-zA-Z0-9_\-]+\.db$/;
    return safeRegex.test(filename) && !filename.includes('..') && !filename.includes('/') && !filename.includes('\\');
}

// GET: Download a specific database backup file (.db)
export async function GET(request, { params }) {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        const resolvedParams = await params;
    const filename = resolvedParams?.filename || params?.filename;
        if (!validateFilename(filename)) {
            return NextResponse.json({ message: 'Nama berkas tidak valid.' }, { status: 400 });
        }

        const filePath = path.join(process.cwd(), 'backups', filename);
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ message: 'Berkas cadangan tidak ditemukan.' }, { status: 404 });
        }

        const fileBuffer = fs.readFileSync(filePath);

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.sqlite3',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': String(fileBuffer.length),
                'Cache-Control': 'no-store, no-cache, must-revalidate, private'
            }
        });
    } catch (err) {
        console.error('[Admin Backup Download API] Error:', err);
        return NextResponse.json({ message: 'Gagal mengunduh berkas backup.' }, { status: 500 });
    }
}

// POST: Restore a specific database backup file (.db)
export async function POST(request, { params }) {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        const resolvedParams = await params;
    const filename = resolvedParams?.filename || params?.filename;
        if (!validateFilename(filename)) {
            return NextResponse.json({ message: 'Nama berkas tidak valid.' }, { status: 400 });
        }

        const backupsDir = path.join(process.cwd(), 'backups');
        const targetBackupPath = path.join(backupsDir, filename);

        if (!fs.existsSync(targetBackupPath)) {
            return NextResponse.json({ message: 'Berkas cadangan tidak ditemukan di server.' }, { status: 404 });
        }

        const dbDir = path.join(process.cwd(), 'data');
        const dbFile = path.join(dbDir, 'database.db');
        const nowStr = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);

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

        // 3. Timpa database utama dengan file cadangan yang dipilih
        fs.copyFileSync(targetBackupPath, dbFile);

        // 4. Jadwalkan background reload PM2 secara graceful
        setTimeout(() => {
            exec('pm2 reload pick-your-photo || pm2 restart pick-your-photo', (err, stdout) => {
                if (err) console.log('[PM2 Reload Output]:', err.message);
                else console.log('[PM2 Reload Success]:', stdout.trim());
            });
        }, 800);

        return NextResponse.json({
            success: true,
            message: `Database berhasil dipulihkan dari berkas "${filename}". Sistem sedang memuat ulang...`,
            restoredFile: filename,
            reloadDelayMs: 3000
        });

    } catch (err) {
        console.error('[Admin Restore API] Error:', err);
        return NextResponse.json({ message: err.message || 'Gagal memulihkan database.' }, { status: 500 });
    }
}

// DELETE: Delete an unwanted backup file (.db)
export async function DELETE(request, { params }) {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        const resolvedParams = await params;
    const filename = resolvedParams?.filename || params?.filename;
        if (!validateFilename(filename)) {
            return NextResponse.json({ message: 'Nama berkas tidak valid.' }, { status: 400 });
        }

        const filePath = path.join(process.cwd(), 'backups', filename);
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ message: 'Berkas tidak ditemukan.' }, { status: 404 });
        }

        fs.unlinkSync(filePath);

        return NextResponse.json({
            success: true,
            message: `Berkas cadangan "${filename}" berhasil dihapus.`
        });
    } catch (err) {
        console.error('[Admin Backup Delete API] Error:', err);
        return NextResponse.json({ message: 'Gagal menghapus berkas backup.' }, { status: 500 });
    }
}
