import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    // Check if user is logged in
    const vendor = getAuthVendor();
    if (vendor) {
        if (vendor.role === 'admin') {
            return NextResponse.redirect(new URL('/admin', request.url));
        } else {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
    }

    // Read static landing page html
    const filePath = path.join(process.cwd(), 'public/landing.html');
    const html = fs.readFileSync(filePath, 'utf8');

    return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html' }
    });
}
