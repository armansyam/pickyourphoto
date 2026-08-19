import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthVendor } from '@/lib/auth';
import { createPayment, getPaymentGatewayConfig } from '@/lib/payment-gateway';
import fs from 'fs';
import path from 'path';

export async function POST(req) {
  const session = getAuthVendor();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Otentikasi dibutuhkan. Harap login kembali.' }, { status: 401 });
  }

  try {
    let addonPlanId = null;
    let paymentMethod = 'gateway';
    let paymentProofFile = null;

    let customQuotaGb = null;
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      addonPlanId = formData.get('addonPlanId');
      paymentMethod = formData.get('paymentMethod') || 'manual';
      paymentProofFile = formData.get('paymentProof');
      if (formData.get('customQuotaGb')) {
        customQuotaGb = parseInt(formData.get('customQuotaGb'), 10);
      }
    } else {
      const body = await req.json();
      addonPlanId = body?.addonPlanId;
      paymentMethod = body?.paymentMethod || 'gateway';
      if (body?.customQuotaGb) {
        customQuotaGb = parseInt(body.customQuotaGb, 10);
      }
    }

    if (!addonPlanId) {
      return NextResponse.json({ success: false, error: 'Pilih paket Add-On Storage terlebih dahulu.' }, { status: 400 });
    }

    const vendor = db.prepare('SELECT id, name, email, whatsapp, status, expiresAt, planId FROM vendors WHERE id = ?').get(session.id);
    if (!vendor) {
      return NextResponse.json({ success: false, error: 'Data vendor tidak ditemukan.' }, { status: 404 });
    }

    if (vendor.status !== 'active') {
      return NextResponse.json({
        success: false,
        error: 'Paket Utama Anda tidak aktif. Harap perpanjang Paket Utama terlebih dahulu sebelum membeli Add-On Storage.'
      }, { status: 403 });
    }

    // Periksa sisa kapasitas penyimpanan global server dari Master Drive Worker Accounts
    const workerStorageRow = db.prepare(`
      SELECT 
        COALESCE(SUM(totalLimitBytes), 0) as totalLimit,
        COALESCE(SUM(usedStorageBytes), 0) as totalUsed
      FROM master_drive_accounts
      WHERE role = 'worker' AND status = 'active'
    `).get();
    const remainingGlobalBytes = Math.max(0, (workerStorageRow.totalLimit - workerStorageRow.totalUsed));
    const remainingGlobalGb = Math.floor(remainingGlobalBytes / (1024 * 1024 * 1024));

    let addonPlan = null;
    if (addonPlanId === 'custom' || customQuotaGb) {
      const targetGb = customQuotaGb && customQuotaGb >= 50 ? customQuotaGb : 60;
      const targetBytes = targetGb * 1024 * 1024 * 1024;

      if (targetBytes > remainingGlobalBytes) {
        return NextResponse.json({
          success: false,
          error: `Kapasitas server global saat ini tersisa ${remainingGlobalGb} GB. Kontak Admin untuk alokasi khusus.`
        }, { status: 400 });
      }

      const customRateRow = db.prepare("SELECT value FROM saas_settings WHERE key = 'custom_storage_price_per_gb'").get();
      const customPricePerGb = customRateRow ? parseInt(customRateRow.value, 10) : 1250;
      const monthlyPrice = targetGb * customPricePerGb;
      addonPlan = {
        id: 'custom',
        name: `Custom Storage ${targetGb} GB`,
        quotaBytes: targetBytes,
        price: monthlyPrice
      };
    } else {
      addonPlan = db.prepare("SELECT * FROM addon_plans WHERE id = ? AND status = 'active'").get(addonPlanId);
      if (!addonPlan) {
        return NextResponse.json({ success: false, error: 'Paket Add-On Storage tidak ditemukan atau tidak aktif.' }, { status: 404 });
      }

      if (addonPlan.quotaBytes > remainingGlobalBytes) {
        return NextResponse.json({
          success: false,
          error: `Kapasitas server global saat ini tersisa ${remainingGlobalGb} GB. Kontak Admin untuk alokasi khusus.`
        }, { status: 400 });
      }
    }

    // Hitung sisa hari Paket Utama untuk kalkulasi prorata
    const now = new Date();
    const expiresAtDate = vendor.expiresAt ? new Date(vendor.expiresAt) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const diffMs = expiresAtDate.getTime() - now.getTime();
    let remainingDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    if (remainingDays > 30) remainingDays = 30;

    // Kalkulasi harga prorata
    const proratedPrice = Math.max(10000, Math.round((addonPlan.price / 30) * remainingDays));

    // A. PEMBAYARAN TRANSFER BANK MANUAL (Jika dikirim bukti transfer / paymentMethod manual)
    if (paymentMethod === 'manual' || paymentProofFile) {
      let transferProofPath = 'Manual Bank Transfer';
      if (paymentProofFile && typeof paymentProofFile.arrayBuffer === 'function') {
        const buffer = Buffer.from(await paymentProofFile.arrayBuffer());
        const proofDir = path.join(process.cwd(), 'data', 'private_storage', 'proofs');
        if (!fs.existsSync(proofDir)) fs.mkdirSync(proofDir, { recursive: true });
        const ext = path.extname(paymentProofFile.name || 'proof.jpg') || '.jpg';
        const filename = `addon_${vendor.id}_${Date.now()}${ext}`;
        fs.writeFileSync(path.join(proofDir, filename), buffer);
        transferProofPath = `/api/admin/proofs/${filename}`;
      }

      // Simpan permohonan Add-On Storage ke subscription_requests & update pending flags di vendors
      const existingReq = db.prepare("SELECT id FROM subscription_requests WHERE vendorId = ? AND status = 'pending'").get(vendor.id);
      if (existingReq) {
        db.prepare("UPDATE subscription_requests SET addonPlanId = ?, requestType = 'addon', proratedPrice = ?, transferProof = ? WHERE id = ?")
          .run(addonPlan.id, proratedPrice, transferProofPath, existingReq.id);
      } else {
        db.prepare("INSERT INTO subscription_requests (vendorId, planId, addonPlanId, requestType, proratedPrice, transferProof, status) VALUES (?, ?, ?, 'addon', ?, ?, 'pending')")
          .run(vendor.id, vendor.planId || 1, addonPlan.id, proratedPrice, transferProofPath);
      }

      db.prepare(`
        UPDATE vendors 
        SET pendingAddonPlanId = ?, pendingAddonQuotaBytes = ?, paymentProof = ? 
        WHERE id = ?
      `).run(addonPlan.id, addonPlan.quotaBytes, transferProofPath, vendor.id);

      return NextResponse.json({
        success: true,
        isManualPayment: true,
        message: `Permintaan Add-On Storage ${addonPlan.name} berhasil diajukan! Harap tunggu verifikasi bukti transfer oleh Admin.`
      });
    }

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

      const vendorMainPlanId = vendor.planId || 1;

      const rawPayload = JSON.stringify({
        customQuotaBytes: addonPlan.quotaBytes,
        ...(paymentResult.raw || {})
      });

      // Catat histori transaksi di payment_transactions & payment_sessions
      db.prepare(`
        INSERT INTO payment_transactions (orderId, vendorId, planId, addonPlanId, amount, provider, status, paymentUrl, transactionType, rawResponse)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, 'addon', ?)
      `).run(orderId, vendor.id, vendorMainPlanId, addonPlan.id, proratedPrice, config.provider, paymentResult.redirectUrl || '', rawPayload);

      db.prepare(`
        INSERT INTO payment_sessions (orderId, vendorId, planId, addonPlanId, amount, status, paymentMethod, qrUrl, expiresAt, transactionType, rawResponse)
        VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, 'addon', ?)
      `).run(orderId, vendor.id, vendorMainPlanId, addonPlan.id, proratedPrice, config.provider, qrUrl, expiresAt, rawPayload);

      // Lock pending addon flags on vendor so Admin badge shows and webhook/polling can read quota
      db.prepare(`
        UPDATE vendors 
        SET pendingAddonPlanId = ?, pendingAddonQuotaBytes = ?
        WHERE id = ?
      `).run(addonPlan.id, addonPlan.quotaBytes, vendor.id);

      return NextResponse.json({
        success: true,
        isPaymentRequired: true,
        orderId,
        provider: config.provider || 'midtrans',
        amount: proratedPrice,
        token: paymentResult.token,
        snapToken: paymentResult.token,
        qrUrl,
        paymentUrl: paymentResult.redirectUrl || '',
        expiresAt,
        addonName: addonPlan.name,
        planName: `Add-On ${addonPlan.name}`,
        planPrice: proratedPrice,
        remainingDays,
        message: 'Invoice pembayaran Add-On Storage berhasil dibuat. Silakan selesaikan pembayaran.'
      });
    }

    // 2. Bila Payment Gateway dinonaktifkan: Wajib menggunakan transfer manual (keamanan finansial: tidak ada kuota gratis)
    return NextResponse.json({
      success: false,
      isPaymentRequired: true,
      error: 'Payment Gateway online sedang dinonaktifkan oleh administrator. Silakan lakukan pembayaran via Transfer Bank Manual dan ajukan permohonan melalui form upgrade/addon di dashboard.',
      proratedPrice,
      addonPlan: {
        id: addonPlan.id,
        name: addonPlan.name,
        price: addonPlan.price,
        quotaBytes: addonPlan.quotaBytes
      }
    }, { status: 400 });
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
