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

    // Security: Require either authenticated session or valid vendorId matching a real transaction
    const { getAuthVendor } = await import('@/lib/auth');
    const authUser = getAuthVendor();
    
    if (!authUser && !vendorId && !orderId) {
      return NextResponse.json({ paid: false, message: 'Akses ditolak.' }, { status: 401 });
    }

    // If caller is authenticated, restrict to their own transactions (unless admin)
    if (authUser && authUser.role !== 'admin' && vendorId && String(authUser.id) !== String(vendorId)) {
      return NextResponse.json({ paid: false, message: 'Akses ditolak.' }, { status: 403 });
    }

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

    // If unauthenticated, verify vendorId matches the transaction owner
    if (!authUser && String(transaction.vendorId) !== String(vendorId)) {
      return NextResponse.json({ paid: false, message: 'Akses ditolak.' }, { status: 403 });
    }

    const config = getPaymentGatewayConfig();
    let isSettled = transaction.status === 'paid';

    // If transaction is not paid yet, check live status from API directly (Midtrans or IPaymu)
    if (!isSettled && config.enabled && config.provider === 'ipaymu') {
      try {
        let trxId = null;
        try {
          const rawObj = JSON.parse(transaction.rawResponse || '{}');
          trxId = rawObj.Data?.TransactionId || rawObj.Data?.transactionId || rawObj.TransactionId;
        } catch (e) {
          console.warn('[PayStatus] rawResponse JSON corrupt for order', orderId, ':', e.message);
        }

        if (trxId) {
          const { checkIPaymuTransactionStatus } = await import('@/lib/payment-gateway/ipaymu.js');
          const ipaymuCheck = await checkIPaymuTransactionStatus({ transactionId: trxId, config });
          if (ipaymuCheck.valid) {
            if (ipaymuCheck.isPaid) {
              isSettled = true;
              db.prepare("UPDATE payment_transactions SET status = 'paid', paidAt = CURRENT_TIMESTAMP WHERE id = ?").run(transaction.id);
              try {
                db.prepare("UPDATE payment_sessions SET status = 'paid', paidAt = CURRENT_TIMESTAMP WHERE orderId = ?").run(orderId);
              } catch (e) {}
            } else if (ipaymuCheck.isFailed) {
              const newTxStatus = 'expired';
              db.prepare("UPDATE payment_transactions SET status = ? WHERE id = ?").run(newTxStatus, transaction.id);
              try {
                db.prepare("UPDATE payment_sessions SET status = ? WHERE orderId = ?").run(newTxStatus, orderId);
              } catch (e) {}

              db.prepare("UPDATE vendors SET status = ?, archivedAt = CURRENT_TIMESTAMP WHERE id = ? AND status != 'active'").run('expired_draft', transaction.vendorId);

              return NextResponse.json({
                paid: false,
                status: newTxStatus,
                expired: true,
                message: 'Transaksi QRIS ini telah kedaluwarsa atau dibatalkan.'
              });
            }
          }
        }
      } catch (ipaymuErr) {
        console.error('[IPaymu Live Status Fetch Error]:', ipaymuErr);
      }
    } else if (!isSettled && config.enabled && config.serverKey && config.provider === 'midtrans') {
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
    // GUARD: Hanya update vendor dan kirim email jika status belum 'active'
    // (mencegah expiresAt bertambah setiap polling frontend tiap 3 detik)
    if (isSettled) {
      const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(transaction.vendorId);
      const vendorAlreadyActive = vendor && vendor.status === 'active' && transaction.transactionType !== 'addon';
      if (vendor) {
        if (transaction.transactionType === 'addon') {
          // Pure Add-On storage purchase
          let targetQuotaBytes = transaction.addonQuotaBytes || vendor.pendingAddonQuotaBytes || 0;
          let addonPlanIdToStore = transaction.addonPlanId || vendor.pendingAddonPlanId || 'custom';
          let planName = 'Add-On Storage';

          if (!targetQuotaBytes && addonPlanIdToStore) {
            const addonPlan = db.prepare('SELECT * FROM addon_plans WHERE id = ?').get(addonPlanIdToStore);
            if (addonPlan) {
              targetQuotaBytes = addonPlan.quotaBytes;
              planName = addonPlan.name;
            } else if (addonPlanIdToStore === 'addon-10gb') targetQuotaBytes = 10 * 1024 * 1024 * 1024;
            else if (addonPlanIdToStore === 'addon-25gb') targetQuotaBytes = 25 * 1024 * 1024 * 1024;
            else if (addonPlanIdToStore === 'addon-50gb') targetQuotaBytes = 50 * 1024 * 1024 * 1024;
          }

          db.prepare(`
            UPDATE vendors 
            SET hasStorageAddon = 1, 
                addonStorageQuotaBytes = ?, 
                addonPlanId = ?, 
                pendingAddonPlanId = NULL, 
                pendingAddonQuotaBytes = 0
            WHERE id = ?
          `).run(targetQuotaBytes > 0 ? targetQuotaBytes : vendor.addonStorageQuotaBytes, addonPlanIdToStore, vendor.id);

          try {
            const currentPlan = db.prepare('SELECT * FROM plans WHERE id = ?').get(vendor.planId);
            const updatedVendorObj = { ...vendor, hasStorageAddon: 1, addonStorageQuotaBytes: targetQuotaBytes };
            sendVendorUpgradeConfirmationEmail(
              updatedVendorObj,
              currentPlan?.name || 'Paket Aktif',
              { name: `Add-On ${planName}`, maxProjects: vendor.maxProjects },
              vendor.expiresAt ? vendor.expiresAt.split('T')[0] : '',
              'QRIS'
            ).catch(() => {});
          } catch (mailErr) {
            console.error('[Payment Status Add-On Email Error]:', mailErr);
          }
        } else {
          // Standard Main Plan (or Main Plan + Bundled Add-On)
          // GUARD: Jika vendor sudah active dan ini bukan upgrade plan — lewati update expiresAt
          // untuk mencegah expiresAt terus bertambah setiap kali frontend polling
          const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(transaction.planId);
          const nowForExp = new Date();
          let expDate = nowForExp;
          if (vendor.expiresAt && new Date(vendor.expiresAt) > nowForExp) {
            expDate = new Date(vendor.expiresAt);
          }
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

          // [MED-03 FIX] Atomic UPDATE — hanya berhasil jika vendor belum active atau ada upgrade plan.
          // Mencegah race condition double-activation antara webhook dan frontend polling.
          // SQLite single-writer guarantee: hanya satu dari dua concurrent request yang lolos (changes > 0).
          const updateResult = db.prepare(`
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
                AND (status != 'active' OR planId != ?)
            `).run(
              plan ? plan.id : transaction.planId, 
              expiresAt, 
              plan ? plan.maxProjects : vendor.maxProjects, 
              newAddonStorageQuotaBytes > 0 ? 1 : vendor.hasStorageAddon, 
              newAddonPlanId, 
              newAddonStorageQuotaBytes, 
              vendor.id,
              plan ? plan.id : transaction.planId  // cek isUpgrade (planId berbeda)
            );

          // Kirim email konfirmasi HANYA jika update berhasil (changes > 0 = first concurrent winner)
          if (updateResult.changes > 0) {
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
          }
        }

        // Generate token dan set cookie HANYA jika belum login (status baru aktif)
        // Mencegah JWT cookie direset setiap polling 3 detik
        const token = generateToken({ id: vendor.id, name: vendor.name, email: vendor.email, role: vendor.role });
        const response = NextResponse.json({
          paid: true,
          status: 'paid',
          redirectUrl: '/dashboard',
          message: 'Pembayaran lunas. Mengarahkan ke Dashboard...'
        });

        if (!vendorAlreadyActive) {
          // Set cookie hanya untuk first-time activation
          response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60,
            path: '/',
          });
        }

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
