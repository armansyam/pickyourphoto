import { NextResponse } from 'next/server';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';
import { generateToken } from '@/lib/auth';
import { getPaymentGatewayConfig } from '@/lib/payment-gateway';

import { sendVendorApprovalEmail } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ message: 'orderId wajib diisi.' }, { status: 400 });
    }

    let transaction = db.prepare('SELECT * FROM payment_transactions WHERE orderId = ?').get(orderId);
    if (!transaction) {
      return NextResponse.json({ paid: false, message: 'Transaksi tidak ditemukan.' });
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

              // Activate vendor account
              const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(transaction.vendorId);
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

              transaction.status = 'paid';
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
        // Generate auth session token using standard 24h helper
        const token = generateToken({ id: vendor.id, name: vendor.name, email: vendor.email });


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
          sameSite: 'strict',
          maxAge: 60 * 60 * 24, // 1 day
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
