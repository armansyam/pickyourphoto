import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { generateToken, setAuthCookie } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request) {
    try {
        const clientIp = getClientIp(request);
        const { email, password } = await request.json();

        // Strict rate limiting for admin portal (max 5 login attempts per minute per IP / email)
        const ipRate = checkRateLimit(`admin_login_ip_${clientIp}`, 5, 60);
        const emailRate = checkRateLimit(`admin_login_email_${email || 'unknown'}`, 5, 60);

        if (!ipRate.success || !emailRate.success) {
            const waitSec = Math.max(ipRate.resetSeconds, emailRate.resetSeconds);
            return NextResponse.json({
                message: `Terlalu banyak percobaan login admin. Harap coba lagi dalam ${waitSec} detik.`
            }, { status: 429 });
        }

        if (!email || !password) {
            return NextResponse.json({ message: 'Email dan password wajib diisi.' }, { status: 400 });
        }

        const stmt = db.prepare('SELECT id, name, email, password, role, status FROM admins WHERE email = ?');
        const adminUser = stmt.get(email.toLowerCase().trim());

        if (!adminUser) {
            return NextResponse.json({ message: 'Kredensial login admin tidak valid.' }, { status: 401 });
        }

        const isPasswordValid = await bcrypt.compare(password, adminUser.password);

        if (!isPasswordValid) {
            return NextResponse.json({ message: 'Kredensial login admin tidak valid.' }, { status: 401 });
        }

        // Strict role restriction: MUST be superadmin role
        if (adminUser.role !== 'admin') {
            return NextResponse.json({ message: 'Akses ditolak. Portal ini khusus Administrator SaaS.' }, { status: 403 });
        }

        if (adminUser.status === 'suspended') {
            return NextResponse.json({ message: 'Akun Administrator telah ditangguhkan.' }, { status: 401 });
        }

        const token = generateToken({ id: adminUser.id, name: adminUser.name, email: adminUser.email, role: 'admin' });
        setAuthCookie(token);

        return NextResponse.json({ success: true, message: 'Admin authentication successful.', role: vendor.role });

    } catch (error) {
        console.error('Admin Login API Error:', error);
        return NextResponse.json({ message: 'Terjadi kesalahan internal server.' }, { status: 500 });
    }
}
