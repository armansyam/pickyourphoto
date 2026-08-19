import Link from 'next/link';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Kebijakan Privasi (Privacy Policy) — Pick Your Photo',
    description: 'Kebijakan Privasi dan Perlindungan Data Pengguna Platform Pick Your Photo.'
};

function getSettings() {
    try {
        const rows = db.prepare("SELECT key, value FROM saas_settings WHERE key IN ('contact_email', 'saas_support_email', 'saas_name')").all() || [];
        const map = {};
        rows.forEach(r => { map[r.key] = r.value; });
        const email = map.saas_support_email || map.contact_email || process.env.ADMIN_EMAIL || 'support@pickyourphoto.id';
        const saasName = map.saas_name || 'Pick Your Photo';
        return { email, saasName };
    } catch (e) {
        return { email: process.env.ADMIN_EMAIL || 'support@pickyourphoto.id', saasName: 'Pick Your Photo' };
    }
}

export default function PrivacyPage() {
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
                        PRIVACY &amp; SECURITY
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
                        Kebijakan Privasi (Privacy Policy)
                    </h1>
                    <p style={{ fontSize: '14px', color: '#78716C' }}>
                        Terakhir diperbarui: 18 Agustus 2026 &bull; {settings.saasName}
                    </p>
                </div>

                <div style={{ height: '1px', background: 'rgba(197, 160, 89, 0.2)', margin: '28px 0 36px' }}></div>

                <section style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(197, 160, 89, 0.15)', color: '#8C6D23' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M12 16v-4"></path>
                                <path d="M12 8h.01"></path>
                            </svg>
                        </div>
                        <h2 style={{ fontSize: '19px', fontWeight: '700', color: '#1C1917', margin: 0, fontFamily: '"Fraunces", Georgia, serif' }}>1. Pendahuluan</h2>
                    </div>
                    <p style={{ color: '#44403C', fontSize: '15px' }}>
                        Selamat datang di <strong>{settings.saasName}</strong> ("Kami"). Kami sangat menghargai privasi dan kerahasiaan data setiap pengguna, baik fotografer, studio foto, maupun klien seleksi foto. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, mengelola, dan melindungi data pribadi Anda sesuai dengan peraturan perundang-undangan perlindungan data yang berlaku di Indonesia.
                    </p>
                </section>

                <section style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(197, 160, 89, 0.15)', color: '#8C6D23' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                                <line x1="8" y1="21" x2="16" y2="21"></line>
                                <line x1="12" y1="17" x2="12" y2="21"></line>
                            </svg>
                        </div>
                        <h2 style={{ fontSize: '19px', fontWeight: '700', color: '#1C1917', margin: 0, fontFamily: '"Fraunces", Georgia, serif' }}>2. Data yang Kami Kumpulkan</h2>
                    </div>
                    <p style={{ color: '#44403C', fontSize: '15px', marginBottom: '10px' }}>
                        Ketika Anda mendaftar atau menggunakan layanan kami, data yang dikumpulkan terbatas pada kebutuhan operasional sistem:
                    </p>
                    <ul style={{ paddingLeft: '20px', color: '#44403C', fontSize: '15px' }}>
                        <li style={{ marginBottom: '8px' }}><strong>Identitas Akun:</strong> Nama vendor/studio, alamat email aktif, dan nomor kontak yang Anda cantumkan saat pendaftaran.</li>
                        <li style={{ marginBottom: '8px' }}><strong>Data Otentikasi Google:</strong> Alamat email dan nama profil publik yang diperoleh melalui Google Sign-In secara aman.</li>
                        <li style={{ marginBottom: '8px' }}><strong>Data Transaksi:</strong> Riwayat order ID, nominal transaksi, tanggal pembayaran, dan status invoice resmi. Kami <strong>tidak pernah menyimpan data sensitif seperti nomor kartu atau PIN perbankan Anda</strong>.</li>
                    </ul>
                </section>

                <section style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(197, 160, 89, 0.15)', color: '#8C6D23' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                            </svg>
                        </div>
                        <h2 style={{ fontSize: '19px', fontWeight: '700', color: '#1C1917', margin: 0, fontFamily: '"Fraunces", Georgia, serif' }}>3. Kepatuhan Kebijakan Pengguna Google (Google OAuth)</h2>
                    </div>
                    <p style={{ color: '#44403C', fontSize: '15px', marginBottom: '10px' }}>
                        Penggunaan dan transfer informasi yang diterima dari Google APIs ke aplikasi lain mematuhi <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style={{ color: '#8C6D23', textDecoration: 'underline', fontWeight: '600' }}>Google API Services User Data Policy</a>, termasuk persyaratan <strong>Limited Use</strong>.
                    </p>
                    <p style={{ color: '#44403C', fontSize: '15px' }}>
                        Kami <strong>TIDAK PERNAH</strong> menjual atau membagikan data identitas pribadi maupun data galeri foto Anda kepada pihak pengiklan atau pihak ketiga yang tidak berwenang.
                    </p>
                </section>

                <section style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(197, 160, 89, 0.15)', color: '#8C6D23' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="16 18 22 12 16 6"></polyline>
                                <polyline points="8 6 2 12 8 18"></polyline>
                            </svg>
                        </div>
                        <h2 style={{ fontSize: '19px', fontWeight: '700', color: '#1C1917', margin: 0, fontFamily: '"Fraunces", Georgia, serif' }}>4. Hak Cipta &amp; Keamanan Foto</h2>
                    </div>
                    <p style={{ color: '#44403C', fontSize: '15px' }}>
                        Seluruh hak cipta karya foto tetap 100% menjadi milik fotografer dan klien Anda. Sistem kami hanya bertindak sebagai media penampil (viewer) seleksi foto sementara. Seluruh komunikasi data dilindungi oleh enkripsi TLS/HTTPS modern.
                    </p>
                </section>

                <section style={{ background: '#FFFDF9', border: '1.5px solid rgba(197, 160, 89, 0.35)', borderRadius: '16px', padding: '24px', marginBottom: '32px', boxShadow: '0 6px 20px rgba(197, 160, 89, 0.06)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#8C6D23', marginBottom: '8px', fontFamily: '"Fraunces", Georgia, serif' }}>
                        Hubungi Tim Privasi Kami
                    </h3>
                    <p style={{ color: '#44403C', fontSize: '14px', margin: '0 0 10px 0' }}>
                        Apabila Anda memiliki pertanyaan mengenai Kebijakan Privasi ini atau ingin mengajukan permohonan penghapusan data akun, silakan hubungi kami di:
                    </p>
                    <a href={`mailto:${settings.email}`} style={{ color: '#8C6D23', textDecoration: 'none', fontWeight: '700', fontSize: '14.5px' }}>
                        {settings.email}
                    </a>
                </section>

                {/* Footer Navigation */}
                <div style={{ borderTop: '1px solid rgba(197, 160, 89, 0.2)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '18px', fontSize: '13px' }}>
                        <Link href="/about" style={{ color: '#8C6D23', textDecoration: 'none', fontWeight: '600' }}>Tentang Kami</Link>
                        <Link href="/terms" style={{ color: '#8C6D23', textDecoration: 'none', fontWeight: '600' }}>Syarat & Ketentuan</Link>
                        <Link href="/refund" style={{ color: '#8C6D23', textDecoration: 'none', fontWeight: '600' }}>Kebijakan Refund</Link>
                        <Link href="/contact" style={{ color: '#8C6D23', textDecoration: 'none', fontWeight: '600' }}>Hubungi Kami</Link>
                    </div>
                    <div style={{ color: '#78716C', fontSize: '12px' }}>
                        &copy; 2026 {settings.saasName}. All rights reserved.
                    </div>
                </div>
            </div>
        </div>
    );
}
