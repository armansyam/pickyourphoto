import { notFound, redirect } from 'next/navigation';
import db from '@/lib/db';
import { getRootDomain } from '@/lib/subdomain';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
    const rootDomain = getRootDomain();
    const slug = (params?.subdomain || '').toLowerCase();
    
    const vendor = db.prepare(`
        SELECT name, brandName, brandLogo FROM vendors 
        WHERE LOWER(subdomain) = ? AND subdomain_active = 1
    `).get(slug);

    if (!vendor) {
        return {
            title: `Studio Tidak Ditemukan — ${rootDomain}`,
            robots: { index: false, follow: false }
        };
    }

    const displayName = vendor.brandName || vendor.name || 'Studio Gallery';
    return {
        title: `${displayName} — Galeri Seleksi Foto Klien`,
        description: `Portal galeri dan seleksi foto online resmi ${displayName}.`,
        robots: { index: false, follow: false }, // Mencegah duplikasi SEO pada link seleksi privat
        icons: {
            icon: vendor.brandLogo || '/favicon.ico'
        }
    };
}

export default async function StudioTenantLayout({ children, params }) {
    const rootDomain = getRootDomain();
    const slug = (params?.subdomain || '').toLowerCase();

    if (!slug) {
        notFound();
    }

    // 1. Ambil data studio vendor aktif
    const vendor = db.prepare(`
        SELECT id, name, email, brandName, brandLogo, status, whatsapp, subdomain, subdomain_active
        FROM vendors 
        WHERE LOWER(subdomain) = ? AND subdomain_active = 1
    `).get(slug);

    // 2. Jika tidak ditemukan, cek apakah ini subdomain lama yang pernah diubah (301 Redirect)
    if (!vendor) {
        try {
            const history = db.prepare(`
                SELECT newSubdomain FROM subdomain_history 
                WHERE LOWER(oldSubdomain) = ? AND (expiresAt IS NULL OR expiresAt > datetime('now'))
                ORDER BY changedAt DESC LIMIT 1
            `).get(slug);

            if (history && history.newSubdomain) {
                redirect(`https://${history.newSubdomain}.${rootDomain}`);
            }
        } catch (e) {
            // Abaikan error redirect jika DB history belum terisi
        }

        // Tampilkan halaman 404 Studio Tidak Ditemukan
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#09090b',
                color: '#f4f4f5',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                padding: '20px',
                textAlign: 'center'
            }}>
                <div style={{
                    maxWidth: '480px',
                    background: '#18181b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px',
                    padding: '36px 24px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏢</div>
                    <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px 0', color: '#ffffff' }}>
                        Studio Belum Terdaftar
                    </h1>
                    <p style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: 1.6, margin: '0 0 24px 0' }}>
                        Alamat subdomain <strong style={{ color: '#fbbf24' }}>{slug}.{rootDomain}</strong> tidak ditemukan atau belum diaktifkan.
                    </p>
                    <a
                        href={`https://${rootDomain}`}
                        style={{
                            display: 'inline-block',
                            background: 'linear-gradient(135deg, #c5a059, #996515)',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '13px',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            textDecoration: 'none'
                        }}
                    >
                        Kembali ke Beranda Utama &rarr;
                    </a>
                </div>
            </div>
        );
    }

    const displayName = vendor.brandName || vendor.name || 'Studio Gallery';

    return (
        <div 
            className="studio-tenant-root"
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                background: '#09090b',
                color: '#f4f4f5',
                fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
        >
            {/* Studio Branded Top Header */}
            <header style={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                backdropFilter: 'blur(12px)',
                background: 'rgba(9, 9, 11, 0.85)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '12px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {vendor.brandLogo ? (
                        <img 
                            src={vendor.brandLogo} 
                            alt={displayName} 
                            style={{ height: '32px', maxWidth: '120px', objectFit: 'contain', borderRadius: '4px' }} 
                        />
                    ) : (
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #c5a059, #996515)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '14px',
                            color: '#ffffff'
                        }}>
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.2px' }}>
                            {displayName}
                        </div>
                        <div style={{ fontSize: '11px', color: '#a1a1aa' }}>
                            Official Client Gallery
                        </div>
                    </div>
                </div>

                {vendor.whatsapp && (
                    <a
                        href={`https://wa.me/${vendor.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            color: '#34d399',
                            background: 'rgba(52, 211, 153, 0.1)',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            textDecoration: 'none',
                            fontWeight: 600,
                            border: '1px solid rgba(52, 211, 153, 0.2)'
                        }}
                    >
                        💬 Hubungi Studio
                    </a>
                )}
            </header>

            {/* Main Content Area */}
            <main style={{ flex: 1 }}>
                {children}
            </main>

            {/* Studio Branded Minimal Footer */}
            <footer style={{
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                padding: '20px 24px',
                textAlign: 'center',
                fontSize: '12px',
                color: '#71717a',
                background: '#09090b'
            }}>
                <div>&copy; {new Date().getFullYear()} {displayName}. All rights reserved.</div>
                <div style={{ fontSize: '11px', color: '#52525b', marginTop: '4px' }}>
                    Powered by <span style={{ color: '#c5a059', fontWeight: 700 }}>Pick Your Photo</span>
                </div>
            </footer>
        </div>
    );
}
