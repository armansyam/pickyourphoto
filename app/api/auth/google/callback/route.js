import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { generateToken, setAuthCookie } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { getRequestOrigin } from '@/lib/url';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const origin = getRequestOrigin(request);
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        const redirectUri = `${origin}/api/auth/google/callback`;

        if (error || !code) {
            return NextResponse.redirect(new URL('/login?error=Google authentication was cancelled.', origin));
        }

        const clientIdStmt = db.prepare("SELECT value FROM saas_settings WHERE key = 'google_client_id'").get();
        const clientSecretStmt = db.prepare("SELECT value FROM saas_settings WHERE key = 'google_client_secret'").get();

        const clientId = clientIdStmt?.value || process.env.GOOGLE_CLIENT_ID;
        const clientSecret = clientSecretStmt?.value || process.env.GOOGLE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return NextResponse.redirect(new URL('/login?error=Google OAuth settings incomplete in Admin Panel.', origin));
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
            return NextResponse.redirect(new URL('/login?error=Failed to exchange Google authentication code.', origin));
        }

        const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const googleUser = await userRes.json();

        if (!googleUser.email) {
            return NextResponse.redirect(new URL('/login?error=Email address not received from Google.', origin));
        }

        const email = googleUser.email.toLowerCase().trim();
        const name = googleUser.name || email.split('@')[0];

        // Parse action state (login vs register)
        let action = 'login';
        try {
            const stateParam = searchParams.get('state');
            if (stateParam) {
                const parsedState = JSON.parse(decodeURIComponent(stateParam));
                if (parsedState.action) action = parsedState.action;
            }
        } catch (e) {}

        let vendor = db.prepare("SELECT * FROM vendors WHERE email = ?").get(email);

        if (vendor) {
            const token = generateToken({
                id: vendor.id,
                email: vendor.email,
                name: vendor.name,
                role: vendor.role
            });
            setAuthCookie(token);

            if (vendor.status === 'active') {
                // Jika sudah terdaftar & aktif -> Masukkan ke Dashboard!
                const redirectPath = action === 'register' ? '/dashboard?notice=already_registered' : '/dashboard';
                return NextResponse.redirect(new URL(redirectPath, origin));
            } else {
                // Jika pendaftaran belum selesai / pending -> Arahkan kembali ke Langkah Pilih Paket untuk melanjutkannya!
                return NextResponse.redirect(new URL(`/register?step=select-plan&email=${encodeURIComponent(vendor.email)}`, origin));
            }
        }

        // New Vendor Registration via Google: Do NOT insert into DB yet!
        // Redirect to register page so the user chooses a plan and completes payment/upload first.
        return NextResponse.redirect(new URL(`/register?step=select-plan&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`, origin));

    } catch (error) {
        console.error('Google OAuth callback error:', error);
        return NextResponse.redirect(new URL('/login?error=Internal authentication failure.', getRequestOrigin(request)));
    }
}
