import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        const stmt = db.prepare("SELECT id, name, maxProjects, price, projectExpireDays, maxPhotosPerProject, activePeriodDays, status, planType, maxStorageMB FROM plans WHERE status = 'active' ORDER BY price ASC");
        const plans = stmt.all();
        return NextResponse.json(plans);
    } catch (error) {
        console.error('Failed to fetch public plans:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
