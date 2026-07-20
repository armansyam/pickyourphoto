import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const { identifier } = await request.json();

        if (!identifier || identifier.trim() === '') {
            return NextResponse.json({ message: 'Email atau Nomor WhatsApp harus diisi.' }, { status: 400 });
        }

        // Search vendor by email or whatsapp
        const findStmt = db.prepare('SELECT id, name, email FROM vendors WHERE (email = ? OR whatsapp = ?) AND role != ?');
        const vendor = findStmt.get(identifier, identifier, 'admin');

        if (!vendor) {
            return NextResponse.json({ message: 'Email atau nomor WhatsApp tidak terdaftar di sistem.' }, { status: 404 });
        }

        // Set resetRequested = 1
        const updateStmt = db.prepare('UPDATE vendors SET resetRequested = 1 WHERE id = ?');
        updateStmt.run(vendor.id);

        return NextResponse.json({ 
            message: 'Permintaan reset password berhasil diajukan ke admin.',
            vendorName: vendor.name,
            vendorEmail: vendor.email
        }, { status: 200 });

    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json({ message: 'Terjadi kesalahan sistem internal.' }, { status: 500 });
    }
}
