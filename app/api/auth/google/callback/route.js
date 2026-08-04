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
            return NextResponse.redirect(new URL('/login?error=' + encodeURIComponent(error || 'Google authentication was cancelled.'), origin));
        }

        const clientIdStmt = db.prepare("SELECT value FROM saas_settings WHERE key = 'google_client_id'").get();
        const clientSecretStmt = db.prepare("SELECT value FROM saas_settings WHERE key = 'google_client_secret'").get();

        const clientId = clientIdStmt?.value || process.env.GOOGLE_CLIENT_ID;
        const clientSecret = clientSecretStmt?.value || process.env.GOOGLE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return NextResponse.redirect(new URL('/login?error=' + encodeURIComponent('Google OAuth settings incomplete in Admin Panel.'), origin));
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
            return NextResponse.redirect(new URL('/login?error=' + encodeURIComponent('Failed to exchange Google authentication code.'), origin));
        }

        const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const googleUser = await userRes.json();

        if (!googleUser.email) {
            return NextResponse.redirect(new URL('/login?error=' + encodeURIComponent('Email address not received from Google.'), origin));
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

            const redirectPath = (vendor.status === 'active')
                ? (action === 'register' ? '/dashboard?notice=already_registered' : '/dashboard')
                : `/register?step=select-plan&email=${encodeURIComponent(vendor.email)}`;

            const response = NextResponse.redirect(new URL(redirectPath, origin));
            response.cookies.set('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 24 * 60 * 60,
                path: '/'
            });
            return response;
        }

        // New Vendor Registration via Google: Create a lead record with status='draft_plan'
        const defaultPasswordHash = await bcrypt.hash(Math.random().toString(36), 10);
        const defaultPlan = db.prepare("SELECT id, maxProjects FROM plans WHERE price > 0 ORDER BY price ASC LIMIT 1").get();
        const planId = defaultPlan?.id || 1;
        const maxProjects = defaultPlan?.maxProjects || 10;

        const insertStmt = db.prepare(`
            INSERT INTO vendors (name, email, whatsapp, password, role, status, maxProjects, planId, paymentProof, resetRequested, createdAt) 
            VALUES (?, ?, ?, ?, ?, 'draft_plan', ?, ?, 'Google OAuth Lead', 0, CURRENT_TIMESTAMP)
        `);
        const info = insertStmt.run(name, email, '', defaultPasswordHash, 'vendor', maxProjects, planId);
        const newVendorId = info.lastInsertRowid;

        const token = generateToken({
            id: newVendorId,
            email: email,
            name: name,
            role: 'vendor'
        });

        const response = NextResponse.redirect(new URL(`/register?step=select-plan&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`, origin));
        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60,
            path: '/'
        });
        return response;

    } catch (error) {
        console.error('Google OAuth callback error:', error);
        const fallbackOrigin = getRequestOrigin(request);
        return NextResponse.redirect(new URL('/login?error=' + encodeURIComponent('Internal authentication failure.'), fallbackOrigin));
    }
}
