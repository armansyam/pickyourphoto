import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';

// PUT: Update plan details (Admin only)
export async function PUT(request, { params }) {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        const { planId } = params;
        const { name, maxProjects, price, projectExpireDays, maxPhotosPerProject, activePeriodDays, status, planType, maxStorageMB } = await request.json();

        if (!name || maxProjects === undefined || price === undefined) {
            return NextResponse.json({ message: 'Name, max projects, and price are required.' }, { status: 400 });
        }

        // Verify plan exists
        const plan = db.prepare('SELECT id FROM plans WHERE id = ?').get(planId);
        if (!plan) {
            return NextResponse.json({ message: 'Plan not found.' }, { status: 404 });
        }

        // Check name uniqueness if changed
        const nameConflict = db.prepare('SELECT id FROM plans WHERE name = ? AND id != ?').get(name, planId);
        if (nameConflict) {
            return NextResponse.json({ message: 'A plan with this name already exists.' }, { status: 409 });
        }

        const updateStmt = db.prepare('UPDATE plans SET name = ?, maxProjects = ?, price = ?, projectExpireDays = ?, maxPhotosPerProject = ?, activePeriodDays = ?, status = ?, planType = ?, maxStorageMB = ? WHERE id = ?');
        updateStmt.run(name, maxProjects, price, projectExpireDays || 0, maxPhotosPerProject || 0, activePeriodDays !== undefined ? activePeriodDays : 30, status || 'active', planType || 'limit', maxStorageMB || 0, planId);

        // Cascade updates to all vendors linked to this plan to update their maxProjects limit
        const updateVendorsStmt = db.prepare('UPDATE vendors SET maxProjects = ? WHERE planId = ? AND role != ?');
        updateVendorsStmt.run(maxProjects, planId, 'admin');

        return NextResponse.json({ message: 'Plan settings updated successfully.' });
    } catch (error) {
        console.error('Failed to update plan:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

// DELETE: Delete plan (Admin only)
export async function DELETE(request, { params }) {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        const { planId } = params;

        // Verify plan exists
        const plan = db.prepare('SELECT id FROM plans WHERE id = ?').get(planId);
        if (!plan) {
            return NextResponse.json({ message: 'Plan not found.' }, { status: 404 });
        }

        // Check if there are vendors linked to this plan
        const hasVendors = db.prepare('SELECT id FROM vendors WHERE planId = ? LIMIT 1').get(planId);
        if (hasVendors) {
            return NextResponse.json({ 
                message: 'Cannot delete plan. There are active vendor accounts linked to this subscription plan. Reassign them first.' 
            }, { status: 409 });
        }

        const deleteStmt = db.prepare('DELETE FROM plans WHERE id = ?');
        deleteStmt.run(planId);

        return NextResponse.json({ message: 'Subscription plan deleted successfully.' });
    } catch (error) {
        console.error('Failed to delete plan:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
