import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

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

    const vendor = db.prepare('SELECT id, name, email, status, expiresAt FROM vendors WHERE id = ?').get(session.id);
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

    // Catat histori subskripsi add-on & update kuota vendor
    db.prepare(`
      INSERT INTO storage_addon_subscriptions (vendorId, addonPlanId, price, proratedPrice, status)
      VALUES (?, ?, ?, ?, 'active')
    `).run(vendor.id, addonPlan.id, addonPlan.price, proratedPrice);

    // Update vendor storage quota & addon status
    db.prepare(`
      UPDATE vendors 
      SET hasStorageAddon = 1, addonStorageQuotaBytes = ?, addonPlanId = ? 
      WHERE id = ?
    `).run(addonPlan.quotaBytes, addonPlan.id, vendor.id);

    return NextResponse.json({
      success: true,
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
