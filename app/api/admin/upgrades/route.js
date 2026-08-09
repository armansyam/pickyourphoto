import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';
import { sendVendorRenewalConfirmationEmail, sendVendorUpgradeConfirmationEmail } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

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
                COALESCE(ap.name, p.name, 'Add-On Storage') as planName,
                p.activePeriodDays as planExpireDays,
                p.maxProjects as planMaxProjects,
                (SELECT name FROM plans WHERE id = v.planId) as currentPlanName
            FROM subscription_requests sr
            JOIN vendors v ON sr.vendorId = v.id
            LEFT JOIN plans p ON sr.planId = p.id
            LEFT JOIN addon_plans ap ON sr.addonPlanId = ap.id
            ORDER BY sr.createdAt DESC
        `);
        const requests = stmt.all();

        const pendingSummary = db.prepare(`
            SELECT 
                COUNT(*) as pendingCount,
                COALESCE(SUM(proratedPrice), 0) as pendingTotalValue
            FROM subscription_requests
            WHERE status = 'pending'
        `).get() || { pendingCount: 0, pendingTotalValue: 0 };

        return NextResponse.json({
            requests,
            summary: pendingSummary
        });
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
            // Handle Add-On Storage Approval
            if (upgradeReq.requestType === 'addon' || (upgradeReq.addonPlanId && upgradeReq.addonPlanId > 0)) {
                const addonPlan = db.prepare('SELECT * FROM addon_plans WHERE id = ?').get(upgradeReq.addonPlanId);
                if (!addonPlan) {
                    return NextResponse.json({ message: 'Paket Add-On Storage tujuan tidak ditemukan.' }, { status: 404 });
                }

                db.prepare(`
                  INSERT INTO storage_addon_subscriptions (vendorId, addonPlanId, price, proratedPrice, status)
                  VALUES (?, ?, ?, ?, 'active')
                `).run(upgradeReq.vendorId, addonPlan.id, addonPlan.price, upgradeReq.proratedPrice);

                db.prepare(`
                  UPDATE vendors 
                  SET hasStorageAddon = 1, addonStorageQuotaBytes = ?, addonPlanId = ?, pendingAddonPlanId = NULL, pendingAddonQuotaBytes = 0 
                  WHERE id = ?
                `).run(addonPlan.quotaBytes, addonPlan.id, upgradeReq.vendorId);

                db.prepare("UPDATE subscription_requests SET status = 'approved' WHERE id = ?").run(id);

                // Trigger email notification for Add-On Storage approval
                try {
                    const fullVendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(upgradeReq.vendorId);
                    const currentPlan = db.prepare('SELECT * FROM plans WHERE id = ?').get(fullVendor?.planId);
                    sendVendorUpgradeConfirmationEmail(
                        fullVendor,
                        currentPlan?.name || 'Paket Aktif',
                        { name: `Add-On ${addonPlan.name}`, maxProjects: fullVendor?.maxProjects || 5 },
                        fullVendor?.expiresAt ? fullVendor.expiresAt.split('T')[0] : '',
                        'Transfer Bank Manual (Dikonfirmasi Admin)'
                    ).catch(() => {});
                } catch (mailErr) {
                    console.error('[Admin Add-On Approval Mailer Error]:', mailErr);
                }

                return NextResponse.json({ message: `Permintaan Add-On Storage (${addonPlan.name}) berhasil disetujui!` });
            }

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

            // Update vendor plan information and clear pending addon flags
            const updateVendor = db.prepare(`
                UPDATE vendors 
                SET status = 'active',
                    planId = ?, 
                    expiresAt = ?, 
                    maxProjects = ?, 
                    paymentProof = ?, 
                    pendingAddonPlanId = NULL, 
                    pendingAddonQuotaBytes = 0,
                    additionalProjects = COALESCE(additionalProjects, 0) + CASE WHEN ? = 1 THEN COALESCE(?, 2) ELSE 0 END
                WHERE id = ?
            `);
            const isBundle = upgradeReq.isBundlePromo === 1 ? 1 : 0;
            const bundleVal = upgradeReq.bundleAddonValue || 2;
            updateVendor.run(upgradeReq.planId, expiresAt, plan.maxProjects, upgradeReq.transferProof, isBundle, bundleVal, upgradeReq.vendorId);

            // Update request status
            const updateReq = db.prepare("UPDATE subscription_requests SET status = 'approved' WHERE id = ?");
            updateReq.run(id);

            // Dispatch automated SMTP confirmation email to vendor
            try {
                const fullVendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(upgradeReq.vendorId);
                const isRenewal = (vendor && vendor.planId === upgradeReq.planId);
                const formattedExp = expiresAt ? expiresAt.split('T')[0] : '';
                
                if (isRenewal) {
                    sendVendorRenewalConfirmationEmail(fullVendor, plan, formattedExp, 'Transfer Bank Manual (Dikonfirmasi Admin)').catch(() => {});
                } else {
                    const oldPlanRow = vendor?.planId ? db.prepare('SELECT name FROM plans WHERE id = ?').get(vendor.planId) : null;
                    sendVendorUpgradeConfirmationEmail(fullVendor, oldPlanRow?.name || 'Paket Sebelumnya', plan, formattedExp, 'Transfer Bank Manual (Dikonfirmasi Admin)').catch(() => {});
                }
            } catch (mailErr) {
                console.error('[Admin Upgrade Manual Mailer Error]:', mailErr);
            }

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
