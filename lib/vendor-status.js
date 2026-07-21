import db from './db';

export function getOverLimitVendors() {
    return db.prepare(`
        SELECT 
            v.id AS vendorId,
            v.name AS vendorName,
            v.whatsapp AS vendorWhatsapp,
            v.usedStorageBytes,
            p.name AS planName,
            p.planType,
            p.maxStorageMB,
            v.maxProjects,
            (SELECT COUNT(*) FROM projects WHERE vendorId = v.id) AS activeProjectsCount,
            CASE 
                WHEN p.planType = 'limit' AND (SELECT COUNT(*) FROM projects WHERE vendorId = v.id) > v.maxProjects THEN 1
                WHEN p.planType = 'storage' AND v.usedStorageBytes > (p.maxStorageMB * 1024 * 1024) THEN 1
                ELSE 0
            END AS isOverLimit
        FROM vendors v
        LEFT JOIN plans p ON v.planId = p.id
        WHERE v.role = 'vendor' AND v.status = 'active';
    `).all();
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
