import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';

// GET: Retrieve system settings and SaaS settings (Admin only)
export async function GET() {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        const settings = db.prepare("SELECT * FROM system_settings WHERE id = 1").get() || {};
        
        // Fetch saas_settings key-values (bank info, google credentials, support contact)
        const saasRows = db.prepare("SELECT key, value FROM saas_settings").all() || [];
        const saasSettings = {};
        saasRows.forEach(row => {
            saasSettings[row.key] = row.value;
        });

        // Compute last backup timestamp and info from backups/ folder
        let lastBackupTime = 'Belum pernah';
        let lastBackupFileName = null;
        let lastBackupSizeFormatted = null;

        try {
            const backupsDir = path.join(process.cwd(), 'backups');
            if (fs.existsSync(backupsDir)) {
                const files = fs.readdirSync(backupsDir)
                    .filter(f => f.endsWith('.db'))
                    .map(f => {
                        const stat = fs.statSync(path.join(backupsDir, f));
                        return { name: f, time: stat.mtimeMs, size: stat.size };
                    })
                    .sort((a, b) => b.time - a.time);

                if (files.length > 0) {
                    const latest = files[0];
                    const dateObj = new Date(latest.time);
                    const dateStr = dateObj.toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                    });
                    const timeStr = dateObj.toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    });
                    lastBackupTime = `${dateStr}, ${timeStr} WIB`;
                    lastBackupFileName = latest.name;
                    lastBackupSizeFormatted = (latest.size / 1024).toFixed(1) + ' KB';
                }
            }
        } catch (backupErr) {
            console.error('Failed to get last backup info:', backupErr);
        }

        return NextResponse.json({
            ...settings,
            saasSettings,
            lastBackupTime,
            lastBackupFileName,
            lastBackupSizeFormatted
        });
    } catch (error) {
        console.error('Failed to get system settings:', error);
        return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
    }
}

// PATCH: Update system settings and SaaS settings (Admin only)
export async function PATCH(request) {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        const body = await request.json();
        const { 
            enable_registration, 
            enable_free_trial, 
            max_vendor_quota, 
            trial_expiration_minutes,
            trial_expiration_hours,
            enable_auto_backup,
            backup_interval_hours,
            saasSettings
        } = body;
 
        // Fetch current settings
        const current = db.prepare("SELECT * FROM system_settings WHERE id = 1").get();
        if (!current) {
            return NextResponse.json({ message: 'Settings not found.' }, { status: 404 });
        }

        // Calculate minutes & fallback to hours if needed
        let new_trial_expiration_minutes;
        if (trial_expiration_minutes !== undefined && trial_expiration_minutes !== null && trial_expiration_minutes !== '') {
            new_trial_expiration_minutes = Math.max(1, parseInt(trial_expiration_minutes) || 30);
        } else if (trial_expiration_hours !== undefined && trial_expiration_hours !== null && trial_expiration_hours !== '') {
            new_trial_expiration_minutes = Math.max(1, Math.round(parseFloat(trial_expiration_hours) * 60) || 30);
        } else {
            new_trial_expiration_minutes = current.trial_expiration_minutes || (current.trial_expiration_hours ? current.trial_expiration_hours * 60 : 30);
        }

        const new_trial_expiration_hours = Math.max(1, Math.ceil(new_trial_expiration_minutes / 60));
 
        // Prepare fields to update
        const new_enable_registration = enable_registration !== undefined ? (enable_registration ? 1 : 0) : current.enable_registration;
        const new_enable_free_trial = enable_free_trial !== undefined ? (enable_free_trial ? 1 : 0) : current.enable_free_trial;
        const new_max_vendor_quota = max_vendor_quota !== undefined ? (max_vendor_quota === null || max_vendor_quota === '' ? null : parseInt(max_vendor_quota)) : current.max_vendor_quota;
        const new_enable_auto_backup = enable_auto_backup !== undefined ? (enable_auto_backup ? 1 : 0) : current.enable_auto_backup;
        const new_backup_interval = backup_interval_hours !== undefined ? parseInt(backup_interval_hours) : current.backup_interval_hours;
 
        // Perform system_settings update
        db.prepare(`
            UPDATE system_settings 
            SET 
                enable_registration = ?, 
                enable_free_trial = ?, 
                max_vendor_quota = ?, 
                trial_expiration_minutes = ?,
                trial_expiration_hours = ?,
                enable_auto_backup = ?,
                backup_interval_hours = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
        `).run(
            new_enable_registration, 
            new_enable_free_trial, 
            new_max_vendor_quota, 
            new_trial_expiration_minutes,
            new_trial_expiration_hours,
            new_enable_auto_backup,
            new_backup_interval
        );

        // Update saas_settings if provided
        if (saasSettings && typeof saasSettings === 'object') {
            const upsertSaas = db.prepare("INSERT OR REPLACE INTO saas_settings (key, value) VALUES (?, ?)");
            const updateMany = db.transaction((settingsObj) => {
                for (const [key, value] of Object.entries(settingsObj)) {
                    upsertSaas.run(key, value !== undefined && value !== null ? String(value) : '');
                }
            });
            updateMany(saasSettings);
        }
 
        const updatedSettings = db.prepare("SELECT * FROM system_settings WHERE id = 1").get();
        const updatedSaasRows = db.prepare("SELECT key, value FROM saas_settings").all() || [];
        const updatedSaasSettings = {};
        updatedSaasRows.forEach(row => {
            updatedSaasSettings[row.key] = row.value;
        });

        return NextResponse.json({
            ...updatedSettings,
            saasSettings: updatedSaasSettings
        });
    } catch (error) {
        console.error('Failed to update system settings:', error);
        return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
    }
}
