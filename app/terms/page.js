import Link from 'next/link';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Syarat & Ketentuan (Terms of Service) — Pick Your Photo',
    description: 'Syarat dan Ketentuan Layanan Berlangganan Platform Pick Your Photo.'
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

export default function TermsPage() {
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
                        LEGAL TERMS
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
                        Syarat &amp; Ketentuan Layanan (Terms of Service)
                    </h1>
                    <p style={{ fontSize: '14px', color: '#9791B8' }}>
                        Terakhir diperbarui: 18 Agustus 2026 &bull; {settings.saasName}
                    </p>
                </div>

                <div style={{ height: '1px', background: 'rgba(129,140,248,0.16)', margin: '28px 0 36px' }}></div>

                <section style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                        </div>
                        <h2 style={{ fontSize: '19px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>1. Ketentuan Umum</h2>
                    </div>
                    <p style={{ color: '#D8D5EE', fontSize: '15px' }}>
                        Dengan mendaftar, mengakses, atau menggunakan layanan di <strong>{settings.saasName}</strong>, Anda menyatakan telah membaca, memahami, dan menyetujui untuk terikat secara hukum oleh Syarat dan Ketentuan ini. Apabila Anda tidak menyetujui ketentuan ini, Anda dipersilakan untuk tidak menggunakan platform.
                    </p>
                </section>

                <section style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                        </div>
                        <h2 style={{ fontSize: '19px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>2. Akun Vendor &amp; Tanggung Jawab Pengguna</h2>
                    </div>
                    <ul style={{ paddingLeft: '20px', color: '#D8D5EE', fontSize: '15px' }}>
                        <li style={{ marginBottom: '8px' }}>Pengguna bertanggung jawab penuh atas keamanan sesi login dan seluruh aktivitas yang dilakukan melalui akun vendor bersangkutan.</li>
                        <li style={{ marginBottom: '8px' }}>Dilarang keras menyalahgunakan platform untuk mengunggah atau mendistribusikan konten yang melanggar hukum Republik Indonesia, konten pornografi, ujaran kebencian, atau materi yang melanggar hak cipta pihak ketiga.</li>
                    </ul>
                </section>

                <section style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                                <line x1="2" y1="10" x2="22" y2="10"></line>
                            </svg>
                        </div>
                        <h2 style={{ fontSize: '19px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>3. Ketentuan Pembayaran &amp; Langganan</h2>
                    </div>
                    <ul style={{ paddingLeft: '20px', color: '#D8D5EE', fontSize: '15px' }}>
                        <li style={{ marginBottom: '8px' }}>Seluruh harga paket berlangganan dan Add-On Storage dicantumkan secara transparan dalam mata uang Rupiah (IDR).</li>
                        <li style={{ marginBottom: '8px' }}>Pembayaran diproses secara instan melalui Payment Gateway resmi berizin Bank Indonesia (seperti QRIS dan Virtual Account).</li>
                        <li style={{ marginBottom: '8px' }}>Masa aktif paket berjalan sesuai durasi yang tertera pada saat transaksi (misal: 30 hari). Perpanjangan paket menambah sisa masa aktif yang masih ada secara akumulatif.</li>
                    </ul>
                </section>

                <section style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                        </div>
                        <h2 style={{ fontSize: '19px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>4. Hak Cipta &amp; Kepemilikan Materi</h2>
                    </div>
                    <p style={{ color: '#D8D5EE', fontSize: '15px' }}>
                        {settings.saasName} tidak mengklaim kepemilikan atas foto, video, atau aset grafis yang dikelola oleh fotografer di platform ini. Hak cipta sepenuhnya tetap berada pada pemilik karya asli.
                    </p>
                </section>

                <section style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#818CF8', marginBottom: '8px' }}>
                        Pertanyaan Terkait Syarat &amp; Ketentuan
                    </h3>
                    <p style={{ color: '#D8D5EE', fontSize: '14px', margin: '0 0 10px 0' }}>
                        Apabila Anda memiliki pertanyaan atau butuh klarifikasi mengenai ketentuan layanan kami, silakan hubungi kami di:
                    </p>
                    <a href={`mailto:${settings.email}`} style={{ color: '#34D399', textDecoration: 'none', fontWeight: '600', fontSize: '14.5px' }}>
                        {settings.email}
                    </a>
                </section>

                {/* Footer Navigation */}
                <div style={{ borderTop: '1px solid rgba(129,140,248,0.16)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '18px', fontSize: '13px' }}>
                        <Link href="/about" style={{ color: '#818CF8', textDecoration: 'none' }}>Tentang Kami</Link>
                        <Link href="/privacy" style={{ color: '#818CF8', textDecoration: 'none' }}>Kebijakan Privasi</Link>
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
