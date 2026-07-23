const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { finished } = require('stream/promises');

// Extract folder ID from Google Drive URL
function parseFolderId(url) {
    if (!url) return null;
    // Matches patterns like /folders/FOLDER_ID or id=FOLDER_ID
    const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch && folderMatch[1]) return folderMatch[1];

    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) return idMatch[1];

    return url.trim(); // Fallback if they paste just the ID
}

// Fetch list of files in a public Google Drive folder
async function fetchFolderFiles(folderId) {
    const apiKey = process.env.GOOGLE_API_KEY;

    if (apiKey) {
        // API Key mode (Official API with pagination)
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
            const pageFiles = (data.files || [])
                .filter(file => file.mimeType && file.mimeType.startsWith('image/'))
                .map(file => ({ id: file.id, name: file.name }));
            files = files.concat(pageFiles);
            pageToken = data.nextPageToken || '';
        } while (pageToken);

        return files;
    }

    // Scraper mode (HTML regex parsing for public shared folders)
    const url = `https://drive.google.com/drive/folders/${folderId}`;
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });

    if (!res.ok) {
        if (res.status === 404) {
            throw new Error("Folder Google Drive tidak ditemukan. Mohon periksa kembali link folder Anda.");
        }
        throw new Error(`Gagal mengakses folder Google Drive (${res.statusText})`);
    }

    const html = await res.text();

    const files = [];
    const seenIds = new Set();

    // 1. Check DOM elements (standard modern Google Drive layout)
    const domRegex = /data-id="([a-zA-Z0-9_-]{28,45})"\s+jsname="[^"]+"\s+data-tooltip="([^"]+)\s+(?:Image|Video|File|Gambar|Video)"/g;
    let match;
    while ((match = domRegex.exec(html)) !== null) {
        const id = match[1];
        const name = match[2];
        if (!seenIds.has(id)) {
            seenIds.add(id);
            files.push({ id, name });
        }
    }

    // 2. Check window['_DRIVE_ivd'] hex-escaped state block
    if (files.length === 0) {
        const unescapedIvd = html.replace(/\\x([0-9a-fA-F]{2})/g, (m, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
        });
        const ivdRegex = /"([a-zA-Z0-9_-]{28,45})"\s*,\s*\[\s*"[a-zA-Z0-9_-]{28,45}"\s*\]\s*,\s*"([^"]+\.(?:jpe?g|png|webp|gif|JPG|PNG|JPEG))"/g;
        let ivdMatch;
        while ((ivdMatch = ivdRegex.exec(unescapedIvd)) !== null) {
            const id = ivdMatch[1];
            const name = ivdMatch[2];
            if (!seenIds.has(id)) {
                seenIds.add(id);
                files.push({ id, name });
            }
        }
    }

    // 3. Fallback to adjacent regexes
    if (files.length === 0) {
        const forwardRegex = /"([a-zA-Z0-9_-]{28,45})"\s*,\s*"([^"]+\.(?:jpe?g|png|webp|gif|JPG|PNG|JPEG))"/g;
        const reverseRegex = /"([^"]+\.(?:jpe?g|png|webp|gif|JPG|PNG|JPEG))"\s*,\s*"([a-zA-Z0-9_-]{28,45})"/g;

        while ((match = forwardRegex.exec(html)) !== null) {
            const id = match[1];
            const name = match[2];
            if (!seenIds.has(id)) {
                seenIds.add(id);
                files.push({ id, name });
            }
        }
        while ((match = reverseRegex.exec(html)) !== null) {
            const name = match[1];
            const id = match[2];
            if (!seenIds.has(id)) {
                seenIds.add(id);
                files.push({ id, name });
            }
        }
    }

    if (files.length === 0) {
        const genericRegex = /"([a-zA-Z0-9_-]{28,45})"\s*,\s*\["([^"]+)"\s*,\s*"image\//g;
        while ((match = genericRegex.exec(html)) !== null) {
            const id = match[1];
            const name = match[2];
            if (!seenIds.has(id)) {
                seenIds.add(id);
                files.push({ id, name });
            }
        }
    }

    if (files.length === 0) {
        if (html.includes("accounts.google.com") || html.includes("signin") || html.includes("ServiceLogin") || html.includes("google-signin")) {
            throw new Error("Folder Google Drive bersifat privat. Harap ubah pengaturan akses berbagi folder Anda menjadi 'Siapa saja yang memiliki link dapat melihat' (Anyone with the link can view) agar dapat diimpor.");
        }
    }

    return files;
}

// Download file from Google Drive and return a buffer
// Helper sleep function for throttling and retry backoff
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Download file from Google Drive with Exponential Backoff & Retry
async function downloadFileBuffer(fileId, maxRetries = 3, initialDelayMs = 1500) {
    const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
    let attempt = 0;
    let delay = initialDelayMs;

    while (attempt <= maxRetries) {
        try {
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                signal: AbortSignal.timeout(30000) // 30-second hard timeout per file attempt
            });

            // If rate-limited (HTTP 429), forbidden (HTTP 403), or server error (HTTP 500+), retry with backoff
            if (res.status === 429 || res.status === 403 || res.status >= 500) {
                if (attempt < maxRetries) {
                    console.warn(`[GDrive Download Warning] HTTP ${res.status} for file ${fileId}. Retrying attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
                    await sleep(delay);
                    attempt++;
                    delay *= 2; // Exponential increase (e.g. 1500ms -> 3000ms -> 6000ms)
                    continue;
                }
            }

            if (!res.ok) {
                throw new Error(`Failed to download file from Google Drive (HTTP ${res.status}): ${res.statusText}`);
            }

            const arrayBuffer = await res.arrayBuffer();
            return Buffer.from(arrayBuffer);
        } catch (err) {
            if (attempt < maxRetries) {
                console.warn(`[GDrive Download Error] ${err.message} for file ${fileId}. Retrying attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
                await sleep(delay);
                attempt++;
                delay *= 2; // Exponential increase
            } else {
                throw err;
            }
        }
    }
}

// Download file from Google Drive directly to a target path on disk
async function downloadFileToPath(fileId, outputPath, maxRetries = 3, initialDelayMs = 1500) {
    const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
    let attempt = 0;
    let delay = initialDelayMs;

    while (attempt <= maxRetries) {
        try {
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                signal: AbortSignal.timeout(30000) // 30-second hard timeout per attempt
            });

            // If rate-limited or server error, retry with backoff
            if (res.status === 429 || res.status === 403 || res.status >= 500) {
                if (attempt < maxRetries) {
                    console.warn(`[GDrive Download Warning] HTTP ${res.status} for file ${fileId}. Retrying attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
                    await sleep(delay);
                    attempt++;
                    delay *= 2; // Exponential increase
                    continue;
                }
            }

            if (!res.ok) {
                throw new Error(`Failed to download file from Google Drive (HTTP ${res.status}): ${res.statusText}`);
            }

            const fileStream = fs.createWriteStream(outputPath);
            await finished(Readable.fromWeb(res.body).pipe(fileStream));
            return;
        } catch (err) {
            if (attempt < maxRetries) {
                console.warn(`[GDrive Download Error] ${err.message} for file ${fileId}. Retrying attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
                await sleep(delay);
                attempt++;
                delay *= 2; // Exponential increase
            } else {
                throw err;
            }
        }
    }
}

module.exports = {
    parseFolderId,
    fetchFolderFiles,
    downloadFileBuffer,
    downloadFileToPath
};
