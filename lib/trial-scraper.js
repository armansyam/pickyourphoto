function extractFolderId(url) {
  if (!url) return null;
  const str = String(url).trim();
  const folderMatch = str.match(/\/folders\/([a-zA-Z0-9_-]+)/i) || str.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  if (folderMatch && folderMatch[1]) return folderMatch[1];
  return /^[a-zA-Z0-9_-]+$/.test(str) ? str : null;
}

async function scrapeTrialFolderFiles(folderUrl, maxLimit = 15) {
  const folderId = extractFolderId(folderUrl);
  if (!folderId || folderId.length < 15) {
    throw new Error('Link Google Drive tidak valid atau terpotong.');
  }

  const filesMap = new Map();
  const driveUrl = `https://drive.google.com/drive/folders/${folderId}`;

  const res = await fetch(driveUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Gagal mengakses folder Drive (HTTP ${res.status}). Pastikan akses folder diset ke 'Anyone with the link can view'.`);
  }

  const html = await res.text();

  if (html.includes('accounts.google.com/v3/signin') || html.includes('ServiceLogin')) {
    throw new Error('Folder Google Drive bersifat privat. Harap ubah akses berbagi folder menjadi "Siapa saja yang memiliki link dapat melihat".');
  }

  // Regex pattern 1: ["FILE_ID", "FILENAME.JPG"]
  const regex1 = /\["([a-zA-Z0-9_-]{25,50})",\s*"([^"]+\.(?:jpg|jpeg|png|webp|JPG|JPEG|PNG|WEBP))"/g;
  let m1;
  while ((m1 = regex1.exec(html)) !== null) {
    const id = m1[1];
    const name = m1[2];
    if (id && name && !filesMap.has(id)) {
      filesMap.set(id, name);
      if (filesMap.size >= maxLimit) break;
    }
  }

  // Regex pattern 2: ["FILENAME.JPG", ..., "FILE_ID"]
  if (filesMap.size < maxLimit) {
    const regex2 = /"([a-zA-Z0-9_-]{25,50})"[^\]]*?"([^"]+\.(?:jpg|jpeg|png|webp|JPG|JPEG|PNG|WEBP))"/g;
    let m2;
    while ((m2 = regex2.exec(html)) !== null) {
      const id = m2[1];
      const name = m2[2];
      if (id && name && !filesMap.has(id)) {
        filesMap.set(id, name);
        if (filesMap.size >= maxLimit) break;
      }
    }
  }

  const result = Array.from(filesMap.entries()).map(([fileId, filename]) => ({
    fileId,
    filename: filename.replace(/[\/\\]/g, '_').trim(),
  }));

  if (result.length === 0) {
    throw new Error('Tidak ada file foto (JPG/PNG) yang ditemukan di folder Drive ini.');
  }

  return result;
}

module.exports = {
  extractFolderId,
  scrapeTrialFolderFiles,
};
