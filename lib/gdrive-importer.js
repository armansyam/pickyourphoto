// Extract folder ID from Google Drive URL
function parseFolderId(url) {
    if (!url) return null;
    let cleanUrl = url.trim().replace(/[\\]+$/g, '');
    const folderMatch = cleanUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch && folderMatch[1]) return folderMatch[1];

    const idMatch = cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) return idMatch[1];

    cleanUrl = cleanUrl.split('?')[0].split('#')[0].replace(/\/+$/, '');
    return cleanUrl; // Fallback if they paste just the ID
}

// Helper to fetch files in a single folder via API Key
async function fetchFolderFilesAPI(folderId, categoryName = '', apiKey) {
    let files = [];
    let pageToken = '';
    do {
        let url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=nextPageToken,files(id,name,mimeType)&key=${apiKey}&pageSize=200`;
        if (pageToken) {
            url += `&pageToken=${pageToken}`;
        }
        const res = await fetch(url);
        if (!res.ok) {
            const err = await res.json();
            throw new Error(`Google API Error: ${err.error?.message || res.statusText}`);
        }
        const data = await res.json();
        const pageFiles = (data.files || []);
        
        // 1. Process images
        const images = pageFiles
            .filter(file => file.mimeType && (file.mimeType.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|heic|heif|tiff?|cr2|cr3|arw|nef|dng|raw)$/i.test(file.name)))
            .map(file => ({ id: file.id, name: file.name, category: categoryName }));
        files = files.concat(images);

        // 2. Process sub-folders (if in root folder)
        if (!categoryName) {
            const subFolders = pageFiles.filter(file => file.mimeType === 'application/vnd.google-apps.folder');
            for (const sf of subFolders) {
                try {
                    const sfFiles = await fetchFolderFilesAPI(sf.id, sf.name, apiKey);
                    files = files.concat(sfFiles);
                } catch (sfErr) {
                    console.warn(`[GDrive Importer] Failed to scan subfolder ${sf.name}:`, sfErr.message);
                }
            }
        }

        pageToken = data.nextPageToken || '';
    } while (pageToken);

    return files;
}

// Helper function to recursively scan GDrive folders & subfolders via Embedded Folderview & Scraper mode
async function scanFolderScraper(folderId, categoryName = '', seenIds = new Set(), depth = 0) {
    if (depth > 5) return []; // Depth limit safety
    let files = [];
    const isImageFile = (filename) => /\.(jpe?g|png|webp|gif|bmp|heic|heif|tiff?|cr2|cr3|arw|nef|dng|raw|orf|rw2)$/i.test(filename || '');

    // Method 1: Embedded Folderview (#list) — Bypasses 50-file static HTML limit completely!
    try {
        const embedUrl = `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;
        const embedRes = await fetch(embedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (embedRes.ok) {
            const embedHtml = await embedRes.text();
            const entryRegex = /id="entry-([a-zA-Z0-9_-]{28,45})"[\s\S]*?class="flip-entry-title">([^<]+)</g;
            let match;
            const subfolders = [];

            while ((match = entryRegex.exec(embedHtml)) !== null) {
                const id = match[1];
                const rawName = match[2];
                const name = rawName
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/\\u0026/g, '&')
                    .replace(/\\+/g, '')
                    .trim();

                if (isImageFile(name)) {
                    if (!seenIds.has(id)) {
                        seenIds.add(id);
                        files.push({ id, name, category: categoryName });
                    }
                } else if (!/\.(mp4|mov|avi|mkv|zip|rar|pdf|docx?|xlsx?)$/i.test(name)) {
                    // It is a subfolder
                    subfolders.push({ id, name });
                }
            }

            if (files.length > 0 || subfolders.length > 0) {
                for (const sf of subfolders) {
                    const catName = categoryName ? `${categoryName} / ${sf.name}` : sf.name;
                    try {
                        const subFiles = await scanFolderScraper(sf.id, catName, seenIds, depth + 1);
                        files = files.concat(subFiles);
                    } catch (sfErr) {
                        console.warn(`[GDrive Importer] Failed embed subfolder ${sf.name}:`, sfErr.message);
                    }
                }
                return files;
            }
        }
    } catch (embedErr) {
        console.warn(`[GDrive Importer] Embedded view fetch failed for ${folderId}, falling back:`, embedErr.message);
    }

    // Method 2: Fallback to standard GDrive folder HTML parsing
    const url = `https://drive.google.com/drive/folders/${folderId}`;
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });

    if (!res.ok) {
        if (depth === 0) {
            if (res.status === 404) throw new Error("Folder Google Drive tidak ditemukan. Mohon periksa kembali link folder Anda.");
            throw new Error(`Gagal mengakses folder Google Drive (${res.statusText})`);
        }
        return files;
    }

    const html = await res.text();
    const unescaped = html.replace(/\\x([0-9a-fA-F]{2})/g, (m, hex) => String.fromCharCode(parseInt(hex, 16)));

    // 1. Extract direct photos in this folder
    const sfDom = /data-id="([a-zA-Z0-9_-]{28,45})"\s+jsname="[^"]+"\s+data-tooltip="([^"]+)"/g;
    let match;
    while ((match = sfDom.exec(html)) !== null) {
        const id = match[1];
        const name = match[2];
        if (!seenIds.has(id) && isImageFile(name)) {
            seenIds.add(id);
            files.push({ id, name, category: categoryName });
        }
    }

    const sfIvd = /"([a-zA-Z0-9_-]{28,45})"\s*,\s*\[\s*"[a-zA-Z0-9_-]{28,45}"\s*\]\s*,\s*"([^"]+)"/g;
    while ((match = sfIvd.exec(unescaped)) !== null) {
        const id = match[1];
        const name = match[2];
        if (!seenIds.has(id) && isImageFile(name)) {
            seenIds.add(id);
            files.push({ id, name, category: categoryName });
        }
    }

    // 2. Detect sub-folders inside this folder
    const subFolderMap = new Map();
    const sfRegex1 = /\[\[null,"([a-zA-Z0-9_-]{28,45})"\]\s*,\s*null\s*,\s*null\s*,\s*null\s*,\s*"application\/vnd\.google-apps\.folder"[\s\S]*?\[\[\["([^"]+)"/g;
    while ((match = sfRegex1.exec(html)) !== null) {
        if (!subFolderMap.has(match[1])) subFolderMap.set(match[1], match[2]);
    }
    const sfRegex4 = /"([a-zA-Z0-9_-]{28,45})"\s*,\s*\[\s*"([^"]+)"\s*,\s*(?:null|"[^"]+")\s*,\s*"application\/vnd\.google-apps\.folder"/g;
    while ((match = sfRegex4.exec(html)) !== null) {
        if (!subFolderMap.has(match[1])) subFolderMap.set(match[1], match[2]);
    }

    // Recursively scan subfolders
    for (const [sfId, rawSfName] of subFolderMap.entries()) {
        const sfName = rawSfName.replace(/\\u0026/g, '&').replace(/\\u([0-9a-fA-F]{4})/g, (m, hex) => String.fromCharCode(parseInt(hex, 16))).replace(/\\+$/g, '').replace(/\\+/g, '').trim();
        const catName = categoryName ? `${categoryName} / ${sfName}` : sfName;
        try {
            const subFiles = await scanFolderScraper(sfId, catName, seenIds, depth + 1);
            files = files.concat(subFiles);
        } catch (sfErr) {
            console.warn(`[GDrive Importer Scraper] Failed subfolder ${sfName}:`, sfErr.message);
        }
    }

    if (depth === 0 && files.length === 0) {
        if (html.includes("ServiceLogin") && (html.includes("Sign-in") || html.includes("Akses ditolak") || html.includes("Access denied"))) {
            throw new Error("Folder Google Drive bersifat privat. Harap ubah pengaturan akses berbagi folder Anda menjadi 'Siapa saja yang memiliki link dapat melihat' (Anyone with the link can view) agar dapat diimpor.");
        }
    }

    return files;
}

// Fetch list of files in a public Google Drive folder (with recursive sub-folder support)
async function fetchFolderFiles(folderId) {
    const apiKey = process.env.GOOGLE_API_KEY;

    if (apiKey) {
        return await fetchFolderFilesAPI(folderId, '', apiKey);
    }

    return await scanFolderScraper(folderId, '');
}

module.exports = {
    parseFolderId,
    fetchFolderFiles
};
