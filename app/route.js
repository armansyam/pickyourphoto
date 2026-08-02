import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import { getRequestOrigin } from '@/lib/url';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    // Check if user is logged in
    const vendor = getAuthVendor();
    if (vendor) {
        const origin = getRequestOrigin(request);
        if (vendor.role === 'admin') {
            return NextResponse.redirect(new URL('/admin', origin));
        } else {
            return NextResponse.redirect(new URL('/dashboard', origin));
        }
    }

    // Read static landing page html
    const filePath = path.join(process.cwd(), 'public/landing.html');
    const html = fs.readFileSync(filePath, 'utf8');

    return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html' }
    });
}
