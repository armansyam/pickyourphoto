import { NextResponse } from 'next/server';
import db from '@/lib/db';

// GET: Fetch trial gallery info by slug
export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const slug = resolvedParams?.slug;
    if (!slug) {
      return NextResponse.json({ message: 'Slug wajib diisi' }, { status: 400 });
    }

    const gallery = db.prepare('SELECT * FROM trial_galleries WHERE slug = ?').get(slug);

    if (!gallery) {
      return NextResponse.json({ message: 'Galeri trial tidak ditemukan' }, { status: 404 });
    }

    const now = new Date();
    const expiresAt = new Date(gallery.expiresAt);
    const createdAt = new Date(gallery.createdAt);
    const isExpired = now > expiresAt;

    // Hitung durasi aktual dari selisih expiresAt - createdAt (menit)
    const trialDurationMinutes = Math.round((expiresAt - createdAt) / (1000 * 60));

    let stagingFiles = [];
    let selectedPhotos = [];
    try {
      stagingFiles = JSON.parse(gallery.stagingFiles || '[]');
      selectedPhotos = JSON.parse(gallery.selectedPhotos || '[]');
    } catch (e) {}

    // Read preview limit and contact from saas_settings
    let previewLimit = 12;
    let contactWhatsapp = '';
    try {
      const saasRows = db.prepare("SELECT key, value FROM saas_settings WHERE key IN ('trial_preview_photos', 'contact_whatsapp')").all();
      for (const row of saasRows) {
        if (row.key === 'trial_preview_photos' && row.value) previewLimit = parseInt(row.value) || 12;
        if (row.key === 'contact_whatsapp') contactWhatsapp = row.value || '';
      }
    } catch (e) {}

    return NextResponse.json({
      gallery: {
        id: gallery.id,
        slug: gallery.slug,
        title: gallery.title,
        maxSelection: gallery.maxSelection,
        selectionStatus: gallery.selectionStatus,
        createdAt: gallery.createdAt,
        expiresAt: gallery.expiresAt,
        trialDurationMinutes,
        isExpired,
        photos: stagingFiles,
        selectedPhotos,
        totalPhotos: stagingFiles.filter(f => !f._isLocked).length,
        previewLimit,
        contactWhatsapp,
        logoUrl: gallery.logoUrl || null
      }
    });
  } catch (error) {
    console.error('[Trial GET Error]:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST: Save photo selections for trial gallery
export async function POST(request, { params }) {
  try {
    const resolvedParams = await params;
    const slug = resolvedParams?.slug;
    const { selectedPhotos, clientName } = await request.json();

    const gallery = db.prepare('SELECT * FROM trial_galleries WHERE slug = ?').get(slug);

    if (!gallery) {
      return NextResponse.json({ message: 'Galeri trial tidak ditemukan' }, { status: 404 });
    }

    const now = new Date();
    const expiresAt = new Date(gallery.expiresAt);
    if (now > expiresAt) {
      return NextResponse.json({ message: 'Masa berlaku galeri trial ini telah berakhir.' }, { status: 403 });
    }

    if (!Array.isArray(selectedPhotos)) {
      return NextResponse.json({ message: 'Daftar foto terpilih tidak valid' }, { status: 400 });
    }

    db.prepare(`
      UPDATE trial_galleries 
      SET selectedPhotos = ?, selectionStatus = 'completed'
      WHERE slug = ?
    `).run(JSON.stringify(selectedPhotos), slug);

    return NextResponse.json({
      success: true,
      message: 'Pilihan foto berhasil disimpan!',
      slug,
      selectedCount: selectedPhotos.length
    });
  } catch (error) {
    console.error('[Trial POST Error]:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
