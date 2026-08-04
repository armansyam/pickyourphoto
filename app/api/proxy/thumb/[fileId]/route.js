import { NextResponse } from 'next/server';

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

    if (!response.ok) {
      return new NextResponse('Gagal mengambil gambar dari Google Drive', { status: 502 });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // ✅ TRUE PIPE STREAM — data langsung diteruskan dari Google CDN ke browser
    // tanpa menampung seluruh file di RAM server (tidak ada arrayBuffer()).
    // Domain tetap pickyourphoto.com, URL Google tidak terekspos ke client.
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
  } catch (error) {
    console.error('[ThumbProxy Error]:', error);
    return new NextResponse('Terjadi kesalahan proxy gambar', { status: 500 });
  }
}
