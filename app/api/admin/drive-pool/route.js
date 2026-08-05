import { NextResponse } from 'next/server';
import db from '../../../../lib/db.js';
import { getAuthVendor } from '../../../../lib/auth.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Tidak memiliki akses admin' }, { status: 403 });
        }

        const rows = db.prepare(`
            SELECT id, email, role, status, totalLimitBytes, usedStorageBytes, createdAt 
            FROM master_drive_accounts 
            ORDER BY id ASC
        `).all() || [];

        const masterIndex = rows.find(r => r.role === 'master_index') || null;
        const workers = rows.filter(r => r.role === 'worker');

        return NextResponse.json({
            success: true,
            masterIndex,
            workers,
            totalWorkers: workers.length,
            totalPoolCapacityBytes: workers.reduce((acc, curr) => acc + (curr.totalLimitBytes || 0), 0),
            totalPoolUsedBytes: workers.reduce((acc, curr) => acc + (curr.usedStorageBytes || 0), 0)
        });
    } catch (error) {
        console.error('Error fetching drive pool:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Tidak memiliki akses admin' }, { status: 403 });
        }

        const body = await request.json();
        const { email, refreshToken, role = 'worker', totalLimitBytes = 16106127360 } = body;

        if (!email || !refreshToken) {
            return NextResponse.json({ success: false, error: 'Email dan refreshToken wajib diisi' }, { status: 400 });
        }

        const stmt = db.prepare(`
            INSERT INTO master_drive_accounts (email, role, refreshToken, totalLimitBytes, status)
            VALUES (?, ?, ?, ?, 'active')
            ON CONFLICT(email) DO UPDATE SET
                refreshToken = excluded.refreshToken,
                role = excluded.role,
                totalLimitBytes = excluded.totalLimitBytes,
                status = 'active'
        `);

        stmt.run(email, role, refreshToken, totalLimitBytes);

        return NextResponse.json({
            success: true,
            message: `Akun ${email} (${role}) berhasil ditambahkan ke Storage Pool`
        });
    } catch (error) {
        console.error('Error adding drive account:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
