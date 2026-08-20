import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthVendor } from '@/lib/auth';
import { sendVendorRejectionEmail } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/vendors/:id/reject
 * Reject a pending vendor inquiry and move them to Archive.
 * Body: { reason?: string }
 * Auth: Admin only
 */
export async function POST(request, { params }) {
  try {
    const currentUser = getAuthVendor();
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const resolvedParams = await params;
    const vendorId = parseInt(resolvedParams?.vendorId || params?.vendorId);
    if (!vendorId || isNaN(vendorId)) {
      return NextResponse.json({ message: 'VendorId tidak valid.' }, { status: 400 });
    }

    const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(vendorId);
    if (!vendor) {
      return NextResponse.json({ message: 'Vendor tidak ditemukan.' }, { status: 404 });
    }

    const rejectableStatuses = ['pending_payment', 'pending_manual', 'pending'];
    if (!rejectableStatuses.includes(vendor.status)) {
      return NextResponse.json(
        { message: `Vendor tidak bisa ditolak dari status: ${vendor.status}` },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const reason = body.reason || 'Pendaftaran ditolak oleh administrator.';
    const now = new Date().toISOString();

    // Cancel any pending payment sessions
    db.prepare(
      "UPDATE payment_sessions SET status = 'cancelled' WHERE vendorId = ? AND status = 'pending'"
    ).run(vendorId);

    // Move vendor to rejected / archive
    db.prepare(
      "UPDATE vendors SET status = 'rejected', archivedAt = ? WHERE id = ?"
    ).run(now, vendorId);

    console.log(`[Admin Reject] Vendor ${vendor.email} (ID: ${vendorId}) ditolak oleh admin.`);

    // Optionally send rejection email (non-blocking, only if SMTP is configured)
    const plan = vendor.planId ? db.prepare('SELECT * FROM plans WHERE id = ?').get(vendor.planId) : null;
    sendVendorRejectionEmail(vendor, plan, reason).catch(err => {
      console.error('[Reject Email Error]:', err.message);
    });

    return NextResponse.json({
      success: true,
      message: `Pendaftaran vendor ${vendor.name} berhasil ditolak dan dipindahkan ke arsip.`,
    });

  } catch (error) {
    console.error('[Admin Reject Vendor Error]:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
