import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const session = getAuthVendor();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Otentikasi dibutuhkan.' }, { status: 401 });
  }

  try {
    const getSaasSetting = (key) => {
      try {
        const row = db.prepare('SELECT value FROM saas_settings WHERE key = ?').get(key);
        return row ? row.value : null;
      } catch {
        return null;
      }
    };

    const clientId = process.env.GOOGLE_CLIENT_ID || getSaasSetting('google_client_id');
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || getSaasSetting('google_client_secret');

    if (!clientId || !clientSecret) {
      return NextResponse.json({ success: false, error: 'Kredensial Google OAuth belum dikonfigurasi di server.' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const origin = searchParams.get('origin') || (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    const redirectUri = `${origin.replace(/\/$/, '')}/api/auth/google/callback`;

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    const state = JSON.stringify({ action: 'byos_connect', vendorId: session.id, origin });

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/drive'
      ],
      state,
    });

    return NextResponse.json({ success: true, authUrl });
  } catch (err) {
    console.error('[External Drive Connect GET Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
