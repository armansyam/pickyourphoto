import db from '@/lib/db';
import { getRootDomain } from '@/lib/subdomain';

export const dynamic = 'force-dynamic';

export default function StudioLandingPage({ params }) {
    const slug = (params?.subdomain || '').toLowerCase();
    const rootDomain = getRootDomain();

    const vendor = db.prepare(`
        SELECT id, name, brandName, brandLogo, email, whatsapp 
        FROM vendors 
        WHERE LOWER(subdomain) = ? AND subdomain_active = 1
    `).get(slug);

    const displayName = vendor?.brandName || vendor?.name || 'Studio Gallery';

    return (
        <div style={{
            maxWidth: '800px',
            margin: '60px auto',
            padding: '0 24px',
            textAlign: 'center'
        }}>
            <div style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '24px',
                padding: '48px 32px',
                boxShadow: '0 24px 64px rgba(0,0,0,0.4)'
            }}>
                {vendor?.brandLogo ? (
                    <img 
                        src={vendor.brandLogo} 
                        alt={displayName} 
                        style={{ height: '72px', maxWidth: '240px', objectFit: 'contain', marginBottom: '24px' }} 
                    />
                ) : (
                    <div style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '18px',
                        background: 'linear-gradient(135deg, #c5a059, #996515)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px',
                        fontWeight: 900,
                        color: '#ffffff',
                        margin: '0 auto 24px auto',
                        boxShadow: '0 8px 24px rgba(197,160,89,0.3)'
                    }}>
                        {displayName.charAt(0).toUpperCase()}
                    </div>
                )}

                <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', margin: '0 0 12px 0' }}>
                    Selamat Datang di Portal Klien {displayName}
                </h1>
                
                <p style={{ fontSize: '15px', color: '#a1a1aa', lineHeight: 1.6, maxWidth: '540px', margin: '0 auto 32px auto' }}>
                    Portal online resmi untuk peninjauan dan seleksi foto pemotretan Anda. Silakan gunakan tautan akses khusus yang telah dikirimkan oleh tim fotografer kami.
                </p>

                <div style={{
                    display: 'inline-flex',
                    flexDirection: 'column',
                    gap: '12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '12px',
                    padding: '16px 24px',
                    fontSize: '13px',
                    color: '#71717a'
                }}>
                    <div>🔒 Akses galeri bersifat privat dan dilindungi kunci enkripsi khusus per klien.</div>
                    {vendor?.whatsapp && (
                        <div>
                            Butuh bantuan akses?{' '}
                            <a 
                                href={`https://wa.me/${vendor.whatsapp.replace(/\D/g, '')}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ color: '#34d399', fontWeight: 700, textDecoration: 'none' }}
                            >
                                Chat WhatsApp Studio &rarr;
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
