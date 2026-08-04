import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';
import { parseFolderId, fetchFolderFiles } from '@/lib/gdrive-importer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET: List all projects for authenticated vendor

export async function GET() {
    console.log("--> [API GET /api/projects] Request received");
    try {
        const vendor = getAuthVendor();
        console.log("--> [API GET /api/projects] Auth vendor:", vendor ? vendor.name : 'none');
        if (!vendor) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        // Get projects with image count and selection status
        const stmt = db.prepare(`
            SELECT 
                p.*,
                (SELECT COUNT(*) FROM photos WHERE projectId = p.id) as totalPhotos,
                c.accessKey as clientAccessKey,
                c.clientPhone as clientPhone,
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

        const pendingRequest = db.prepare(`
            SELECT sr.*, p.name as planName 
            FROM subscription_requests sr 
            JOIN plans p ON sr.planId = p.id 
            WHERE sr.vendorId = ? AND sr.status = 'pending'
        `).get(vendor.id);

        console.log(`--> [API GET /api/projects] Returning ${allProjects.length} total projects for vendor: ${vendor.name}`);
        return NextResponse.json({
            projects: allProjects,
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
                copyDelimiter: vendor.copyDelimiter || ', ',
                copyIncludeExt: vendor.copyIncludeExt !== undefined ? vendor.copyIncludeExt : 0,
                copySortOrder: vendor.copySortOrder || 'name_asc',
                planType: vendor.planType || 'limit',
                allowCustomLogo: vendor.allowCustomLogo === 1 || vendor.allowCustomLogo === true ? 1 : 0,
                allowRawSelector: vendor.allowRawSelector !== undefined ? (vendor.allowRawSelector ? 1 : 0) : 1,
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

        // Check project limit
        const countStmt = db.prepare('SELECT COUNT(*) as count FROM projects WHERE vendorId = ?');
        const projectCount = countStmt.get(vendor.id)?.count || 0;

        if (projectCount >= vendor.maxProjects) {
            return NextResponse.json({
                message: `Batas jumlah project tercapai. Anda telah menggunakan ${projectCount} dari ${vendor.maxProjects} project yang diperbolehkan. Silakan upgrade paket Anda.`
            }, { status: 403 });
        }


        // Check subscription expiration
        if (vendor.isExpired) {
            return NextResponse.json({
                message: `Masa aktif langganan Anda telah berakhir pada ${new Date(vendor.expiresAt).toLocaleDateString()}. Silakan hubungi administrator untuk melakukan perpanjangan.`
            }, { status: 403 });
        }

        const { name, folderUrl, maxSelection, confirmLimitExceeded, galleryTheme, clientPhone } = await request.json();

        if (!name || !folderUrl) {
            return NextResponse.json({ message: 'Project name and Google Drive URL are required.' }, { status: 400 });
        }

        const folderId = parseFolderId(folderUrl);
        if (!folderId) {
            return NextResponse.json({ message: 'Invalid Google Drive URL.' }, { status: 400 });
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

        // 1. Insert project record with status 'importing', maxSelection, folderUrl, and galleryTheme
        const insertProject = db.prepare('INSERT INTO projects (vendorId, name, slug, status, maxSelection, expiresAt, folderUrl, galleryTheme) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)');
        const projectInfo = insertProject.run(vendor.id, name, slug, 'importing', maxSelection || 0, folderUrl, galleryTheme || 'default');
        const projectId = projectInfo.lastInsertRowid;

        // 2. Generate client record with optional phone number
        const clientAccessKey = crypto.randomBytes(16).toString('hex');
        const insertClient = db.prepare('INSERT INTO clients (email, projectId, accessKey, clientPhone) VALUES (?, ?, ?, ?)');
        insertClient.run('client@example.com', projectId, clientAccessKey, clientPhone || '');

        // 3. Create public upload directory for the project using structured paths
        const uploadDir = path.join(process.cwd(), 'public', 'staging_uploads', `vendor_${vendor.id}`, `project_${projectId}_${slug}`);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Start background processing (un-awaited)
        processImagesInBackground(projectId, folderId).catch(err => {
            console.error(`Background processing failed for project ${projectId}:`, err);
        });

        return NextResponse.json({
            message: 'Project berhasil dibuat! Foto-foto sedang diimpor di background.',
            projectId,
            slug
        }, { status: 201 });

    } catch (error) {
        console.error('Failed to create project:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

// Simple in-memory concurrency queue (Max 1 Import Jalan)
const importQueue = [];
let isProcessingQueue = false;

async function addToImportQueue(projectId, folderId) {
    importQueue.push({ projectId, folderId });
    console.log(`[Queue] Project ${projectId} added to import queue. Position: ${importQueue.length}`);
    triggerQueueProcessor();
}

async function triggerQueueProcessor() {
    if (isProcessingQueue) {
        console.log(`[Queue] Queue processor is already running. Queue size: ${importQueue.length}`);
        return;
    }

    isProcessingQueue = true;
    console.log(`[Queue] Queue processor started.`);

    while (importQueue.length > 0) {
        const currentTask = importQueue[0];
        console.log(`[Queue] Processing project: ${currentTask.projectId}. Queue left: ${importQueue.length}`);
        try {
            await runImportTask(currentTask.projectId, currentTask.folderId);
        } catch (err) {
            console.error(`[Queue Error] Uncaught fatal error in project ${currentTask.projectId}:`, err);
        } finally {
            importQueue.shift();
            console.log(`[Queue] Task completed/removed. Remaining queue: ${importQueue.length}`);
        }
    }

    isProcessingQueue = false;
    console.log(`[Queue] Queue processor stopped (no tasks remaining).`);
}

// Background worker entry point (places task into concurrency queue)
export async function processImagesInBackground(projectId, folderId) {
    addToImportQueue(projectId, folderId);
}

// Zero-Storage Import Task using Google Drive Proxy Stream
async function runImportTask(projectId, folderId) {
    console.log(`--> [runImportTask Zero-Storage] Started for project: ${projectId} (folderId: ${folderId})`);
    
    try {
        const project = db.prepare('SELECT vendorId, slug FROM projects WHERE id = ?').get(projectId);
        if (!project) {
            console.error(`[runImportTask] Project not found in database: ${projectId}`);
            return;
        }

        const files = await fetchFolderFiles(folderId);
        if (!files || files.length === 0) {
            console.warn(`[runImportTask] No files found for project ${projectId}`);
            db.prepare('UPDATE projects SET status = ? WHERE id = ?').run('failed', projectId);
            return;
        }

        const insertPhoto = db.prepare('INSERT INTO photos (projectId, originalPath, thumbnailPath, watermarkedPath, fileSizeBytes, category) VALUES (?, ?, ?, ?, ?, ?)');

        const insertMany = db.transaction((photosList) => {
            for (const file of photosList) {
                const cleanName = file.name || `photo_${file.id}.jpg`;
                const categoryName = file.category || '';
                const thumbPath = `/api/proxy/thumb/${file.id}/${encodeURIComponent(cleanName)}?sz=w400`;
                const origPath = `/api/proxy/thumb/${file.id}/${encodeURIComponent(cleanName)}?sz=w1200`;
                insertPhoto.run(projectId, origPath, thumbPath, origPath, 0, categoryName);
            }
        });

        insertMany(files);

        db.prepare('UPDATE projects SET status = ?, expiresAt = NULL WHERE id = ?').run('pending_selection', projectId);
        console.log(`--> [runImportTask Zero-Storage] Successfully completed import for project ${projectId} (${files.length} photos) with 0 Bytes server disk!`);
    } catch (fatalErr) {
        console.error(`[runImportTask Fatal Error] Uncaught error processing project ${projectId}:`, fatalErr);
        try {
            db.prepare('UPDATE projects SET status = ? WHERE id = ?').run('failed', projectId);
        } catch (dbErr) {
            console.error(`[runImportTask Fatal Error] Failed to update project status in DB:`, dbErr);
        }
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
