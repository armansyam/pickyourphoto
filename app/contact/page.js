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
            background: 'radial-gradient(90% 50% at 50% 0%, rgba(99,102,241,0.12), transparent 60%), #0B0918',
            color: '#EAE8F7',
            fontFamily: '"Inter", -apple-system, sans-serif',
            padding: '48px 20px 80px',
            lineHeight: '1.75'
        }}>
            <div style={{
                maxWidth: '860px',
                margin: '0 auto',
                background: 'linear-gradient(165deg, rgba(19,16,36,0.95), rgba(11,9,24,0.98))',
                border: '1px solid rgba(129,140,248,0.18)',
                borderRadius: '16px',
                padding: '48px 40px',
                boxShadow: '0 24px 64px rgba(0,0,0,0.5)'
            }}>
                {/* Top Nav */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <Link href="/" style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#818CF8',
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontWeight: '600',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: 'rgba(99,102,241,0.08)',
                        border: '1px solid rgba(99,102,241,0.2)',
                        transition: 'all 0.2s ease'
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        Kembali ke Beranda
                    </Link>

                    <span style={{
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        color: '#818CF8',
                        background: 'rgba(129,140,248,0.12)',
                        padding: '4px 10px',
                        borderRadius: '6px'
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
                        color: '#FFFFFF',
                        letterSpacing: '-0.02em',
                        lineHeight: '1.2',
                        marginBottom: '12px'
                    }}>
                        Hubungi Kami
                    </h1>
                    <p style={{ fontSize: '16px', color: '#9791B8', maxWidth: '680px' }}>
                        Tim dukungan {settings.saasName} siap membantu menjawab pertanyaan seputar paket berlangganan, kendala teknis, dan verifikasi pembayaran.
                    </p>
                </div>

                <div style={{ height: '1px', background: 'rgba(129,140,248,0.16)', margin: '28px 0 36px' }}></div>

                {/* Main Contact Card */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '36px' }}>
                    
                    {/* Card 1: Email Resmi */}
                    <div style={{
                        background: 'rgba(99,102,241,0.06)',
                        border: '1.5px solid rgba(99,102,241,0.25)',
                        borderRadius: '14px',
                        padding: '28px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '18px'
                    }}>
                        <div style={{
                            padding: '12px',
                            borderRadius: '12px',
                            background: 'rgba(99,102,241,0.15)',
                            color: '#818CF8',
                            flexShrink: 0
                        }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                        </div>
                        <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#A5B4FC' }}>
                                SALURAN RESMI DUKUNGAN PENGGUNA
                            </span>
                            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#FFFFFF', margin: '4px 0 8px 0' }}>
                                Email Dukungan &amp; Layanan Pelanggan
                            </h2>
                            <p style={{ color: '#D8D5EE', fontSize: '14.5px', margin: '0 0 14px 0' }}>
                                Seluruh korespondensi, permohonan refund, pelaporan bug teknis, atau permintaan faktur resmi dilayani melalui alamat email resmi kami di bawah ini:
                            </p>
                            <a
                                href={`mailto:${settings.email}`}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                    color: '#FFFFFF',
                                    textDecoration: 'none',
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    fontWeight: '700',
                                    fontSize: '15px',
                                    boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
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
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(129,140,248,0.12)',
                        borderRadius: '12px',
                        padding: '22px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                            <div style={{ color: '#34D399' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                            </div>
                            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>
                                Jam Operasional Respon
                            </h3>
                        </div>
                        <p style={{ color: '#D8D5EE', fontSize: '13.5px', margin: '0 0 6px 0' }}>
                            <strong>Senin – Sabtu:</strong> 08:00 – 17:00 WIB
                        </p>
                        <p style={{ color: '#9791B8', fontSize: '12.5px', margin: 0 }}>
                            Tiket email masuk di luar jam kerja akan direspon pada hari kerja berikutnya maksimal dalam 1x24 jam.
                        </p>
                    </div>

                    {/* Keamanan & Penipuan */}
                    <div style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(129,140,248,0.12)',
                        borderRadius: '12px',
                        padding: '22px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                            <div style={{ color: '#FBBF24' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                </svg>
                            </div>
                            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>
                                Keamanan &amp; Verifikasi
                            </h3>
                        </div>
                        <p style={{ color: '#D8D5EE', fontSize: '13.5px', margin: 0 }}>
                            {settings.saasName} tidak pernah meminta password akun Google Anda. Seluruh transaksi pembayaran hanya diproses melalui sistem resmi yang terhubung ke Payment Gateway berizin Bank Indonesia.
                        </p>
                    </div>

                </div>

                {/* Footer Navigation */}
                <div style={{ borderTop: '1px solid rgba(129,140,248,0.16)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '18px', fontSize: '13px' }}>
                        <Link href="/about" style={{ color: '#818CF8', textDecoration: 'none' }}>Tentang Kami</Link>
                        <Link href="/privacy" style={{ color: '#818CF8', textDecoration: 'none' }}>Kebijakan Privasi</Link>
                        <Link href="/terms" style={{ color: '#818CF8', textDecoration: 'none' }}>Syarat & Ketentuan</Link>
                        <Link href="/refund" style={{ color: '#818CF8', textDecoration: 'none' }}>Kebijakan Refund</Link>
                    </div>
                    <div style={{ color: '#9791B8', fontSize: '12px' }}>
                        &copy; 2026 {settings.saasName}. All rights reserved.
                    </div>
                </div>
            </div>
        </div>
    );
}
