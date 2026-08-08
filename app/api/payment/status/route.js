import { NextResponse } from 'next/server';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';
import { generateToken } from '@/lib/auth';
import { getPaymentGatewayConfig } from '@/lib/payment-gateway';

import { sendVendorApprovalEmail } from '@/lib/mailer';

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

    // If not marked paid yet, check live status from Midtrans API directly
    if (transaction.status !== 'paid') {
      const config = getPaymentGatewayConfig();
      if (config.enabled && config.serverKey) {
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
              // Update payment transaction status in DB
              db.prepare("UPDATE payment_transactions SET status = 'paid', paidAt = CURRENT_TIMESTAMP WHERE id = ?").run(transaction.id);
              try {
                db.prepare("UPDATE payment_sessions SET status = 'paid', paidAt = CURRENT_TIMESTAMP WHERE orderId = ?").run(orderId);
              } catch (e) {}

              // Activate vendor account / Add-On storage
              const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(transaction.vendorId);

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

                  console.log(`[Live Midtrans Status SUCCESS] Vendor ${vendor.name} Add-On Storage ${planName} activated!`);
                }
              } else {
                const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(transaction.planId);
                if (vendor && plan) {
                  const expDate = new Date();
                  expDate.setDate(expDate.getDate() + (plan.activePeriodDays || 30));
                  const expiresAt = expDate.toISOString().split('T')[0];

                  db.prepare(`
                    UPDATE vendors 
                    SET status = 'active', planId = ?, expiresAt = ?, maxProjects = ?
                    WHERE id = ?
                  `).run(plan.id, expiresAt, plan.maxProjects, vendor.id);

                  console.log(`[Live Midtrans Check SUCCESS] Vendor ${vendor.name} (${vendor.email}) activated & sending approval email...`);

                  // Send email notification to vendor!
                  sendVendorApprovalEmail({ ...vendor, status: 'active' }, plan).catch(err => {
                    console.error('[Live Payment Status Email Error]:', err);
                  });
                }
              }

              transaction.status = 'paid';
            } else if (txStatus === 'expire' || txStatus === 'cancel' || txStatus === 'deny') {
              const newTxStatus = txStatus === 'expire' ? 'expired' : 'cancelled';
              db.prepare("UPDATE payment_transactions SET status = ? WHERE id = ?").run(newTxStatus, transaction.id);
              try {
                db.prepare("UPDATE payment_sessions SET status = ? WHERE orderId = ?").run(newTxStatus, orderId);
              } catch (e) {}

              // Update vendor status to move candidate to Arsip sub-tab
              const newVendorStatus = txStatus === 'expire' ? 'expired_draft' : 'cancelled';
              db.prepare("UPDATE vendors SET status = ?, archivedAt = CURRENT_TIMESTAMP WHERE id = ? AND status != 'active'").run(newVendorStatus, transaction.vendorId);

              console.log(`[Live Midtrans Check EXPIRED] Vendor ID ${transaction.vendorId} status set to ${newVendorStatus}`);
              transaction.status = newTxStatus;

              return NextResponse.json({
                paid: false,
                status: newTxStatus,
                expired: true,
                message: txStatus === 'expire' ? 'Transaksi QRIS ini telah KEDALUWARSA (Expired) oleh Midtrans. Akun dipindahkan ke Arsip.' : 'Transaksi telah dibatalkan/ditolak oleh Midtrans.'
              });
            }
          }
        } catch (midErr) {
          console.error('[Midtrans Live Status Fetch Error]:', midErr);
        }
      }
    }

    const session = db.prepare('SELECT * FROM payment_sessions WHERE orderId = ?').get(orderId);

    if (transaction.status === 'paid') {
      const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(transaction.vendorId);
      if (vendor) {
        // Generate auth session token using standard helper with role
        const token = generateToken({ id: vendor.id, name: vendor.name, email: vendor.email, role: vendor.role });

        const response = NextResponse.json({
          paid: true,
          status: 'paid',
          redirectUrl: '/dashboard',
          message: 'Pembayaran lunas. Mengarahkan ke Dashboard...'
        });

        // Set token cookie
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
