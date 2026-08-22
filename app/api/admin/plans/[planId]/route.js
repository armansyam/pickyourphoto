import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';

async function handleUpdatePlan(request, params) {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        const resolvedParams = await params;
        const planId = resolvedParams?.planId || params?.planId;
        const body = await request.json();
        const { name, maxProjects, price, maxPhotosPerProject, activePeriodDays, status, planType, maxStorageMB, allowCustomLogo, allowRawSelector } = body;

        if (!name || maxProjects === undefined || price === undefined) {
            return NextResponse.json({ message: 'Name, max projects, and price are required.' }, { status: 400 });
        }

        const plan = db.prepare('SELECT id FROM plans WHERE id = ?').get(planId);
        if (!plan) {
            return NextResponse.json({ message: 'Plan not found.' }, { status: 404 });
        }

        const nameConflict = db.prepare('SELECT id FROM plans WHERE name = ? AND id != ?').get(name, planId);
        if (nameConflict) {
            return NextResponse.json({ message: 'A plan with this name already exists.' }, { status: 409 });
        }

        const updateStmt = db.prepare('UPDATE plans SET name = ?, maxProjects = ?, price = ?, projectExpireDays = 0, maxPhotosPerProject = ?, activePeriodDays = ?, status = ?, planType = ?, maxStorageMB = ?, allowCustomLogo = ?, allowRawSelector = ? WHERE id = ?');
        updateStmt.run(name, maxProjects, price, maxPhotosPerProject || 0, activePeriodDays !== undefined ? activePeriodDays : 30, status || 'active', planType || 'limit', maxStorageMB || 0, allowCustomLogo ? 1 : 0, allowRawSelector !== undefined ? (allowRawSelector ? 1 : 0) : 1, planId);

        const updateVendorsStmt = db.prepare('UPDATE vendors SET maxProjects = ? WHERE planId = ? AND role != ?');
        updateVendorsStmt.run(maxProjects, planId, 'admin');

        return NextResponse.json({ message: 'Plan settings updated successfully.' });
    } catch (error) {
        console.error('Failed to update plan:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(request, { params }) {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden.' }, { status: 403 });
        }
        const resolvedParams = await params;
        const planId = resolvedParams?.planId || params?.planId;
        const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(planId);
        if (!plan) return NextResponse.json({ message: 'Plan not found.' }, { status: 404 });
        return NextResponse.json(plan);
    } catch (error) {
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    return handleUpdatePlan(request, params);
}

export async function PATCH(request, { params }) {
    return handleUpdatePlan(request, params);
}

export async function DELETE(request, { params }) {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        const resolvedParams = await params;
        const planId = resolvedParams?.planId || params?.planId;

        const plan = db.prepare('SELECT id FROM plans WHERE id = ?').get(planId);
        if (!plan) {
            return NextResponse.json({ message: 'Plan not found.' }, { status: 404 });
        }

        // Hapus permanen paket langganan dari katalog penawaran
        const deleteStmt = db.prepare('DELETE FROM plans WHERE id = ?');
        deleteStmt.run(planId);

        return NextResponse.json({ message: 'Paket langganan berhasil dihapus secara permanen dari katalog.' });
    } catch (error) {
        console.error('Failed to delete plan:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
