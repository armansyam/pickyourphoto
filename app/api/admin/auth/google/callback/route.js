import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        const host = request.headers.get('host');
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const redirectUri = `${protocol}://${host}/api/admin/auth/google/callback`;

        if (error || !code) {
            return NextResponse.redirect(new URL('/admin#settings?error=Otorisasi Google Master dibatalkan.', request.url));
        }

        const clientIdStmt = db.prepare("SELECT value FROM saas_settings WHERE key = 'google_client_id'").get();
        const clientSecretStmt = db.prepare("SELECT value FROM saas_settings WHERE key = 'google_client_secret'").get();

        const clientId = clientIdStmt?.value || process.env.GOOGLE_CLIENT_ID;
        const clientSecret = clientSecretStmt?.value || process.env.GOOGLE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return NextResponse.redirect(new URL('/admin#settings?error=Google OAuth settings incomplete.', request.url));
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
            return NextResponse.redirect(new URL('/admin#settings?error=Gagal mengumpulkan token Google Master.', request.url));
        }

        const upsertStmt = db.prepare(`
            INSERT INTO saas_settings (key, value, updatedAt) VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = CURRENT_TIMESTAMP
        `);

        upsertStmt.run('google_access_token', tokenData.access_token);
        if (tokenData.refresh_token) {
            upsertStmt.run('google_refresh_token', tokenData.refresh_token);
        }

        return NextResponse.redirect(new URL('/admin#settings?success=Google Master Drive berhasil terhubung!', request.url));
    } catch (error) {
        console.error('Admin Google callback error:', error);
        return NextResponse.redirect(new URL('/admin#settings?error=Internal failure during Google Master auth.', request.url));
    }
}
