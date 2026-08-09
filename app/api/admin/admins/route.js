import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthVendor } from '@/lib/auth';
import bcrypt from 'bcryptjs';

function verifyAdmin() {
  const user = getAuthVendor();
  if (!user || user.role !== 'admin') return null;
  return user;
}

// GET: List all admin accounts
export async function GET() {
  const admin = verifyAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 401 });
  }

  try {
    const adminList = db.prepare('SELECT id, name, email, isRoot, status, createdAt FROM admins ORDER BY id ASC').all();
    return NextResponse.json({ success: true, admins: adminList });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Add new sub-admin account
export async function POST(req) {
  const admin = verifyAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ success: false, error: 'Nama, email, dan password wajib diisi.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password minimal 6 karakter.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    const existing = db.prepare('SELECT id FROM admins WHERE email = ?').get(cleanEmail);
    if (existing) {
      return NextResponse.json({ success: false, error: 'Email admin tersebut sudah terdaftar.' }, { status: 400 });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const info = db.prepare(`
      INSERT INTO admins (name, email, password, role, isRoot, status)
      VALUES (?, ?, ?, 'admin', 0, 'active')
    `).run(name.trim(), cleanEmail, hashedPassword);

    return NextResponse.json({ success: true, id: info.lastInsertRowid, message: `Sub-Admin "${name}" berhasil ditambahkan.` });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove a sub-admin account (Root Admin cannot be deleted)
export async function DELETE(req) {
  const admin = verifyAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID admin wajib disertakan.' }, { status: 400 });
    }

    const targetAdmin = db.prepare('SELECT * FROM admins WHERE id = ?').get(id);
    if (!targetAdmin) {
      return NextResponse.json({ success: false, error: 'Akun admin tidak ditemukan.' }, { status: 404 });
    }

    if (targetAdmin.isRoot === 1 || Number(targetAdmin.id) === 1) {
      return NextResponse.json({ success: false, error: 'Root Master Admin tidak boleh dihapus demi keamanan sistem.' }, { status: 400 });
    }

    db.prepare('DELETE FROM admins WHERE id = ?').run(id);
    return NextResponse.json({ success: true, message: `Akun Sub-Admin "${targetAdmin.name}" berhasil dihapus.` });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
