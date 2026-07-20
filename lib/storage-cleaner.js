import fs from 'fs';
import path from 'path';
import db from './db';

/**
 * Safely deletes all downloaded photo files of a project from local storage
 * and marks filesDeleted = 1 in the database.
 * @param {number|string} projectId 
 */
export function deleteProjectFiles(projectId) {
    if (!projectId) return;

    try {
        // Fetch project to retrieve vendorId and slug
        const project = db.prepare('SELECT vendorId, slug FROM projects WHERE id = ?').get(projectId);
        if (!project) {
            console.log(`[Storage Cleaner] Project not found in database for ID: ${projectId}`);
            return;
        }

        // Subtract total file size of this project from the vendor's storage count
        const totalBytes = db.prepare('SELECT SUM(fileSizeBytes) as total FROM photos WHERE projectId = ?').get(projectId)?.total || 0;
        if (totalBytes > 0) {
            db.prepare('UPDATE vendors SET usedStorageBytes = MAX(0, usedStorageBytes - ?) WHERE id = ?').run(totalBytes, project.vendorId);
        }

        // Delete directory from public/staging_uploads/vendor_[vendorId]/project_[projectId]_[slug]
        const uploadDir = path.join(process.cwd(), 'public', 'staging_uploads', `vendor_${project.vendorId}`, `project_${projectId}_${project.slug}`);
        
        if (fs.existsSync(uploadDir)) {
            fs.rmSync(uploadDir, { recursive: true, force: true });
            console.log(`[Storage Cleaner] Successfully deleted local files for project ID: ${projectId}`);
        } else {
            console.log(`[Storage Cleaner] Directory not found (already deleted): ${uploadDir}`);
        }

        // Set DB flag filesDeleted = 1
        db.prepare('UPDATE projects SET filesDeleted = 1 WHERE id = ?').run(projectId);
    } catch (error) {
        console.error(`[Storage Cleaner] Failed to delete files for project ID: ${projectId}`, error);
    }
}

/**
 * Automatically scans and cleans up files of all vendors whose subscriptions expired more than 5 days ago.
 */
export function cleanupExpiredProjects() {
    try {
        const now = new Date();
        const graceDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days ago

        // Get all expired vendors (expiresAt is past the 5-day grace period)
        const expiredVendors = db.prepare(`
            SELECT id FROM vendors 
            WHERE role = 'vendor' 
              AND expiresAt IS NOT NULL 
              AND expiresAt < ?
        `).all(graceDate);

        if (expiredVendors.length > 0) {
            console.log(`[Storage Cleaner] Found ${expiredVendors.length} expired vendors. Cleaning files...`);
            for (const vendor of expiredVendors) {
                // Find all active projects for this vendor where files are not yet deleted
                const activeProjects = db.prepare('SELECT id FROM projects WHERE vendorId = ? AND filesDeleted = 0').all(vendor.id);
                for (const proj of activeProjects) {
                    deleteProjectFiles(proj.id);
                }
                // Reset vendor usedStorageBytes to 0
                db.prepare('UPDATE vendors SET usedStorageBytes = 0 WHERE id = ?').run(vendor.id);
            }
        }
    } catch (error) {
        console.error(`[Storage Cleaner] Error in vendor subscription file cleanup:`, error);
    }
}
