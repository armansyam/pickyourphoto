import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const plans = db.prepare(`
      SELECT id, planKey, name, quotaBytes, price, status, sortOrder 
      FROM addon_plans 
      WHERE status = 'active' 
      ORDER BY sortOrder ASC
    `).all();

    const workerStorageRow = db.prepare(`
      SELECT 
        COALESCE(SUM(totalLimitBytes), 0) as totalLimit,
        COALESCE(SUM(usedStorageBytes), 0) as totalUsed
      FROM master_drive_accounts
      WHERE role = 'worker' AND status = 'active'
    `).get();

    const remainingGlobalBytes = Math.max(0, (workerStorageRow.totalLimit - workerStorageRow.totalUsed));
    const remainingGlobalGb = Math.floor(remainingGlobalBytes / (1024 * 1024 * 1024));

    const customPriceRow = db.prepare("SELECT value FROM saas_settings WHERE key = 'custom_storage_price_per_gb'").get();
    const customStoragePricePerGb = customPriceRow ? parseInt(customPriceRow.value, 10) : 1250;

    return NextResponse.json({ 
      success: true, 
      plans,
      remainingGlobalBytes,
      remainingGlobalGb,
      customStoragePricePerGb
    });
  } catch (error) {
    console.error('[Addon Plans API Error]:', error.message);
    return NextResponse.json({ success: false, error: 'Gagal mengambil daftar paket Add-On Storage.' }, { status: 500 });
  }
}
