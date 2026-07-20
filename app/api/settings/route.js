import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const stmt = db.prepare('SELECT key, value FROM saas_settings');
        const rows = stmt.all();
        
        // Convert rows to simple key-value object
        const settings = {};
        rows.forEach(row => {
            settings[row.key] = row.value;
        });

        return NextResponse.json(settings, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Failed to retrieve SaaS settings.' }, { status: 500 });
    }
}
