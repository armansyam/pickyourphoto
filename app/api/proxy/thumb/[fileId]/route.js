import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import db from '@/lib/db';

export async function GET(request, { params }) {
  const { fileId } = params;
  const { searchParams } = new URL(request.url);
  const sz = searchParams.get('sz') || 'w400';

  if (!fileId || !/^[a-zA-Z0-9_-]{10,}$/.test(fileId)) {
    return NextResponse.json({ error: 'File ID tidak valid' }, { status: 400 });
  }

  const primaryUrl = `https://lh3.googleusercontent.com/d/${fileId}=${sz}`;
  const fallbackUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=${sz}`;

  try {
    let response = await fetch(primaryUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://drive.google.com/',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      },
      next: { revalidate: 86400 }
    });

    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) {
      response = await fetch(fallbackUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://drive.google.com/',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        },
      });
    }

    if (response.ok && response.headers.get('content-type')?.startsWith('image/')) {
      const contentType = response.headers.get('content-type') || 'image/jpeg';

      // ✅ TRUE PIPE STREAM — data langsung diteruskan dari Google CDN ke browser
      return new NextResponse(response.body, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400',
          'CDN-Cache-Control': 'public, max-age=2592000',
          'Cloudflare-CDN-Cache-Control': 'public, max-age=2592000',
          'X-Proxy-Source': 'drive-pipe'
        },
      });
    }

    // 🔒 FALLBACK UNTUK FILE GOOGLE DRIVE PRIVAT VENDOR (BYOS):
    // Gunakan OAuth refresh token milik Vendor untuk streaming media langsung via GDrive API
    const fileRecord = db.prepare('SELECT vendorId, mimeType FROM storage_files WHERE driveFileId = ?').get(fileId);
    if (fileRecord) {
      const vendor = db.prepare('SELECT externalDriveConnected, externalDriveRefreshToken FROM vendors WHERE id = ?').get(fileRecord.vendorId);
      if (vendor && vendor.externalDriveRefreshToken) {
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

        if (clientId && clientSecret) {
          const oauth = new google.auth.OAuth2(clientId, clientSecret);
          oauth.setCredentials({ refresh_token: vendor.externalDriveRefreshToken });
          const drive = google.drive({ version: 'v3', auth: oauth });

          const mediaRes = await drive.files.get(
            { fileId, alt: 'media' },
            { responseType: 'stream' }
          );

          if (mediaRes.status === 200) {
            const contentType = mediaRes.headers['content-type'] || fileRecord.mimeType || 'image/jpeg';
            return new NextResponse(mediaRes.data, {
              status: 200,
              headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
                'X-Proxy-Source': 'drive-auth-stream'
              }
            });
          }
        }
      }
    }

    return new NextResponse('Gagal mengambil gambar dari Google Drive', { status: 502 });
  } catch (error) {
    console.error('[ThumbProxy Error]:', error);
    return new NextResponse('Terjadi kesalahan proxy gambar', { status: 500 });
  }
}
