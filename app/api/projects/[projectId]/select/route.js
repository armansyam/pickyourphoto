import { NextResponse } from 'next/server';
import db from '@/lib/db';

// POST: Save client selections & set project status to completed
export async function POST(request, { params }) {
    try {
        const resolvedParams = await params;
        const projectId = resolvedParams?.projectId || params?.projectId;

        if (!projectId) {
            return NextResponse.json({ message: 'ID atau Slug proyek tidak valid.' }, { status: 400 });
        }

        const cleanIdOrSlug = decodeURIComponent(String(projectId).trim());
        const isNumeric = /^\d+$/.test(cleanIdOrSlug);
        const project = isNumeric
            ? db.prepare('SELECT id, vendorId, maxSelection, status, expiresAt FROM projects WHERE id = ?').get(parseInt(cleanIdOrSlug, 10))
            : db.prepare('SELECT id, vendorId, maxSelection, status, expiresAt FROM projects WHERE slug = ?').get(cleanIdOrSlug);

        if (!project) {
            return NextResponse.json({ message: 'Proyek tidak ditemukan.' }, { status: 404 });
        }

        const realProjectId = project.id;

        // Safe JSON parse — guard against empty or malformed body (SyntaxError → 400 not 500)
        let body = {};
        try { body = await request.json(); } catch (_) {
            return NextResponse.json({ message: 'Request body tidak valid.' }, { status: 400 });
        }
        const { photoIds, action = 'submit' } = body;
        const { searchParams } = new URL(request.url);
        const clientKey = searchParams.get('key');

        if (!Array.isArray(photoIds)) {
            return NextResponse.json({ message: 'Selected photos must be an array of IDs.' }, { status: 400 });
        }

        // Pada mode submit final, minimal harus ada 1 foto yang dipilih
        if (action === 'submit' && photoIds.length === 0) {
            return NextResponse.json({ message: 'Silakan pilih minimal 1 foto sebelum mengirim pilihan final Anda.' }, { status: 400 });
        }

        // 1. Authorize Client (by key or project default client)
        let client = null;
        if (clientKey) {
            client = db.prepare('SELECT id FROM clients WHERE projectId = ? AND accessKey = ?').get(realProjectId, clientKey);
        }
        if (!client) {
            client = db.prepare('SELECT id FROM clients WHERE projectId = ? ORDER BY id ASC LIMIT 1').get(realProjectId);
        }

        if (!client) {
            return NextResponse.json({ message: 'Akses galeri klien tidak valid.' }, { status: 401 });
        }

        const clientId = client.id;

        // 2. Check maxSelection limit & expiration & vendor subscription status
        const projectWithVendor = db.prepare(`
          SELECT p.maxSelection, p.status as projectStatus, p.expiresAt as projectExpiresAt, v.expiresAt as vendorExpiresAt, v.status as vendorStatus 
          FROM projects p 
          JOIN vendors v ON p.vendorId = v.id 
          WHERE p.id = ?
        `).get(realProjectId);

        if (!projectWithVendor) {
          return NextResponse.json({ message: 'Proyek tidak ditemukan.' }, { status: 404 });
        }

        // Jika proyek sudah berstatus completed dan sudah dikunci, tolak perubahan draft
        if (projectWithVendor.projectStatus === 'completed') {
            return NextResponse.json({ 
                message: 'Pilihan foto untuk proyek ini sudah dikirim dan dikunci sebelumnya.', 
                isLocked: true 
            }, { status: 400 });
        }

        const graceRow = db.prepare("SELECT value FROM saas_settings WHERE key = 'grace_period_days'").get();
        const graceDays = graceRow && parseInt(graceRow.value, 10) > 0 ? parseInt(graceRow.value, 10) : 7;
        const graceMs = graceDays * 24 * 60 * 60 * 1000;

        const nowTime = new Date().getTime();
        const vendorExpiryTime = projectWithVendor.vendorExpiresAt ? new Date(projectWithVendor.vendorExpiresAt).getTime() : 0;

        if (vendorExpiryTime > 0 && nowTime > vendorExpiryTime) {
          return NextResponse.json({ 
            message: 'Masa aktif layanan studio telah berakhir (dalam masa tenggang/kedaluwarsa). Galeri seleksi foto sementara ditangguhkan. Harap hubungi pihak studio foto.' 
          }, { status: 403 });
        }

        const maxSelection = projectWithVendor.maxSelection || 0;
        const isProjectExpired = projectWithVendor.projectExpiresAt ? (nowTime > new Date(projectWithVendor.projectExpiresAt).getTime()) : false;

        if (isProjectExpired) {
            return NextResponse.json({
                message: 'Batas waktu pemilihan foto untuk galeri ini telah berakhir (Expired). Silakan hubungi fotografer Anda.'
            }, { status: 400 });
        }

        // Deduplicate photo IDs to prevent duplicate count & constraint crashes
        const uniquePhotoIds = Array.from(new Set(photoIds));

        if (maxSelection > 0 && uniquePhotoIds.length > maxSelection) {
            return NextResponse.json({ 
                message: `Jumlah foto yang dipilih (${uniquePhotoIds.length}) melebihi batas maksimal (${maxSelection}). Silakan kurangi pilihan Anda.` 
            }, { status: 400 });
        }

        // 3. Validate that all submitted photoIds belong to the project
        const getProjectPhotoIds = db.prepare('SELECT id FROM photos WHERE projectId = ?');
        const validPhotos = getProjectPhotoIds.all(realProjectId);
        const validPhotoIdsSet = new Set(validPhotos.map(p => p.id));

        for (const id of uniquePhotoIds) {
            if (!validPhotoIdsSet.has(id)) {
                return NextResponse.json({ message: `Photo ID ${id} is not part of this project.` }, { status: 400 });
            }
        }

        // 4. Atomic Transaction: Bersihkan seleksi lama & masukkan seleksi terkini
        db.prepare('DELETE FROM selections WHERE clientId = ?').run(clientId);

        if (uniquePhotoIds.length > 0) {
            const insertSelection = db.prepare('INSERT OR IGNORE INTO selections (clientId, photoId) VALUES (?, ?)');
            const insertMany = db.transaction((ids) => {
                for (const id of ids) {
                    insertSelection.run(clientId, id);
                }
            });
            insertMany(uniquePhotoIds);
        }

        // 5. Update status proyek: Hanya kunci menjadi 'completed' jika aksi adalah 'submit'
        if (action === 'submit') {
            db.prepare("UPDATE projects SET status = 'completed' WHERE id = ?").run(realProjectId);
        }

        return NextResponse.json({
            success: true,
            isDraft: action === 'draft',
            message: action === 'draft' ? 'Draft pilihan foto berhasil disinkronkan.' : 'Pilihan foto berhasil dikirim dan galeri terkunci.',
            selectedCount: uniquePhotoIds.length
        });

    } catch (error) {
        console.error('Failed to submit selections:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
