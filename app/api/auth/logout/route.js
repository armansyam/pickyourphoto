import { NextResponse } from 'next/server';
import { getRequestOrigin } from '@/lib/url';

export async function POST() {
    const response = NextResponse.json({ message: 'Logged out successfully.' });
    response.cookies.delete('token');
    return response;
}
export async function GET(request) {
    const origin = getRequestOrigin(request);
    const response = NextResponse.redirect(new URL('/login', origin));
    response.cookies.delete('token');
    return response;
}
