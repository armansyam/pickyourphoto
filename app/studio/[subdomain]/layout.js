import { notFound, redirect } from 'next/navigation';
import db from '@/lib/db';
import { getRootDomain } from '@/lib/subdomain';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
    const rootDomain = getRootDomain();
    const resolvedParams = await params;
    const rawSlug = (resolvedParams?.subdomain || params?.subdomain || '').toLowerCase().trim();
    const slug = rawSlug.replace(/[^a-z0-9-]/g, '');
    
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

    const displayName = vendor.brandName || vendor.name || 'Studio';
    const logoUrl = vendor.brandLogo || '/favicon.ico';
    const title = `${displayName} — Official Profile`;
    const description = `Official profile dan portofolio resmi ${displayName}.`;

    return {
        title,
        description,
        robots: { index: false, follow: false },
        icons: {
            icon: logoUrl,
            shortcut: logoUrl,
            apple: logoUrl
        },
        openGraph: {
            title,
            description,
            type: 'website',
            siteName: displayName,
            images: [
                {
                    url: logoUrl,
                    alt: displayName,
                }
            ]
        },
        twitter: {
            card: 'summary',
            title,
            description,
            images: [logoUrl]
        }
    };
}

export default async function StudioTenantLayout({ children, params }) {
    const rootDomain = getRootDomain();
    const resolvedParams = await params;
    const rawSlug = (resolvedParams?.subdomain || params?.subdomain || '').toLowerCase().trim();
    const slug = rawSlug.replace(/[^a-z0-9-]/g, '');

    if (!slug) {
        notFound();
    }

    // 1. Ambil data studio vendor aktif & identitas platform dinamis
    const saasNameRow = db.prepare("SELECT value FROM saas_settings WHERE key = 'saas_name'").get();
    const platformName = saasNameRow?.value || 'Photota';

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
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', marginBottom: '16px', color: '#ef4444' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                    </div>
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
                        Kembali ke Beranda Utama
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
                background: '#fafaf9',
                color: '#0f172a',
                fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
        >
            {/* Studio Branded Top Header */}
            <header style={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                backdropFilter: 'blur(16px)',
                background: 'rgba(255, 255, 255, 0.85)',
                borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                padding: '12px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {vendor.brandLogo ? (
                        <img 
                            src={vendor.brandLogo} 
                            alt={displayName} 
                            style={{ height: '32px', maxWidth: '140px', objectFit: 'contain' }} 
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
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span>{displayName}</span>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, display: 'inline-block' }} title="Verified Official">
                                <path d="M10.52 2.4a2.2 2.2 0 0 1 2.96 0l.85.77c.4.37.93.58 1.47.6l1.15.04a2.2 2.2 0 0 1 2.1 2.1l.04 1.15c.02.54.23 1.07.6 1.47l.77.85a2.2 2.2 0 0 1 0 2.96l-.77.85c-.37.4-.58.93-.6 1.47l-.04 1.15a2.2 2.2 0 0 1-2.1 2.1l-1.15.04c-.54.02-1.07.23-1.47.6l-.85.77a2.2 2.2 0 0 1-2.96 0l-.85-.77c-.4-.37-.93-.58-1.47-.6l-1.15-.04a2.2 2.2 0 0 1-2.1-2.1l-.04-1.15c-.02-.54-.23-1.07-.6-1.47l-.77-.85a2.2 2.2 0 0 1 0-2.96l.77-.85c.37-.4.58-.93.6-1.47l.04-1.15a2.2 2.2 0 0 1 2.1-2.1l1.15-.04c.54-.02 1.07-.23 1.47-.6l.85-.77z" fill="#0095f6"/>
                                <path d="M9 12l2 2 4-4" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                            Official Profil
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
                            gap: '7px',
                            fontSize: '12px',
                            color: '#059669',
                            background: 'rgba(16, 185, 129, 0.08)',
                            padding: '6px 14px',
                            borderRadius: '20px',
                            textDecoration: 'none',
                            fontWeight: 600,
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                        </svg>
                        <span>WhatsApp Studio</span>
                    </a>
                )}
            </header>

            {/* Main Content Area */}
            <main style={{ flex: 1 }}>
                {children}
            </main>

            {/* Studio Branded Minimal Footer */}
            <footer style={{
                borderTop: '1px solid rgba(0, 0, 0, 0.06)',
                padding: '20px 24px',
                textAlign: 'center',
                fontSize: '12px',
                color: '#64748b',
                background: '#ffffff'
            }}>
                <div>&copy; {new Date().getFullYear()} {displayName}. All rights reserved.</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                    Powered by <span style={{ color: '#c5a059', fontWeight: 700 }}>{platformName}</span>
                </div>
            </footer>
        </div>
    );
}
