import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request) {
    try {
        let _body; try { _body = await request.json(); } catch (_) { return NextResponse.json({ message: 'Format body tidak valid.' }, { status: 400 }); }
        const { email, whatsapp } = _body || {};

        if (email) {
            const existingEmail = db.prepare('SELECT id, status FROM vendors WHERE email = ?').get(email.toLowerCase().trim());
            if (existingEmail && existingEmail.status === 'active') {
                return NextResponse.json({ message: 'Email sudah terdaftar pada akun lain. Silakan login.' }, { status: 409 });
            }
        }

        return NextResponse.json({ success: true, message: 'Data registrasi valid.' });
    } catch (error) {
        console.error('[Validate Register Error]:', error);
        return NextResponse.json({ message: 'Terjadi kesalahan validasi.' }, { status: 500 });
    }
}
