import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';

// GET: Retrieve system settings (Admin only)
export async function GET() {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        const settings = db.prepare("SELECT * FROM system_settings WHERE id = 1").get();
        if (!settings) {
            return NextResponse.json({ message: 'Settings not found.' }, { status: 404 });
        }

        return NextResponse.json(settings);
    } catch (error) {
        console.error('Failed to get system settings:', error);
        return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
    }
}

// PATCH: Update system settings (Admin only)
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
            disk_warning_threshold_percent, 
            disk_critical_threshold_percent,
            enable_auto_backup,
            backup_interval_hours
        } = body;
 
        // Fetch current settings
        const current = db.prepare("SELECT * FROM system_settings WHERE id = 1").get();
        if (!current) {
            return NextResponse.json({ message: 'Settings not found.' }, { status: 404 });
        }
 
        // Prepare fields to update or fall back to current values
        const new_enable_registration = enable_registration !== undefined ? (enable_registration ? 1 : 0) : current.enable_registration;
        const new_enable_free_trial = enable_free_trial !== undefined ? (enable_free_trial ? 1 : 0) : current.enable_free_trial;
        const new_max_vendor_quota = max_vendor_quota !== undefined ? (max_vendor_quota === null || max_vendor_quota === '' ? null : parseInt(max_vendor_quota)) : current.max_vendor_quota;
        const new_disk_warning = disk_warning_threshold_percent !== undefined ? parseInt(disk_warning_threshold_percent) : current.disk_warning_threshold_percent;
        const new_disk_critical = disk_critical_threshold_percent !== undefined ? parseInt(disk_critical_threshold_percent) : current.disk_critical_threshold_percent;
        const new_enable_auto_backup = enable_auto_backup !== undefined ? (enable_auto_backup ? 1 : 0) : current.enable_auto_backup;
        const new_backup_interval = backup_interval_hours !== undefined ? parseInt(backup_interval_hours) : current.backup_interval_hours;
 
        // Perform update
        db.prepare(`
            UPDATE system_settings 
            SET 
                enable_registration = ?, 
                enable_free_trial = ?, 
                max_vendor_quota = ?, 
                disk_warning_threshold_percent = ?, 
                disk_critical_threshold_percent = ?,
                enable_auto_backup = ?,
                backup_interval_hours = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
        `).run(
            new_enable_registration, 
            new_enable_free_trial, 
            new_max_vendor_quota, 
            new_disk_warning, 
            new_disk_critical,
            new_enable_auto_backup,
            new_backup_interval
        );
 
        const updated = db.prepare("SELECT * FROM system_settings WHERE id = 1").get();
        return NextResponse.json(updated);
    } catch (error) {
        console.error('Failed to update system settings:', error);
        return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
    }
}
