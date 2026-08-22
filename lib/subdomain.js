import db from './db.js';

export const RESERVED_SUBDOMAINS = [
    'www', 'api', 'admin', 'app', 'mail', 'ftp', 'static', 'help', 
    'support', 'public', 'assets', 'root', 'dashboard', 'login', 
    'register', 'auth', 'staging', 'dev', 'test', 'status', 'docs', 
    'cdn', 'demo', 'trial', 'gallery', 'storage', 'select'
];

export const SUBDOMAIN_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

/**
 * Sanitize nama studio/vendor menjadi subdomain slug yang valid
 * @param {string} studioName 
 * @returns {string}
 */
export function toSubdomain(studioName) {
    if (!studioName || typeof studioName !== 'string') return '';
    return studioName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // buang karakter spesial (&, ., ', dll)
        .trim()
        .replace(/\s+/g, '-')        // spasi → hyphen
        .replace(/-+/g, '-')         // double hyphen → single
        .replace(/^-|-$/g, '')       // buang hyphen di awal/akhir
        .slice(0, 30);               // maksimal 30 karakter
}

/**
 * Validasi apakah subdomain memenuhi kriteria keamanan & format
 * @param {string} slug 
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateSubdomain(slug) {
    if (!slug || typeof slug !== 'string') {
        return { valid: false, reason: 'Subdomain tidak boleh kosong.' };
    }
    const clean = slug.toLowerCase().trim();
    if (clean.length < 3) {
        return { valid: false, reason: 'Subdomain minimal 3 karakter.' };
    }
    if (clean.length > 30) {
        return { valid: false, reason: 'Subdomain maksimal 30 karakter.' };
    }
    if (!SUBDOMAIN_REGEX.test(clean)) {
        return { valid: false, reason: 'Hanya boleh huruf kecil, angka, dan tanda hubung (-). Tidak boleh diawali/diakhiri tanda hubung.' };
    }
    if (RESERVED_SUBDOMAINS.includes(clean)) {
        return { valid: false, reason: 'Subdomain ini adalah kata kunci sistem dan tidak dapat digunakan.' };
    }
    return { valid: true };
}

/**
 * Cek ketersediaan subdomain di database
 * @param {string} slug 
 * @param {number|null} excludeVendorId ID vendor yang sedang mengedit (opsional)
 * @returns {boolean} True jika tersedia, false jika sudah dipakai
 */
export function isSubdomainAvailable(slug, excludeVendorId = null) {
    if (!slug) return false;
    const clean = slug.toLowerCase().trim();
    const validation = validateSubdomain(clean);
    if (!validation.valid) return false;

    let query = "SELECT id FROM vendors WHERE LOWER(subdomain) = ? AND subdomain_active = 1";
    const params = [clean];
    if (excludeVendorId) {
        query += " AND id != ?";
        params.push(excludeVendorId);
    }
    const existing = db.prepare(query).get(...params);
    return !existing;
}

/**
 * Hasilkan saran alternatif jika slug yang diinginkan sudah dipakai
 * @param {string} baseSlug 
 * @param {string} [city] 
 * @returns {string[]}
 */
export function suggestAlternatives(baseSlug, city = '') {
    const clean = toSubdomain(baseSlug) || 'studio';
    const citySlug = city ? toSubdomain(city).slice(0, 5) : '';
    
    const candidates = [
        `${clean}-id`,
        `${clean}-studio`,
        `${clean}-photo`,
        citySlug ? `${clean}-${citySlug}` : null,
        `${clean}-2`,
        `${clean}-${Math.random().toString(36).slice(2, 6)}`
    ].filter(Boolean);

    // Filter kandidat yang benar-benar belum dipakai di DB
    const available = [];
    for (const cand of candidates) {
        const trimmed = cand.slice(0, 30);
        if (isSubdomainAvailable(trimmed) && !available.includes(trimmed)) {
            available.push(trimmed);
        }
        if (available.length >= 3) break;
    }
    return available;
}

/**
 * Otomatis generate slug subdomain yang unik dan aman untuk vendor baru
 * @param {string} studioName 
 * @param {number|null} [vendorId] 
 * @returns {string}
 */
export function autoGenerateUniqueSubdomain(studioName, vendorId = null) {
    const raw = studioName || 'studio';
    let baseSlug = toSubdomain(raw);
    if (baseSlug.length < 3) baseSlug = `studio-${Date.now().toString().slice(-4)}`;
    let finalSlug = baseSlug;
    let counter = 1;
    
    let query = "SELECT id FROM vendors WHERE LOWER(subdomain) = ?";
    let params = [finalSlug];
    if (vendorId) {
        query += " AND id != ?";
        params.push(vendorId);
    }
    
    while (db.prepare(query).get(...params) || RESERVED_SUBDOMAINS.includes(finalSlug)) {
        counter++;
        finalSlug = `${baseSlug}-${counter}`.slice(0, 30);
        params[0] = finalSlug;
    }
    return finalSlug;
}

/**
 * Dapatkan root domain aktif sistem secara dinamis dari request atau database
 * @param {Request} [request]
 * @returns {string}
 */
export function getRootDomain(request) {
    if (request && typeof request.headers?.get === 'function') {
        const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
        if (host) {
            return host.replace(/^https?:\/\//, '').replace(/\/$/, '').trim();
        }
    }
    
    if (typeof window !== 'undefined' && window.location?.host) {
        return window.location.host;
    }

    try {
        const row = db.prepare("SELECT value FROM saas_settings WHERE key = 'saas_domain'").get();
        if (row && row.value && row.value.trim()) {
            return row.value.replace(/^https?:\/\//, '').replace(/\/$/, '').trim();
        }
    } catch (e) {}

    return (process.env.ROOT_DOMAIN || process.env.NEXT_PUBLIC_ROOT_DOMAIN || '').replace(/^https?:\/\//, '').replace(/\/$/, '').trim();
}

