import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getRequestOrigin } from '@/lib/url';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const origin = getRequestOrigin(request);
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        const redirectUri = `${origin}/api/admin/auth/google/callback`;

        if (error || !code) {
            return NextResponse.redirect(new URL('/admin#settings?error=Otorisasi Google Master dibatalkan.', origin));
        }

        const clientIdStmt = db.prepare("SELECT value FROM saas_settings WHERE key = 'google_client_id'").get();
        const clientSecretStmt = db.prepare("SELECT value FROM saas_settings WHERE key = 'google_client_secret'").get();

        const clientId = clientIdStmt?.value || process.env.GOOGLE_CLIENT_ID;
        const clientSecret = clientSecretStmt?.value || process.env.GOOGLE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return NextResponse.redirect(new URL('/admin#settings?error=Google OAuth settings incomplete.', origin));
        }

        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            })
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok || !tokenData.access_token) {
            console.error('Failed to exchange Google OAuth code for Admin Master:', tokenData);
            return NextResponse.redirect(new URL('/admin#settings?error=Gagal mengumpulkan token Google Master.', origin));
        }

        const upsertStmt = db.prepare(`
            INSERT OR REPLACE INTO saas_settings (key, value) VALUES (?, ?)
        `);

        upsertStmt.run('google_access_token', tokenData.access_token);
        if (tokenData.refresh_token) {
            upsertStmt.run('google_refresh_token', tokenData.refresh_token);
        }

        return NextResponse.redirect(new URL('/admin#settings?success=Google Master Drive berhasil terhubung!', origin));
    } catch (error) {
        console.error('Admin Google callback error:', error);
        return NextResponse.redirect(new URL('/admin#settings?error=Internal failure during Google Master auth.', getRequestOrigin(request)));
    }
}
