import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthVendor } from '@/lib/auth';
import { createPayment } from '@/lib/payment-gateway';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payment/regenerate
 * Generate a new QRIS payment session for a vendor in the archive
 * (expired_draft, cancelled, or expired session).
 * Body: { vendorId: number, planId: number }
 * Auth: Admin only (called from Inquiry → Arsip tab)
 */
export async function POST(request) {
  try {
    const currentUser = getAuthVendor();
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const { vendorId, planId } = body;

    if (!vendorId || !planId) {
      return NextResponse.json({ message: 'vendorId dan planId wajib diisi.' }, { status: 400 });
    }

    // Fetch vendor
    const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(vendorId);
    if (!vendor) {
      return NextResponse.json({ message: 'Vendor tidak ditemukan.' }, { status: 404 });
    }

    // Must be in archive status to regenerate
    const allowedStatuses = ['expired_draft', 'cancelled', 'rejected'];
    if (!allowedStatuses.includes(vendor.status)) {
      return NextResponse.json(
        { message: `Vendor tidak bisa di-regenerate dari status: ${vendor.status}` },
        { status: 400 }
      );
    }

    // Fetch plan
    const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(planId);
    if (!plan) {
      return NextResponse.json({ message: 'Paket tidak ditemukan.' }, { status: 404 });
    }

    // Cancel any previously pending sessions for this vendor
    db.prepare(
      "UPDATE payment_sessions SET status = 'cancelled' WHERE vendorId = ? AND status = 'pending'"
    ).run(vendorId);

    // Restore vendor to pending_payment status (remove from archive)
    db.prepare(
      "UPDATE vendors SET status = 'pending_payment', planId = ?, archivedAt = NULL WHERE id = ?"
    ).run(planId, vendorId);

    // Create new Midtrans Snap transaction
    const orderId = `ORDER-${Date.now()}-${vendorId}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const paymentResult = await createPayment({
      orderId,
      amount: plan.price,
      vendorName: vendor.name,
      vendorEmail: vendor.email,
      vendorPhone: vendor.whatsapp || '',
      planName: plan.name,
    });

    // Record new payment session (2-hour expiry)
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    db.prepare(`
      INSERT INTO payment_sessions (orderId, vendorId, planId, amount, status, paymentMethod, expiresAt)
      VALUES (?, ?, ?, ?, 'pending', 'qris', ?)
    `).run(orderId, vendorId, planId, plan.price, expiresAt);

    console.log(`[Payment Regenerate] New session ${orderId} created for vendor ${vendor.email} (${plan.name})`);

    return NextResponse.json({
      success: true,
      orderId,
      token: paymentResult.token,
      redirectUrl: paymentResult.redirectUrl,
      expiresAt,
      message: 'QRIS baru berhasil dibuat. Calon vendor dipindahkan kembali ke antrian QRIS.',
    });

  } catch (error) {
    console.error('[Payment Regenerate Error]:', error);
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 });
  }
}
