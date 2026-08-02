import { google } from 'googleapis';
import db from './db';

/**
 * Google Master Drive OAuth Helper
 * Enables centralized Studio Master OAuth for Pick-Your-Photo SaaS platform
 */

export function getMasterDriveClient() {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || getSaasSetting('google_client_id');
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || getSaasSetting('google_client_secret');
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || getSaasSetting('google_refresh_token');

    if (!clientId || !clientSecret || !refreshToken) {
      return null;
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    return google.drive({ version: 'v3', auth: oauth2Client });
  } catch (err) {
    console.error('[Google Master Drive Client Error]:', err.message);
    return null;
  }
}

function getSaasSetting(key) {
  try {
    const row = db.prepare('SELECT value FROM saas_settings WHERE key = ?').get(key);
    return row ? row.value : null;
  } catch {
    return null;
  }
}

export async function fetchFolderFilesMasterOAuth(folderId) {
  const drive = getMasterDriveClient();
  if (!drive) return null;

  try {
    let files = [];
    let pageToken = '';
    do {
      const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false and mimeType contains 'image/'`,
        fields: 'nextPageToken, files(id, name, mimeType)',
        pageSize: 200,
        pageToken: pageToken || undefined
      });

      const pageFiles = (res.data.files || []).map(f => ({ id: f.id, name: f.name }));
      files = files.concat(pageFiles);
      pageToken = res.data.nextPageToken || '';
    } while (pageToken);

    return files;
  } catch (err) {
    console.error('[Master OAuth Fetch Error]:', err.message);
    return null;
  }
}
