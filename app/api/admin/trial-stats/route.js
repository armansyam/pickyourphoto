import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const now = new Date().toISOString();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayISO = todayStart.toISOString();

        // Total trial galleries ever created
        const totalTrials = db.prepare("SELECT COUNT(*) as count FROM trial_galleries").get()?.count || 0;

        // Trials created today
        const trialsToday = db.prepare(
            "SELECT COUNT(*) as count FROM trial_galleries WHERE createdAt >= ?"
        ).get(todayISO)?.count || 0;

        // Active (not yet expired)
        const trialsActive = db.prepare(
            "SELECT COUNT(*) as count FROM trial_galleries WHERE expiresAt > ?"
        ).get(now)?.count || 0;

        // Completed (client selected photos)
        const trialsCompleted = db.prepare(
            "SELECT COUNT(*) as count FROM trial_galleries WHERE selectionStatus = 'completed'"
        ).get()?.count || 0;

        // Expired without completion
        const trialsExpiredNoConvert = db.prepare(
            "SELECT COUNT(*) as count FROM trial_galleries WHERE expiresAt <= ? AND selectionStatus != 'completed'"
        ).get(now)?.count || 0;

        // Conversion rate
        const conversionRate = totalTrials > 0
            ? ((trialsCompleted / totalTrials) * 100).toFixed(1)
            : '0.0';

        // Recent 10 trials
        const recentTrials = db.prepare(`
            SELECT id, slug, title, createdAt, expiresAt, selectionStatus,
                   json_array_length(COALESCE(stagingFiles, '[]')) as photoCount,
                   json_array_length(COALESCE(selectedPhotos, '[]')) as selectedCount
            FROM trial_galleries
            ORDER BY createdAt DESC
            LIMIT 10
        `).all() || [];

        // Current trial settings from saas_settings
        const saasRows = db.prepare("SELECT key, value FROM saas_settings WHERE key IN ('raw_sorter_trial_limit', 'trial_cta_text', 'trial_cta_subtext', 'trial_max_selection', 'trial_max_photos', 'trial_preview_photos')").all() || [];
        const saasMap = {};
        saasRows.forEach(r => { saasMap[r.key] = r.value; });

        // system_settings for trial control
        const sysSetting = db.prepare("SELECT enable_free_trial, trial_expiration_minutes, max_vendor_quota FROM system_settings WHERE id = 1").get() || {};

        return NextResponse.json({
            stats: {
                totalTrials,
                trialsToday,
                trialsActive,
                trialsCompleted,
                trialsExpiredNoConvert,
                conversionRate,
            },
            recentTrials,
            settings: {
                enable_free_trial: sysSetting.enable_free_trial ?? 1,
                trial_expiration_minutes: sysSetting.trial_expiration_minutes ?? 30,
                raw_sorter_trial_limit: parseInt(saasMap.raw_sorter_trial_limit || '5'),
                trial_max_selection: parseInt(saasMap.trial_max_selection || '10'),
                trial_max_photos: parseInt(saasMap.trial_max_photos || '50'),
                trial_preview_photos: parseInt(saasMap.trial_preview_photos || '12'),
                trial_cta_text: saasMap.trial_cta_text || '',
                trial_cta_subtext: saasMap.trial_cta_subtext || '',
            }
        });
    } catch (error) {
        console.error('[Trial Stats Error]:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

// PATCH: Save trial settings dynamically
export async function PATCH(request) {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const {
            enable_free_trial,
            trial_expiration_minutes,
            raw_sorter_trial_limit,
            trial_max_selection,
            trial_max_photos,
            trial_cta_text,
            trial_cta_subtext,
        } = body;

        // Update system_settings
        const current = db.prepare("SELECT * FROM system_settings WHERE id = 1").get();
        if (!current) return NextResponse.json({ message: 'Settings not found' }, { status: 404 });

        db.prepare(`
            UPDATE system_settings 
            SET enable_free_trial = ?, trial_expiration_minutes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
        `).run(
            enable_free_trial !== undefined ? (enable_free_trial ? 1 : 0) : current.enable_free_trial,
            trial_expiration_minutes !== undefined ? Math.max(1, parseInt(trial_expiration_minutes) || 30) : current.trial_expiration_minutes
        );

        // Update saas_settings
        const upsert = db.prepare("INSERT OR REPLACE INTO saas_settings (key, value) VALUES (?, ?)");
        const updateMany = db.transaction((items) => {
            for (const [key, value] of items) {
                upsert.run(key, value !== undefined && value !== null ? String(value) : '');
            }
        });

        const toUpdate = [];
        if (raw_sorter_trial_limit !== undefined) toUpdate.push(['raw_sorter_trial_limit', String(Math.max(1, parseInt(raw_sorter_trial_limit) || 5))]);
        if (trial_max_selection !== undefined) toUpdate.push(['trial_max_selection', String(Math.max(1, parseInt(trial_max_selection) || 10))]);
        if (trial_max_photos !== undefined) toUpdate.push(['trial_max_photos', String(Math.max(1, parseInt(trial_max_photos) || 50))]);
        if (body.trial_preview_photos !== undefined) toUpdate.push(['trial_preview_photos', String(Math.max(1, parseInt(body.trial_preview_photos) || 12))]);
        if (trial_cta_text !== undefined) toUpdate.push(['trial_cta_text', trial_cta_text]);
        if (trial_cta_subtext !== undefined) toUpdate.push(['trial_cta_subtext', trial_cta_subtext]);
        if (toUpdate.length > 0) updateMany(toUpdate);

        return NextResponse.json({ success: true, message: 'Trial settings berhasil disimpan.' });
    } catch (error) {
        console.error('[Trial Settings PATCH Error]:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
