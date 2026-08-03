import db from './db';

export function getOverLimitVendors() {
    return db.prepare(`
        SELECT 
            v.id AS vendorId,
            v.name AS vendorName,
            v.whatsapp AS vendorWhatsapp,
            p.name AS planName,
            v.maxProjects,
            (SELECT COUNT(*) FROM projects WHERE vendorId = v.id) AS activeProjectsCount,
            CASE 
                WHEN (SELECT COUNT(*) FROM projects WHERE vendorId = v.id) > v.maxProjects THEN 1
                ELSE 0
            END AS isOverLimit
        FROM vendors v
        LEFT JOIN plans p ON v.planId = p.id
        WHERE v.role = 'vendor' AND v.status = 'active';
    `).all();
}

export function autoCheckVendorSubscriptionExpiry() {
    try {
        const nowIso = new Date().toISOString();
        const expiredVendors = db.prepare(`
            SELECT id FROM vendors 
            WHERE role = 'vendor' 
              AND status = 'active' 
              AND activeUntil IS NOT NULL 
              AND activeUntil < ?
        `).all(nowIso);

        if (expiredVendors.length > 0) {
            const vendorIds = expiredVendors.map(v => v.id);
            const placeholders = vendorIds.map(() => '?').join(',');

            db.prepare(`
                UPDATE vendors 
                SET status = 'expired' 
                WHERE id IN (${placeholders})
            `).run(...vendorIds);

            const projInfo = db.prepare(`
                UPDATE projects 
                SET status = 'archived' 
                WHERE vendorId IN (${placeholders}) AND status != 'completed'
            `).run(...vendorIds);

            console.log(`[Auto-Expire Cron] Soft-locked ${expiredVendors.length} vendors and archived ${projInfo.changes} projects.`);
        }
    } catch (err) {
        console.error('[Auto-Expire Cron Error]:', err);
    }
}


export function normalizeWhatsappNumber(rawNumber) {
    if (!rawNumber) return '';
    // 1. Hapus semua karakter non-digit (spasi, strip, kurung, tanda plus)
    let cleaned = rawNumber.replace(/\D/g, '');
    
    // 2. Jika hasil diawali '0', ganti awalan itu jadi '62'
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.slice(1);
    }
    
    // 3. Jika hasil belum diawali '62', tambahkan '62' di depan
    if (!cleaned.startsWith('62')) {
        cleaned = '62' + cleaned;
    }
    
    return cleaned;
}
