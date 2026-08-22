import { parseFolderId, fetchFolderFiles } from './gdrive-importer.js';

// In-memory cache for folder file lists (TTL: 10 minutes)
const _portfolioCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

export async function getRandomPortfolioPhotos(driveFolderUrl) {
    if (!driveFolderUrl || typeof driveFolderUrl !== 'string' || !driveFolderUrl.trim()) {
        return [];
    }

    const folderId = parseFolderId(driveFolderUrl);
    if (!folderId) {
        return [];
    }

    try {
        let files = null;
        const now = Date.now();
        const cached = _portfolioCache.get(folderId);

        if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
            files = cached.files;
        } else {
            files = await fetchFolderFiles(folderId);
            if (files && Array.isArray(files) && files.length > 0) {
                _portfolioCache.set(folderId, {
                    files,
                    timestamp: now
                });
            }
        }

        if (!files || files.length === 0) {
            return [];
        }

        // Filter only valid image files
        const imageFiles = files.filter(f => f && f.id);
        if (imageFiles.length === 0) {
            return [];
        }

        // Shuffle files randomly on each request / refresh
        const shuffled = [...imageFiles].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 4);

        return selected.map((f, idx) => {
            const rawTitle = (f.name || `Photo ${idx + 1}`)
                .replace(/\.[^/.]+$/, '')
                .replace(/[-_]/g, ' ')
                .trim();

            const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
            const category = f.category ? f.category.split('/')[0].trim() : 'Portfolio';

            return {
                id: f.id,
                title: title.length > 30 ? title.substring(0, 30) + '...' : title,
                category: category || 'Portfolio',
                year: new Date().getFullYear().toString(),
                image: `https://lh3.googleusercontent.com/d/${f.id}=w800`
            };
        });
    } catch (err) {
        console.warn(`[Studio Portfolio] Failed to fetch Drive portfolio for ${folderId}:`, err.message);
        return [];
    }
}
