/**
 * Storage Cleaner for Zero-Storage Architecture
 * Since no physical files are saved on disk, file deletion is a no-op (0 Bytes disk usage).
 */

export function deleteProjectFiles(projectId) {
    return true;
}

export function cleanupExpiredProjects() {
    return true;
}

/**
 * Cleanup expired trial galleries from database.
 * Logo base64 data is stored inline in the row, so deleting the row
 * automatically removes the logo — no file system cleanup needed.
 * 
 * This function can be called on-demand (e.g., via cron or admin API).
 * Note: Startup cleanup is already handled in db.js initDb().
 */
export function cleanupExpiredTrials() {
    try {
        const db = require('./db');
        const result = db.prepare("DELETE FROM trial_galleries WHERE expiresAt < datetime('now')").run();
        if (result.changes > 0) {
            console.log(`[Trial Cleanup] Deleted ${result.changes} expired trial galleries.`);
        }
        return result.changes;
    } catch (err) {
        console.error('[Trial Cleanup Error]:', err);
        return 0;
    }
}
