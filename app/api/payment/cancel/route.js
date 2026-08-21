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

    if (!orderId) {
      return NextResponse.json({ message: 'orderId wajib diisi.' }, { status: 400 });
    }

    // Find the payment session
    const session = db.prepare('SELECT * FROM payment_sessions WHERE orderId = ?').get(orderId);
    if (!session) {
      return NextResponse.json({ message: 'Sesi pembayaran tidak ditemukan.' }, { status: 404 });
    }

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

    if (session.status !== 'pending') {
      return NextResponse.json(
        { message: `Sesi tidak bisa dibatalkan. Status saat ini: ${session.status}` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Cancel the payment session and transaction atomically
    db.prepare(
      "UPDATE payment_sessions SET status = 'cancelled' WHERE orderId = ?"
    ).run(orderId);

    try {
      db.prepare(
        "UPDATE payment_transactions SET status = 'cancelled' WHERE orderId = ?"
      ).run(orderId);
    } catch (e) {}

    // Return vendor status to draft_plan
    db.prepare(
      "UPDATE vendors SET status = 'draft_plan' WHERE id = ? AND status != 'active'"
    ).run(session.vendorId);

    console.log(`[Payment Cancel] Session ${orderId} (vendorId: ${session.vendorId}) cancelled.`);

    return NextResponse.json({
      success: true,
      message: 'Sesi pembayaran berhasil dibatalkan dan dipindahkan ke arsip.',
    });

  } catch (error) {
    console.error('[Payment Cancel Error]:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
