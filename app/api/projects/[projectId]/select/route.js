import { NextResponse } from 'next/server';
import db from '@/lib/db';

// POST: Save client selections & set project status to completed
export async function POST(request, { params }) {
    try {
        const { projectId } = params;
        const body = await request.json();
        const { photoIds, action = 'submit' } = body; // 'draft' (simpan sementara) or 'submit' (final lock)
        const { searchParams } = new URL(request.url);
        const clientKey = searchParams.get('key');

        if (!clientKey) {
            return NextResponse.json({ message: 'Missing client access key.' }, { status: 400 });
        }

        if (!Array.isArray(photoIds)) {
            return NextResponse.json({ message: 'Selected photos must be an array of IDs.' }, { status: 400 });
        }

        // Pada mode submit final, minimal harus ada 1 foto yang dipilih
        if (action === 'submit' && photoIds.length === 0) {
            return NextResponse.json({ message: 'Silakan pilih minimal 1 foto sebelum mengirim pilihan final Anda.' }, { status: 400 });
        }

        // 1. Authorize Client
        const getClient = db.prepare('SELECT id FROM clients WHERE projectId = ? AND accessKey = ?');
        const client = getClient.get(projectId, clientKey);

        if (!client) {
            return NextResponse.json({ message: 'Invalid access key or unauthorized.' }, { status: 401 });
        }

        const clientId = client.id;

        // 2. Check maxSelection limit & expiration & vendor subscription status
        const projectWithVendor = db.prepare(`
          SELECT p.maxSelection, p.status as projectStatus, p.expiresAt as projectExpiresAt, v.expiresAt as vendorExpiresAt, v.status as vendorStatus 
          FROM projects p 
          JOIN vendors v ON p.vendorId = v.id 
          WHERE p.id = ?
        `).get(projectId);

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
        const validPhotos = getProjectPhotoIds.all(projectId);
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
            db.prepare("UPDATE projects SET status = 'completed' WHERE id = ?").run(projectId);
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
