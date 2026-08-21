import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/register/update-whatsapp
 * Updates the candidate vendor's WhatsApp number.
 * Body: { email: string, whatsapp: string }
 */
export async function POST(request) {
  try {
    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`update_wa_${clientIp}`, 20, 60);
    if (!rateCheck.success) {
      return NextResponse.json({ success: false, message: 'Terlalu banyak permintaan. Silakan tunggu sebentar.' }, { status: 429 });
    }

    const body = await request.json();
    const email = (body.email || '').toLowerCase().trim();
    let whatsapp = (body.whatsapp || '').trim();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ success: false, message: 'Email tidak valid.' }, { status: 400 });
    }

    // Clean phone number (digits only or with standard prefix)
    whatsapp = whatsapp.replace(/[^0-9+]/g, '');

    const vendor = db.prepare("SELECT id, status FROM vendors WHERE email = ? AND status IN ('draft_plan', 'pending_payment', 'expired_draft')").get(email);
    if (!vendor) {
      return NextResponse.json({ success: false, message: 'Data pendaftaran tidak ditemukan.' }, { status: 404 });
    }

    db.prepare("UPDATE vendors SET whatsapp = ? WHERE id = ?").run(whatsapp, vendor.id);

    return NextResponse.json({
      success: true,
      whatsapp: whatsapp,
      message: 'Nomor WhatsApp berhasil diperbarui.'
    });

  } catch (error) {
    console.error('[Update WhatsApp Error]:', error);
    return NextResponse.json({ success: false, message: error.message || 'Gagal memperbarui nomor WhatsApp' }, { status: 500 });
  }
}
