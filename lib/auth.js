import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import db from './db';

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.trim() === '' || secret === 'isi_dengan_string_acak_panjang_dan_aman') {
        throw new Error('CRITICAL SECURITY CONFIGURATION MISSING: process.env.JWT_SECRET environment variable is missing.');
    }
    return secret;
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
                v.additionalProjects,
                v.additionalProjectsExpiresAt,
                v.additionalPhotosPerProject,
                v.usedStorageBytes,
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

        // Inject status kedaluwarsa & masa tenggang dinamis dari saas_settings
        const graceRow = db.prepare("SELECT value FROM saas_settings WHERE key = 'grace_period_days'").get();
        const graceDays = graceRow && parseInt(graceRow.value, 10) > 0 ? parseInt(graceRow.value, 10) : 7;
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
    cookieStore.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60,
        path: '/'
    });
}

