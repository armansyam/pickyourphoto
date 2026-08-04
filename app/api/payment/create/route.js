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

    // Generate unique orderId
    const orderId = `ORDER-${Date.now()}-${vendor.id}-${Math.floor(1000 + Math.random() * 9000)}`;
    const amount = (customAmount && customAmount > 0) ? customAmount : plan.price;


    const paymentResult = await createPayment({
      orderId,
      amount,
      vendorName: vendor.name,
      vendorEmail: vendor.email,
      vendorPhone: vendor.whatsapp,
      planName: plan.name,
    });

    // Calculate 2-hour QRIS expiration time
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();

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

    // Save payment session in DB with 2-hour QRIS expiration
    db.prepare(`
      INSERT INTO payment_sessions (orderId, vendorId, planId, amount, status, paymentMethod, qrUrl, expiresAt, rawResponse)
      VALUES (?, ?, ?, ?, 'pending', 'qris', ?, ?, ?)
    `).run(
      orderId,
      vendor.id,
      plan.id,
      amount,
      paymentResult.redirectUrl || '',
      expiresAt,
      JSON.stringify(paymentResult.raw || {})
    );

    return NextResponse.json({
      success: true,
      orderId,
      provider: config.provider,
      token: paymentResult.token,
      redirectUrl: paymentResult.redirectUrl,
      expiresAt,
    });

  } catch (error) {
    console.error('[Payment Create Error]:', error);
    return NextResponse.json({ message: error.message || 'Gagal memproses pembayaran' }, { status: 500 });
  }
}
