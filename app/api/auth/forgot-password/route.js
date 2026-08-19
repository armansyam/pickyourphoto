import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const clientIp = getClientIp(request);
        const { identifier } = await request.json();

        if (!identifier || identifier.trim() === '') {
            return NextResponse.json({ message: 'Email atau Nomor WhatsApp harus diisi.' }, { status: 400 });
        }

        const cleanIdentifier = identifier.trim();

        // Rate limiting check (max 4 attempts per minute per IP / identifier)
        const ipRate = checkRateLimit(`forgot_pw_ip_${clientIp}`, 4, 60);
        const idRate = checkRateLimit(`forgot_pw_id_${cleanIdentifier.toLowerCase()}`, 4, 60);

        if (!ipRate.success || !idRate.success) {
            const waitSec = Math.max(ipRate.resetSeconds, idRate.resetSeconds);
            return NextResponse.json({
                message: `Terlalu banyak permintaan reset password. Harap coba lagi dalam ${waitSec} detik.`
            }, { status: 429 });
        }

        // Search vendor by email or whatsapp
        const findStmt = db.prepare('SELECT id, name, email FROM vendors WHERE (email = ? OR whatsapp = ?) AND role != ?');
        const vendor = findStmt.get(cleanIdentifier, cleanIdentifier, 'admin');

        if (!vendor) {
            return NextResponse.json({ message: 'Email atau nomor WhatsApp tidak terdaftar di sistem.' }, { status: 404 });
        }

        // Set resetRequested = 1
        const updateStmt = db.prepare('UPDATE vendors SET resetRequested = 1 WHERE id = ?');
        updateStmt.run(vendor.id);

        return NextResponse.json({ 
            message: 'Permintaan reset password berhasil diajukan ke admin.'
        }, { status: 200 });

    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json({ message: 'Terjadi kesalahan sistem internal.' }, { status: 500 });
    }
}
