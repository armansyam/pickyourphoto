import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request) {
    try {
        const { email, whatsapp } = await request.json();

        if (email) {
            const existingEmail = db.prepare('SELECT id, status FROM vendors WHERE email = ?').get(email.toLowerCase().trim());
            if (existingEmail && existingEmail.status === 'active') {
                return NextResponse.json({ message: 'Email sudah terdaftar pada akun lain. Silakan login.' }, { status: 409 });
            }
        }

        if (whatsapp) {
            let cleanWa = whatsapp.replace(/\D/g, '');
            if (cleanWa.startsWith('0')) cleanWa = '62' + cleanWa.slice(1);
            if (!cleanWa.startsWith('62')) cleanWa = '62' + cleanWa;

            const existingWa = db.prepare("SELECT id, email, status FROM vendors WHERE whatsapp = ? AND status IN ('active', 'pending_payment')").get(cleanWa);
            if (existingWa && existingWa.email !== email?.toLowerCase().trim()) {
                return NextResponse.json({ message: 'Nomor WhatsApp ini sudah terdaftar pada akun lain. Silakan gunakan nomor WhatsApp lain.' }, { status: 409 });
            }
        }

        return NextResponse.json({ success: true, message: 'Data registrasi valid.' });
    } catch (error) {
        console.error('[Validate Register Error]:', error);
        return NextResponse.json({ message: 'Terjadi kesalahan validasi.' }, { status: 500 });
    }
}
