import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

export async function GET() {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        // Fetch settings for backup configurations
        const settings = db.prepare("SELECT * FROM system_settings WHERE id = 1").get() || {
            enable_auto_backup: 0,
            backup_interval_hours: 6
        };

        // 1. Get top storage users (vendors)
        const topStorageQuery = db.prepare(`
            SELECT 
                v.id, 
                v.name, 
                v.email,
                p.name as planName,
                p.planType,
                p.maxStorageMB,
                COALESCE(SUM(ph.fileSizeBytes), 0) as totalBytes
            FROM vendors v
            LEFT JOIN plans p ON v.planId = p.id
            LEFT JOIN projects pr ON pr.vendorId = v.id
            LEFT JOIN photos ph ON ph.projectId = pr.id
            WHERE v.role = 'vendor'
            GROUP BY v.id
            ORDER BY totalBytes DESC
            LIMIT 5
        `);
        const topStorageUsers = topStorageQuery.all().map(u => ({
            ...u,
            totalMB: (u.totalBytes / (1024 * 1024)).toFixed(2)
        }));

        // 2. Get plan distribution
        const planDistQuery = db.prepare(`
            SELECT 
                p.name, 
                p.planType,
                COUNT(v.id) as count
            FROM plans p
            LEFT JOIN vendors v ON v.planId = p.id AND v.status = 'active'
            GROUP BY p.id
            ORDER BY count DESC
        `);
        const planDistribution = planDistQuery.all();

        // 3. Get system statistics
        const totalPhotos = db.prepare("SELECT COUNT(*) as count FROM photos").get()?.count || 0;
        const totalProjects = db.prepare("SELECT COUNT(*) as count FROM projects").get()?.count || 0;

        // Get database file size
        let dbSizeBytes = 0;
        try {
            const dbPath = path.join(process.cwd(), 'data', 'database.db');
            if (fs.existsSync(dbPath)) {
                dbSizeBytes = fs.statSync(dbPath).size;
            }
        } catch (dbErr) {
            console.error('Failed to get database size:', dbErr);
        }

        // Get last backup time from backups/ folder
        let lastBackupMs = 0;
        let lastBackupTime = 'Belum pernah';
        try {
            const backupsDir = path.join(process.cwd(), 'backups');
            if (fs.existsSync(backupsDir)) {
                const files = fs.readdirSync(backupsDir)
                    .filter(f => f.startsWith('db_') && f.endsWith('.db'))
                    .map(f => {
                        const stat = fs.statSync(path.join(backupsDir, f));
                        return { name: f, time: stat.mtimeMs };
                    })
                    .sort((a, b) => b.time - a.time);
                
                if (files.length > 0) {
                    lastBackupMs = files[0].time;
                    const latest = new Date(files[0].time);
                    lastBackupTime = latest.toLocaleString('id-ID');
                }
            }
        } catch (backupErr) {
            console.error('Failed to get last backup time:', backupErr);
        }

        // Trigger auto backup if enabled and interval elapsed
        if (settings.enable_auto_backup === 1) {
            const now = Date.now();
            const intervalMs = settings.backup_interval_hours * 60 * 60 * 1000;
            if (now - lastBackupMs > intervalMs) {
                console.log(`[Auto Backup Triggered] Last backup was at: ${lastBackupTime}. Running backups...`);
                
                // Execute backup scripts asynchronously (fire and forget)
                exec('bash scripts/backup-db.sh', (err, stdout) => {
                    if (err) console.error('[Auto Backup DB Error]', err);
                    else console.log('[Auto Backup DB Success]', stdout);
                });
                exec('bash scripts/backup-photos.sh', (err, stdout) => {
                    if (err) console.error('[Auto Backup Photos Error]', err);
                    else console.log('[Auto Backup Photos Success]', stdout);
                });
            }
        }

        return NextResponse.json({
            topStorageUsers,
            planDistribution,
            enable_auto_backup: settings.enable_auto_backup,
            backup_interval_hours: settings.backup_interval_hours,
            systemStats: {
                totalPhotos,
                totalProjects,
                dbSizeBytes,
                dbSizeMB: (dbSizeBytes / (1024 * 1024)).toFixed(2),
                lastBackupTime
            }
        });
    } catch (error) {
        console.error('Failed to retrieve analytics:', error);
        return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
    }
}
