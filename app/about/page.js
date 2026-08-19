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
                        color: '#A5B4FC',
                        background: 'rgba(129,140,248,0.12)',
                        padding: '4px 10px',
                        borderRadius: '6px'
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
                        color: '#FFFFFF',
                        letterSpacing: '-0.02em',
                        lineHeight: '1.2',
                        marginBottom: '12px'
                    }}>
                        Tentang {settings.saasName}
                    </h1>
                    <p style={{ fontSize: '16px', color: '#9791B8', maxWidth: '680px' }}>
                        Platform SaaS seleksi foto digital yang dirancang khusus untuk fotografer freelance, studio foto, dan agensi kreatif di Indonesia.
                    </p>
                </div>

                <div style={{ height: '1px', background: 'rgba(129,140,248,0.16)', margin: '28px 0 36px' }}></div>

                {/* Section 1: Siapa Kami */}
                <section style={{ marginBottom: '36px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M12 16v-4"></path>
                                <path d="M12 8h.01"></path>
                            </svg>
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>1. Siapa Kami</h2>
                    </div>
                    <p style={{ color: '#D8D5EE', fontSize: '15px', marginBottom: '14px' }}>
                        <strong>{settings.saasName}</strong> adalah platform perangkat lunak berbasis langganan (<em>Software as a Service / SaaS</em>) yang berfokus menyelesaikan kendala mendasar dalam industri fotografi: <strong>proses seleksi foto klien yang memakan waktu dan rumit</strong>.
                    </p>
                    <p style={{ color: '#D8D5EE', fontSize: '15px' }}>
                        Kami percaya bahwa waktu seorang fotografer seharusnya dihabiskan untuk memotret dan berkarya, bukan berkutat menyalin nomor file satu per satu dari grup chat atau mengelola galeri klien secara manual.
                    </p>
                </section>

                {/* Section 2: Visi & Misi */}
                <section style={{ marginBottom: '36px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>2. Visi & Misi</h2>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(129,140,248,0.12)', borderRadius: '12px', padding: '20px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#818CF8', marginBottom: '8px' }}>🎯 Visi Kami</h3>
                            <p style={{ color: '#D8D5EE', fontSize: '14px', margin: 0 }}>
                                Menjadi standar infrastruktur digital utama bagi para fotografer profesional di Indonesia dalam menyajikan hasil karya visual ke klien secara elegan dan modern.
                            </p>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(129,140,248,0.12)', borderRadius: '12px', padding: '20px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#34D399', marginBottom: '8px' }}>🚀 Misi Kami</h3>
                            <p style={{ color: '#D8D5EE', fontSize: '14px', margin: 0 }}>
                                Menghadirkan teknologi otomasi alur kerja (seperti Auto-Sorter RAW) dan galeri online berkecepatan tinggi dengan biaya terjangkau bagi semua skala studio.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Section 3: Nilai Utama & Layanan */}
                <section style={{ marginBottom: '36px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                            </svg>
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>3. Layanan Utama</h2>
                    </div>
                    <ul style={{ paddingLeft: '20px', color: '#D8D5EE', fontSize: '15px' }}>
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
                        <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                            </svg>
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>4. Komitmen Hak Cipta & Keamanan</h2>
                    </div>
                    <p style={{ color: '#D8D5EE', fontSize: '15px' }}>
                        {settings.saasName} <strong>tidak pernah mengklaim hak kepemilikan</strong> atas foto atau karya visual yang Anda kelola melalui platform kami. Seluruh aset foto sepenuhnya adalah milik fotografer dan klien bersangkutan. Seluruh transaksi pembayaran diproses melalui saluran Payment Gateway berizin resmi Bank Indonesia.
                    </p>
                </section>

                {/* Section 5: Kontak Resmi */}
                <section style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#818CF8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                        Kontak & Dukungan Resmi
                    </h3>
                    <p style={{ color: '#D8D5EE', fontSize: '14px', margin: '0 0 8px 0' }}>
                        Untuk informasi kemitraan, pertanyaan produk, atau permohonan bantuan teknis, silakan hubungi kami di:
                    </p>
                    <div style={{ display: 'inline-block', background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(129,140,248,0.2)' }}>
                        <a href={`mailto:${settings.email}`} style={{ color: '#34D399', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
                            {settings.email}
                        </a>
                    </div>
                </section>

                {/* Footer Navigation */}
                <div style={{ borderTop: '1px solid rgba(129,140,248,0.16)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '18px', fontSize: '13px' }}>
                        <Link href="/privacy" style={{ color: '#818CF8', textDecoration: 'none' }}>Kebijakan Privasi</Link>
                        <Link href="/terms" style={{ color: '#818CF8', textDecoration: 'none' }}>Syarat & Ketentuan</Link>
                        <Link href="/refund" style={{ color: '#818CF8', textDecoration: 'none' }}>Kebijakan Refund</Link>
                        <Link href="/contact" style={{ color: '#818CF8', textDecoration: 'none' }}>Hubungi Kami</Link>
                    </div>
                    <div style={{ color: '#9791B8', fontSize: '12px' }}>
                        &copy; 2026 {settings.saasName}. All rights reserved.
                    </div>
                </div>
            </div>
        </div>
    );
}
