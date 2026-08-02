import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const sysSetting = db.prepare("SELECT enable_free_trial, trial_expiration_minutes FROM system_settings WHERE id = 1").get() || {};
        const stmt = db.prepare('SELECT key, value FROM saas_settings');
        const rows = stmt.all();
        
        // Convert rows to simple key-value object
        const settings = {
            enable_free_trial: sysSetting.enable_free_trial ?? 1,
            trial_expiration_minutes: sysSetting.trial_expiration_minutes ?? 60,
        };
        rows.forEach(row => {
            settings[row.key] = row.value;
        });

        return NextResponse.json(settings, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Failed to retrieve SaaS settings.' }, { status: 500 });
    }
}
