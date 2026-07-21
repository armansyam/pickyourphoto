import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';
import { parseFolderId, fetchFolderFiles, downloadFileBuffer } from '@/lib/gdrive-importer';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import crypto from 'crypto';

// GET: List all projects for authenticated vendor
export async function GET() {
    console.log("--> [API GET /api/projects] Request received");
    try {
        const vendor = getAuthVendor();
        console.log("--> [API GET /api/projects] Auth vendor:", vendor ? vendor.name : 'none');
        if (!vendor) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        // Trigger background cleanup of all expired projects
        const { cleanupExpiredProjects } = require('@/lib/storage-cleaner');
        cleanupExpiredProjects();
        // Get projects with image count and selection status
        const stmt = db.prepare(`
            SELECT 
                p.*,
                (SELECT COUNT(*) FROM photos WHERE projectId = p.id) as totalPhotos,
                c.accessKey as clientAccessKey,
                (SELECT COUNT(DISTINCT s.photoId) FROM selections s JOIN clients cl ON s.clientId = cl.id WHERE cl.projectId = p.id) as selectedPhotosCount
            FROM projects p
            LEFT JOIN clients c ON c.projectId = p.id
            WHERE p.vendorId = ?
            ORDER BY p.createdAt DESC
        `);
        const allProjects = stmt.all(vendor.id).map(p => {
            const isProjectExpired = p.expiresAt ? (new Date() > new Date(p.expiresAt)) : false;
            return {
                ...p,
                isProjectExpired
            };
        });

        const activeProjects = allProjects.filter(p => p.status !== 'archived' && !p.isProjectExpired);
        const archivedProjects = allProjects.filter(p => p.status === 'archived' || p.isProjectExpired);

        const pendingRequest = db.prepare(`
            SELECT sr.*, p.name as planName 
            FROM subscription_requests sr 
            JOIN plans p ON sr.planId = p.id 
            WHERE sr.vendorId = ? AND sr.status = 'pending'
        `).get(vendor.id);

        console.log(`--> [API GET /api/projects] Returning ${activeProjects.length} active and ${archivedProjects.length} archived projects for vendor: ${vendor.name}`);
        return NextResponse.json({
            projects: activeProjects,
            archivedProjects,
            vendor: {
                id: vendor.id,
                name: vendor.name,
                email: vendor.email,
                role: vendor.role,
                planName: vendor.planName,
                planId: vendor.planId,
                planPrice: vendor.planPrice || 0,
                maxProjects: vendor.maxProjects,
                projectExpireDays: vendor.projectExpireDays || 0,
                maxPhotosPerProject: vendor.maxPhotosPerProject || 0,
                expiresAt: vendor.expiresAt,
                isExpired: vendor.isExpired,
                brandName: vendor.brandName || '',
                brandLogo: vendor.brandLogo || '',
                planType: vendor.planType || 'limit',
                maxStorageMB: vendor.maxStorageMB || 0,
                usedStorageBytes: vendor.usedStorageBytes || 0,
                upgradeRequest: pendingRequest || null
            }
        });
    } catch (error) {
        console.error('Failed to list projects:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

// POST: Create a new project & import files from GDrive
export async function POST(request) {
    try {
        const vendor = getAuthVendor();
        if (!vendor) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // Check project limit or storage limit depending on plan type
        const planType = vendor.planType || 'limit';
        if (planType === 'limit') {
            const countStmt = db.prepare('SELECT COUNT(*) as count FROM projects WHERE vendorId = ?');
            const projectCount = countStmt.get(vendor.id)?.count || 0;

            if (projectCount >= vendor.maxProjects) {
                return NextResponse.json({
                    message: `Batas jumlah proyek tercapai. Anda telah menggunakan ${projectCount} dari ${vendor.maxProjects} proyek yang diperbolehkan. Silakan upgrade paket Anda.`
                }, { status: 403 });
            }
        } else if (planType === 'storage') {
            const maxStorageBytes = (vendor.maxStorageMB || 0) * 1024 * 1024;
            if (vendor.usedStorageBytes >= maxStorageBytes) {
                return NextResponse.json({
                    message: `Kapasitas penyimpanan Anda penuh (${(vendor.usedStorageBytes / (1024 * 1024)).toFixed(1)} MB dari ${vendor.maxStorageMB} MB). Silakan arsipkan proyek lain terlebih dahulu.`
                }, { status: 403 });
            }
        }

        // Check subscription expiration
        if (vendor.isExpired) {
            return NextResponse.json({
                message: `Masa aktif langganan Anda telah berakhir pada ${new Date(vendor.expiresAt).toLocaleDateString()}. Silakan hubungi administrator untuk melakukan perpanjangan.`
            }, { status: 403 });
        }

        const { name, folderUrl, maxSelection, confirmLimitExceeded, galleryTheme } = await request.json();

        if (!name || !folderUrl) {
            return NextResponse.json({ message: 'Project name and Google Drive URL are required.' }, { status: 400 });
        }

        const folderId = parseFolderId(folderUrl);
        if (!folderId) {
            return NextResponse.json({ message: 'Invalid Google Drive URL.' }, { status: 400 });
        }

        // Fetch GDrive files list
        let files;
        try {
            files = await fetchFolderFiles(folderId);
        } catch (err) {
            console.error('GDrive fetch error:', err);
            return NextResponse.json({ message: `Failed to fetch Google Drive folder: ${err.message}` }, { status: 400 });
        }

        if (!files || files.length === 0) {
            return NextResponse.json({ message: 'No image files found in the Google Drive folder.' }, { status: 400 });
        }

        // Enforce maxPhotosPerProject limit for Limit-based plans
        if (planType === 'limit') {
            const maxPhotos = vendor.maxPhotosPerProject || 0;
            if (maxPhotos > 0 && files.length > maxPhotos) {
                if (!confirmLimitExceeded) {
                    return NextResponse.json({
                        limitExceeded: true,
                        limit: maxPhotos,
                        totalFiles: files.length,
                        message: `Jumlah foto di folder Google Drive Anda (${files.length} foto) melebihi batas tipe langganan Anda (maks. ${maxPhotos} foto per galeri).`
                    }, { status: 400 });
                }
                files = files.slice(0, maxPhotos);
            }
        }

        // Generate clean unique slug
        let baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        if (!baseSlug) baseSlug = 'project';
        let slug = baseSlug;
        let counter = 1;

        const checkSlug = db.prepare('SELECT id FROM projects WHERE slug = ?');
        while (checkSlug.get(slug)) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        // 1. Insert project record with status 'importing', maxSelection, folderUrl, and galleryTheme (expiresAt will be set after import finishes)
        const insertProject = db.prepare('INSERT INTO projects (vendorId, name, slug, status, maxSelection, expiresAt, folderUrl, galleryTheme) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)');
        const projectInfo = insertProject.run(vendor.id, name, slug, 'importing', maxSelection || 0, folderUrl, galleryTheme || 'default');
        const projectId = projectInfo.lastInsertRowid;

        // 2. Generate client record
        const clientAccessKey = crypto.randomBytes(16).toString('hex');
        const insertClient = db.prepare('INSERT INTO clients (email, projectId, accessKey) VALUES (?, ?, ?)');
        insertClient.run('client@example.com', projectId, clientAccessKey);

        // 3. Create public upload directory for the project using structured paths (vendor_[vendorId]/project_[projectId]_[slug])
        const uploadDir = path.join(process.cwd(), 'public', 'staging_uploads', `vendor_${vendor.id}`, `project_${projectId}_${slug}`);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Start background processing (un-awaited)
        processImagesInBackground(projectId, files, uploadDir).catch(err => {
            console.error(`Background processing failed for project ${projectId}:`, err);
        });

        return NextResponse.json({
            message: 'Proyek berhasil dibuat! Foto-foto sedang diimpor di background. Anda dapat menutup popup ini.',
            projectId,
            slug
        }, { status: 201 });

    } catch (error) {
        console.error('Failed to create project:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

// Background worker to download and process photos
export async function processImagesInBackground(projectId, files, uploadDir) {
    const project = db.prepare('SELECT vendorId, slug FROM projects WHERE id = ?').get(projectId);
    const vendorFolder = project ? `vendor_${project.vendorId}` : `vendor_unknown`;
    const projectFolder = project ? `project_${projectId}_${project.slug}` : `${projectId}`;

    const insertPhoto = db.prepare('INSERT INTO photos (projectId, originalPath, thumbnailPath, watermarkedPath, fileSizeBytes) VALUES (?, ?, ?, ?, ?)');
    let successCount = 0;
    let failCount = 0;
    let isStorageFull = false;

    for (const file of files) {
        try {
            // Sanitize file name for filesystem
            const sanitizedName = file.name.replace(/[\/\\?%*:|"<>]/g, '_');
            const ext = path.extname(sanitizedName) || '.jpg';
            const baseName = path.basename(sanitizedName, ext);

            const origFileName = `${baseName}${ext}`;
            const thumbFileName = `${baseName}_thumb${ext}`;

            // Save reference paths relative to public webserver root
            const origPathDb = `/staging_uploads/${vendorFolder}/${projectFolder}/${origFileName}`;
            const thumbPathDb = `/staging_uploads/${vendorFolder}/${projectFolder}/${thumbFileName}`;

            // Check if photo is already imported (resumable import)
            const existingPhoto = db.prepare('SELECT id FROM photos WHERE projectId = ? AND originalPath = ?').get(projectId, origPathDb);
            if (existingPhoto) {
                successCount++;
                continue;
            }

            // Download file buffer
            const buffer = await downloadFileBuffer(file.id);

            const origFilePath = path.join(uploadDir, origFileName);
            const thumbFilePath = path.join(uploadDir, thumbFileName);

            // Compress preview image (max width 1200px, quality 70)
            await sharp(buffer)
                .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 70 })
                .toFile(origFilePath);

            // Create thumbnail (max width 400px, quality 60)
            await sharp(buffer)
                .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 60 })
                .toFile(thumbFilePath);

            // Calculate exact file size written to disk
            const origStats = fs.statSync(origFilePath);
            const thumbStats = fs.statSync(thumbFilePath);
            const fileSizeBytes = origStats.size + thumbStats.size;

            insertPhoto.run(projectId, origPathDb, thumbPathDb, origPathDb, fileSizeBytes);

            // Update vendor total storage usage
            db.prepare('UPDATE vendors SET usedStorageBytes = usedStorageBytes + ? WHERE id = ?').run(fileSizeBytes, project.vendorId);

            // Check if storage limit is exceeded for Storage-based plans
            const vendorStore = db.prepare(`
                SELECT v.usedStorageBytes, p.maxStorageMB, p.planType 
                FROM vendors v 
                JOIN plans p ON v.planId = p.id 
                WHERE v.id = ?
            `).get(project.vendorId);

            if (vendorStore && vendorStore.planType === 'storage') {
                const maxStorageBytes = vendorStore.maxStorageMB * 1024 * 1024;
                if (vendorStore.usedStorageBytes > maxStorageBytes) {
                    throw new Error('STORAGE_LIMIT_EXCEEDED');
                }
            }

            successCount++;
        } catch (err) {
            console.error(`Failed to process file in background: ${file.name || file.id}`, err);
            if (err.message === 'STORAGE_LIMIT_EXCEEDED') {
                isStorageFull = true;
                break;
            }
            failCount++;
        }
    }

    if (isStorageFull) {
        // Rollback all imported files for this project to free space
        await rollbackProjectFiles(projectId, uploadDir, project.vendorId);
        db.prepare("UPDATE projects SET status = ? WHERE id = ?").run('failed', projectId);
    } else if (successCount === 0) {
        // Mark project as failed if all files failed
        db.prepare('UPDATE projects SET status = ? WHERE id = ?').run('failed', projectId);
    } else {
        // Calculate project expiresAt date based on plan now that import is successful
        const planInfo = db.prepare(`
            SELECT p.projectExpireDays 
            FROM projects proj
            JOIN vendors v ON proj.vendorId = v.id
            JOIN plans p ON v.planId = p.id
            WHERE proj.id = ?
        `).get(projectId);

        let expiresAt = null;
        if (planInfo && planInfo.projectExpireDays > 0 && planInfo.projectExpireDays < 99999) {
            const expireDate = new Date();
            expireDate.setDate(expireDate.getDate() + planInfo.projectExpireDays);
            expiresAt = expireDate.toISOString();
        }

        // Successfully imported at least one file!
        db.prepare('UPDATE projects SET status = ?, expiresAt = ? WHERE id = ?').run('pending_selection', expiresAt, projectId);
    }
}

// Rollback processed project files and decrease storage counter
async function rollbackProjectFiles(projectId, uploadDir, vendorId) {
    try {
        // 1. Get sum of fileSizeBytes for photos in this project
        const totalBytes = db.prepare('SELECT SUM(fileSizeBytes) as total FROM photos WHERE projectId = ?').get(projectId)?.total || 0;

        // 2. Subtract from usedStorageBytes
        if (totalBytes > 0) {
            db.prepare('UPDATE vendors SET usedStorageBytes = MAX(0, usedStorageBytes - ?) WHERE id = ?').run(totalBytes, vendorId);
        }

        // 3. Delete DB rows
        db.prepare('DELETE FROM photos WHERE projectId = ?').run(projectId);

        // 4. Clean physical directory
        if (fs.existsSync(uploadDir)) {
            fs.rmSync(uploadDir, { recursive: true, force: true });
        }
        console.log(`[Storage Rollback] Successfully rolled back ${totalBytes} bytes for project ${projectId} due to storage exhaustion.`);
    } catch (err) {
        console.error(`[Storage Rollback] Failed to rollback project ${projectId} files:`, err);
    }
}
