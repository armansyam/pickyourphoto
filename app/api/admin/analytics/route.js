import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
            LEFT JOIN vendors v ON v.planId = p.id AND v.status = 'active' AND v.role = 'vendor'

            GROUP BY p.id
            ORDER BY count DESC
        `);
        const planDistribution = planDistQuery.all();

        // 3. Get system statistics & real metrics
        const totalPhotos = db.prepare("SELECT COUNT(*) as count FROM photos").get()?.count || 0;
        const selectedPhotosCount = db.prepare("SELECT COUNT(*) as count FROM selections").get()?.count || 0;
        const totalProjects = db.prepare("SELECT COUNT(*) as count FROM projects").get()?.count || 0;
        const completedProjectsCount = db.prepare("SELECT COUNT(*) as count FROM projects WHERE status = 'completed'").get()?.count || 0;
        const activeVendorsCount = db.prepare("SELECT COUNT(*) as count FROM vendors WHERE role = 'vendor' AND status = 'active'").get()?.count || 0;
        const pendingVendorCount = db.prepare("SELECT COUNT(*) as count FROM vendors WHERE role = 'vendor' AND status = 'pending'").get()?.count || 0;
        const totalVendorsCount = db.prepare("SELECT COUNT(*) as count FROM vendors WHERE role = 'vendor'").get()?.count || 0;
        const pendingUpgradesCount = db.prepare("SELECT COUNT(*) as count FROM subscription_requests WHERE status = 'pending'").get()?.count || 0;

        const mrrResult = db.prepare(`
            SELECT COALESCE(SUM(p.price), 0) as total 
            FROM vendors v 
            JOIN plans p ON v.planId = p.id 
            WHERE v.role = 'vendor' AND v.status = 'active'
        `).get();
        const mrr = mrrResult?.total || 0;

        let trialActiveCount = 0;
        let totalTrials = 0;
        let trialsToday = 0;
        let trialsCompleted = 0;
        let trialsExpiredNoConvert = 0;
        let trialConversionRate = '0.0';
        let trialTrend = [];
        try {
            const trialNow = new Date().toISOString();
            const trialTodayStart = new Date();
            trialTodayStart.setHours(0, 0, 0, 0);
            const trialTodayISO = trialTodayStart.toISOString();

            trialActiveCount = db.prepare("SELECT COUNT(*) as count FROM trial_galleries WHERE expiresAt > ?").get(trialNow)?.count || 0;
            totalTrials = db.prepare("SELECT COUNT(*) as count FROM trial_galleries").get()?.count || 0;
            trialsToday = db.prepare("SELECT COUNT(*) as count FROM trial_galleries WHERE createdAt >= ?").get(trialTodayISO)?.count || 0;
            trialsCompleted = db.prepare("SELECT COUNT(*) as count FROM trial_galleries WHERE selectionStatus = 'completed'").get()?.count || 0;
            trialsExpiredNoConvert = db.prepare("SELECT COUNT(*) as count FROM trial_galleries WHERE expiresAt <= ? AND selectionStatus != 'completed'").get(trialNow)?.count || 0;
            trialConversionRate = totalTrials > 0 ? ((trialsCompleted / totalTrials) * 100).toFixed(1) : '0.0';

            // 7-day trial creation trend
            const trialDayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
            for (let i = 6; i >= 0; i--) {
                const td = new Date();
                td.setDate(td.getDate() - i);
                const dayLabel = trialDayNames[td.getDay()];
                const dateStr = td.toISOString().split('T')[0];
                const created = db.prepare("SELECT COUNT(*) as count FROM trial_galleries WHERE date(createdAt) = ? OR date(createdAt, 'localtime') = ?").get(dateStr, dateStr)?.count || 0;
                const completed7d = db.prepare("SELECT COUNT(*) as count FROM trial_galleries WHERE selectionStatus = 'completed' AND (date(createdAt) = ? OR date(createdAt, 'localtime') = ?)").get(dateStr, dateStr)?.count || 0;
                trialTrend.push({ day: dayLabel, date: dateStr, created, completed: completed7d });
            }
        } catch (err) { console.error('[Trial analytics error]', err); }

        // Calculate folder size and file count of static assets (vendor_logos & payment_proofs)
        const logosDir = path.join(process.cwd(), 'public', 'vendor_logos');
        const proofsDir = path.join(process.cwd(), 'public', 'staging_uploads', 'payment_proofs');

        function getFolderStats(dirPath) {
            if (!fs.existsSync(dirPath)) return { bytes: 0, count: 0 };
            let bytes = 0;
            let count = 0;
            try {
                const files = fs.readdirSync(dirPath, { withFileTypes: true });
                for (const file of files) {
                    const fp = path.join(dirPath, file.name);
                    if (file.isDirectory()) {
                        const sub = getFolderStats(fp);
                        bytes += sub.bytes;
                        count += sub.count;
                    } else if (file.isFile()) {
                        bytes += fs.statSync(fp).size;
                        count += 1;
                    }
                }
            } catch (e) {}
            return { bytes, count };
        }

        const logosStats = getFolderStats(logosDir);
        const proofsStats = getFolderStats(proofsDir);
        const totalAssetBytes = logosStats.bytes + proofsStats.bytes;
        const totalAssetFiles = logosStats.count + proofsStats.count;
        const totalAssetMB = (totalAssetBytes / (1024 * 1024)).toFixed(2);

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

        // Memory Usage
        const heapUsedMB = (process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(1);

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

        // 4. Get vendors whose subscription is expiring within 7 days
        const expiringSoonQuery = db.prepare(`
            SELECT 
                v.id, v.name, v.email, v.expiresAt, v.whatsapp,
                p.name as planName
            FROM vendors v
            LEFT JOIN plans p ON v.planId = p.id
            WHERE v.role = 'vendor'
              AND v.status = 'active'
              AND v.expiresAt IS NOT NULL
              AND date(v.expiresAt) BETWEEN date('now') AND date('now', '+7 days')
            ORDER BY v.expiresAt ASC
        `);
        const expiringSoon = expiringSoonQuery.all();

        // 5. Get vendors requesting password reset
        const resetRequestsQuery = db.prepare(`
            SELECT id, name, email, whatsapp FROM vendors WHERE resetRequested = 1 ORDER BY id DESC
        `);
        const resetRequests = resetRequestsQuery.all();

        // Additional SaaS Operational Metrics
        const arr = mrr * 12;

        const pendingUpgradeValueResult = db.prepare(`
            SELECT COALESCE(SUM(proratedPrice), 0) as total FROM subscription_requests WHERE status = 'pending'
        `).get();
        const pendingUpgradeTotalValue = pendingUpgradeValueResult?.total || 0;

        const expiredVendorsCount = db.prepare(`
            SELECT COUNT(*) as count FROM vendors 
            WHERE role = 'vendor' AND (expiresAt < datetime('now') OR status = 'inactive')
        `).get()?.count || 0;

        // Check Google OAuth & SMTP status accurately from saas_settings & process.env
        const saasSettingsRows = db.prepare("SELECT key, value FROM saas_settings").all();
        const saasSettings = {};
        for (const row of saasSettingsRows) {
            saasSettings[row.key] = row.value;
        }

        const googleClientId = process.env.GOOGLE_CLIENT_ID || saasSettings.google_client_id;
        const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || saasSettings.google_client_secret;
        const googleRefreshToken = process.env.GOOGLE_REFRESH_TOKEN || saasSettings.google_refresh_token;
        const googleMasterFolderId = process.env.GOOGLE_MASTER_FOLDER_ID || saasSettings.google_master_folder_id;

        const isGoogleMasterConnected = Boolean(
            googleClientId && (googleClientSecret || googleRefreshToken || googleMasterFolderId)
        );

        const smtpHost = process.env.SMTP_HOST || saasSettings.smtp_host;
        const smtpEmail = process.env.SMTP_EMAIL || saasSettings.smtp_email;
        const smtpPassword = process.env.SMTP_PASSWORD || saasSettings.smtp_password;
        const smtpEnable = saasSettings.smtp_enable;
        const isSmtpConfigured = Boolean(
            (smtpEmail || smtpHost) && (smtpPassword || process.env.SMTP_PASSWORD) && smtpEnable !== '0'
        );

        // 6. Get recent projects and vendors for Live Activity Stream Feed
        const recentProjects = db.prepare(`
            SELECT p.id, p.name, p.status, p.createdAt, v.name as vendorName 
            FROM projects p 
            JOIN vendors v ON p.vendorId = v.id 
            ORDER BY p.id DESC 
            LIMIT 5
        `).all() || [];

        const recentVendors = db.prepare(`
            SELECT v.id, v.name, v.email, v.status, v.createdAt, p.name as planName 
            FROM vendors v 
            LEFT JOIN plans p ON v.planId = p.id 
            WHERE v.role = 'vendor' 
            ORDER BY v.id DESC 
            LIMIT 5
        `).all() || [];

        // 7. Monthly trend data queried DIRECTLY from SQLite (Vendor Growth & MRR)
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const now = new Date();
        const revenueTrend = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const yearMonth = d.toISOString().substring(0, 7);
            const label = `${monthNames[d.getMonth()]}`;

            const activeInMonth = db.prepare(`
                SELECT COUNT(*) as count 
                FROM vendors 
                WHERE role = 'vendor' 
                  AND status = 'active'
                  AND strftime('%Y-%m', createdAt) <= ?
            `).get(yearMonth)?.count || 0;

            const mrrInMonth = db.prepare(`
                SELECT COALESCE(SUM(p.price), 0) as total
                FROM vendors v
                JOIN plans p ON v.planId = p.id
                WHERE v.role = 'vendor'
                  AND v.status = 'active'
                  AND strftime('%Y-%m', v.createdAt) <= ?
            `).get(yearMonth)?.total || 0;

            revenueTrend.push({ 
                month: label, 
                mrr: mrrInMonth, 
                vendors: activeInMonth 
            });
        }

        // 8. 7-day photo upload & selection activity trend queried DIRECTLY from SQLite tables photos & selections
        const selectionTrend = [];
        const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayLabel = dayNames[d.getDay()];
            const dateStr = d.toISOString().split('T')[0];

            const uploaded = db.prepare("SELECT COUNT(*) as count FROM photos WHERE date(uploadedAt) = ? OR date(uploadedAt, 'localtime') = ?").get(dateStr, dateStr)?.count || 0;
            const selected = db.prepare("SELECT COUNT(*) as count FROM selections WHERE date(createdAt) = ? OR date(createdAt, 'localtime') = ?").get(dateStr, dateStr)?.count || 0;

            selectionTrend.push({ 
                day: dayLabel, 
                date: dateStr, 
                uploaded, 
                selected 
            });
        }

        // 9. Calculate Top 5 Free Trial galleries and Top 5 Subscribed Vendors by Photo Scan volume
        let topTrialGalleries = [];
        let totalTrialPhotosScanned = 0;
        let todayTrialPhotosScanned = 0;
        try {
            const trialGalleriesAll = db.prepare("SELECT slug, title, stagingFiles, createdAt FROM trial_galleries").all() || [];
            const todayStr = new Date().toISOString().split('T')[0];

            const parsedTrialGalleries = trialGalleriesAll.map(g => {
                let files = [];
                try { files = JSON.parse(g.stagingFiles || '[]'); } catch(e){}
                
                let photoCount = 0;
                let unlockedCount = 0;
                files.forEach(f => {
                    if (f._isLocked) {
                        photoCount += (f._count || 0);
                    } else {
                        photoCount += 1;
                        unlockedCount += 1;
                    }
                });

                totalTrialPhotosScanned += photoCount;
                if (g.createdAt && g.createdAt.startsWith(todayStr)) {
                    todayTrialPhotosScanned += photoCount;
                }

                return {
                    slug: g.slug,
                    title: g.title || 'Galeri Trial',
                    photoCount,
                    unlockedCount,
                    createdAt: g.createdAt
                };
            });

            topTrialGalleries = parsedTrialGalleries
                .sort((a, b) => b.photoCount - a.photoCount)
                .slice(0, 5);
        } catch (tErr) {
            console.error('[Analytics Error] Failed to calculate trial photo stats:', tErr);
        }

        let topVendorsByPhotos = [];
        let todayVendorPhotosScanned = 0;
        try {
            topVendorsByPhotos = db.prepare(`
                SELECT 
                    v.id, 
                    v.name, 
                    v.brandName,
                    v.email,
                    p.name as planName,
                    COUNT(DISTINCT pr.id) as totalProjects,
                    COUNT(ph.id) as totalPhotos
                FROM vendors v
                LEFT JOIN plans p ON v.planId = p.id
                LEFT JOIN projects pr ON pr.vendorId = v.id
                LEFT JOIN photos ph ON ph.projectId = pr.id
                WHERE v.role = 'vendor' AND v.status = 'active'
                GROUP BY v.id
                ORDER BY totalPhotos DESC
                LIMIT 5
            `).all() || [];

            todayVendorPhotosScanned = db.prepare("SELECT COUNT(*) as count FROM photos WHERE date(uploadedAt) = date('now') OR date(uploadedAt, 'localtime') = date('now')").get()?.count || 0;
        } catch (vErr) {
            console.error('[Analytics Error] Failed to calculate vendor photo stats:', vErr);
        }

        return NextResponse.json({
            topStorageUsers,
            planDistribution,
            expiringSoon,
            expiringSoonCount: expiringSoon.length,
            resetRequests,
            trialActiveCount,
            totalTrials,
            trialsToday,
            trialsCompleted,
            trialsExpiredNoConvert,
            trialConversionRate,
            trialTrend,
            topTrialGalleries,
            topVendorsByPhotos,
            photoScanStats: {
                totalTrialPhotosScanned,
                todayTrialPhotosScanned,
                totalVendorPhotosScanned: totalPhotos,
                todayVendorPhotosScanned
            },
            activeVendorCount: activeVendorsCount,
            pendingVendorCount,
            totalVendorsCount,
            expiredVendorsCount,
            pendingUpgradesCount,
            pendingUpgradeTotalValue,
            mrr,
            arr,
            totalProjectCount: totalProjects,
            completedProjectCount: completedProjectsCount,
            selectedPhotosCount,
            totalAssetMB,
            totalAssetFiles,
            heapUsedMB,
            isGoogleMasterConnected,
            isSmtpConfigured,
            googleClientId: googleClientId ? 'Configured' : null,
            recentProjects,
            recentVendors,
            revenueTrend,
            selectionTrend,
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
