import { NextResponse } from 'next/server';
import { getAuthAdmin } from '@/lib/auth';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
    try {
        const admin = getAuthAdmin();
        if (!admin) {
            return NextResponse.json({ message: 'Unauthorized. Hanya Superadmin yang dapat mengakses fitur ini.' }, { status: 401 });
        }

        const body = await request.json();
        const { type, adminPassword } = body; // type: 'financial' | 'vendors'

        if (!type || !['financial', 'vendors'].includes(type)) {
            return NextResponse.json({ message: 'Tipe reset data tidak valid. Pilih "financial" atau "vendors".' }, { status: 400 });
        }

        if (!adminPassword) {
            return NextResponse.json({ message: 'Password Superadmin wajib diisi untuk konfirmasi keamanan.' }, { status: 400 });
        }

        // 1. Verifikasi Password Superadmin
        const currentAdmin = db.prepare('SELECT * FROM admins WHERE id = ?').get(admin.id);
        if (!currentAdmin || !bcrypt.compareSync(adminPassword, currentAdmin.password)) {
            return NextResponse.json({ message: 'Password Superadmin salah. Operasi dibatalkan demi keamanan.' }, { status: 403 });
        }

        // 2. Buat Snapshot Backup Darurat Otomatis sebelum reset
        const dbPath = path.join(process.cwd(), 'data', 'database.db');
        const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15);
        const backupDir = path.join(process.cwd(), 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        const snapshotFileName = `db_pre_clean_${type}_${timestamp}.db`;
        const snapshotPath = path.join(backupDir, snapshotFileName);
        
        if (fs.existsSync(dbPath)) {
            try {
                fs.copyFileSync(dbPath, snapshotPath);
            } catch (backupErr) {
                console.error('Failed to create pre-clean snapshot:', backupErr);
                return NextResponse.json({ message: 'Gagal membuat snapshot backup darurat. Operasi dibatalkan demi keamanan.' }, { status: 500 });
            }
        }

        // 3. Eksekusi Pembersihan Data secara Atomik (SQLite Transaction)
        const cleanTransaction = db.transaction(() => {
            if (type === 'financial') {
                // Hanya bersihkan riwayat transaksi, invoice, dan sesi pembayaran
                try { db.exec('DELETE FROM payment_transactions;'); } catch (_) {}
                try { db.exec('DELETE FROM payment_sessions;'); } catch (_) {}
                try { db.exec('DELETE FROM storage_addon_subscriptions;'); } catch (_) {}
                try { db.exec('DELETE FROM subscription_requests;'); } catch (_) {}
                try { db.exec("UPDATE vendors SET paymentProof = NULL;"); } catch (_) {}
            } else if (type === 'vendors') {
                // Fresh Start: Bersihkan seluruh data vendor, klien, proyek, foto, dan transaksi
                try { db.exec('DELETE FROM selections;'); } catch (_) {}
                try { db.exec('DELETE FROM photos;'); } catch (_) {}
                try { db.exec('DELETE FROM clients;'); } catch (_) {}
                try { db.exec('DELETE FROM projects;'); } catch (_) {}
                try { db.exec('DELETE FROM storage_files;'); } catch (_) {}
                try { db.exec('DELETE FROM storage_folders;'); } catch (_) {}
                try { db.exec('DELETE FROM daily_upload_logs;'); } catch (_) {}
                try { db.exec('DELETE FROM upload_queue;'); } catch (_) {}
                try { db.exec('DELETE FROM trial_galleries;'); } catch (_) {}
                try { db.exec('DELETE FROM payment_transactions;'); } catch (_) {}
                try { db.exec('DELETE FROM payment_sessions;'); } catch (_) {}
                try { db.exec('DELETE FROM storage_addon_subscriptions;'); } catch (_) {}
                try { db.exec('DELETE FROM subscription_requests;'); } catch (_) {}
                try { db.exec('DELETE FROM vendors;'); } catch (_) {}
            }
        });

        cleanTransaction();

        // 4. Shrink & Defragment SQLite
        try {
            db.exec('VACUUM;');
        } catch (_) {}

        return NextResponse.json({
            success: true,
            type,
            snapshotFileName,
            message: type === 'financial' 
                ? 'Seluruh data riwayat transaksi keuangan uji coba telah dibersihkan. Grafik pendapatan kembali ke Rp 0.'
                : 'Seluruh akun vendor & galeri uji coba telah dibersihkan. Seluruh pengaturan kredensial, paket SaaS, dan akun admin tetap aman utuh.'
        });

    } catch (error) {
        console.error('Reset Data API Error:', error);
        return NextResponse.json({ message: 'Terjadi kesalahan sistem saat membersihkan data: ' + error.message }, { status: 500 });
    }
}
