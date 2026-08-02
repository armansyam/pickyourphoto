import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getRequestOrigin } from '@/lib/url';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action') || 'login';

        const setting = db.prepare("SELECT value FROM saas_settings WHERE key = 'google_client_id'").get();
        const clientId = setting ? setting.value : process.env.GOOGLE_CLIENT_ID;

        if (!clientId) {
            return NextResponse.json({ 
                message: 'Google Sign-In belum dikonfigurasi oleh Admin. Silakan isi Google Client ID di Admin Panel.' 
            }, { status: 400 });
        }

        const origin = getRequestOrigin(request);
        const redirectUri = `${origin}/api/auth/google/callback`;

        const scope = encodeURIComponent('openid profile email');
        const state = encodeURIComponent(JSON.stringify({ action }));
        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}&access_type=offline&prompt=consent`;

        return NextResponse.redirect(googleAuthUrl);
    } catch (error) {
        console.error('Google OAuth init error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
