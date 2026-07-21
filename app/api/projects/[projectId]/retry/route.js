import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';
import { parseFolderId, fetchFolderFiles } from '@/lib/gdrive-importer';
import { deleteProjectFiles } from '@/lib/storage-cleaner';
import { processImagesInBackground } from '../../route';
import fs from 'fs';
import path from 'path';

export async function POST(request, { params }) {
    try {
        const vendor = getAuthVendor();
        if (!vendor) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { projectId } = params;
        if (!projectId) {
            return NextResponse.json({ message: 'Missing project ID.' }, { status: 400 });
        }

        // Fetch project details
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
        if (!project) {
            return NextResponse.json({ message: 'Project tidak ditemukan.' }, { status: 404 });
        }

        // Verify ownership
        if (project.vendorId !== vendor.id) {
            return NextResponse.json({ message: 'Forbidden. You do not own this project.' }, { status: 403 });
        }

        // Must be in failed status to retry
        if (project.status !== 'failed') {
            return NextResponse.json({ message: 'Hanya project yang berstatus Gagal (failed) yang dapat diimpor ulang.' }, { status: 400 });
        }

        if (!project.folderUrl) {
            return NextResponse.json({ message: 'URL folder Google Drive asal tidak ditemukan untuk project ini.' }, { status: 400 });
        }

        const folderId = parseFolderId(project.folderUrl);
        if (!folderId) {
            return NextResponse.json({ message: 'Folder URL Google Drive tidak valid.' }, { status: 400 });
        }

        // Fetch GDrive files list
        let files;
        try {
            files = await fetchFolderFiles(folderId);
        } catch (err) {
            console.error('GDrive fetch error on retry:', err);
            return NextResponse.json({ message: `Gagal membaca folder Google Drive: ${err.message}` }, { status: 400 });
        }

        if (!files || files.length === 0) {
            return NextResponse.json({ message: 'Tidak ditemukan file gambar di dalam folder Google Drive tersebut.' }, { status: 400 });
        }

        // Enforce maxPhotosPerProject limit from subscription plan
        const maxPhotos = vendor.maxPhotosPerProject || 0;
        if (maxPhotos > 0 && files.length > maxPhotos) {
            files = files.slice(0, maxPhotos);
        }

        // 1. Reset project status to 'importing', filesDeleted = 0, and expiresAt = NULL
        db.prepare('UPDATE projects SET status = ?, filesDeleted = 0, expiresAt = NULL WHERE id = ?').run('importing', projectId);

        // 3. Re-create public upload directory using structured paths
        const uploadDir = path.join(process.cwd(), 'public', 'staging_uploads', `vendor_${project.vendorId}`, `project_${project.id}_${project.slug}`);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // 4. Start background processing (un-awaited)
        processImagesInBackground(projectId, files, uploadDir).catch(err => {
            console.error(`Background processing failed for project ${projectId} on retry:`, err);
        });

        return NextResponse.json({
            message: 'Proses impor ulang berhasil dijalankan di background!',
            projectId
        });

    } catch (error) {
        console.error('Failed to retry project import:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
