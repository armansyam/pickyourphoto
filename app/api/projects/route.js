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
        // Get projects with image count and selection status (Optimized Subqueries 0.1ms)
        const stmt = db.prepare(`
            SELECT 
                p.*,
                (SELECT COUNT(*) FROM photos WHERE projectId = p.id) as totalPhotos,
                c.accessKey as clientAccessKey,
                c.clientPhone as clientPhone,
                (SELECT COUNT(*) FROM selections s JOIN clients c2 ON s.clientId = c2.id WHERE c2.projectId = p.id) as selectedPhotosCount
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

        const vDb = db.prepare('SELECT hasStorageAddon, addonStorageQuotaBytes, usedStorageBytes, externalDriveConnected, externalDriveEmail FROM vendors WHERE id = ?').get(vendor.id);
        const addonQuotaBytes = vDb?.addonStorageQuotaBytes || 0;
        const hasAddon = Boolean(vDb?.hasStorageAddon || addonQuotaBytes > 0);
        const storageQuotaGb = hasAddon ? parseFloat((addonQuotaBytes / (1024 * 1024 * 1024)).toFixed(1)) : 0;
        const storageUsedMb = parseFloat(((vDb?.usedStorageBytes || 0) / (1024 * 1024)).toFixed(1));

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
                hasStorageAddon: hasAddon,
                storageQuotaGb,
                storageUsedMb,
                addonStorageQuotaBytes: addonQuotaBytes,
                usedStorageBytes: vDb?.usedStorageBytes || 0,
                externalDriveConnected: Boolean(vDb?.externalDriveConnected),
                externalDriveEmail: vDb?.externalDriveEmail || null,
                brandName: vendor.brandName || '',
                brandLogo: vendor.brandLogo || '',
                whatsapp: vendor.whatsapp || '',
                copyDelimiter: vendor.copyDelimiter || ', ',
                copyIncludeExt: vendor.copyIncludeExt !== undefined ? vendor.copyIncludeExt : 0,
                copySortOrder: vendor.copySortOrder || 'name_asc',
                planType: vendor.planType || 'limit',
                allowCustomLogo: vendor.allowCustomLogo === 1 || vendor.allowCustomLogo === true ? 1 : 0,
                allowRawSelector: vendor.allowRawSelector !== undefined ? (vendor.allowRawSelector ? 1 : 0) : 1,
                subdomain: vendor.subdomain || '',
                subdomain_active: vendor.subdomain_active === 1 || vendor.subdomain_active === true ? 1 : 0,
                subdomain_set_at: vendor.subdomain_set_at || null,
                portfolioDriveUrl: vendor.portfolioDriveUrl || '',
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

        // Cek apakah folder ini merupakan internal storage folder milik vendor yang sudah ter-index di DB storage_files
        const internalFolder = db.prepare('SELECT driveFolderId FROM storage_folders WHERE driveFolderId = ? OR id = ?').get(folderId, parseInt(folderId) || 0);

        let files = [];
        if (internalFolder) {
            console.log(`[runImportTask Fast-Reuse] Reading directly from SQLite storage_files for internal folder: ${internalFolder.driveFolderId}`);
            const dbFiles = db.prepare(`
              WITH RECURSIVE Subtree(fId) AS (
                SELECT driveFolderId FROM storage_folders WHERE driveFolderId = ?
                UNION ALL
                SELECT child.driveFolderId FROM storage_folders child
                JOIN Subtree parent ON child.parentFolderId = parent.fId
              )
              SELECT sf.driveFileId as driveId, sf.fileName as name, sf.fileSizeBytes as size
              FROM storage_files sf
              WHERE sf.parentFolderId IN (SELECT fId FROM Subtree)
            `).all(internalFolder.driveFolderId);

            files = dbFiles.map(f => ({ id: f.driveId, name: f.name, size: f.size, category: '' }));
        }

        if (!files || files.length === 0) {
            files = await fetchFolderFiles(folderId);
        }

        if (!files || files.length === 0) {
            console.warn(`[runImportTask] No files found for project ${projectId}`);
            db.prepare('UPDATE projects SET status = ? WHERE id = ?').run('failed', projectId);
            return;
        }

        const insertPhoto = db.prepare('INSERT INTO photos (projectId, originalPath, thumbnailPath, watermarkedPath, fileSizeBytes, category, googleFileId) VALUES (?, ?, ?, ?, ?, ?, ?)');

        let totalImportedBytes = 0;
        const insertMany = db.transaction((photosList) => {
            for (const file of photosList) {
                const cleanName = file.name || `photo_${file.id}.jpg`;
                const categoryName = file.category || '';
                const sizeBytes = parseInt(file.size) || 0;
                totalImportedBytes += sizeBytes;
                const thumbPath = `https://lh3.googleusercontent.com/d/${file.id}=w600`;
                const origPath = `https://lh3.googleusercontent.com/d/${file.id}=w1600`;
                // originalPath stores the human-readable file name (for RAW Sorter & clipboard copy)
                // CDN URL is always constructed at runtime from googleFileId
                insertPhoto.run(projectId, cleanName, thumbPath, origPath, sizeBytes, categoryName, file.id);
            }
        });

        insertMany(files);

        // Update vendor usedStorageBytes ONLY for internal cloud storage projects (not external GDrive links)
        if (totalImportedBytes > 0 && project.vendorId && (!project.folderUrl || project.folderUrl === '')) {
            db.prepare('UPDATE vendors SET usedStorageBytes = usedStorageBytes + ? WHERE id = ?').run(totalImportedBytes, project.vendorId);
        }

        db.prepare('UPDATE projects SET status = ?, expiresAt = NULL WHERE id = ?').run('pending_selection', projectId);
        console.log(`--> [runImportTask Zero-Storage] Successfully completed import for project ${projectId} (${files.length} photos, ${totalImportedBytes} bytes)!`);
    } catch (fatalErr) {
        console.error(`[runImportTask Fatal Error] Uncaught error processing project ${projectId}:`, fatalErr);
        try {
            db.prepare('UPDATE projects SET status = ? WHERE id = ?').run('failed', projectId);
        } catch (dbErr) {
            console.error(`[runImportTask Fatal Error] Failed to update project status in DB:`, dbErr);
        }
    }
}

