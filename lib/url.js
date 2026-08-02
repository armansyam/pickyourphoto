/**
 * Helper to dynamically determine the public request origin (protocol + host).
 * Automatically reads `x-forwarded-host` and `x-forwarded-proto` headers
 * sent by Reverse Proxies (Nginx, PM2, Docker, Caddy, Cloudflare, etc.).
 */
export function getRequestOrigin(request) {
    if (!request) {
        return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.BASE_URL || 'http://localhost:3000';
    }

    // 1. Optional explicit env overrides
    if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
    if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');

    // 2. Extract proxy headers
    const forwardedHost = request.headers?.get('x-forwarded-host');
    const forwardedProto = request.headers?.get('x-forwarded-proto');

    const host = forwardedHost || request.headers?.get('host') || 'localhost:3000';

    // Determine protocol: prefer X-Forwarded-Proto header, fallback to host checking
    let protocol = forwardedProto;
    if (!protocol) {
        protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
    }

    return `${protocol}://${host}`;
}
