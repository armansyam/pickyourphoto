import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { generateToken, setAuthCookie } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request) {
    try {
        const clientIp = getClientIp(request);
        const { email, password } = await request.json();

        // Rate limiting check (max 5 login attempts per minute per IP / email)
        const ipRate = checkRateLimit(`login_ip_${clientIp}`, 5, 60);
        const emailRate = checkRateLimit(`login_email_${email || 'unknown'}`, 5, 60);

        if (!ipRate.success || !emailRate.success) {
            const waitSec = Math.max(ipRate.resetSeconds, emailRate.resetSeconds);
            return NextResponse.json({
                message: `Terlalu banyak percobaan login. Harap coba lagi dalam ${waitSec} detik.`
            }, { status: 429 });
        }

        if (!email || !password) {
            return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 });
        }


        const stmt = db.prepare('SELECT id, name, email, password, role, status FROM vendors WHERE email = ?');
        const vendor = stmt.get(email.toLowerCase().trim());

        if (!vendor) {
            return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
        }

        const isPasswordValid = await bcrypt.compare(password, vendor.password);

        if (!isPasswordValid) {
            return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
        }

        // Account status validations
        if (vendor.status === 'pending') {
            return NextResponse.json({ message: 'Pendaftaran Anda sedang menunggu konfirmasi/persetujuan dari administrator.' }, { status: 401 });
        }

        if (vendor.status === 'suspended') {
            return NextResponse.json({ message: 'Akun Anda telah ditangguhkan. Silakan hubungi administrator.' }, { status: 401 });
        }

        const token = generateToken({ id: vendor.id, name: vendor.name, email: vendor.email, role: vendor.role });
        setAuthCookie(token);

        return NextResponse.json({ success: true, message: 'Login successful.' });

    } catch (error) {
        console.error('Login Error:', error);
        return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
    }
}