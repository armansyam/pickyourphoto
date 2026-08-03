import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(request, { params }) {
    try {
        const vendor = getAuthVendor();
        if (!vendor) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { projectId } = params;
        if (!projectId) {
            return NextResponse.json({ message: 'Project ID wajib diisi.' }, { status: 400 });
        }

        // Verify vendor subscription status
        if (vendor.isExpired) {
            return NextResponse.json({
                message: `Masa aktif langganan Anda telah berakhir. Harap perpanjang paket berlangganan terlebih dahulu untuk mengaktifkan kembali galeri ini.`
            }, { status: 403 });
        }

        // Fetch project
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
        if (!project) {
            return NextResponse.json({ message: 'Project tidak ditemukan.' }, { status: 404 });
        }

        if (project.vendorId !== vendor.id) {
            return NextResponse.json({ message: 'Forbidden. Anda tidak memiliki akses ke project ini.' }, { status: 403 });
        }

        // Read retention days from plan or default 30
        const retentionDays = vendor.projectExpireDays && vendor.projectExpireDays > 0 && vendor.projectExpireDays < 99999
            ? vendor.projectExpireDays
            : 30;

        const newExpiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString();

        // Update project status to 'pending_selection' or 'draft' if it was archived
        const newStatus = project.status === 'archived' ? 'pending_selection' : project.status;

        db.prepare('UPDATE projects SET status = ?, expiresAt = ?, filesDeleted = 0 WHERE id = ?').run(
            newStatus,
            newExpiresAt,
            projectId
        );

        return NextResponse.json({
            success: true,
            message: `Galeri foto "${project.name}" berhasil diaktifkan kembali hingga ${new Date(newExpiresAt).toLocaleDateString()}!`,
            expiresAt: newExpiresAt
        });

    } catch (error) {
        console.error('Failed to reactivate project:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
