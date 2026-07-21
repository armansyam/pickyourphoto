import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';
import { statfs } from 'fs/promises';

export async function GET() {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        const settings = db.prepare("SELECT * FROM system_settings WHERE id = 1").get() || {
            disk_warning_threshold_percent: 20,
            disk_critical_threshold_percent: 10
        };

        const checkPath = process.cwd();
        const stats = await statfs(checkPath);
        const totalBytes = stats.blocks * stats.bsize;
        const freeBytes = stats.bfree * stats.bsize;
        const usedBytes = totalBytes - freeBytes;
        const freePercent = (freeBytes / totalBytes) * 100;

        const status = freePercent < settings.disk_critical_threshold_percent 
            ? 'critical' 
            : freePercent < settings.disk_warning_threshold_percent 
                ? 'warning' 
                : 'safe';

        return NextResponse.json({
            total_gb: (totalBytes / 1e9).toFixed(1),
            used_gb: (usedBytes / 1e9).toFixed(1),
            free_gb: (freeBytes / 1e9).toFixed(1),
            free_percent: freePercent.toFixed(1),
            status,
            warning_threshold: settings.disk_warning_threshold_percent,
            critical_threshold: settings.disk_critical_threshold_percent
        });
    } catch (error) {
        console.error('Failed to get disk stats:', error);
        return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
    }
}
