import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';
import { getPaymentGatewayConfig } from '@/lib/payment-gateway';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

let lastSyncTimestamp = 0;
const SYNC_THROTTLE_MS = 60 * 1000;

// GET: List all vendors (Superadmin only)
export async function GET() {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        // Auto-sync live Midtrans status for any pending_payment vendors (throttled max 1x per 60s)
        const nowMs = Date.now();
        if (nowMs - lastSyncTimestamp > SYNC_THROTTLE_MS) {
            lastSyncTimestamp = nowMs;
            
            // Auto-expire manual transfer registrations without proof older than 24 hours
            try {
                db.prepare(`
                    UPDATE vendors 
                    SET status = 'expired_draft', archivedAt = CURRENT_TIMESTAMP 
                    WHERE status = 'pending_manual' 
                      AND (paymentProof IS NULL OR paymentProof = '') 
                      AND createdAt <= DATETIME('now', '-24 hours')
                `).run();
            } catch (e) {}

            try {
                const pendingTxs = db.prepare("SELECT pt.*, v.email as vendorEmail FROM payment_transactions pt JOIN vendors v ON pt.vendorId = v.id WHERE v.status = 'pending_payment' AND pt.status = 'pending'").all();
                
                if (pendingTxs && pendingTxs.length > 0) {
                    const pgConfig = getPaymentGatewayConfig();
                    const serverKey = pgConfig?.serverKey;
                    if (serverKey) {
                        const authHeader = 'Basic ' + Buffer.from(serverKey + ':').toString('base64');
                        const baseUrl = pgConfig.isProduction ? 'https://api.midtrans.com/v2' : 'https://api.sandbox.midtrans.com/v2';
                        for (const tx of pendingTxs) {
                            try {
                                const midRes = await fetch(`${baseUrl}/${tx.orderId}/status`, {
                                    headers: { 'Accept': 'application/json', 'Authorization': authHeader }
                                });
                                if (midRes.ok) {
                                    const midData = await midRes.json();
                                    if (midData.transaction_status === 'settlement' || midData.transaction_status === 'capture') {
                                        db.prepare("UPDATE payment_transactions SET status = 'paid', paidAt = CURRENT_TIMESTAMP WHERE id = ?").run(tx.id);
                                        try { db.prepare("UPDATE payment_sessions SET status = 'paid', paidAt = CURRENT_TIMESTAMP WHERE orderId = ?").run(tx.orderId); } catch (e) {}
                                        
                                        const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(tx.planId);
                                        const expDate = new Date();
                                        expDate.setDate(expDate.getDate() + (plan ? plan.activePeriodDays : 30));
                                        const expiresAt = expDate.toISOString().split('T')[0];

                                         const vendorObj = db.prepare('SELECT * FROM vendors WHERE id = ?').get(tx.vendorId);
                                         let syncAddonKey = vendorObj?.addonPlanId;
                                         let syncAddonQuotaBytes = vendorObj?.addonStorageQuotaBytes || 0;

                                         if (tx.addonPlanId || vendorObj?.pendingAddonQuotaBytes > 0) {
                                           const addonKey = tx.addonPlanId || vendorObj?.pendingAddonPlanId;
                                           let quotaBytes = vendorObj?.pendingAddonQuotaBytes || 0;
                                           if (!quotaBytes && addonKey) {
                                             if (addonKey === 'addon-10gb') quotaBytes = 10 * 1024 * 1024 * 1024;
                                             else if (addonKey === 'addon-25gb') quotaBytes = 25 * 1024 * 1024 * 1024;
                                             else if (addonKey === 'addon-50gb') quotaBytes = 50 * 1024 * 1024 * 1024;
                                           }
                                           if (quotaBytes > 0) {
                                             syncAddonKey = addonKey;
                                             syncAddonQuotaBytes = quotaBytes;
                                           }
                                         }

                                         db.prepare("UPDATE vendors SET status = 'active', planId = ?, expiresAt = ?, maxProjects = ?, hasStorageAddon = ?, addonPlanId = ?, addonStorageQuotaBytes = ?, pendingAddonPlanId = NULL, pendingAddonQuotaBytes = 0 WHERE id = ?")
                                             .run(plan ? plan.id : tx.planId, expiresAt, plan ? plan.maxProjects : 10, syncAddonQuotaBytes > 0 ? 1 : 0, syncAddonKey, syncAddonQuotaBytes, tx.vendorId);
                                         
                                         console.log(`[Admin API Auto-Sync SUCCESS] Vendor ID ${tx.vendorId} activated automatically (Storage: ${syncAddonQuotaBytes} bytes)!`);
                                    }
                                }
                            } catch (err) {
                                console.warn('[Admin API Auto-Sync Warning]:', err);
                            }
                        }
                    }
                }
            } catch (syncErr) {
                console.error('[Admin Vendors Sync Error]:', syncErr);
            }
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
                v.addonPlanId,
                v.addonStorageQuotaBytes,
                v.pendingAddonPlanId,
                v.pendingAddonQuotaBytes,
                v.resetRequested,
                v.createdAt,
                p.name as planName,
                p.price as planPrice,
                p.activePeriodDays as planActivePeriodDays,
                (SELECT COUNT(*) FROM projects WHERE vendorId = v.id) as projectCount,
                (SELECT COUNT(*) FROM projects WHERE vendorId = v.id AND status = 'completed') as completedProjectsCount,
                (SELECT expiresAt FROM payment_sessions WHERE vendorId = v.id ORDER BY id DESC LIMIT 1) as paymentExpiresAt,
                (SELECT expiresAt FROM payment_sessions WHERE vendorId = v.id ORDER BY id DESC LIMIT 1) as qrisExpiresAt,
                (SELECT orderId FROM payment_sessions WHERE vendorId = v.id ORDER BY id DESC LIMIT 1) as orderId,
                (SELECT paymentMethod FROM payment_sessions WHERE vendorId = v.id ORDER BY id DESC LIMIT 1) as sessionPaymentMethod,
                (SELECT planId FROM subscription_requests WHERE vendorId = v.id AND status = 'pending' ORDER BY id DESC LIMIT 1) as pendingPlanId,
                (SELECT p2.name FROM subscription_requests sr JOIN plans p2 ON sr.planId = p2.id WHERE sr.vendorId = v.id AND sr.status = 'pending' ORDER BY sr.id DESC LIMIT 1) as pendingPlanName,
                (SELECT transferProof FROM subscription_requests WHERE vendorId = v.id AND status = 'pending' ORDER BY id DESC LIMIT 1) as pendingTransferProof
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
