import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import db from '@/lib/db';
import { encryptSecret } from '@/lib/crypto-vault';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const rawState = searchParams.get('state');
  const errorParam = searchParams.get('error');

  let stateObj = {};
  try {
    if (rawState) stateObj = JSON.parse(rawState);
  } catch (_) {}

  const origin = stateObj.origin || (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  const redirectTarget = `${origin.replace(/\/$/, '')}/dashboard/storage`;

  if (errorParam || !code) {
    return NextResponse.redirect(`${redirectTarget}?error=${encodeURIComponent(errorParam || 'Otentikasi Google ditolak.')}`);
  }

  try {
    const vendorId = stateObj.vendorId;
    if (!vendorId) {
      return NextResponse.redirect(`${redirectTarget}?error=Sesi+vendor+tidak+valid.`);
    }

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
    const redirectUri = `${origin.replace(/\/$/, '')}/api/storage/external/callback`;

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens } = await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);

    // Ambil profil email Google vendor
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userRes = await oauth2.userinfo.get();
    const googleEmail = userRes.data.email || '';

    // Ambil Refresh Token
    let refreshToken = tokens.refresh_token;
    if (!refreshToken) {
      // Ambil refresh token lama jika sudah ada
      const existing = db.prepare('SELECT externalDriveRefreshToken FROM vendors WHERE id = ?').get(vendorId);
      refreshToken = existing ? existing.externalDriveRefreshToken : null;
    }

    if (!refreshToken) {
      return NextResponse.redirect(`${redirectTarget}?error=Google+tidak+mengembalikan+Refresh+Token.+Harap+ulangi+otentikasi.`);
    }

    // Langsung gunakan Root Index Google Drive Vendor ('root')
    const externalFolderId = 'root';
    const encryptedToken = encryptSecret(refreshToken);

    // Simpan ke DB dalam bentuk terenkripsi
    db.prepare(`
      UPDATE vendors 
      SET externalDriveConnected = 1,
          externalDriveEmail = ?,
          externalDriveRefreshToken = ?,
          externalDriveFolderId = ?
      WHERE id = ?
    `).run(googleEmail, encryptedToken, externalFolderId, vendorId);

    console.log(`[BYOS Integration] Vendor ID ${vendorId} successfully connected external GDrive (${googleEmail}).`);

    return NextResponse.redirect(`${redirectTarget}?byos_success=1`);
  } catch (err) {
    console.error('[External Drive Callback Error]:', err.message);
    return NextResponse.redirect(`${redirectTarget}?error=${encodeURIComponent(err.message)}`);
  }
}
