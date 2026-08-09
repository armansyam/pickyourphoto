import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthVendor } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const session = getAuthVendor();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Otentikasi dibutuhkan.' }, { status: 401 });
  }

  try {
    const { mode } = await req.json();
    if (!['byos', 'system'].includes(mode)) {
      return NextResponse.json({ success: false, error: 'Mode storage tidak valid.' }, { status: 400 });
    }

    const vendor = db.prepare('SELECT id, externalDriveConnected FROM vendors WHERE id = ?').get(session.id);
    if (!vendor) {
      return NextResponse.json({ success: false, error: 'Vendor tidak ditemukan.' }, { status: 404 });
    }

    if (mode === 'byos' && !vendor.externalDriveConnected) {
      return NextResponse.json({ success: false, error: 'Google Drive Anda belum terhubung. Harap hubungkan Google Drive terlebih dahulu.' }, { status: 400 });
    }

    db.prepare('UPDATE vendors SET activeStorageMode = ? WHERE id = ?').run(mode, vendor.id);

    const modeName = mode === 'byos' ? 'Kuota Google Drive Sendiri (BYOS)' : 'Kuota Storage Add-On Platform';
    console.log(`[Storage Toggle Success]: Vendor ID ${vendor.id} switched storage quota source to: ${mode}`);

    return NextResponse.json({
      success: true,
      activeStorageMode: mode,
      message: `Sumber kuota upload proyek baru berhasil diubah ke: ${modeName}.`
    });
  } catch (err) {
    console.error('[Storage Toggle Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
