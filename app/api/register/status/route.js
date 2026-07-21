import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { statfs } from 'fs/promises';

export async function GET() {
    try {
        const settings = db.prepare("SELECT * FROM system_settings WHERE id = 1").get() || {
            enable_registration: 1,
            enable_free_trial: 1,
            max_vendor_quota: null,
            disk_critical_threshold_percent: 10
        };

        // 1. Check if manually closed by admin
        if (settings.enable_registration === 0) {
            return NextResponse.json({
                registration_open: false,
                free_trial_available: false,
                reason_closed: 'Pendaftaran vendor baru saat ini sedang ditutup oleh administrator.'
            });
        }

        // 2. Check disk-space based critical threshold
        try {
            const checkPath = process.cwd();
            const stats = await statfs(checkPath);
            const totalBytes = stats.blocks * stats.bsize;
            const freeBytes = stats.bfree * stats.bsize;
            const freePercent = (freeBytes / totalBytes) * 100;

            if (freePercent < settings.disk_critical_threshold_percent) {
                return NextResponse.json({
                    registration_open: false,
                    free_trial_available: false,
                    reason_closed: 'Kuota registrasi kami sudah penuh saat ini. Silakan coba beberapa saat lagi.'
                });
            }
        } catch (diskErr) {
            console.error('Failed to read disk space during registration status check:', diskErr);
            // Allow registration to proceed if stats check fails, but log it
        }

        // 3. Check vendor quota based threshold
        if (settings.max_vendor_quota !== null && settings.max_vendor_quota > 0) {
            const activeVendorCount = db.prepare(`
                SELECT COUNT(*) as count 
                FROM vendors 
                WHERE role = 'vendor' AND status = 'active'
            `).get()?.count || 0;

            if (activeVendorCount >= settings.max_vendor_quota) {
                return NextResponse.json({
                    registration_open: false,
                    free_trial_available: false,
                    reason_closed: 'Kuota registrasi kami sudah penuh saat ini.'
                });
            }
        }

        // All checks passed!
        return NextResponse.json({
            registration_open: true,
            free_trial_available: settings.enable_free_trial === 1,
            reason_closed: null
        });
    } catch (error) {
        console.error('Failed to get registration status:', error);
        return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
    }
}
