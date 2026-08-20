import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';

// GET: List all plans (Admin only)
export async function GET() {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        const stmt = db.prepare('SELECT id, name, maxProjects, price, projectExpireDays, maxPhotosPerProject, activePeriodDays, status, planType, maxStorageMB, allowCustomLogo, allowRawSelector, createdAt FROM plans ORDER BY price ASC');
        const plans = stmt.all();

        return NextResponse.json(plans);
    } catch (error) {
        console.error('Failed to list plans for admin:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

// POST: Create a new plan (Admin only)
export async function POST(request) {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        let _body; try { _body = await request.json(); } catch (_) { return NextResponse.json({ message: 'Format body tidak valid.' }, { status: 400 }); }

        const { name, maxProjects, price, maxPhotosPerProject, activePeriodDays, status, planType, maxStorageMB, allowCustomLogo, allowRawSelector } = _body || {};

        if (!name || maxProjects === undefined || price === undefined) {
            return NextResponse.json({ message: 'Name, max projects, and price are required.' }, { status: 400 });
        }

        const exists = db.prepare('SELECT id FROM plans WHERE name = ?').get(name);
        if (exists) {
            return NextResponse.json({ message: 'A plan with this name already exists.' }, { status: 409 });
        }

        const insertStmt = db.prepare('INSERT INTO plans (name, maxProjects, price, projectExpireDays, maxPhotosPerProject, activePeriodDays, status, planType, maxStorageMB, allowCustomLogo, allowRawSelector) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)');
        const info = insertStmt.run(name, maxProjects, price, maxPhotosPerProject || 0, activePeriodDays !== undefined ? activePeriodDays : 30, status || 'active', planType || 'limit', maxStorageMB || 0, allowCustomLogo ? 1 : 0, allowRawSelector !== undefined ? (allowRawSelector ? 1 : 0) : 1);

        return NextResponse.json({ message: 'Subscription plan created successfully.', planId: info.lastInsertRowid }, { status: 201 });
    } catch (error) {
        console.error('Failed to create subscription plan:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
