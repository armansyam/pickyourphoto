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

    let _body; try { _body = await request.json(); } catch (_) { return NextResponse.json({ message: 'Format body tidak valid.' }, { status: 400 }); }

    const { vendorId, email, vendorEmail, planId, addonPlanId, customAmount } = _body || {};
    const targetEmail = (email || vendorEmail || '').trim().toLowerCase();

    let vendor = null;
    if (vendorId) {
      vendor = db.prepare('SELECT id, name, email, whatsapp, status FROM vendors WHERE id = ?').get(vendorId);
    } else if (targetEmail) {
      vendor = db.prepare('SELECT id, name, email, whatsapp, status FROM vendors WHERE lower(email) = ?').get(targetEmail);
    }

    if (!vendor) {
      return NextResponse.json({ message: 'Akun vendor tidak ditemukan.' }, { status: 404 });
    }

    if (!planId) {
      return NextResponse.json({ message: 'Paket langganan wajib dipilih.' }, { status: 400 });
    }

    const plan = db.prepare('SELECT id, name, price FROM plans WHERE id = ?').get(planId);
    if (!plan) {
      return NextResponse.json({ message: 'Paket berlangganan tidak ditemukan.' }, { status: 404 });
    }

    // Import auth helper to verify caller session
    const { getAuthVendor } = await import('@/lib/auth');
    const authUser = getAuthVendor();

    // SECURITY CRITICAL: Active vendors MUST be authenticated to create a payment.
    // Unauthenticated payment creation is only allowed for new vendor registrants
    // who don't yet have an account session (status: pending/pending_payment/new).
    // This prevents unauthenticated attackers from creating fake payment sessions
    // for active vendor accounts, which can cause auto-sync to mark them as expired_draft.
    if (vendor.status === 'active') {
      if (!authUser) {
        return NextResponse.json({ message: 'Akses ditolak. Harap login untuk melanjutkan.' }, { status: 401 });
      }
      if (authUser.role !== 'admin' && String(authUser.id) !== String(vendor.id)) {
        return NextResponse.json({ message: 'Akses ditolak.' }, { status: 403 });
      }
    } else {
      // For non-active vendors (new registrants): restrict cross-account if authenticated
      if (authUser && authUser.role !== 'admin' && String(authUser.id) !== String(vendor.id)) {
        return NextResponse.json({ message: 'Akses ditolak.' }, { status: 403 });
      }
    }

    // Security: Only super-admin can provide manual customAmount override. Vendors are strictly billed based on server-side pricing & active promos.
    const allowCustom = Boolean(authUser && authUser.role === 'admin');
    let planAmount = (customAmount && customAmount > 0 && allowCustom) ? Number(customAmount) : plan.price;

    if (plan.price > 0 && (!customAmount || !allowCustom)) {
      const settings = db.prepare("SELECT enable_flash_promo, flash_promo_discount_percent, flash_promo_ends_at FROM system_settings WHERE id = 1").get() || {};
      const promoEnds = settings.flash_promo_ends_at ? new Date(settings.flash_promo_ends_at) : null;
      if (settings.enable_flash_promo === 1 && promoEnds && promoEnds > new Date()) {
        const pct = settings.flash_promo_discount_percent || 20;
        planAmount = Math.round(plan.price * (1 - pct / 100));
      }
    }

    // Calculate Add-On price & quota if selected
    let addonAmount = 0;
    let addonQuotaBytes = 0;
    let addonName = '';
    if (addonPlanId) {
      const addonRow = db.prepare("SELECT name, price, quotaBytes, status FROM addon_plans WHERE planKey = ? OR id = ?").get(addonPlanId, addonPlanId);
      if (addonRow) {
        if (addonRow.status === 'active') {
          addonAmount = addonRow.price;
          addonQuotaBytes = addonRow.quotaBytes;
          addonName = addonRow.name;
        } else {
          return NextResponse.json({ message: 'Paket Add-On Storage yang dipilih sedang dinonaktifkan.' }, { status: 400 });
        }
      } else {
        if (addonPlanId === 'addon-10gb') {
          addonAmount = 29000;
          addonQuotaBytes = 10 * 1024 * 1024 * 1024;
          addonName = 'Add-On Storage 10 GB';
        } else if (addonPlanId === 'addon-25gb') {
          addonAmount = 49000;
          addonQuotaBytes = 25 * 1024 * 1024 * 1024;
          addonName = 'Add-On Storage 25 GB';
        } else if (addonPlanId === 'addon-50gb') {
          addonAmount = 89000;
          addonQuotaBytes = 50 * 1024 * 1024 * 1024;
          addonName = 'Add-On Storage 50 GB';
        }
      }
    }

    const totalAmount = planAmount + addonAmount;

    // Handle Free Plan / 100% Promo (Zero Amount) directly without calling payment gateway
    if (totalAmount <= 0) {
      const activeDays = plan.activePeriodDays || 30;
      const expiresAtDate = new Date();
      expiresAtDate.setDate(expiresAtDate.getDate() + activeDays);
      const expiresAtIso = expiresAtDate.toISOString();

      db.prepare(`
        UPDATE vendors 
        SET status = 'active', 
            planId = ?, 
            maxProjects = ?, 
            expiresAt = ?, 
            hasStorageAddon = ?, 
            addonStorageQuotaBytes = ?, 
            addonPlanId = ? 
        WHERE id = ?
      `).run(
        plan.id,
        plan.maxProjects || 5,
        expiresAtIso,
        addonQuotaBytes > 0 ? 1 : 0,
        addonQuotaBytes,
        addonPlanId || null,
        vendor.id
      );

      return NextResponse.json({
        success: true,
        isFree: true,
        redirectUrl: '/setup',
        message: 'Paket berhasil diaktifkan. Silakan lanjutkan konfigurasi studio.'
      });
    }

    // Generate unique orderId for brand new transaction
    const orderId = `ORDER-${Date.now()}-${vendor.id}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    // Dynamic QRIS expiration time strictly from Admin SaaS settings
    const expiryMinutes = config.qrisExpirationMinutes && config.qrisExpirationMinutes > 0 ? config.qrisExpirationMinutes : 5;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiryMinutes * 60 * 1000).toISOString();

    // ── ATOMIC STEP 1 (DETIK KE-0): KUNCI STATUS DATABASE SEBELUM PANGGIL GATEWAY ──
    // 1. Mark any old pending sessions as 'replaced'
    try {
      db.prepare(`
        UPDATE payment_sessions 
        SET status = 'replaced' 
        WHERE vendorId = ? AND status = 'pending'
      `).run(vendor.id);
    } catch (e) {
      console.warn('[Payment Create] Failed to replace old expired sessions for vendor', vendor.id, ':', e.message);
    }

    // 2. Lock vendor status to 'pending_payment' IMMEDIATELY
    if (vendor.status === 'active') {
      db.prepare(`
        UPDATE vendors 
        SET pendingAddonPlanId = ?, pendingAddonQuotaBytes = ?
        WHERE id = ?
      `).run(addonPlanId || null, addonQuotaBytes, vendor.id);
    } else {
      db.prepare(`
        UPDATE vendors 
        SET status = 'pending_payment', archivedAt = NULL, planId = ?, pendingAddonPlanId = ?, pendingAddonQuotaBytes = ?
        WHERE id = ?
      `).run(plan.id, addonPlanId || null, addonQuotaBytes, vendor.id);
    }

    // 3. Insert placeholder payment_session IMMEDIATELY (so refresh during load stays in Stage 4)
    db.prepare(`
      INSERT INTO payment_sessions (orderId, vendorId, planId, addonPlanId, amount, status, paymentMethod, qrUrl, expiresAt, rawResponse)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, '', ?, '{}')
    `).run(
      orderId,
      vendor.id,
      plan.id,
      addonPlanId || null,
      totalAmount,
      config.provider,
      expiresAt
    );

    // 4. Insert placeholder payment_transaction IMMEDIATELY
    db.prepare(`
      INSERT INTO payment_transactions (orderId, vendorId, planId, addonPlanId, addonQuotaBytes, amount, provider, status, paymentUrl, rawResponse)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', '', '{}')
    `).run(
      orderId,
      vendor.id,
      plan.id,
      addonPlanId || null,
      addonQuotaBytes,
      totalAmount,
      config.provider
    );

    // Determine dynamic request origin & webhook notifyUrl based on Mode (Sandbox vs Live)
    const host = request.headers.get('host') || 'localhost:3000';
    const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    let origin = request.headers.get('origin') || request.nextUrl.origin || `${proto}://${host}`;

    const gatewayModeRow = db.prepare("SELECT value FROM saas_settings WHERE key = 'gateway_mode'").get();
    const gatewayMode = gatewayModeRow?.value || 'sandbox';

    const tunnelRow = db.prepare("SELECT value FROM saas_settings WHERE key = 'sandbox_tunnel_url'").get();
    const sandboxTunnel = tunnelRow?.value ? tunnelRow.value.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '') : '';

    let notifyOrigin = origin;

    if (gatewayMode === 'sandbox' && sandboxTunnel && !sandboxTunnel.includes('localhost')) {
      notifyOrigin = `https://${sandboxTunnel}`;
    } else {
      const saasDomainRow = db.prepare("SELECT value FROM saas_settings WHERE key = 'saas_domain'").get();
      if (saasDomainRow?.value && saasDomainRow.value.trim()) {
        const cleanDomain = saasDomainRow.value.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
        if (!cleanDomain.includes('localhost') && !cleanDomain.includes('127.0.0.1')) {
          notifyOrigin = `https://${cleanDomain}`;
        }
      }
    }

    // ── STEP 2: PANGGIL PAYMENT GATEWAY UNTUK GENERATE QRIS BARU ──
    const paymentResult = await createPayment({
      orderId,
      amount: totalAmount,
      vendorName: vendor.name,
      vendorEmail: vendor.email,
      vendorPhone: vendor.whatsapp,
      planName: addonName ? `${plan.name} + ${addonName}` : plan.name,
      baseUrl: origin,
      notifyUrl: `${notifyOrigin}/api/payment/notification`,
      returnUrl: `${origin}/dashboard`,
      cancelUrl: `${origin}/register`,
    });

    const qrUrl = paymentResult.qrUrl || paymentResult.redirectUrl || '';

    // ── STEP 3: UPDATE PLACEHOLDER SESI DENGAN QRURL & RAW RESPONSE DARI GATEWAY ──
    db.prepare(`
      UPDATE payment_sessions 
      SET qrUrl = ?, rawResponse = ? 
      WHERE orderId = ?
    `).run(qrUrl, JSON.stringify(paymentResult.raw || {}), orderId);

    db.prepare(`
      UPDATE payment_transactions 
      SET paymentUrl = ?, rawResponse = ? 
      WHERE orderId = ?
    `).run(paymentResult.redirectUrl || '', JSON.stringify(paymentResult.raw || {}), orderId);

    // Trigger Pending QRIS Instructions Email in background
    try {
      const mailer = await import('@/lib/mailer.js');
      const addonNameEmail = addonPlanId ? (addonPlanId === 'addon-10gb' ? 'Drive 10 GB' : addonPlanId === 'addon-25gb' ? 'Drive 25 GB' : 'Drive 50 GB') : null;
      mailer.sendPendingQrisEmail(vendor, plan, orderId, totalAmount, addonNameEmail).catch((mailErr) => {
        console.warn('[Payment Create] QRIS email failed for order', orderId, ':', mailErr.message);
      });
    } catch (e) {
      console.warn('[Payment Create] Failed to import mailer for order', orderId, ':', e.message);
    }

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
