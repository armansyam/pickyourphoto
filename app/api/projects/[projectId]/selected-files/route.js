import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';

// GET: Retrieve list of selected file names for a project (Vendor only)
// Used by RAW Sorter to know which files to match in the local folder
export async function GET(request, { params }) {
    try {
        const resolvedParams = await params;
        const projectId = resolvedParams?.projectId || params?.projectId;
        const vendor = getAuthVendor();

        if (!vendor) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // Validate project ownership
        const project = db.prepare('SELECT id, name, vendorId FROM projects WHERE id = ? AND vendorId = ?').get(projectId, vendor.id);

        if (!project) {
            return NextResponse.json({ message: 'Project not found or unauthorized.' }, { status: 404 });
        }

        // Query selected photos: join selections → photos to get originalPath
        // originalPath contains the file name (e.g. "DSC_0201.jpg")
        const selectedPhotos = db.prepare(`
            SELECT DISTINCT p.originalPath
            FROM photos p
            INNER JOIN selections s ON s.photoId = p.id
            INNER JOIN clients c ON s.clientId = c.id
            WHERE c.projectId = ?
            ORDER BY p.originalPath ASC
        `).all(projectId);

        // Extract clean file name from originalPath (strip query params and decode URI)
        const fileNames = selectedPhotos.map(row => {
            const fullPath = row.originalPath || '';
            const noQuery = fullPath.split('?')[0];
            const rawName = noQuery.split('/').pop() || '';
            try {
                return decodeURIComponent(rawName).trim();
            } catch (_) {
                return rawName.trim();
            }
        }).filter(name => name.length > 0);

        return NextResponse.json({
            projectName: project.name,
            totalSelected: fileNames.length,
            fileNames
        });

    } catch (error) {
        console.error('Failed to get selected files:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
