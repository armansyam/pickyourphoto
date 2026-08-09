import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { generateToken } from '@/lib/auth';
import { getPaymentGatewayConfig } from '@/lib/payment-gateway';
import { 
  sendVendorApprovalEmail, 
  sendVendorUpgradeConfirmationEmail, 
  sendVendorRenewalConfirmationEmail 
} from '@/lib/mailer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    let orderId = searchParams.get('orderId');
    const vendorId = searchParams.get('vendorId');

    if (!orderId && vendorId) {
      const tx = db.prepare('SELECT orderId FROM payment_transactions WHERE vendorId = ? ORDER BY id DESC LIMIT 1').get(vendorId);
      if (tx) orderId = tx.orderId;
    }

    if (!orderId) {
      return NextResponse.json({ message: 'orderId atau vendorId wajib diisi.' }, { status: 400 });
    }

    let transaction = db.prepare('SELECT * FROM payment_transactions WHERE orderId = ?').get(orderId);
    if (!transaction) {
      return NextResponse.json({ paid: false, message: 'Transaksi pembayaran tidak ditemukan.' });
    }

    const config = getPaymentGatewayConfig();
    let isSettled = transaction.status === 'paid';

    // If transaction is not paid yet, check live status from Midtrans API directly
    if (!isSettled && config.enabled && config.serverKey) {
      try {
        const midtransStatusUrl = config.isProduction
          ? `https://api.midtrans.com/v2/${orderId}/status`
          : `https://api.sandbox.midtrans.com/v2/${orderId}/status`;

        const authHeader = 'Basic ' + Buffer.from(config.serverKey + ':').toString('base64');
        const midRes = await fetch(midtransStatusUrl, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': authHeader
          }
        });

        if (midRes.ok) {
          const midData = await midRes.json();
          const txStatus = midData.transaction_status;

          if (txStatus === 'settlement' || txStatus === 'capture') {
            isSettled = true;
            db.prepare("UPDATE payment_transactions SET status = 'paid', paidAt = CURRENT_TIMESTAMP WHERE id = ?").run(transaction.id);
            try {
              db.prepare("UPDATE payment_sessions SET status = 'paid', paidAt = CURRENT_TIMESTAMP WHERE orderId = ?").run(orderId);
            } catch (e) {}
          } else if (txStatus === 'expire' || txStatus === 'cancel' || txStatus === 'deny') {
            const newTxStatus = txStatus === 'expire' ? 'expired' : 'cancelled';
            db.prepare("UPDATE payment_transactions SET status = ? WHERE id = ?").run(newTxStatus, transaction.id);
            try {
              db.prepare("UPDATE payment_sessions SET status = ? WHERE orderId = ?").run(newTxStatus, orderId);
            } catch (e) {}

            const newVendorStatus = txStatus === 'expire' ? 'expired_draft' : 'cancelled';
            db.prepare("UPDATE vendors SET status = ?, archivedAt = CURRENT_TIMESTAMP WHERE id = ? AND status != 'active'").run(newVendorStatus, transaction.vendorId);

            return NextResponse.json({
              paid: false,
              status: newTxStatus,
              expired: true,
              message: 'Transaksi QRIS ini telah kedaluwarsa atau dibatalkan.'
            });
          }
        }
      } catch (midErr) {
        console.error('[Midtrans Live Status Fetch Error]:', midErr);
      }
    }

    // Always ensure vendor record is updated and email sent if transaction is settled (or marked paid)
    if (isSettled) {
      const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(transaction.vendorId);
      if (vendor) {
        const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(transaction.planId);
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + (plan ? plan.activePeriodDays : 30));
        const expiresAt = expDate.toISOString().split('T')[0];

        const wasActive = vendor.status === 'active';
        const isUpgrade = wasActive && plan && vendor.planId !== plan.id;
        const isRenewal = wasActive && plan && vendor.planId === plan.id;
        const oldPlanRow = isUpgrade ? db.prepare('SELECT name FROM plans WHERE id = ?').get(vendor.planId) : null;

        let newAddonPlanId = vendor.addonPlanId;
        let newAddonStorageQuotaBytes = vendor.addonStorageQuotaBytes || 0;

        if (transaction.addonPlanId || vendor.pendingAddonQuotaBytes > 0) {
          const addonKey = transaction.addonPlanId || vendor.pendingAddonPlanId;
          let quotaBytes = transaction.addonQuotaBytes || vendor.pendingAddonQuotaBytes || 0;
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

        db.prepare(`
          UPDATE vendors 
          SET status = 'active', 
              planId = ?, 
              expiresAt = ?, 
              maxProjects = ?, 
              hasStorageAddon = ?, 
              addonPlanId = ?, 
              addonStorageQuotaBytes = ?, 
              pendingAddonPlanId = NULL, 
              pendingAddonQuotaBytes = 0
          WHERE id = ?
        `).run(
          plan ? plan.id : transaction.planId, 
          expiresAt, 
          plan ? plan.maxProjects : vendor.maxProjects, 
          newAddonStorageQuotaBytes > 0 ? 1 : vendor.hasStorageAddon, 
          newAddonPlanId, 
          newAddonStorageQuotaBytes, 
          vendor.id
        );

        // Send confirmation email asynchronously
        const updatedVendorObj = { ...vendor, status: 'active', expiresAt };
        if (isUpgrade) {
          sendVendorUpgradeConfirmationEmail(updatedVendorObj, oldPlanRow?.name || 'Paket Sebelumnya', plan, expiresAt, 'QRIS').catch(err => {
            console.error('[Payment Status Email Error]:', err);
          });
        } else if (isRenewal) {
          sendVendorRenewalConfirmationEmail(updatedVendorObj, plan, expiresAt, 'QRIS').catch(err => {
            console.error('[Payment Status Email Error]:', err);
          });
        } else {
          sendVendorApprovalEmail(updatedVendorObj, plan, transaction.orderId, 'QRIS').catch(err => {
            console.error('[Payment Status Email Error]:', err);
          });
        }

        // Generate token and return paid response
        const token = generateToken({ id: vendor.id, name: vendor.name, email: vendor.email, role: vendor.role });
        const response = NextResponse.json({
          paid: true,
          status: 'paid',
          redirectUrl: '/dashboard',
          message: 'Pembayaran lunas. Mengarahkan ke Dashboard...'
        });

        response.cookies.set('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 24 * 60 * 60,
          path: '/',
        });

        return response;
      }
    }

    const session = db.prepare('SELECT * FROM payment_sessions WHERE orderId = ?').get(orderId);
    return NextResponse.json({ 
      paid: false, 
      status: transaction.status,
      expiresAt: session?.expiresAt || null
    });

  } catch (error) {
    console.error('[Payment Status Check Error]:', error);
    return NextResponse.json({ paid: false, message: 'Internal server error' }, { status: 500 });
  }
}
