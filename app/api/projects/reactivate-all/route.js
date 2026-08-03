import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(request) {
    try {
        const vendor = getAuthVendor();
        if (!vendor) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // Verify vendor subscription status
        if (vendor.isExpired) {
            return NextResponse.json({
                message: `Masa aktif langganan Anda telah berakhir. Harap perpanjang paket berlangganan terlebih dahulu.`
            }, { status: 403 });
        }

        const retentionDays = vendor.projectExpireDays && vendor.projectExpireDays > 0 && vendor.projectExpireDays < 99999
            ? vendor.projectExpireDays
            : 30;

        const newExpiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString();

        // Reactivate all archived projects owned by vendor
        const result = db.prepare(`
            UPDATE projects 
            SET status = 'pending_selection', expiresAt = ?, filesDeleted = 0 
            WHERE vendorId = ? AND status = 'archived'
        `).run(newExpiresAt, vendor.id);

        if (result.changes === 0) {
            return NextResponse.json({
                message: 'Tidak ada galeri terarsip yang perlu diaktifkan kembali.',
                count: 0
            });
        }

        return NextResponse.json({
            success: true,
            message: `Berhasil mengaktifkan kembali ${result.changes} galeri terarsip hingga ${new Date(newExpiresAt).toLocaleDateString()}!`,
            count: result.changes,
            expiresAt: newExpiresAt
        });

    } catch (error) {
        console.error('Failed to reactivate all projects:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
