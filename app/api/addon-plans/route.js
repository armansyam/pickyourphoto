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

    return NextResponse.json({ success: true, plans });
  } catch (error) {
    console.error('[Addon Plans API Error]:', error.message);
    return NextResponse.json({ success: false, error: 'Gagal mengambil daftar paket Add-On Storage.' }, { status: 500 });
  }
}
