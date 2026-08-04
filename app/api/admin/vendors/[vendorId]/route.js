import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { sendVendorApprovalEmail } from '@/lib/mailer';

// PUT & PATCH: Update vendor account settings, status, and reset password (Superadmin only)
export async function PATCH(request, { params }) {
    return handleUpdateVendor(request, params);
}

export async function PUT(request, { params }) {
    return handleUpdateVendor(request, params);
}

async function handleUpdateVendor(request, params) {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        const { vendorId } = params;
        const body = await request.json();
        const { planId, expiresAt, status, password, additionalProjects, additionalProjectsExpiresAt, additionalPhotosPerProject, action } = body;

        // Verify vendor exists
        const targetVendor = db.prepare('SELECT * FROM vendors WHERE id = ? AND role != ?').get(vendorId, 'admin');
        if (!targetVendor) {
            return NextResponse.json({ message: 'Vendor not found.' }, { status: 404 });
        }

        // If simple status update / approval action
        const finalStatus = status || targetVendor.status;
        const finalPlanId = planId || targetVendor.planId;

        // Fetch plan details
        const fullPlan = db.prepare('SELECT * FROM plans WHERE id = ?').get(finalPlanId);
        const maxProjects = fullPlan ? fullPlan.maxProjects : targetVendor.maxProjects;

        // Auto-calculate expiration date if approving vendor and no date is set
        let finalExpiresAt = expiresAt !== undefined ? expiresAt : targetVendor.expiresAt;
        if (finalStatus === 'active' && !finalExpiresAt && fullPlan && fullPlan.activePeriodDays) {
            const expDate = new Date();
            expDate.setDate(expDate.getDate() + fullPlan.activePeriodDays);
            finalExpiresAt = expDate.toISOString().split('T')[0]; // Format YYYY-MM-DD
        }

        // Update details
        const updateStmt = db.prepare('UPDATE vendors SET planId = ?, expiresAt = ?, maxProjects = ?, status = ?, additionalProjects = ?, additionalProjectsExpiresAt = ?, additionalPhotosPerProject = ? WHERE id = ?');
        updateStmt.run(
            finalPlanId, 
            finalExpiresAt, 
            maxProjects, 
            finalStatus, 
            additionalProjects !== undefined ? (parseInt(additionalProjects) || 0) : targetVendor.additionalProjects, 
            additionalProjectsExpiresAt !== undefined ? additionalProjectsExpiresAt : targetVendor.additionalProjectsExpiresAt, 
            additionalPhotosPerProject !== undefined ? (parseInt(additionalPhotosPerProject) || 0) : targetVendor.additionalPhotosPerProject, 
            vendorId
        );

        // Send automated approval email notification in background if vendor was just activated
        if (finalStatus === 'active' && targetVendor.status !== 'active') {
            sendVendorApprovalEmail(targetVendor, fullPlan).catch(err => {
                console.error('Failed to trigger background approval email:', err);
            });
        }

        // Reset password if provided
        if (password && password.trim() !== '') {
            if (password.length < 6) {
                return NextResponse.json({ message: 'Password must be at least 6 characters.' }, { status: 400 });
            }
            const hashedPassword = bcrypt.hashSync(password, 10);
            db.prepare('UPDATE vendors SET password = ?, resetRequested = 0 WHERE id = ?').run(hashedPassword, vendorId);
        }

        return NextResponse.json({ success: true, message: `Status vendor ${targetVendor.name} berhasil diperbarui.` });

    } catch (error) {
        console.error('Failed to update vendor settings:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

// DELETE: Delete vendor account and all associated projects/files (Superadmin only)
export async function DELETE(request, { params }) {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        const { vendorId } = params;

        // Verify vendor exists and is not an admin
        const getVendor = db.prepare('SELECT id, name FROM vendors WHERE id = ? AND role != ?');
        const targetVendor = getVendor.get(vendorId, 'admin');

        if (!targetVendor) {
            return NextResponse.json({ message: 'Vendor not found.' }, { status: 404 });
        }

        // Delete dependencies recursively inside a transaction
        const runDelete = db.transaction(() => {
            // Get all projects of this vendor
            const getProjects = db.prepare('SELECT id FROM projects WHERE vendorId = ?');
            const projects = getProjects.all(vendorId);
            const projectIds = projects.map(p => p.id);

            if (projectIds.length > 0) {
                // To delete selections, we need all photo IDs for this vendor's projects
                db.prepare(`
                    DELETE FROM selections 
                    WHERE photoId IN (
                        SELECT id FROM photos WHERE projectId IN (${projectIds.map(() => '?').join(',')})
                    )
                `).run(...projectIds);

                // Delete photos
                db.prepare(`DELETE FROM photos WHERE projectId IN (${projectIds.map(() => '?').join(',')})`).run(...projectIds);

                // Delete clients
                db.prepare(`DELETE FROM clients WHERE projectId IN (${projectIds.map(() => '?').join(',')})`).run(...projectIds);

                // Delete projects
                db.prepare('DELETE FROM projects WHERE vendorId = ?').run(vendorId);
            }

            // Delete payment transactions & sessions
            db.prepare('DELETE FROM payment_transactions WHERE vendorId = ?').run(vendorId);
            db.prepare('DELETE FROM payment_sessions WHERE vendorId = ?').run(vendorId);

            // Delete subscription requests
            db.prepare('DELETE FROM subscription_requests WHERE vendorId = ?').run(vendorId);

            // Delete vendor
            db.prepare('DELETE FROM vendors WHERE id = ?').run(vendorId);
        });

        runDelete();

        // Delete vendor physical files from public/staging_uploads directory
        const vendorDir = path.join(process.cwd(), 'public', 'staging_uploads', `vendor_${vendorId}`);
        if (fs.existsSync(vendorDir)) {
            try {
                fs.rmSync(vendorDir, { recursive: true, force: true });
            } catch (err) {
                console.error(`Failed to delete directory ${vendorDir}:`, err);
            }
        }

        return NextResponse.json({ 
            message: `Vendor "${targetVendor.name}" dan semua data terkait berhasil dihapus secara permanen.` 
        });

    } catch (error) {
        console.error('Failed to delete vendor:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
