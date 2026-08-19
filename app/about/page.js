import Link from 'next/link';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Tentang Kami — Pick Your Photo',
    description: 'Profil platform Pick Your Photo, solusi seleksi foto digital dan alur kerja cerdas untuk fotografer dan studio profesional.'
};

function getSettings() {
    try {
        const rows = db.prepare("SELECT key, value FROM saas_settings WHERE key IN ('contact_email', 'saas_support_email', 'saas_name', 'company_name', 'company_address')").all() || [];
        const map = {};
        rows.forEach(r => { map[r.key] = r.value; });
        const email = map.saas_support_email || map.contact_email || process.env.ADMIN_EMAIL || 'support@pickyourphoto.id';
        const saasName = map.saas_name || 'Pick Your Photo';
        return { email, saasName, ...map };
    } catch (e) {
        return { email: process.env.ADMIN_EMAIL || 'support@pickyourphoto.id', saasName: 'Pick Your Photo' };
    }
}

export default function AboutPage() {
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
                        TENTANG PLATFORM
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
                        Tentang {settings.saasName}
                    </h1>
                    <p style={{ fontSize: '15px', color: '#78716C', maxWidth: '680px' }}>
                        Platform SaaS seleksi foto digital yang dirancang khusus untuk fotografer freelance, studio foto, dan agensi kreatif di Indonesia.
                    </p>
                </div>

                <div style={{ height: '1px', background: 'rgba(197, 160, 89, 0.2)', margin: '28px 0 36px' }}></div>

                {/* Section 1: Siapa Kami */}
                <section style={{ marginBottom: '36px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(197, 160, 89, 0.15)', color: '#8C6D23' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M12 16v-4"></path>
                                <path d="M12 8h.01"></path>
                            </svg>
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1C1917', margin: 0, fontFamily: '"Fraunces", Georgia, serif' }}>1. Siapa Kami</h2>
                    </div>
                    <p style={{ color: '#44403C', fontSize: '15px', marginBottom: '14px' }}>
                        <strong>{settings.saasName}</strong> adalah platform perangkat lunak berbasis langganan (<em>Software as a Service / SaaS</em>) yang berfokus menyelesaikan kendala mendasar dalam industri fotografi: <strong>proses seleksi foto klien yang memakan waktu dan rumit</strong>.
                    </p>
                    <p style={{ color: '#44403C', fontSize: '15px' }}>
                        Kami percaya bahwa waktu seorang fotografer seharusnya dihabiskan untuk memotret dan berkarya, bukan berkutat menyalin nomor file satu per satu dari grup chat atau mengelola galeri klien secara manual.
                    </p>
                </section>

                {/* Section 2: Visi & Misi */}
                <section style={{ marginBottom: '36px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(197, 160, 89, 0.15)', color: '#8C6D23' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1C1917', margin: 0, fontFamily: '"Fraunces", Georgia, serif' }}>2. Visi & Misi</h2>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
                        <div style={{ background: '#FAF8F5', border: '1px solid rgba(197, 160, 89, 0.25)', borderRadius: '12px', padding: '20px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#8C6D23', marginBottom: '8px' }}>Visi Kami</h3>
                            <p style={{ color: '#44403C', fontSize: '14px', margin: 0 }}>
                                Menjadi standar infrastruktur digital utama bagi para fotografer profesional di Indonesia dalam menyajikan hasil karya visual ke klien secara elegan dan modern.
                            </p>
                        </div>
                        <div style={{ background: '#FAF8F5', border: '1px solid rgba(197, 160, 89, 0.25)', borderRadius: '12px', padding: '20px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#15803D', marginBottom: '8px' }}>Misi Kami</h3>
                            <p style={{ color: '#44403C', fontSize: '14px', margin: 0 }}>
                                Menghadirkan teknologi otomasi alur kerja (seperti Auto-Sorter RAW) dan galeri online modern serta responsif dengan biaya terjangkau bagi semua skala studio.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Section 3: Nilai Utama & Layanan */}
                <section style={{ marginBottom: '36px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(197, 160, 89, 0.15)', color: '#8C6D23' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                            </svg>
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1C1917', margin: 0, fontFamily: '"Fraunces", Georgia, serif' }}>3. Layanan Utama</h2>
                    </div>
                    <ul style={{ paddingLeft: '20px', color: '#44403C', fontSize: '15px' }}>
                        <li style={{ marginBottom: '10px' }}>
                            <strong>Galeri Seleksi Foto Klien Interaktif:</strong> Tautan galeri estetik berkecepatan tinggi dengan fitur proteksi PIN/Watermark, filter subfolder, dan batas maksimal pemilihan foto.
                        </li>
                        <li style={{ marginBottom: '10px' }}>
                            <strong>Auto-Sorter File RAW (Lightroom-Ready):</strong> Fitur penyortiran otomatis yang memisahkan file RAW terpilih ke folder terpisah dalam hitungan detik tanpa instalasi software tambahan.
                        </li>
                        <li style={{ marginBottom: '10px' }}>
                            <strong>Dedicated Cloud Storage Add-On:</strong> Ekspansi kapasitas penyimpanan cloud berkecepatan tinggi dengan skema tagihan prorata harian yang transparan.
                        </li>
                    </ul>
                </section>

                {/* Section 4: Komitmen Privasi & Hak Cipta */}
                <section style={{ marginBottom: '36px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(197, 160, 89, 0.15)', color: '#8C6D23' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                            </svg>
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1C1917', margin: 0, fontFamily: '"Fraunces", Georgia, serif' }}>4. Komitmen Hak Cipta & Keamanan</h2>
                    </div>
                    <p style={{ color: '#44403C', fontSize: '15px' }}>
                        {settings.saasName} <strong>tidak pernah mengklaim hak kepemilikan</strong> atas foto atau karya visual yang Anda kelola melalui platform kami. Seluruh aset foto sepenuhnya adalah milik fotografer dan klien bersangkutan. Seluruh transaksi pembayaran diproses melalui saluran Payment Gateway berizin resmi Bank Indonesia.
                    </p>
                </section>

                {/* Section 5: Kontak Resmi */}
                <section style={{ background: '#FFFDF9', border: '1.5px solid rgba(197, 160, 89, 0.35)', borderRadius: '16px', padding: '24px', marginBottom: '32px', boxShadow: '0 6px 20px rgba(197, 160, 89, 0.06)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#8C6D23', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: '"Fraunces", Georgia, serif' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                        Kontak & Dukungan Resmi
                    </h3>
                    <p style={{ color: '#44403C', fontSize: '14px', margin: '0 0 10px 0' }}>
                        Untuk informasi kemitraan, pertanyaan produk, atau permohonan bantuan teknis, silakan hubungi kami di:
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
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontWeight: '700',
                            fontSize: '14px',
                            boxShadow: '0 4px 14px rgba(197, 160, 89, 0.25)'
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                        {settings.email}
                    </a>
                </section>

                {/* Footer Navigation */}
                <div style={{ borderTop: '1px solid rgba(197, 160, 89, 0.2)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '18px', fontSize: '13px' }}>
                        <Link href="/privacy" style={{ color: '#8C6D23', textDecoration: 'none', fontWeight: '600' }}>Kebijakan Privasi</Link>
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
