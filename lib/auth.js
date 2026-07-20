import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import db from './db';

export function getAuthVendor() {
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
        return null;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Fetch fresh details with subscription plan name and expiration date
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
                p.projectExpireDays,
                p.maxPhotosPerProject,
                p.planType,
                p.maxStorageMB
            FROM vendors v
            LEFT JOIN plans p ON v.planId = p.id
            WHERE v.id = ?
        `);
        const freshUser = stmt.get(decoded.id);

        // Account must exist and be active
        if (!freshUser || freshUser.status !== 'active') {
            return null;
        }

        // Inject isExpired boolean helper
        const expired = freshUser.expiresAt ? (new Date() > new Date(freshUser.expiresAt)) : false;
        
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
            isExpired: expired
        };
    } catch (err) {
        return null;
    }
}
