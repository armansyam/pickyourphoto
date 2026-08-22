import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import db from './db';

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.trim() === '') {
        throw new Error('CRITICAL: JWT_SECRET environment variable is required.');
    }
    return secret;
}

// Cache grace_period_days (jarang berubah — hanya admin yang set)
// TTL 5 menit untuk mengurangi N+1 DB query di setiap request protected route
let _cachedGraceDays = null;
let _graceDaysCacheTs = 0;
const GRACE_CACHE_TTL_MS = 5 * 60 * 1000;

function getCachedGraceDays() {
    const now = Date.now();
    if (_cachedGraceDays !== null && (now - _graceDaysCacheTs) < GRACE_CACHE_TTL_MS) {
        return _cachedGraceDays;
    }
    try {
        const graceRow = db.prepare("SELECT value FROM saas_settings WHERE key = 'grace_period_days'").get();
        _cachedGraceDays = graceRow && parseInt(graceRow.value, 10) > 0 ? parseInt(graceRow.value, 10) : 7;
    } catch {
        _cachedGraceDays = 7;
    }
    _graceDaysCacheTs = now;
    return _cachedGraceDays;
}


export function getAuthVendor() {
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
        return null;
    }

    try {
        const decoded = jwt.verify(token, getJwtSecret());
        
        // Handling isolated Superadmin user from admins table
        if (decoded.role === 'admin') {
            const adminUser = db.prepare('SELECT id, name, email, role, status FROM admins WHERE id = ?').get(decoded.id);
            if (!adminUser || adminUser.status !== 'active') {
                return null;
            }
            return {
                ...adminUser,
                maxProjects: 999999,
                isExpired: false
            };
        }

        // Fetch fresh details for vendor user from vendors table
        const stmt = db.prepare(`
            SELECT 
                v.id, 
                v.name, 
                v.email, 
                v.role, 
                v.status, 
                v.maxProjects, 
                v.planId,
                v.expiresAt,
                v.brandName,
                v.brandLogo,
                v.whatsapp,
                v.additionalProjects,
                v.additionalProjectsExpiresAt,
                v.additionalPhotosPerProject,
                v.usedStorageBytes,
                v.hasStorageAddon,
                v.addonStorageQuotaBytes,
                v.externalDriveConnected,
                v.externalDriveEmail,
                v.externalDriveFolderId,
                v.copyDelimiter,
                v.copyIncludeExt,
                v.copySortOrder,
                v.subdomain,
                v.subdomain_active,
                v.subdomain_set_at,
                v.is_setup_completed,
                p.name as planName,
                p.price as planPrice,
                p.activePeriodDays,
                p.maxPhotosPerProject,
                p.planType,
                p.allowCustomLogo,
                p.allowRawSelector
            FROM vendors v
            LEFT JOIN plans p ON v.planId = p.id
            WHERE v.id = ?
        `);
        const freshUser = stmt.get(decoded.id);

        // Account must exist and be active
        if (!freshUser || freshUser.status !== 'active') {
            return null;
        }

        // Inject status kedaluwarsa & masa tenggang dinamis dari saas_settings (via cache 5 menit)
        const graceDays = getCachedGraceDays();
        const graceMs = graceDays * 24 * 60 * 60 * 1000;

        const nowTime = new Date().getTime();
        const expiryTime = freshUser.expiresAt ? new Date(freshUser.expiresAt).getTime() : 0;

        const expired = expiryTime > 0 && nowTime > expiryTime;
        const isGracePeriod = expired && nowTime <= (expiryTime + graceMs);
        const isHardPurgeExpired = expired && nowTime > (expiryTime + graceMs);
        const graceDaysRemaining = isGracePeriod ? Math.max(1, Math.ceil((expiryTime + graceMs - nowTime) / (1000 * 60 * 60 * 24))) : 0;

        // Calculate dynamic maxProjects including unexpired subsidy
        const now = new Date();
        const isSubsidyValid = freshUser.additionalProjectsExpiresAt ? (now < new Date(freshUser.additionalProjectsExpiresAt)) : false;
        const totalMaxProjects = freshUser.maxProjects + (isSubsidyValid ? (freshUser.additionalProjects || 0) : 0);
        const totalMaxPhotosPerProject = (freshUser.maxPhotosPerProject === 99999 || freshUser.maxPhotosPerProject === 0)
            ? freshUser.maxPhotosPerProject
            : freshUser.maxPhotosPerProject + (freshUser.additionalPhotosPerProject || 0);

        return {
            ...freshUser,
            maxProjects: totalMaxProjects,
            maxPhotosPerProject: totalMaxPhotosPerProject,
            isExpired: expired,
            isGracePeriod,
            isHardPurgeExpired,
            graceDays,
            graceDaysRemaining
        };
    } catch (err) {
        return null;
    }
}

export function generateToken(payload) {
    return jwt.sign(payload, getJwtSecret(), { expiresIn: '24h' });
}

export function setAuthCookie(token) {
    const cookieStore = cookies();
    // Otomatis aktifkan secure flag jika di production dengan HTTPS atau akses via domain resmi
    const isProd = process.env.NODE_ENV === 'production';
    const isHttps = process.env.NEXT_PUBLIC_APP_URL 
        ? process.env.NEXT_PUBLIC_APP_URL.startsWith('https://') 
        : isProd;
    cookieStore.set('token', token, {
        httpOnly: true,
        secure: isHttps,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60,
        path: '/'
    });
}

export function getAuthAdmin() {
    const user = getAuthVendor();
    if (!user || user.role !== 'admin') {
        return null;
    }
    return user;
}


