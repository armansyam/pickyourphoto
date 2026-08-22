import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthVendor } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payment/cancel
 * Cancel a pending QRIS payment session.
 * Body: { orderId: string }
 * Auth: Must be the vendor who owns the session, OR admin.
 */
export async function POST(request) {
  try {
    const currentUser = getAuthVendor();

    const body = await request.json();
    const { orderId, vendorId, email } = body;

    if (!orderId && !email && !vendorId) {
      return NextResponse.json({ message: 'orderId atau email wajib diisi.' }, { status: 400 });
    }

    let targetVendorId = null;

    if (orderId) {
      // Find the payment session
      const session = db.prepare('SELECT * FROM payment_sessions WHERE orderId = ?').get(orderId);
      if (session) {
        targetVendorId = session.vendorId;
        // Allow logged-in admin/vendor OR matching candidate vendor email
        let isAuthorized = false;
        if (currentUser && (currentUser.role === 'admin' || session.vendorId === currentUser.id)) {
          isAuthorized = true;
        } else if (email) {
          const v = db.prepare('SELECT id FROM vendors WHERE email = ?').get(email.toLowerCase().trim());
          if (v && v.id === session.vendorId) {
            isAuthorized = true;
          }
        }

        if (!isAuthorized) {
          return NextResponse.json({ message: 'Forbidden.' }, { status: 403 });
        }

        // Cancel the payment session and transaction atomically
        db.prepare("UPDATE payment_sessions SET status = 'cancelled' WHERE orderId = ?").run(orderId);
        try {
          db.prepare("UPDATE payment_transactions SET status = 'cancelled' WHERE orderId = ?").run(orderId);
        } catch (e) {}
      }
    }

    if (!targetVendorId && email) {
      const v = db.prepare('SELECT id FROM vendors WHERE email = ?').get(email.toLowerCase().trim());
      if (v) {
        targetVendorId = v.id;
        // Also cancel any open pending sessions for this vendor
        try {
          db.prepare("UPDATE payment_sessions SET status = 'cancelled' WHERE vendorId = ? AND status = 'pending'").run(v.id);
          db.prepare("UPDATE payment_transactions SET status = 'cancelled' WHERE vendorId = ? AND status = 'pending'").run(v.id);
        } catch (e) {}
      }
    }

    if (!targetVendorId && vendorId) {
      targetVendorId = Number(vendorId);
    }

    if (!targetVendorId) {
      return NextResponse.json({ message: 'Akun vendor tidak ditemukan.' }, { status: 404 });
    }

    // Return vendor status to draft_plan
    db.prepare(
      "UPDATE vendors SET status = 'draft_plan' WHERE id = ? AND status != 'active'"
    ).run(targetVendorId);

    console.log(`[Payment Cancel] Session ${orderId || 'N/A'} (vendorId: ${targetVendorId}) cancelled.`);

    return NextResponse.json({
      success: true,
      message: 'Sesi pembayaran berhasil dibatalkan dan dipindahkan ke arsip.',
    });

  } catch (error) {
    console.error('[Payment Cancel Error]:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
