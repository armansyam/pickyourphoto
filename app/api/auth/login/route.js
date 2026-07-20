import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 });
        }

        const stmt = db.prepare('SELECT id, name, email, password, role, status FROM vendors WHERE email = ?');
        const vendor = stmt.get(email);

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

        const token = jwt.sign(
            { id: vendor.id, name: vendor.name, email: vendor.email },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        const response = NextResponse.json({ message: 'Login successful.', role: vendor.role });
        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24, // 1 day
            path: '/',
        });

        return response;

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
    }
}