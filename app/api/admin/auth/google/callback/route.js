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
        const state = searchParams.get('state');

        const redirectUri = `${origin}/api/admin/auth/google/callback`;

        if (error || !code) {
            return NextResponse.redirect(new URL('/admin#storage-pool?error=Otorisasi Google dibatalkan.', origin));
        }

        const clientIdStmt = db.prepare("SELECT value FROM saas_settings WHERE key = 'google_client_id'").get();
        const clientSecretStmt = db.prepare("SELECT value FROM saas_settings WHERE key = 'google_client_secret'").get();

        const clientId = clientIdStmt?.value || process.env.GOOGLE_CLIENT_ID;
        const clientSecret = clientSecretStmt?.value || process.env.GOOGLE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return NextResponse.redirect(new URL('/admin#storage-pool?error=Google OAuth settings incomplete.', origin));
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
            console.error('Failed to exchange Google OAuth code:', tokenData);
            return NextResponse.redirect(new URL('/admin#storage-pool?error=Gagal mengumpulkan token Google.', origin));
        }

        // Fetch connected Google Account email
        let accountEmail = '';
        try {
            const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${tokenData.access_token}` }
            });
            if (userinfoRes.ok) {
                const userinfo = await userinfoRes.json();
                accountEmail = userinfo?.email || '';
            }
        } catch (e) {
            console.warn('[Admin OAuth Callback] Gagal membaca userinfo email:', e.message);
        }

        if (!accountEmail) {
            return NextResponse.redirect(new URL('/admin#storage-pool?error=Gagal membaca email akun Google.', origin));
        }

        // Handle WORKER ACCOUNT OAuth (state === 'worker')
        if (state === 'worker') {
            if (!tokenData.refresh_token) {
                const existing = db.prepare('SELECT refreshToken FROM master_drive_accounts WHERE email = ?').get(accountEmail);
                if (existing && existing.refreshToken) {
                    tokenData.refresh_token = existing.refreshToken;
                } else {
                    return NextResponse.redirect(new URL(`/admin#storage-pool?error=${encodeURIComponent('Google tidak memberikan Refresh Token. Silakan cabut akses aplikasi di akun Google tersebut lalu otorisasi ulang.')}`, origin));
                }
            }

            // Fetch Storage Quota Limit
            let totalLimitBytes = 16106127360; // Default 15 GB
            try {
                const driveAboutRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota', {
                    headers: { Authorization: `Bearer ${tokenData.access_token}` }
                });
                if (driveAboutRes.ok) {
                    const aboutData = await driveAboutRes.json();
                    if (aboutData.storageQuota?.limit) {
                        totalLimitBytes = parseInt(aboutData.storageQuota.limit);
                    }
                }
            } catch (qErr) {
                console.warn('Failed to fetch storage quota limit for worker, using 15GB default:', qErr.message);
            }

            // Update role to 'worker' even if email was previously master_index
            const stmt = db.prepare(`
                INSERT INTO master_drive_accounts (email, role, refreshToken, accessToken, totalLimitBytes, status)
                VALUES (?, 'worker', ?, ?, ?, 'active')
                ON CONFLICT(email) DO UPDATE SET
                    role = 'worker',
                    refreshToken = excluded.refreshToken,
                    accessToken = excluded.accessToken,
                    totalLimitBytes = excluded.totalLimitBytes,
                    status = 'active'
            `);

            stmt.run(accountEmail, tokenData.refresh_token, tokenData.access_token, totalLimitBytes);
            console.log(`[Worker OAuth] Akun Worker ${accountEmail} (${(totalLimitBytes / (1024 ** 3)).toFixed(2)} GB) BERHASIL DITAMBAHKAN KE STORAGE POOL!`);

            return NextResponse.redirect(new URL(`/admin#storage-pool?msg=${encodeURIComponent(`Akun Worker ${accountEmail} berhasil ditambahkan ke Storage Pool!`)}`, origin));
        }

        // Handle MASTER INDEX HUB OAuth (state !== 'worker')
        // Demote any old master_index accounts to 'worker' so there is only 1 Master Hub
        db.prepare("UPDATE master_drive_accounts SET role = 'worker' WHERE role = 'master_index'").run();

        const upsertStmt = db.prepare(`
            INSERT OR REPLACE INTO saas_settings (key, value) VALUES (?, ?)
        `);

        upsertStmt.run('google_access_token', tokenData.access_token);
        if (tokenData.refresh_token) {
            upsertStmt.run('google_refresh_token', tokenData.refresh_token);
        }
        upsertStmt.run('google_master_account_email', accountEmail);

        // Set the new account as the sole 'master_index'
        db.prepare(`
            INSERT INTO master_drive_accounts (email, role, refreshToken, accessToken, totalLimitBytes, status)
            VALUES (?, 'master_index', ?, ?, 16106127360, 'active')
            ON CONFLICT(email) DO UPDATE SET
                role = 'master_index',
                refreshToken = excluded.refreshToken,
                accessToken = excluded.accessToken,
                status = 'active'
        `).run(accountEmail, tokenData.refresh_token || '', tokenData.access_token);

        return NextResponse.redirect(new URL('/admin#storage-pool?success=Google Master Hub berhasil terhubung!', origin));
    } catch (error) {
        console.error('Admin Google callback error:', error);
        return NextResponse.redirect(new URL('/admin#storage-pool?error=Internal failure during Google Master auth.', getRequestOrigin(request)));
    }
}
