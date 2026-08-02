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
        const info = db.prepare(`
            UPDATE vendors 
            SET status = 'expired' 
            WHERE role = 'vendor' 
              AND status = 'active' 
              AND activeUntil IS NOT NULL 
              AND activeUntil < ?
        `).run(nowIso);
        if (info.changes > 0) {
            console.log(`[Auto-Expire Cron] Automatically soft-locked ${info.changes} expired vendor subscriptions.`);
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
