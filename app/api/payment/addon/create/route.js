import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { createPayment, getPaymentGatewayConfig } from '@/lib/payment-gateway';

const JWT_SECRET = process.env.JWT_SECRET || 'pick-your-photo-secret-key-2026';

function verifyVendorSession() {
  const token = cookies().get('token')?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'vendor' && decoded.role !== 'admin') return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function POST(req) {
  const session = verifyVendorSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Otentikasi dibutuhkan. Harap login kembali.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { addonPlanId } = body;

    if (!addonPlanId) {
      return NextResponse.json({ success: false, error: 'Pilih paket Add-On Storage terlebih dahulu.' }, { status: 400 });
    }

    const vendor = db.prepare('SELECT id, name, email, whatsapp, status, expiresAt FROM vendors WHERE id = ?').get(session.id);
    if (!vendor) {
      return NextResponse.json({ success: false, error: 'Data vendor tidak ditemukan.' }, { status: 404 });
    }

    if (vendor.status !== 'active') {
      return NextResponse.json({
        success: false,
        error: 'Paket Utama Anda tidak aktif. Harap perpanjang Paket Utama terlebih dahulu sebelum membeli Add-On Storage.'
      }, { status: 403 });
    }

    const addonPlan = db.prepare('SELECT * FROM addon_plans WHERE id = ? AND status = "active"').get(addonPlanId);
    if (!addonPlan) {
      return NextResponse.json({ success: false, error: 'Paket Add-On Storage tidak ditemukan atau tidak aktif.' }, { status: 404 });
    }

    // Hitung sisa hari Paket Utama untuk kalkulasi prorata
    const now = new Date();
    const expiresAtDate = vendor.expiresAt ? new Date(vendor.expiresAt) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const diffMs = expiresAtDate.getTime() - now.getTime();
    let remainingDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    if (remainingDays > 30) remainingDays = 30;

    // Kalkulasi harga prorata
    const proratedPrice = Math.max(10000, Math.round((addonPlan.price / 30) * remainingDays));

    const config = getPaymentGatewayConfig();
    
    // 1. JIKA PAYMENT GATEWAY MIDTRANS AKTIF -> BUAT INVOICE PAYMENT MIDTRANS
    if (config && config.enabled) {
      const orderId = `ADDON-${vendor.id}-${addonPlan.id}-${Date.now()}`;

      const paymentResult = await createPayment({
        orderId,
        amount: proratedPrice,
        vendorName: vendor.name,
        vendorEmail: vendor.email,
        vendorPhone: vendor.whatsapp || '',
        planName: `Add-On ${addonPlan.name}`,
      });

      const expiryMinutes = config.qrisExpirationMinutes && config.qrisExpirationMinutes > 0 ? config.qrisExpirationMinutes : 15;
      const expiresAt = new Date(now.getTime() + expiryMinutes * 60 * 1000).toISOString();
      const qrUrl = paymentResult.qrUrl || paymentResult.redirectUrl || '';

      // Catat histori transaksi di payment_transactions & payment_sessions
      db.prepare(`
        INSERT INTO payment_transactions (orderId, vendorId, planId, addonPlanId, amount, provider, status, paymentUrl, transactionType, rawResponse)
        VALUES (?, ?, 0, ?, ?, ?, 'pending', ?, 'addon', ?)
      `).run(orderId, vendor.id, addonPlan.id, proratedPrice, config.provider, paymentResult.redirectUrl || '', JSON.stringify(paymentResult.raw || {}));

      db.prepare(`
        INSERT INTO payment_sessions (orderId, vendorId, planId, addonPlanId, amount, status, paymentMethod, qrUrl, expiresAt, transactionType, rawResponse)
        VALUES (?, ?, 0, ?, ?, 'pending', 'qris', ?, ?, 'addon', ?)
      `).run(orderId, vendor.id, addonPlan.id, proratedPrice, qrUrl, expiresAt, JSON.stringify(paymentResult.raw || {}));

      return NextResponse.json({
        success: true,
        isPaymentRequired: true,
        orderId,
        amount: proratedPrice,
        qrUrl,
        paymentUrl: paymentResult.redirectUrl || '',
        expiresAt,
        addonName: addonPlan.name,
        remainingDays,
        message: 'Invoice pembayaran Add-On Storage berhasil dibuat. Silakan selesaikan pembayaran.'
      });
    }

    // 2. FALLBACK / DEV MODE (Bila Payment Gateway dinonaktifkan): Langsung aktifkan kuota
    db.prepare(`
      INSERT INTO storage_addon_subscriptions (vendorId, addonPlanId, price, proratedPrice, status)
      VALUES (?, ?, ?, ?, 'active')
    `).run(vendor.id, addonPlan.id, addonPlan.price, proratedPrice);

    db.prepare(`
      UPDATE vendors 
      SET hasStorageAddon = 1, addonStorageQuotaBytes = ?, addonPlanId = ? 
      WHERE id = ?
    `).run(addonPlan.quotaBytes, addonPlan.id, vendor.id);

    return NextResponse.json({
      success: true,
      isPaymentRequired: false,
      message: `Berhasil mendaftar ${addonPlan.name}. Kuota storage sebesar ${formatBytes(addonPlan.quotaBytes)} telah diaktifkan.`,
      summary: {
        addonName: addonPlan.name,
        monthlyPrice: addonPlan.price,
        proratedPrice,
        remainingDays,
        quotaBytes: addonPlan.quotaBytes,
        expiresAt: vendor.expiresAt
      }
    });
  } catch (error) {
    console.error('[Addon Payment Create Error]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
