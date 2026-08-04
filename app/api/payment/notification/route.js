import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyPaymentWebhook } from '@/lib/payment-gateway';
import { sendVendorApprovalEmail } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

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

    const { orderId, isPaid, isFailed } = verification;

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

      if (vendor && plan) {
        // Calculate new expiration date (Today + activePeriodDays)
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + (plan.activePeriodDays || 30));
        const expiresAt = expDate.toISOString().split('T')[0];

        // Activate vendor account
        db.prepare(`
          UPDATE vendors 
          SET status = 'active', planId = ?, expiresAt = ?, maxProjects = ?
          WHERE id = ?
        `).run(plan.id, expiresAt, plan.maxProjects, vendor.id);

        console.log(`[Payment Webhook SUCCESS] Vendor ${vendor.name} (${vendor.email}) berhasil diaktivasi otomatis untuk paket ${plan.name}!`);

        // Trigger automated approval email notification to vendor
        sendVendorApprovalEmail({ ...vendor, status: 'active' }, plan).catch(err => {
          console.error('[Payment Webhook Email Error]:', err);
        });
      }
    } else if (isFailed && transaction.status !== 'failed') {
      db.prepare("UPDATE payment_transactions SET status = 'failed' WHERE id = ?").run(transaction.id);
    }

    return NextResponse.json({ success: true, message: 'Notification processed' });

  } catch (error) {
    console.error('[Payment Webhook Error]:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
