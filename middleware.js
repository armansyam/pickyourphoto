import { NextResponse } from 'next/server';

const ROOT_DOMAIN = process.env.ROOT_DOMAIN || process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'photota.my.id';

const RESERVED_SUBDOMAINS = [
    'www', 'api', 'admin', 'app', 'mail', 'ftp', 'static', 'help',
    'support', 'public', 'assets', 'root', 'dashboard', 'login',
    'register', 'auth', 'staging', 'dev', 'test', 'status', 'docs',
    'cdn', 'demo', 'trial', 'gallery', 'storage', 'select'
];

export function middleware(req) {
    const host = req.headers.get('host') || '';
    const hostname = host.replace(/:\d+$/, '').toLowerCase(); // buang port :3000 / :80

    // 1. Ekstrak subdomain
    let subdomain = '';
    if (hostname.endsWith(`.${ROOT_DOMAIN.toLowerCase()}`)) {
        subdomain = hostname.slice(0, -(ROOT_DOMAIN.length + 1));
    } else if (hostname.endsWith('.localhost')) {
        subdomain = hostname.slice(0, -('.localhost'.length));
    }

    // 2. Jika merupakan root domain utama, IP langsung, atau reserved subdomain → teruskan normal
    const isRoot = !subdomain || subdomain === hostname || RESERVED_SUBDOMAINS.includes(subdomain);
    if (isRoot) {
        return NextResponse.next();
    }

    // 3. Skip rewrite untuk asset internal Next.js, static files, dan direct API calls
    const pathname = req.nextUrl.pathname;
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/branding') ||
        pathname.startsWith('/icons') ||
        pathname.startsWith('/vendor_logos') ||
        pathname.startsWith('/videos') ||
        pathname.startsWith('/mockups') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // 4. Mencegah circular rewrite jika sudah di dalam prefix /studio/
    if (pathname.startsWith('/studio/')) {
        return NextResponse.next();
    }

    // 5. Rewrite URL secara transparan ke /studio/[subdomain]/...
    const url = req.nextUrl.clone();
    url.pathname = `/studio/${subdomain}${pathname === '/' ? '' : pathname}`;

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-subdomain', subdomain);
    requestHeaders.set('x-is-subdomain', '1');

    return NextResponse.rewrite(url, {
        request: {
            headers: requestHeaders
        }
    });
}

export const config = {
    matcher: [
        /*
         * Cocokkan semua request path KECUALI:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - images/media publik
         */
        '/((?!_next/static|_next/image|favicon.ico|api/|branding/|icons/|vendor_logos/|videos/).*)',
    ],
};
