import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const currentUser = getAuthVendor();
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    // Query transactions joined with vendors, plans, and addon_plans
    const rows = db.prepare(`
      SELECT 
        pt.orderId,
        v.name as vendorName,
        v.email as vendorEmail,
        COALESCE(ap.name, p.name, 'Paket SaaS') as planName,
        pt.transactionType,
        pt.amount,
        pt.status,
        pt.createdAt,
        pt.paidAt
      FROM payment_transactions pt
      LEFT JOIN vendors v ON pt.vendorId = v.id
      LEFT JOIN plans p ON pt.planId = p.id
      LEFT JOIN addon_plans ap ON pt.addonPlanId = ap.id
      ORDER BY pt.createdAt DESC
    `).all();

    // Format CSV Header
    let csvContent = 'Order ID,Nama Vendor,Email Vendor,Nama Paket/Addon,Tipe Transaksi,Jumlah (IDR),Status Pembayaran,Tanggal Dibuat,Tanggal Lunas\n';

    // Format CSV Rows
    for (const r of rows) {
      const orderId = `"${(r.orderId || '').replace(/"/g, '""')}"`;
      const name = `"${(r.vendorName || 'Pengguna Baru').replace(/"/g, '""')}"`;
      const email = `"${(r.vendorEmail || '-').replace(/"/g, '""')}"`;
      const plan = `"${(r.planName || '-').replace(/"/g, '""')}"`;
      const type = `"${r.transactionType === 'addon' ? 'Add-On Storage' : 'Paket Utama'}"`;
      const amount = r.amount || 0;
      const status = `"${(r.status || '').toUpperCase()}"`;
      const created = `"${r.createdAt ? new Date(r.createdAt).toLocaleString('id-ID') : '-'}"`;
      const paid = `"${r.paidAt ? new Date(r.paidAt).toLocaleString('id-ID') : '-'}"`;

      csvContent += `${orderId},${name},${email},${plan},${type},${amount},${status},${created},${paid}\n`;
    }

    const filename = `laporan_keuangan_pyp_${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error('[Admin Financial Export CSV Error]:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
