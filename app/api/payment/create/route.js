import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { createPayment, getPaymentGatewayConfig } from '@/lib/payment-gateway';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request) {
  try {
    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`payment_create_ip_${clientIp}`, 5, 60);

    if (!rateCheck.success) {
      return NextResponse.json({
        message: `Terlalu banyak permintaan pembayaran. Harap tunggu ${rateCheck.resetSeconds} detik.`
      }, { status: 429 });
    }

    const config = getPaymentGatewayConfig();
    if (!config.enabled) {
      return NextResponse.json({ message: 'Payment Gateway saat ini dinonaktifkan.' }, { status: 400 });
    }

    const { vendorId, planId, customAmount } = await request.json();

    if (!vendorId || !planId) {
      return NextResponse.json({ message: 'vendorId dan planId wajib diisi.' }, { status: 400 });
    }


    const vendor = db.prepare('SELECT id, name, email, whatsapp FROM vendors WHERE id = ?').get(vendorId);
    if (!vendor) {
      return NextResponse.json({ message: 'Vendor tidak ditemukan.' }, { status: 404 });
    }

    const plan = db.prepare('SELECT id, name, price FROM plans WHERE id = ?').get(planId);
    if (!plan) {
      return NextResponse.json({ message: 'Paket berlangganan tidak ditemukan.' }, { status: 404 });
    }

    // Calculate amount considering active Flash Sale Promo
    let amount = (customAmount && customAmount > 0) ? customAmount : plan.price;
    if (!customAmount && plan.price > 0) {
      const settings = db.prepare("SELECT enable_flash_promo, flash_promo_discount_percent, flash_promo_ends_at FROM system_settings WHERE id = 1").get() || {};
      const promoEnds = settings.flash_promo_ends_at ? new Date(settings.flash_promo_ends_at) : null;
      if (settings.enable_flash_promo === 1 && promoEnds && promoEnds > new Date()) {
        const pct = settings.flash_promo_discount_percent || 20;
        amount = Math.round(plan.price * (1 - pct / 100));
      }
    }


    const paymentResult = await createPayment({
      orderId,
      amount,
      vendorName: vendor.name,
      vendorEmail: vendor.email,
      vendorPhone: vendor.whatsapp,
      planName: plan.name,
    });

    // Calculate dynamic QRIS expiration time from Admin SaaS settings (default: 15 minutes)
    const expiryMinutes = config.qrisExpirationMinutes && config.qrisExpirationMinutes > 0 ? config.qrisExpirationMinutes : 15;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiryMinutes * 60 * 1000).toISOString();

    // Save payment transaction log in DB
    db.prepare(`
      INSERT INTO payment_transactions (orderId, vendorId, planId, amount, provider, status, paymentUrl, rawResponse)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(
      orderId,
      vendor.id,
      plan.id,
      amount,
      config.provider,
      paymentResult.redirectUrl || '',
      JSON.stringify(paymentResult.raw || {})
    );

    // Save payment session in DB with real qrUrl from Midtrans Core API
    const qrUrl = paymentResult.qrUrl || paymentResult.redirectUrl || '';
    db.prepare(`
      INSERT INTO payment_sessions (orderId, vendorId, planId, amount, status, paymentMethod, qrUrl, expiresAt, rawResponse)
      VALUES (?, ?, ?, ?, 'pending', 'qris', ?, ?, ?)
    `).run(
      orderId,
      vendor.id,
      plan.id,
      amount,
      qrUrl,
      expiresAt,
      JSON.stringify(paymentResult.raw || {})
    );

    // Update vendor status back to pending_payment and clear archivedAt
    db.prepare(`
      UPDATE vendors 
      SET status = 'pending_payment', archivedAt = NULL, planId = ? 
      WHERE id = ?
    `).run(plan.id, vendor.id);

    // Mark old expired pending sessions as replaced
    try {
      db.prepare(`
        UPDATE payment_sessions 
        SET status = 'replaced' 
        WHERE vendorId = ? AND status = 'pending' AND expiresAt <= CURRENT_TIMESTAMP
      `).run(vendor.id);
    } catch (e) {}

    return NextResponse.json({
      success: true,
      orderId,
      provider: config.provider,
      token: paymentResult.token,
      qrUrl,
      expiresAt,
    });


  } catch (error) {
    console.error('[Payment Create Error]:', error);
    return NextResponse.json({ message: error.message || 'Gagal memproses pembayaran' }, { status: 500 });
  }
}
