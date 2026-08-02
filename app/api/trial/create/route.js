import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { parseFolderId, fetchFolderFiles } from '@/lib/gdrive-importer';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const { folderUrl, title, maxSelection, logoUrl } = await request.json();

    // Check if Free Trial is enabled in system_settings
    const settings = db.prepare('SELECT enable_free_trial, trial_expiration_minutes, trial_expiration_hours FROM system_settings WHERE id = 1').get() || {};
    if (settings.enable_free_trial === 0 || settings.enable_free_trial === false) {
      return NextResponse.json({ message: 'Fitur Uji Coba Trial Instan saat ini sedang dinonaktifkan oleh Admin.' }, { status: 403 });
    }

    if (!folderUrl) {
      return NextResponse.json({ message: 'URL Google Drive wajib diisi' }, { status: 400 });
    }

    const folderId = parseFolderId(folderUrl);
    if (!folderId) {
      return NextResponse.json({ message: 'Link Google Drive tidak valid' }, { status: 400 });
    }

    let files;
    try {
      files = await fetchFolderFiles(folderId);
    } catch (err) {
      console.error('[Trial Create] GDrive fetch error:', err);
      return NextResponse.json({ message: `Gagal membaca folder Google Drive: ${err.message}` }, { status: 400 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ message: 'Tidak ada file gambar yang ditemukan dalam folder Google Drive tersebut.' }, { status: 400 });
    }

    // Read flexible expiration duration (minutes) from system_settings
    const trialMinutes = settings.trial_expiration_minutes ? parseInt(settings.trial_expiration_minutes) : (settings.trial_expiration_hours ? settings.trial_expiration_hours * 60 : 60);
    const expiresAt = new Date(Date.now() + trialMinutes * 60 * 1000).toISOString();

    // Read dynamic limits from saas_settings
    const saasRows = db.prepare("SELECT key, value FROM saas_settings WHERE key IN ('trial_max_selection', 'trial_max_photos', 'trial_preview_photos', 'trial_max_subfolders')").all() || [];
    const saasMap = {};
    saasRows.forEach(r => { saasMap[r.key] = r.value; });
    // trial_max_photos  = TOTAL shared pool across all unlocked tabs (e.g. 50)
    // trial_preview_photos = per-tab cap: max photos one tab can take from the pool (e.g. 20)
    // → Tab 1 takes min(its_files, 20, pool); leftover pool carries to Tab 2, and so on.
    const dynamicTotalPool    = parseInt(saasMap.trial_max_photos || '50');    // shared budget across all tabs
    const dynamicPerTabCap    = parseInt(saasMap.trial_preview_photos || '12'); // max photos per individual tab
    const dynamicMaxSelection = parseInt(saasMap.trial_max_selection || '10');
    const dynamicMaxSubfolders= parseInt(saasMap.trial_max_subfolders || '1');

    // Group files by category/subfolder
    const categoryMap = new Map();
    for (const file of files) {
      const cat = file.category || '';
      if (!categoryMap.has(cat)) categoryMap.set(cat, []);
      categoryMap.get(cat).push(file);
    }
    const categories = [...categoryMap.keys()];

    // First N tabs = unlocked. Each tab consumes from the shared pool, capped at dynamicPerTabCap.
    // If a tab has fewer photos than the cap, the remainder rolls over to the next tab.
    // Remaining tabs (beyond N) = locked — lightweight marker, no real file IDs proxied.
    const trialFiles = [];
    let sharedPool = dynamicTotalPool; // starts at trial_max_photos, decreases each tab

    categories.forEach((cat, idx) => {
      const catFiles = categoryMap.get(cat);
      if (idx < dynamicMaxSubfolders) {
        // quota = min(files available, per-tab cap, remaining shared pool)
        const quota = Math.min(catFiles.length, dynamicPerTabCap, sharedPool);
        catFiles.slice(0, quota).forEach((file, fileIdx) => {
          trialFiles.push({
            id: file.id,
            name: file.name || `Photo_${fileIdx + 1}.jpg`,
            category: cat,
            thumbUrl: `/api/proxy/thumb/${file.id}?sz=w400`,
            origUrl: `/api/proxy/thumb/${file.id}?sz=w1200`,
          });
        });
        sharedPool -= quota; // roll leftover to the next tab
      } else {
        // Locked tabs: single marker entry — just name + count, no real file IDs
        trialFiles.push({
          id: null,
          name: `__locked_${cat}__`,
          category: cat,
          _isLocked: true,
          _count: catFiles.length,
          thumbUrl: null,
          origUrl: null,
        });
      }
    });

    // Generate unique slug
    const randomHex = crypto.randomBytes(4).toString('hex');
    const galleryTitle = (title && title.trim()) ? title.trim() : 'Galeri Trial Instan';
    let baseSlug = galleryTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    if (!baseSlug) baseSlug = 'trial';
    const slug = `${baseSlug}-${randomHex}`;

    // Validasi ukuran logoUrl (base64) - maks ~700KB encoded
    if (logoUrl && logoUrl.length > 700 * 1024) {
      return NextResponse.json({ message: 'Logo terlalu besar. Maksimal 500KB.' }, { status: 400 });
    }

    const insertStmt = db.prepare(`
      INSERT INTO trial_galleries (slug, folderUrl, title, maxSelection, stagingFiles, selectedPhotos, logoUrl, selectionStatus, expiresAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `);

    insertStmt.run(
      slug,
      folderUrl,
      galleryTitle,
      maxSelection || dynamicMaxSelection,
      JSON.stringify(trialFiles),
      JSON.stringify([]),
      logoUrl || null,
      expiresAt
    );

    return NextResponse.json({
      success: true,
      message: 'Galeri trial instan berhasil dibuat!',
      slug,
      expiresAt,
      totalPhotos: trialFiles.length
    }, { status: 201 });

  } catch (error) {
    console.error('[Trial Create Error]:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan sistem saat membuat galeri trial' }, { status: 500 });
  }
}
