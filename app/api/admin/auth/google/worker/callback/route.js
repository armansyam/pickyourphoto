import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import db from '../../../../../../../lib/db.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const redirectUri = `${protocol}://${host}/api/admin/auth/google/worker/callback`;

    if (error) {
        console.error('Google Worker OAuth error:', error);
        return NextResponse.redirect(`${protocol}://${host}/admin?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
        return NextResponse.redirect(`${protocol}://${host}/admin?error=Missing_code`);
    }

    try {
        const getSetting = (k) => {
            const r = db.prepare('SELECT value FROM saas_settings WHERE key = ?').get(k);
            return r ? r.value : '';
        };

        const clientId = getSetting('google_client_id');
        const clientSecret = getSetting('google_client_secret');

        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Fetch User Info (Email & Profile)
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        const workerEmail = userInfo.data.email;

        // Fetch Storage Quota Limit
        let totalLimitBytes = 16106127360; // Default 15 GB
        try {
            const drive = google.drive({ version: 'v3', auth: oauth2Client });
            const aboutRes = await drive.about.get({ fields: 'storageQuota' });
            if (aboutRes.data.storageQuota && aboutRes.data.storageQuota.limit) {
                totalLimitBytes = parseInt(aboutRes.data.storageQuota.limit);
            }
        } catch (qErr) {
            console.warn('Failed to fetch storage quota limit for worker, using 15GB default:', qErr.message);
        }

        if (!tokens.refresh_token) {
            // Check if account already exists with refresh_token
            const existing = db.prepare('SELECT refreshToken FROM master_drive_accounts WHERE email = ?').get(workerEmail);
            if (!existing || !existing.refreshToken) {
                return NextResponse.redirect(`${protocol}://${host}/admin?error=${encodeURIComponent('Google tidak memberikan Refresh Token. Silakan cabut akses aplikasi di akun Google tersebut lalu otorisasi ulang.')}`);
            }
            tokens.refresh_token = existing.refreshToken;
        }

        // Insert or update Worker Account in Database
        const stmt = db.prepare(`
            INSERT INTO master_drive_accounts (email, role, refreshToken, accessToken, totalLimitBytes, status)
            VALUES (?, 'worker', ?, ?, ?, 'active')
            ON CONFLICT(email) DO UPDATE SET
                refreshToken = excluded.refreshToken,
                accessToken = excluded.accessToken,
                totalLimitBytes = excluded.totalLimitBytes,
                status = 'active'
        `);

        stmt.run(workerEmail, tokens.refresh_token, tokens.access_token || '', totalLimitBytes);
        console.log(`[Worker OAuth] Akun Worker ${workerEmail} (${(totalLimitBytes / (1024 ** 3)).toFixed(2)} GB) BERHASIL DITAMBAHKAN KE STORAGE POOL!`);

        return NextResponse.redirect(`${protocol}://${host}/admin?msg=${encodeURIComponent(`Akun Worker ${workerEmail} berhasil ditambahkan ke Storage Pool`)}`);
    } catch (err) {
        console.error('Error handling Google Worker OAuth callback:', err);
        return NextResponse.redirect(`${protocol}://${host}/admin?error=${encodeURIComponent(err.message)}`);
    }
}
