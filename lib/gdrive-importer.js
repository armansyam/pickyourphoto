import { fetchFolderFilesMasterOAuth } from './google-master-drive';

// Extract folder ID from Google Drive URL
export function parseFolderId(url) {
    if (!url) return null;
    let cleanUrl = url.trim().replace(/[\\]+$/g, '');
    const folderMatch = cleanUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch && folderMatch[1]) return folderMatch[1];

    const idMatch = cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) return idMatch[1];

    cleanUrl = cleanUrl.split('?')[0].split('#')[0].replace(/\/+$/, '');
    return cleanUrl; // Fallback if they paste just the ID
}

// Fetch list of files in a Google Drive folder using Master OAuth 2.0 strictly
export async function fetchFolderFiles(folderId) {
    return await fetchFolderFilesMasterOAuth(folderId);
}

