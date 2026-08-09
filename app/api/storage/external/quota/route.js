import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';
import { fetchVendorDriveAboutQuota } from '@/lib/google-master-drive';

export const dynamic = 'force-dynamic';

// In-Memory Cache (TTL: 5 Menit)
const quotaCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET(req) {
  const session = getAuthVendor();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Otentikasi dibutuhkan.' }, { status: 401 });
  }

  try {
    const vendor = db.prepare('SELECT id, externalDriveConnected, externalDriveEmail, externalDriveFolderId FROM vendors WHERE id = ?').get(session.id);
    if (!vendor || !vendor.externalDriveConnected) {
      return NextResponse.json({
        success: true,
        connected: false,
        quota: null
      });
    }

    const now = Date.now();
    const cached = quotaCache.get(vendor.id);
    if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
      return NextResponse.json({
        success: true,
        connected: true,
        email: vendor.externalDriveEmail,
        quota: cached.data,
        cached: true,
      });
    }

    const quota = await fetchVendorDriveAboutQuota(vendor.id);
    if (quota) {
      quotaCache.set(vendor.id, { data: quota, timestamp: now });
    }

    return NextResponse.json({
      success: true,
      connected: true,
      email: vendor.externalDriveEmail,
      quota,
      cached: false,
    });
  } catch (err) {
    console.error('[External Drive Quota API Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
