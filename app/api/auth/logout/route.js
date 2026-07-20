import { NextResponse } from 'next/server';

export async function POST() {
    const response = NextResponse.json({ message: 'Logged out successfully.' });
    response.cookies.delete('token');
    return response;
}
export async function GET() {
    const response = NextResponse.redirect(new URL('/login', process.env.BASE_URL || 'http://localhost:3000'));
    response.cookies.delete('token');
    return response;
}
