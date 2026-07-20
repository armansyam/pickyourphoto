import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';

// GET: List all vendors (Superadmin only)
export async function GET() {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        // Get all vendors (excluding admins) with plan names & expiration dates
        const stmt = db.prepare(`
            SELECT 
                v.id, 
                v.name, 
                v.email, 
                v.whatsapp,
                v.role, 
                v.status, 
                v.maxProjects, 
                v.additionalProjects,
                v.additionalProjectsExpiresAt,
                v.additionalPhotosPerProject,
                v.planId,
                v.expiresAt,
                v.paymentProof,
                v.resetRequested,
                v.createdAt,
                p.name as planName,
                p.price as planPrice,
                p.activePeriodDays as planActivePeriodDays,
                (SELECT COUNT(*) FROM projects WHERE vendorId = v.id) as projectCount,
                (SELECT COUNT(*) FROM projects WHERE vendorId = v.id AND status = 'completed') as completedProjectsCount
            FROM vendors v
            LEFT JOIN plans p ON v.planId = p.id
            WHERE v.role != 'admin'
            ORDER BY v.createdAt DESC
        `);
        const vendors = stmt.all();

        return NextResponse.json(vendors);
    } catch (error) {
        console.error('Failed to retrieve vendors for admin:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
