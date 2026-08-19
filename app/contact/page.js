import Link from 'next/link';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Hubungi Kami — Pick Your Photo',
    description: 'Layanan bantuan, kontak resmi, dan saluran dukungan teknis Pick Your Photo.'
};

function getSettings() {
    try {
        const rows = db.prepare("SELECT key, value FROM saas_settings WHERE key IN ('contact_email', 'saas_support_email', 'contact_whatsapp', 'saas_name', 'company_address', 'operational_hours')").all() || [];
        const map = {};
        rows.forEach(r => { map[r.key] = r.value; });
        const email = map.saas_support_email || map.contact_email || process.env.ADMIN_EMAIL || 'support@pickyourphoto.id';
        const whatsapp = map.contact_whatsapp || '';
        const saasName = map.saas_name || 'Pick Your Photo';
        const companyAddress = map.company_address || '';
        const operationalHours = map.operational_hours || 'Senin – Sabtu: 08:00 – 17:00 WIB';
        return { email, whatsapp, saasName, companyAddress, operationalHours, ...map };
    } catch (e) {
        return { 
            email: process.env.ADMIN_EMAIL || 'support@pickyourphoto.id', 
            whatsapp: '',
            saasName: 'Pick Your Photo',
            companyAddress: '',
            operationalHours: 'Senin – Sabtu: 08:00 – 17:00 WIB'
        };
    }
}

export default function ContactPage() {
    const settings = getSettings();

    // Resolve domain name dynamically
    let domainName = 'photota.my.id';
    try {
        if (process.env.NEXT_PUBLIC_APP_URL) {
            domainName = new URL(process.env.NEXT_PUBLIC_APP_URL).hostname.replace('www.', '');
        }
    } catch (_) {}

    // Format WhatsApp Link
    let cleanWaPhone = (settings.whatsapp || '').replace(/[^0-9]/g, '');
    if (cleanWaPhone.startsWith('0')) {
        cleanWaPhone = '62' + cleanWaPhone.slice(1);
    }
    const waText = encodeURIComponent(`Halo Tim Support ${domainName}, saya butuh bantuan terkait galeri foto.`);
    const waUrl = cleanWaPhone ? `https://api.whatsapp.com/send?phone=${cleanWaPhone}&text=${waText}` : null;

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
                        PUSAT BANTUAN RESMI
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
                        Tim Customer Service &amp; Technical Support {settings.saasName} siap membantu menjawab pertanyaan seputar paket berlangganan, kendala teknis, dan verifikasi pembayaran.
                    </p>
                </div>

                <div style={{ height: '1px', background: 'rgba(197, 160, 89, 0.2)', margin: '28px 0 36px' }}></div>

                {/* Main Contact Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '36px' }}>
                    
                    {/* Card 1: Email Resmi */}
                    <div style={{
                        background: '#FFFDF9',
                        border: '1.5px solid rgba(197, 160, 89, 0.35)',
                        borderRadius: '16px',
                        padding: '28px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 6px 20px rgba(197, 160, 89, 0.06)'
                    }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                                <div style={{
                                    padding: '10px',
                                    borderRadius: '10px',
                                    background: 'rgba(197, 160, 89, 0.18)',
                                    border: '1px solid rgba(197, 160, 89, 0.4)',
                                    color: '#8C6D23',
                                    flexShrink: 0
                                }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                        <polyline points="22,6 12,13 2,6"></polyline>
                                    </svg>
                                </div>
                                <div>
                                    <span style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#8C6D23', fontFamily: '"JetBrains Mono", monospace' }}>
                                        SALURAN RESMI
                                    </span>
                                    <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#1C1917', margin: 0, fontFamily: '"Fraunces", Georgia, serif' }}>
                                        Email Dukungan
                                    </h2>
                                </div>
                            </div>
                            <p style={{ color: '#44403C', fontSize: '13.5px', margin: '0 0 20px 0', lineHeight: '1.6' }}>
                                Untuk permohonan faktur resmi, administrasi, kemitraan, atau pertanyaan umum seputar langganan.
                            </p>
                        </div>
                        <a
                            href={`mailto:${settings.email}`}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                background: 'linear-gradient(135deg, #C5A059, #996515)',
                                color: '#FFFFFF',
                                textDecoration: 'none',
                                padding: '12px 18px',
                                borderRadius: '10px',
                                fontWeight: '700',
                                fontSize: '14px',
                                boxShadow: '0 4px 14px rgba(197, 160, 89, 0.25)',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                            {settings.email}
                        </a>
                    </div>

                    {/* Card 2: WhatsApp CS Resmi */}
                    <div style={{
                        background: '#FFFDF9',
                        border: '1.5px solid rgba(34, 197, 94, 0.35)',
                        borderRadius: '16px',
                        padding: '28px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 6px 20px rgba(34, 197, 94, 0.06)'
                    }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                                <div style={{
                                    padding: '10px',
                                    borderRadius: '10px',
                                    background: 'rgba(34, 197, 94, 0.15)',
                                    border: '1px solid rgba(34, 197, 94, 0.4)',
                                    color: '#16a34a',
                                    flexShrink: 0
                                }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                                    </svg>
                                </div>
                                <div>
                                    <span style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#16a34a', fontFamily: '"JetBrains Mono", monospace' }}>
                                        RESPON CEPAT
                                    </span>
                                    <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#1C1917', margin: 0, fontFamily: '"Fraunces", Georgia, serif' }}>
                                        WhatsApp Customer Service
                                    </h2>
                                </div>
                            </div>
                            <p style={{ color: '#44403C', fontSize: '13.5px', margin: '0 0 20px 0', lineHeight: '1.6' }}>
                                Konsultasi langsung dengan tim admin untuk panduan setup Google Drive, aktivasi akun, dan konfirmasi transfer instan.
                            </p>
                        </div>
                        {waUrl ? (
                            <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    background: 'linear-gradient(135deg, #16a34a, #15803d)',
                                    color: '#FFFFFF',
                                    textDecoration: 'none',
                                    padding: '12px 18px',
                                    borderRadius: '10px',
                                    fontWeight: '700',
                                    fontSize: '14px',
                                    boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.074-2.193-.544-1.637-.678-2.614-2.355-2.697-2.464-.082-.11-1.39-1.85-1.39-3.526 0-1.677.87-2.497 1.187-2.839.29-.313.633-.391.844-.391.21 0 .421.002.605.011.194.009.453-.073.709.542.263.633.896 2.186.974 2.345.078.158.131.344.026.554-.105.21-.157.34-.31.521-.153.181-.321.405-.459.543-.153.153-.313.32-.134.628.179.308.795 1.312 1.706 2.124 1.173 1.045 2.161 1.368 2.469 1.521.308.153.489.134.67-.076.181-.21.776-.904.983-1.213.207-.31.414-.258.69-.155.276.103 1.751.826 2.052.977.301.15.502.227.575.352.073.125.073.726-.071 1.131z"></path>
                                </svg>
                                💬 Chat WhatsApp CS ({settings.whatsapp})
                            </a>
                        ) : (
                            <div style={{
                                padding: '12px',
                                borderRadius: '10px',
                                background: 'rgba(0,0,0,0.04)',
                                color: '#78716C',
                                fontSize: '13px',
                                textAlign: 'center',
                                fontWeight: '600'
                            }}>
                                📱 Kontak WhatsApp dapat diatur melalui Admin Dashboard
                            </div>
                        )}
                    </div>

                </div>

                {/* Additional Information Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '36px' }}>
                    
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
                            <strong>{settings.operationalHours}</strong>
                        </p>
                        <p style={{ color: '#78716C', fontSize: '12.5px', margin: 0 }}>
                            Tiket dan pesan di luar jam kerja akan direspon pada hari kerja berikutnya maksimal dalam 1x24 jam.
                        </p>
                    </div>

                    {/* Alamat & Domisili Legal */}
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
                                Keamanan &amp; Alamat Resmi
                            </h3>
                        </div>
                        {settings.companyAddress ? (
                            <p style={{ color: '#292524', fontSize: '13px', margin: '0 0 6px 0', fontWeight: '600' }}>
                                📍 {settings.companyAddress}
                            </p>
                        ) : null}
                        <p style={{ color: '#44403C', fontSize: '12.5px', margin: 0 }}>
                            {settings.saasName} tidak pernah meminta password akun Google Anda. Seluruh transaksi diproses via Payment Gateway resmi.
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
