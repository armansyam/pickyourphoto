import { NextResponse } from 'next/server';
import db from '../../../../../lib/db.js';
import { getAuthVendor } from '../../../../../lib/auth.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function DELETE(request, { params }) {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Tidak memiliki akses admin' }, { status: 403 });
        }

        const resolvedParams = await params;
        const id = resolvedParams?.id || params?.id;
        if (!id) {
            return NextResponse.json({ success: false, error: 'ID akun tidak valid' }, { status: 400 });
        }

        const targetAccount = db.prepare('SELECT * FROM master_drive_accounts WHERE id = ?').get(id);
        if (!targetAccount) {
            return NextResponse.json({ success: false, error: 'Akun tidak ditemukan' }, { status: 404 });
        }

        if (targetAccount.role === 'master_index') {
            return NextResponse.json({ success: false, error: 'Akun Master Index Hub tidak boleh dihapus' }, { status: 403 });
        }

        db.prepare('DELETE FROM master_drive_accounts WHERE id = ?').run(id);

        return NextResponse.json({
            success: true,
            message: `Akun Worker ${targetAccount.email} berhasil dihapus dari pool`
        });
    } catch (error) {
        console.error('Error deleting worker account:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
