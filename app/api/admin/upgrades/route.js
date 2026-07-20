import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';

// GET: Retrieve all upgrade requests for Superadmin
export async function GET() {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        const stmt = db.prepare(`
            SELECT 
                sr.*, 
                v.name as vendorName, 
                v.email as vendorEmail,
                v.expiresAt as currentExpiresAt,
                p.name as planName,
                p.projectExpireDays as planExpireDays,
                p.maxProjects as planMaxProjects,
                (SELECT name FROM plans WHERE id = v.planId) as currentPlanName
            FROM subscription_requests sr
            JOIN vendors v ON sr.vendorId = v.id
            JOIN plans p ON sr.planId = p.id
            ORDER BY sr.createdAt DESC
        `);
        const requests = stmt.all();

        return NextResponse.json(requests);
    } catch (error) {
        console.error('Failed to list upgrade requests:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

// PUT: Approve or reject an upgrade request
export async function PUT(request) {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        const { id, action } = await request.json(); // action: 'approve' | 'reject'

        if (!id || !action) {
            return NextResponse.json({ message: 'Missing ID or action parameter.' }, { status: 400 });
        }

        // Fetch request details
        const upgradeReq = db.prepare('SELECT * FROM subscription_requests WHERE id = ?').get(id);
        if (!upgradeReq) {
            return NextResponse.json({ message: 'Permintaan upgrade tidak ditemukan.' }, { status: 404 });
        }

        if (upgradeReq.status !== 'pending') {
            return NextResponse.json({ message: 'Permintaan upgrade sudah diproses sebelumnya.' }, { status: 400 });
        }

        if (action === 'approve') {
            // Get target plan info
            const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(upgradeReq.planId);
            if (!plan) {
                return NextResponse.json({ message: 'Plan tujuan tidak ditemukan.' }, { status: 404 });
            }

            // Get current vendor plan info to calculate renewal accumulatively
            const vendor = db.prepare('SELECT planId, expiresAt FROM vendors WHERE id = ?').get(upgradeReq.vendorId);
            
            // Calculate new expiresAt date
            let expiresAt = null;
            if (plan.activePeriodDays && plan.activePeriodDays > 0) {
                let baseDate = new Date();
                
                // If it is a renewal of current plan and current subscription is still active (in future), add to it
                if (vendor && vendor.planId === upgradeReq.planId && vendor.expiresAt) {
                    const currentExpires = new Date(vendor.expiresAt);
                    if (currentExpires > baseDate) {
                        baseDate = currentExpires;
                    }
                }
                
                baseDate.setDate(baseDate.getDate() + plan.activePeriodDays);
                expiresAt = baseDate.toISOString();
            }

            // Update vendor plan information and update their main paymentProof link to the latest approved one
            const updateVendor = db.prepare('UPDATE vendors SET planId = ?, expiresAt = ?, maxProjects = ?, paymentProof = ? WHERE id = ?');
            updateVendor.run(upgradeReq.planId, expiresAt, plan.maxProjects, upgradeReq.transferProof, upgradeReq.vendorId);

            // Update request status
            const updateReq = db.prepare("UPDATE subscription_requests SET status = 'approved' WHERE id = ?");
            updateReq.run(id);

            return NextResponse.json({ message: 'Permintaan upgrade berhasil disetujui.' });

        } else if (action === 'reject') {
            // Update request status
            const updateReq = db.prepare("UPDATE subscription_requests SET status = 'rejected' WHERE id = ?");
            updateReq.run(id);

            return NextResponse.json({ message: 'Permintaan upgrade berhasil ditolak.' });
        } else {
            return NextResponse.json({ message: 'Action tidak valid.' }, { status: 400 });
        }

    } catch (error) {
        console.error('Failed to update upgrade request:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
