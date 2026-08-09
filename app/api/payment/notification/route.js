import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyPaymentWebhook } from '@/lib/payment-gateway';
import { sendVendorApprovalEmail, sendVendorRenewalConfirmationEmail, sendVendorUpgradeConfirmationEmail } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

// Helper: format bytes to human-readable string (was missing — caused ReferenceError in Add-On webhook log)
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

export async function POST(request) {
  try {
    const rawBody = await request.text();
    let payload = {};
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      payload = {};
    }

    const headers = {};
    request.headers.forEach((val, key) => {
      headers[key.toLowerCase()] = val;
    });

    // Verify webhook authenticity
    const verification = verifyPaymentWebhook(payload, headers, rawBody);
    if (!verification.valid) {
      console.warn('[Payment Webhook Warning]:', verification.message);
      return NextResponse.json({ message: verification.message }, { status: 400 });
    }

    const { orderId, isPaid, isFailed, transactionStatus } = verification;


    // Find payment transaction
    const transaction = db.prepare('SELECT * FROM payment_transactions WHERE orderId = ?').get(orderId);
    if (!transaction) {
      // Look up by vendor order if orderId matches pattern
      console.warn(`[Payment Webhook] Transaksi ${orderId} tidak ditemukan.`);
      return NextResponse.json({ message: 'Order tidak ditemukan' }, { status: 404 });
    }

    if (isPaid && transaction.status !== 'paid') {
      // Update transaction status
      db.prepare("UPDATE payment_transactions SET status = 'paid', paidAt = CURRENT_TIMESTAMP WHERE id = ?").run(transaction.id);

      // Sync payment_sessions to 'paid' as well (prevents auto-cleanup from archiving paid vendors)
      db.prepare("UPDATE payment_sessions SET status = 'paid', paidAt = CURRENT_TIMESTAMP WHERE orderId = ?").run(orderId);

      // Fetch vendor & plan
      const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(transaction.vendorId);
      const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(transaction.planId);

      // Handle Add-On Storage activation
      if (transaction.transactionType === 'addon' || transaction.addonPlanId) {
        let targetQuotaBytes = 0;
        let addonPlanIdToStore = transaction.addonPlanId;
        let planName = 'Add-On Storage';

        if (transaction.addonPlanId === 'custom' || String(transaction.addonPlanId).includes('custom')) {
          planName = 'Custom Storage';
          try {
            const rawObj = JSON.parse(transaction.rawResponse || '{}');
            if (rawObj.customQuotaBytes) {
              targetQuotaBytes = parseInt(rawObj.customQuotaBytes, 10);
            }
          } catch (e) {}

          if (!targetQuotaBytes) {
            targetQuotaBytes = 60 * 1024 * 1024 * 1024;
          }
        } else {
          const addonPlan = db.prepare('SELECT * FROM addon_plans WHERE id = ?').get(transaction.addonPlanId);
          if (addonPlan) {
            targetQuotaBytes = addonPlan.quotaBytes;
            addonPlanIdToStore = addonPlan.id;
            planName = addonPlan.name;
          }
        }

        if (vendor && targetQuotaBytes > 0) {
          db.prepare(`
            INSERT INTO storage_addon_subscriptions (vendorId, addonPlanId, price, proratedPrice, status)
            VALUES (?, ?, ?, ?, 'active')
          `).run(vendor.id, addonPlanIdToStore || 'custom', transaction.amount, transaction.amount);

          db.prepare(`
            UPDATE vendors 
            SET hasStorageAddon = 1, addonStorageQuotaBytes = ?, addonPlanId = ? 
            WHERE id = ?
          `).run(targetQuotaBytes, addonPlanIdToStore || 'custom', vendor.id);

          if (!vendor.driveRootFolderId) {
            try {
              const { createVendorRootFolder } = await import('@/lib/google-master-drive.js');
              const root = await createVendorRootFolder(vendor.email, vendor.name);
              db.prepare('UPDATE vendors SET driveRootFolderId = ? WHERE id = ?').run(root.folderId, vendor.id);
            } catch (err) {
              console.warn('[Root Folder Creation Error]:', err.message);
            }
          }

          console.log(`[Payment Webhook SUCCESS] Vendor ${vendor.name} (${vendor.email}) Add-On Storage ${planName} (${targetQuotaBytes} bytes) berhasil diaktivasi!`);
        }
      } else if (vendor && plan) {
        const wasActive = vendor.status === 'active';
        const isRenewal = wasActive && vendor.planId === plan.id;
        const isUpgrade = wasActive && vendor.planId !== plan.id;
        const oldPlanRow = isUpgrade ? db.prepare('SELECT name FROM plans WHERE id = ?').get(vendor.planId) : null;

        // Calculate new expiration date (Accumulate remaining days if active)
        const now = new Date();
        let expDate = now;
        if (vendor.expiresAt && new Date(vendor.expiresAt) > now) {
          expDate = new Date(vendor.expiresAt);
        }
        expDate.setDate(expDate.getDate() + (plan.activePeriodDays || 30));
        const expiresAt = expDate.toISOString().split('T')[0];

        // Determine if there is a bundled Add-On storage quota to activate
        let newAddonPlanId = vendor.addonPlanId;
        let newAddonStorageQuotaBytes = vendor.addonStorageQuotaBytes || 0;

        if (transaction.addonPlanId || vendor.pendingAddonQuotaBytes > 0) {
          const addonKey = transaction.addonPlanId || vendor.pendingAddonPlanId;
          let quotaBytes = vendor.pendingAddonQuotaBytes || 0;
          if (!quotaBytes && addonKey) {
            if (addonKey === 'addon-10gb') quotaBytes = 10 * 1024 * 1024 * 1024;
            else if (addonKey === 'addon-25gb') quotaBytes = 25 * 1024 * 1024 * 1024;
            else if (addonKey === 'addon-50gb') quotaBytes = 50 * 1024 * 1024 * 1024;
          }
          if (quotaBytes > 0) {
            newAddonPlanId = addonKey;
            newAddonStorageQuotaBytes = quotaBytes;
          }
        }

        // Activate vendor account and addon storage
        db.prepare(`
          UPDATE vendors 
          SET status = 'active', planId = ?, expiresAt = ?, maxProjects = ?, hasStorageAddon = ?, addonPlanId = ?, addonStorageQuotaBytes = ?, pendingAddonPlanId = NULL, pendingAddonQuotaBytes = 0
          WHERE id = ?
        `).run(plan.id, expiresAt, plan.maxProjects, newAddonStorageQuotaBytes > 0 ? 1 : vendor.hasStorageAddon, newAddonPlanId, newAddonStorageQuotaBytes, vendor.id);

        console.log(`[Payment Webhook SUCCESS] Vendor ${vendor.name} (${vendor.email}) berhasil diaktivasi otomatis untuk paket ${plan.name} (Storage: ${newAddonStorageQuotaBytes} bytes)!`);

        // Trigger automated email notification based on transaction type
        const updatedVendor = { ...vendor, status: 'active', expiresAt };
        if (isRenewal) {
          sendVendorRenewalConfirmationEmail(updatedVendor, plan, expiresAt, 'QRIS').catch(() => {});
        } else if (isUpgrade) {
          sendVendorUpgradeConfirmationEmail(updatedVendor, oldPlanRow?.name || 'Paket Sebelumnya', plan, expiresAt, 'QRIS').catch(() => {});
        } else {
          sendVendorApprovalEmail(updatedVendor, plan, transaction.orderId, 'QRIS').catch(() => {});
        }
      }
    } else if (isFailed) {
      const isExpire = transactionStatus === 'expire';
      const newTxStatus = isExpire ? 'expired' : 'failed';
      db.prepare("UPDATE payment_transactions SET status = ? WHERE id = ?").run(newTxStatus, transaction.id);
      try {
        db.prepare("UPDATE payment_sessions SET status = ? WHERE orderId = ?").run(newTxStatus, orderId);
      } catch (e) {}

      // Move vendor to expired_draft / cancelled so candidate moves to Arsip sub-tab
      const newVendorStatus = isExpire ? 'expired_draft' : 'cancelled';
      db.prepare("UPDATE vendors SET status = ?, archivedAt = CURRENT_TIMESTAMP WHERE id = ? AND status != 'active'").run(newVendorStatus, transaction.vendorId);

      console.log(`[Payment Webhook EXPIRED/FAILED] Vendor ID ${transaction.vendorId} dipindahkan ke Arsip (${newVendorStatus}).`);
    }

    return NextResponse.json({ success: true, message: 'Notification processed' });

  } catch (error) {
    console.error('[Payment Webhook Error]:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
