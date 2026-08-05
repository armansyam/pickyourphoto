import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';
import { getRequestOrigin } from '@/lib/url';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        const clientIdStmt = db.prepare("SELECT value FROM saas_settings WHERE key = 'google_client_id'").get();
        const clientId = clientIdStmt?.value || process.env.GOOGLE_CLIENT_ID;

        if (!clientId) {
            return NextResponse.json({ message: 'Isi Google Client ID terlebih dahulu di Admin Settings.' }, { status: 400 });
        }

        const origin = getRequestOrigin(request);
        // Use the authorized redirect URI registered in Google Cloud Console
        const redirectUri = `${origin}/api/admin/auth/google/callback`;

        const scopes = [
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
        ].join(' ');

        // Pass state=worker to differentiate Worker Account OAuth from Master OAuth
        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent&state=worker`;

        return NextResponse.redirect(googleAuthUrl);
    } catch (error) {
        console.error('Admin Google Worker auth init error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
