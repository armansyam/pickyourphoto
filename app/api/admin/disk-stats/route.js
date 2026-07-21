import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';
import { statfs } from 'fs/promises';
import path from 'path';
import fs from 'fs';

async function getVolumeStats(targetPath, warningThreshold, criticalThreshold) {
    try {
        let checkPath = targetPath;
        if (!fs.existsSync(checkPath)) {
            checkPath = process.cwd();
        }
        const stats = await statfs(checkPath);
        const totalBytes = stats.blocks * stats.bsize;
        const freeBytes = stats.bfree * stats.bsize;
        const usedBytes = totalBytes - freeBytes;
        const freePercent = totalBytes > 0 ? (freeBytes / totalBytes) * 100 : 0;

        const status = freePercent < criticalThreshold 
            ? 'critical' 
            : freePercent < warningThreshold 
                ? 'warning' 
                : 'safe';

        return {
            total_gb: (totalBytes / 1e9).toFixed(1),
            used_gb: (usedBytes / 1e9).toFixed(1),
            free_gb: (freeBytes / 1e9).toFixed(1),
            free_percent: freePercent.toFixed(1),
            status,
            path: checkPath
        };
    } catch (err) {
        console.error(`Failed statfs for path ${targetPath}:`, err);
        return {
            total_gb: '0.0',
            used_gb: '0.0',
            free_gb: '0.0',
            free_percent: '0.0',
            status: 'safe',
            path: targetPath
        };
    }
}

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

        const warnThr = settings.disk_warning_threshold_percent;
        const critThr = settings.disk_critical_threshold_percent;

        // Path Staging Foto
        const defaultStagingPath = path.join(process.cwd(), 'public', 'staging_uploads');
        const stagingPath = process.env.STAGING_STORAGE_PATH || (fs.existsSync(defaultStagingPath) ? defaultStagingPath : process.cwd());

        // Path Database & System
        const defaultDbPath = path.join(process.cwd(), 'data');
        const dbPath = process.env.DB_STORAGE_PATH || (fs.existsSync(defaultDbPath) ? defaultDbPath : process.cwd());

        const stagingStats = await getVolumeStats(stagingPath, warnThr, critThr);
        const systemStats = await getVolumeStats(dbPath, warnThr, critThr);

        // SQLite DB File Size
        let dbFileSizeMB = '0.00';
        try {
            const dbFilePath = path.join(dbPath, 'database.db');
            if (fs.existsSync(dbFilePath)) {
                const dbStat = fs.statSync(dbFilePath);
                dbFileSizeMB = (dbStat.size / (1024 * 1024)).toFixed(2);
            }
        } catch (dbErr) {
            console.error('Failed to get SQLite db size:', dbErr);
        }

        // Overall status: Staging disk priority + system disk
        const overallStatus = (stagingStats.status === 'critical' || systemStats.status === 'critical')
            ? 'critical'
            : (stagingStats.status === 'warning' || systemStats.status === 'warning')
                ? 'warning'
                : 'safe';

        return NextResponse.json({
            staging: {
                ...stagingStats,
                label: 'Storage Foto Staging (Vendor)',
                description: 'Tempat penampungan file foto & ZIP resolusi tinggi'
            },
            system: {
                ...systemStats,
                db_file_size_mb: dbFileSizeMB,
                label: 'Storage Database SQLite',
                description: 'Tempat penyimpanan berkas database SQLite (database.db)'
            },
            // Backwards compatibility
            total_gb: stagingStats.total_gb,
            used_gb: stagingStats.used_gb,
            free_gb: stagingStats.free_gb,
            free_percent: stagingStats.free_percent,
            status: overallStatus,
            warning_threshold: warnThr,
            critical_threshold: critThr
        });
    } catch (error) {
        console.error('Failed to get disk stats:', error);
        return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
    }
}

