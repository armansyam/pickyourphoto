import { NextResponse } from 'next/server';
import db from '@/lib/db';

// POST: Save client selections & set project status to completed
export async function POST(request, { params }) {
    try {
        const { projectId } = params;
        const { photoIds } = await request.json(); // Array of photo IDs selected
        const { searchParams } = new URL(request.url);
        const clientKey = searchParams.get('key');

        if (!clientKey) {
            return NextResponse.json({ message: 'Missing client access key.' }, { status: 400 });
        }

        if (!Array.isArray(photoIds)) {
            return NextResponse.json({ message: 'Selected photos must be an array of IDs.' }, { status: 400 });
        }

        // 1. Authorize Client
        const getClient = db.prepare('SELECT id FROM clients WHERE projectId = ? AND accessKey = ?');
        const client = getClient.get(projectId, clientKey);

        if (!client) {
            return NextResponse.json({ message: 'Invalid access key or unauthorized.' }, { status: 401 });
        }

        const clientId = client.id;

        // 2. Check maxSelection limit & expiration
        const getProject = db.prepare('SELECT maxSelection, expiresAt FROM projects WHERE id = ?');
        const project = getProject.get(projectId);
        const maxSelection = project?.maxSelection || 0;
        const isProjectExpired = project?.expiresAt ? (new Date() > new Date(project.expiresAt)) : false;

        if (isProjectExpired) {
            return NextResponse.json({
                message: 'Batas waktu pemilihan foto untuk galeri ini telah berakhir (Expired). Silakan hubungi fotografer Anda.'
            }, { status: 400 });
        }

        if (maxSelection > 0 && photoIds.length > maxSelection) {
            return NextResponse.json({ 
                message: `Jumlah foto yang dipilih (${photoIds.length}) melebihi batas maksimal (${maxSelection}). Silakan kurangi pilihan Anda.` 
            }, { status: 400 });
        }

        // 3. Validate that all submitted photoIds belong to the project
        const getProjectPhotoIds = db.prepare('SELECT id FROM photos WHERE projectId = ?');
        const validPhotos = getProjectPhotoIds.all(projectId);
        const validPhotoIdsSet = new Set(validPhotos.map(p => p.id));

        for (const id of photoIds) {
            if (!validPhotoIdsSet.has(id)) {
                return NextResponse.json({ message: `Photo ID ${id} is not part of this project.` }, { status: 400 });
            }
        }

        // 3. Clear existing selections for this client
        db.prepare('DELETE FROM selections WHERE clientId = ?').run(clientId);

        // 4. Save new selections
        if (photoIds.length > 0) {
            const insertSelection = db.prepare('INSERT INTO selections (clientId, photoId) VALUES (?, ?)');
            const insertMany = db.transaction((ids) => {
                for (const id of ids) {
                    insertSelection.run(clientId, id);
                }
            });
            insertMany(photoIds);
        }

        // 5. Update project status to completed
        db.prepare("UPDATE projects SET status = 'completed' WHERE id = ?").run(projectId);

        return NextResponse.json({
            message: 'Selections submitted successfully.',
            selectedCount: photoIds.length
        });

    } catch (error) {
        console.error('Failed to submit selections:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
