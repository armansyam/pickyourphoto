import Link from 'next/link';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Hubungi Kami — Pick Your Photo',
    description: 'Layanan bantuan, kontak resmi, dan saluran dukungan teknis Pick Your Photo.'
};

function getSettings() {
    try {
        const rows = db.prepare("SELECT key, value FROM saas_settings WHERE key IN ('contact_email', 'saas_support_email', 'saas_name', 'company_address', 'operational_hours')").all() || [];
        const map = {};
        rows.forEach(r => { map[r.key] = r.value; });
        const email = map.saas_support_email || map.contact_email || process.env.ADMIN_EMAIL || 'support@pickyourphoto.id';
        const saasName = map.saas_name || 'Pick Your Photo';
        return { email, saasName, ...map };
    } catch (e) {
        return { email: process.env.ADMIN_EMAIL || 'support@pickyourphoto.id', saasName: 'Pick Your Photo' };
    }
}

export default function ContactPage() {
    const settings = getSettings();

    return (
        <div style={{
            minHeight: '100vh',
            background: '#FBF9F4',
            color: '#292524',
            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
            padding: '48px 20px 80px',
            lineHeight: '1.75'
        }}>
            <div style={{
                maxWidth: '860px',
                margin: '0 auto',
                background: '#FFFFFF',
                border: '1.5px solid rgba(197, 160, 89, 0.35)',
                borderRadius: '20px',
                padding: '48px 40px',
                boxShadow: '0 14px 40px rgba(197, 160, 89, 0.08)'
            }}>
                {/* Top Nav */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <Link href="/" style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#8C6D23',
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontWeight: '600',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        background: 'rgba(197, 160, 89, 0.1)',
                        border: '1px solid rgba(197, 160, 89, 0.3)',
                        transition: 'all 0.2s ease'
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        Kembali ke Beranda
                    </Link>

                    <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        fontFamily: '"JetBrains Mono", monospace',
                        color: '#8C6D23',
                        background: 'rgba(197, 160, 89, 0.15)',
                        border: '1px solid rgba(197, 160, 89, 0.4)',
                        padding: '4px 12px',
                        borderRadius: '12px'
                    }}>
                        PUSAT BANTUAN
                    </span>
                </div>

                {/* Header */}
                <div style={{ marginBottom: '36px' }}>
                    <h1 style={{
                        fontSize: '34px',
                        fontFamily: '"Fraunces", Georgia, serif',
                        fontWeight: '700',
                        color: '#1C1917',
                        letterSpacing: '-0.02em',
                        lineHeight: '1.2',
                        marginBottom: '12px'
                    }}>
                        Hubungi Kami
                    </h1>
                    <p style={{ fontSize: '15px', color: '#78716C', maxWidth: '680px' }}>
                        Tim dukungan {settings.saasName} siap membantu menjawab pertanyaan seputar paket berlangganan, kendala teknis, dan verifikasi pembayaran.
                    </p>
                </div>

                <div style={{ height: '1px', background: 'rgba(197, 160, 89, 0.2)', margin: '28px 0 36px' }}></div>

                {/* Main Contact Card */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '36px' }}>
                    
                    {/* Card 1: Email Resmi */}
                    <div style={{
                        background: '#FFFDF9',
                        border: '1.5px solid rgba(197, 160, 89, 0.35)',
                        borderRadius: '16px',
                        padding: '28px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '18px',
                        boxShadow: '0 6px 20px rgba(197, 160, 89, 0.06)'
                    }}>
                        <div style={{
                            padding: '12px',
                            borderRadius: '12px',
                            background: 'rgba(197, 160, 89, 0.18)',
                            border: '1px solid rgba(197, 160, 89, 0.4)',
                            color: '#8C6D23',
                            flexShrink: 0
                        }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                        </div>
                        <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#8C6D23', fontFamily: '"JetBrains Mono", monospace' }}>
                                SALURAN RESMI DUKUNGAN PENGGUNA
                            </span>
                            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1C1917', margin: '4px 0 8px 0', fontFamily: '"Fraunces", Georgia, serif' }}>
                                Email Dukungan &amp; Layanan Pelanggan
                            </h2>
                            <p style={{ color: '#44403C', fontSize: '14.5px', margin: '0 0 14px 0' }}>
                                Seluruh korespondensi, permohonan refund, pelaporan bug teknis, atau permintaan faktur resmi dilayani melalui alamat email resmi kami di bawah ini:
                            </p>
                            <a
                                href={`mailto:${settings.email}`}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: 'linear-gradient(135deg, #C5A059, #996515)',
                                    color: '#FFFFFF',
                                    textDecoration: 'none',
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    fontWeight: '700',
                                    fontSize: '15px',
                                    boxShadow: '0 4px 14px rgba(197, 160, 89, 0.25)',
                                    transition: 'transform 0.15s ease'
                                }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                                {settings.email}
                            </a>
                        </div>
                    </div>

                </div>

                {/* Additional Information Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '36px' }}>
                    
                    {/* Jam Operasional */}
                    <div style={{
                        background: '#FAF8F5',
                        border: '1px solid rgba(197, 160, 89, 0.25)',
                        borderRadius: '12px',
                        padding: '22px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                            <div style={{ color: '#15803D' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                            </div>
                            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1C1917', margin: 0 }}>
                                Jam Operasional Respon
                            </h3>
                        </div>
                        <p style={{ color: '#292524', fontSize: '13.5px', margin: '0 0 6px 0' }}>
                            <strong>Senin – Sabtu:</strong> 08:00 – 17:00 WIB
                        </p>
                        <p style={{ color: '#78716C', fontSize: '12.5px', margin: 0 }}>
                            Tiket email masuk di luar jam kerja akan direspon pada hari kerja berikutnya maksimal dalam 1x24 jam.
                        </p>
                    </div>

                    {/* Keamanan & Penipuan */}
                    <div style={{
                        background: '#FAF8F5',
                        border: '1px solid rgba(197, 160, 89, 0.25)',
                        borderRadius: '12px',
                        padding: '22px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                            <div style={{ color: '#8C6D23' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                </svg>
                            </div>
                            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1C1917', margin: 0 }}>
                                Keamanan &amp; Verifikasi
                            </h3>
                        </div>
                        <p style={{ color: '#44403C', fontSize: '13.5px', margin: 0 }}>
                            {settings.saasName} tidak pernah meminta password akun Google Anda. Seluruh transaksi pembayaran hanya diproses melalui sistem resmi yang terhubung ke Payment Gateway berizin Bank Indonesia.
                        </p>
                    </div>

                </div>

                {/* Footer Navigation */}
                <div style={{ borderTop: '1px solid rgba(197, 160, 89, 0.2)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '18px', fontSize: '13px' }}>
                        <Link href="/about" style={{ color: '#8C6D23', textDecoration: 'none', fontWeight: '600' }}>Tentang Kami</Link>
                        <Link href="/privacy" style={{ color: '#8C6D23', textDecoration: 'none', fontWeight: '600' }}>Kebijakan Privasi</Link>
                        <Link href="/terms" style={{ color: '#8C6D23', textDecoration: 'none', fontWeight: '600' }}>Syarat & Ketentuan</Link>
                        <Link href="/refund" style={{ color: '#8C6D23', textDecoration: 'none', fontWeight: '600' }}>Kebijakan Refund</Link>
                    </div>
                    <div style={{ color: '#78716C', fontSize: '12px' }}>
                        &copy; 2026 {settings.saasName}. All rights reserved.
                    </div>
                </div>
            </div>
        </div>
    );
}
