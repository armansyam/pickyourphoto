import './globals.css';
import DevWatermark from '@/components/DevWatermark';
import db from '@/lib/db';

export async function generateMetadata() {
    let faviconUrl = '/favicon.ico';
    let brandName = 'Photota';
    try {
        const rows = db.prepare("SELECT key, value FROM saas_settings WHERE key IN ('saas_favicon_url', 'saas_logo_url', 'saas_name')").all() || [];
        const map = {};
        rows.forEach(r => { map[r.key] = r.value; });
        if (map.saas_favicon_url) faviconUrl = map.saas_favicon_url;
        else if (map.saas_logo_url) faviconUrl = map.saas_logo_url;
        if (map.saas_name) brandName = map.saas_name;
    } catch (_) {}

    return {
        title: `${brandName} — Platform Seleksi Foto Digital`,
        description: 'Platform seleksi foto digital terpercaya untuk fotografer & studio foto profesional.',
        icons: {
            icon: faviconUrl,
            shortcut: faviconUrl,
            apple: faviconUrl,
        },
    };
}

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head>
                <meta name="color-scheme" content="dark" />
                <meta name="theme-color" content="#09090b" />
            </head>
            <body>
                {children}
                <DevWatermark />
            </body>
        </html>
    );
}