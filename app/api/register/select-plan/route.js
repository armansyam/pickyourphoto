import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/register/select-plan
 * Updates or clears the candidate vendor's selected plan in the database.
 * Body: { email: string, planId: number | null }
 */
export async function POST(request) {
  try {
    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`select_plan_${clientIp}`, 30, 60);
    if (!rateCheck.success) {
      return NextResponse.json({ success: false, message: 'Terlalu banyak permintaan.' }, { status: 429 });
    }

    const body = await request.json();
    const email = (body.email || '').toLowerCase().trim();
    const planId = body.planId ? parseInt(body.planId, 10) : null;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ success: false, message: 'Email tidak valid.' }, { status: 400 });
    }

    const vendor = db.prepare("SELECT id, status FROM vendors WHERE email = ? AND status IN ('draft_plan', 'pending_payment', 'expired_draft')").get(email);
    if (!vendor) {
      return NextResponse.json({ success: false, message: 'Data pendaftaran tidak ditemukan.' }, { status: 404 });
    }

    // Update vendor's planId and ensure status is draft_plan if changing/resetting plan
    db.prepare("UPDATE vendors SET planId = ?, status = 'draft_plan' WHERE id = ?").run(planId, vendor.id);

    return NextResponse.json({
      success: true,
      planId,
      message: planId ? 'Paket berhasil dipilih.' : 'Pilihan paket berhasil direset.'
    });

  } catch (error) {
    console.error('[Select Plan Error]:', error);
    return NextResponse.json({ success: false, message: error.message || 'Gagal memperbarui paket' }, { status: 500 });
  }
}
