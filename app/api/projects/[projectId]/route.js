import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';

// GET: Retrieve project details & photos (Shared between Vendor & Client)
export async function GET(request, { params }) {
    try {
        const { projectId } = params;
        const { searchParams } = new URL(request.url);
        const clientKey = searchParams.get('key');

        const vendor = getAuthVendor();
        let isAuthorized = false;
        let isClient = false;
        let clientId = null;

        // 1. Authorize Vendor
        const getProject = db.prepare('SELECT * FROM projects WHERE id = ?');
        const project = getProject.get(projectId);

        if (!project) {
            return NextResponse.json({ message: 'Project not found.' }, { status: 404 });
        }

        if (vendor && project.vendorId === vendor.id) {
            isAuthorized = true;
        }

        // 2. Authorize Client (via Sharing Key)
        if (clientKey) {
            const getClient = db.prepare('SELECT id FROM clients WHERE projectId = ? AND accessKey = ?');
            const client = getClient.get(projectId, clientKey);
            if (client) {
                isAuthorized = true;
                isClient = true;
                clientId = client.id;
            }
        }

        if (!isAuthorized) {
            return NextResponse.json({ message: 'Unauthorized access.' }, { status: 401 });
        }

        // 3. Check Photographer subscription expiry and project archived status for Client access
        if (isClient) {
            if (project.status === 'archived') {
                return NextResponse.json({ 
                    message: 'Galeri ini telah diarsipkan dan tidak lagi dapat diakses oleh klien.' 
                }, { status: 403 });
            }
            const getVendorInfo = db.prepare('SELECT expiresAt FROM vendors WHERE id = ?').get(project.vendorId);
            if (getVendorInfo && getVendorInfo.expiresAt && new Date() > new Date(getVendorInfo.expiresAt)) {
                return NextResponse.json({ 
                    message: 'Galeri ini sementara tidak aktif karena masa berlaku paket fotografer telah berakhir. Silakan hubungi fotografer Anda.' 
                }, { status: 403 });
            }
        }

        // Get Client Details (e.g., sharing key, email)
        const getClientInfo = db.prepare('SELECT email, accessKey FROM clients WHERE projectId = ?');
        const clientInfo = getClientInfo.get(projectId) || {};

        // Fetch photos for the project, indicating which are selected
        let photos;
        if (isClient && clientId) {
            // Client view: show all photos, and mark if this specific client selected it
            const getPhotos = db.prepare(`
                SELECT 
                    p.*,
                    (SELECT COUNT(*) FROM selections s WHERE s.photoId = p.id AND s.clientId = ?) as isSelected
                FROM photos p
                WHERE p.projectId = ?
                ORDER BY p.id ASC
            `);
            photos = getPhotos.all(clientId, projectId);
        } else {
            // Vendor view: show all photos, and mark if selected by the project's client
            const getPhotos = db.prepare(`
                SELECT 
                    p.*,
                    (SELECT COUNT(*) FROM selections s JOIN clients c ON s.clientId = c.id WHERE s.photoId = p.id AND c.projectId = ?) as isSelected
                FROM photos p
                WHERE p.projectId = ?
                ORDER BY p.id ASC
            `);
            photos = getPhotos.all(projectId, projectId);
        }

        // Get Vendor Branding Info
        const vendorBranding = db.prepare('SELECT brandName, brandLogo FROM vendors WHERE id = ?').get(project.vendorId) || {};
        const isProjectExpired = project.expiresAt ? (new Date() > new Date(project.expiresAt)) : false;
        
        let filesDeleted = project.filesDeleted || 0;
        if (isProjectExpired && filesDeleted === 0) {
            const { deleteProjectFiles } = require('@/lib/storage-cleaner');
            deleteProjectFiles(projectId);
            filesDeleted = 1;
        }

        return NextResponse.json({
            project: {
                id: project.id,
                name: project.name,
                slug: project.slug,
                status: project.status,
                maxSelection: project.maxSelection || 0,
                galleryTheme: project.galleryTheme || 'default',
                expiresAt: project.expiresAt,
                isProjectExpired,
                filesDeleted,
                createdAt: project.createdAt
            },
            vendorBranding: {
                brandName: vendorBranding.brandName || '',
                brandLogo: vendorBranding.brandLogo || ''
            },
            client: clientInfo,
            photos
        });

    } catch (error) {
        console.error('Failed to get project details:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

// DELETE: Permanent deletion of project & static staging files
export async function DELETE(request, { params }) {
    try {
        const { projectId } = params;
        const vendor = getAuthVendor();

        if (!vendor) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // Validate project ownership
        const getProject = db.prepare('SELECT * FROM projects WHERE id = ? AND vendorId = ?');
        const project = getProject.get(projectId, vendor.id);

        if (!project) {
            return NextResponse.json({ message: 'Project not found or unauthorized.' }, { status: 404 });
        }

        // 1. Query SUM(fileSizeBytes) dari tabel photos untuk projectId tersebut sebelum dihapus
        const totalBytes = db.prepare('SELECT SUM(fileSizeBytes) as total FROM photos WHERE projectId = ?').get(projectId)?.total || 0;

        // Start manual deletion of dependencies in SQLite (grouped inside a transaction)
        const runDeleteTx = db.transaction(() => {
            db.prepare('DELETE FROM selections WHERE photoId IN (SELECT id FROM photos WHERE projectId = ?)').run(projectId);
            db.prepare('DELETE FROM photos WHERE projectId = ?').run(projectId);
            db.prepare('DELETE FROM clients WHERE projectId = ?').run(projectId);
            db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);

            // 2. Kurangi usedStorageBytes vendor dengan totalBytes dari project yang dihapus
            if (totalBytes > 0) {
                db.prepare('UPDATE vendors SET usedStorageBytes = MAX(0, usedStorageBytes - ?) WHERE id = ?').run(totalBytes, project.vendorId);
            }
        });

        runDeleteTx();

        // Delete physical files from disk recursively
        const uploadDir = path.join(process.cwd(), 'public', 'staging_uploads', `vendor_${project.vendorId}`, `project_${project.id}_${project.slug}`);
        if (fs.existsSync(uploadDir)) {
            try {
                fs.rmSync(uploadDir, { recursive: true, force: true });
            } catch (err) {
                console.error(`Failed to delete directory ${uploadDir}:`, err);
            }
        }

        return NextResponse.json({ message: 'Project and all associated files deleted successfully.' });

    } catch (error) {
        console.error('Failed to delete project:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

// PUT: Update project settings (name, maxSelection, status) (Vendor only)
export async function PUT(request, { params }) {
    try {
        const { projectId } = params;
        const vendor = getAuthVendor();

        if (!vendor) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // Validate project ownership
        const getProject = db.prepare('SELECT * FROM projects WHERE id = ? AND vendorId = ?');
        const project = getProject.get(projectId, vendor.id);

        if (!project) {
            return NextResponse.json({ message: 'Project not found or unauthorized.' }, { status: 404 });
        }

        const { name, maxSelection, status, galleryTheme } = await request.json();

        // Build dynamic query fields
        const fields = [];
        const values = [];

        if (name !== undefined) {
            if (!name.trim()) {
                return NextResponse.json({ message: 'Project name cannot be empty.' }, { status: 400 });
            }
            fields.push('name = ?');
            values.push(name.trim());
        }

        if (maxSelection !== undefined) {
            const parsedMax = parseInt(maxSelection);
            if (isNaN(parsedMax) || parsedMax < 0) {
                return NextResponse.json({ message: 'Invalid selection limit.' }, { status: 400 });
            }
            fields.push('maxSelection = ?');
            values.push(parsedMax);
        }

        if (status !== undefined) {
            const allowedStatuses = ['pending_selection', 'completed', 'archived'];
            if (!allowedStatuses.includes(status)) {
                return NextResponse.json({ message: 'Invalid status.' }, { status: 400 });
            }
            fields.push('status = ?');
            values.push(status);

            // Trigger file cleanup automatically when project is archived by the vendor
            if (status === 'archived') {
                const { deleteProjectFiles } = require('@/lib/storage-cleaner');
                deleteProjectFiles(projectId);
            }
        }
 
        if (galleryTheme !== undefined) {
            const allowedThemes = ['default', 'contactSheet', 'galleryWall', 'editorsMark', 'polaroid'];
            if (!allowedThemes.includes(galleryTheme)) {
                return NextResponse.json({ message: 'Invalid gallery theme.' }, { status: 400 });
            }
            fields.push('galleryTheme = ?');
            values.push(galleryTheme);
        }

        if (fields.length === 0) {
            return NextResponse.json({ message: 'No fields to update.' }, { status: 400 });
        }

        values.push(projectId);
        const updateQuery = `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`;
        db.prepare(updateQuery).run(...values);

        return NextResponse.json({ message: 'Project settings updated successfully.' });

    } catch (error) {
        console.error('Failed to update project settings:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
