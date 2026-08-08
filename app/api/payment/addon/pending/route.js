import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthVendor } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = getAuthVendor();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Otentikasi dibutuhkan.' }, { status: 401 });
  }

  try {
    const nowIso = new Date().toISOString();
    const pendingSession = db.prepare(`
      SELECT ps.*, ap.name as addonName, ap.price as addonPlanPrice, pt.paymentUrl, pt.rawResponse
      FROM payment_sessions ps
      LEFT JOIN addon_plans ap ON ps.addonPlanId = ap.id
      LEFT JOIN payment_transactions pt ON ps.orderId = pt.orderId
      WHERE ps.vendorId = ? AND ps.status = 'pending' AND ps.expiresAt > ?
      ORDER BY ps.createdAt DESC
      LIMIT 1
    `).get(session.id, nowIso);

    if (!pendingSession) {
      return NextResponse.json({ success: true, hasPending: false });
    }

    let token = null;
    try {
      if (pendingSession.rawResponse) {
        const raw = JSON.parse(pendingSession.rawResponse);
        token = raw.token || raw.snap_token || null;
      }
    } catch (e) {}

    return NextResponse.json({
      success: true,
      hasPending: true,
      pendingOrder: {
        orderId: pendingSession.orderId,
        amount: pendingSession.amount,
        planPrice: pendingSession.amount,
        planName: `Add-On ${pendingSession.addonName || 'Storage'}`,
        addonName: pendingSession.addonName,
        qrUrl: pendingSession.qrUrl,
        paymentUrl: pendingSession.paymentUrl || pendingSession.qrUrl,
        expiresAt: pendingSession.expiresAt,
        token: token,
        snapToken: token
      }
    });
  } catch (error) {
    console.error('[Pending Addon GET Error]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
