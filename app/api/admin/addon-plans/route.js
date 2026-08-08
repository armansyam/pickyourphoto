import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthVendor } from '@/lib/auth';

function verifyAdmin() {
  const user = getAuthVendor();
  if (!user || user.role !== 'admin') return null;
  return user;
}

export async function GET() {
  const admin = verifyAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Akses ditolak. Sesi admin tidak valid.' }, { status: 401 });
  }

  try {
    const plans = db.prepare('SELECT * FROM addon_plans ORDER BY sortOrder ASC').all();
    return NextResponse.json({ success: true, plans });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  const admin = verifyAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { planKey, name, quotaBytes, price, sortOrder } = body;

    if (!planKey || !name || !quotaBytes || price === undefined) {
      return NextResponse.json({ success: false, error: 'Data paket tidak lengkap.' }, { status: 400 });
    }

    const info = db.prepare(`
      INSERT INTO addon_plans (planKey, name, quotaBytes, price, status, sortOrder)
      VALUES (?, ?, ?, ?, 'active', ?)
    `).run(planKey, name, Number(quotaBytes), Number(price), Number(sortOrder || 0));

    return NextResponse.json({ success: true, id: info.lastInsertRowid, message: 'Paket Add-On berhasil ditambahkan.' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  const admin = verifyAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, name, quotaBytes, price, status, sortOrder } = body;

    if (!id || !name || !quotaBytes || price === undefined) {
      return NextResponse.json({ success: false, error: 'Data paket tidak lengkap.' }, { status: 400 });
    }

    db.prepare(`
      UPDATE addon_plans 
      SET name = ?, quotaBytes = ?, price = ?, status = ?, sortOrder = ?
      WHERE id = ?
    `).run(name, Number(quotaBytes), Number(price), status || 'active', Number(sortOrder || 0), id);

    return NextResponse.json({ success: true, message: 'Paket Add-On berhasil diperbarui.' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  const admin = verifyAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID paket tidak ditemukan.' }, { status: 400 });
    }

    db.prepare('DELETE FROM addon_plans WHERE id = ?').run(id);
    return NextResponse.json({ success: true, message: 'Paket Add-On berhasil dihapus.' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
