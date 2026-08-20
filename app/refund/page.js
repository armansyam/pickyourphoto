import Link from 'next/link';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
    let saasName = 'Pick Your Photo';
    try {
        const row = db.prepare("SELECT value FROM saas_settings WHERE key = 'saas_name'").get();
        if (row?.value) saasName = row.value;
    } catch (_) {}
    return {
        title: `Kebijakan Pengembalian Dana & Pembatalan — ${saasName}`,
        description: `Kebijakan Refund, Pembatalan Langganan, dan Pengiriman/Aktivasi Layanan Digital ${saasName}.`
    };
}

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

export default function RefundPage() {
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
                        REFUND &amp; CANCELLATION
                    </span>
                </div>

                {/* Header */}
                <div style={{ marginBottom: '36px' }}>
                    <h1 style={{
                        fontSize: '32px',
                        fontFamily: '"Fraunces", Georgia, serif',
                        fontWeight: '700',
                        color: '#1C1917',
                        letterSpacing: '-0.02em',
                        lineHeight: '1.2',
                        marginBottom: '12px'
                    }}>
                        Kebijakan Pengembalian Dana, Pembatalan &amp; Aktivasi Layanan
                    </h1>
                    <p style={{ fontSize: '14px', color: '#78716C' }}>
                        Terakhir diperbarui: 18 Agustus 2026 &bull; Berlaku untuk seluruh transaksi di platform {settings.saasName}
                    </p>
                </div>

                <div style={{ height: '1px', background: 'rgba(197, 160, 89, 0.2)', margin: '28px 0 36px' }}></div>

                {/* Section 1: Karakteristik Layanan Digital */}
                <section style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(197, 160, 89, 0.15)', color: '#8C6D23' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                                <line x1="8" y1="21" x2="16" y2="21"></line>
                                <line x1="12" y1="17" x2="12" y2="21"></line>
                            </svg>
                        </div>
                        <h2 style={{ fontSize: '19px', fontWeight: '700', color: '#1C1917', margin: 0, fontFamily: '"Fraunces", Georgia, serif' }}>
                            1. Karakteristik Layanan Digital &amp; Cloud Berlangganan
                        </h2>
                    </div>
                    <p style={{ color: '#44403C', fontSize: '15px' }}>
                        Seluruh produk yang tersedia di <strong>{settings.saasName}</strong> berbentuk <strong>Produk Digital / Layanan Berlangganan Cloud Platform</strong>. Kami tidak melakukan pengiriman fisik dalam bentuk barang cetak maupun paket logistik fisik.
                    </p>
                </section>

                {/* Section 2: Kebijakan Pengiriman / Aktivasi (Delivery Policy) */}
                <section style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(21,128,61,0.15)', color: '#15803D' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                            </svg>
                        </div>
                        <h2 style={{ fontSize: '19px', fontWeight: '700', color: '#1C1917', margin: 0, fontFamily: '"Fraunces", Georgia, serif' }}>
                            2. Kebijakan Aktivasi Layanan (Delivery Policy)
                        </h2>
                    </div>
                    <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '12px', padding: '18px 20px', marginBottom: '14px' }}>
                        <p style={{ color: '#15803D', fontSize: '14.5px', margin: 0, fontWeight: '500' }}>
                            <strong>Aktivasi Instan Otomatis:</strong> Setelah pembayaran melalui saluran Payment Gateway resmi (seperti QRIS atau Virtual Account) terverifikasi lunas oleh sistem (status <em>settlement</em>), akun vendor dan kuota proyek/storage Anda akan <strong>langsung aktif secara otomatis seketika itu juga (0–60 detik)</strong>.
                        </p>
                    </div>
                    <p style={{ color: '#44403C', fontSize: '15px' }}>
                        Tanda terima pembayaran (Invoice elektronik) dan konfirmasi aktivasi akun akan dikirimkan secara otomatis ke alamat email yang Anda daftarkan.
                    </p>
                </section>

                {/* Section 3: Kebijakan Pembatalan (Cancellation Policy) */}
                <section style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(197, 160, 89, 0.15)', color: '#8C6D23' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                        </div>
                        <h2 style={{ fontSize: '19px', fontWeight: '700', color: '#1C1917', margin: 0, fontFamily: '"Fraunces", Georgia, serif' }}>
                            3. Kebijakan Pembatalan Langganan (Cancellation Policy)
                        </h2>
                    </div>
                    <ul style={{ paddingLeft: '20px', color: '#44403C', fontSize: '15px' }}>
                        <li style={{ marginBottom: '10px' }}>
                            <strong>Bebas Berhenti Sewaktu-Waktu:</strong> Pengguna dapat memilih untuk tidak memperpanjang masa aktif paket langganan kapan saja tanpa dikenakan biaya penalti atau denda pembatalan.
                        </li>
                        <li style={{ marginBottom: '10px' }}>
                            <strong>Akses Hingga Akhir Periode:</strong> Apabila pengguna tidak melakukan perpanjangan, seluruh fitur dan galeri tetap dapat diakses normal hingga tanggal masa aktif berjalan selesai (<em>expiration date</em>).
                        </li>
                        <li style={{ marginBottom: '10px' }}>
                            <strong>Grace Period:</strong> Setelah masa aktif berakhir, sistem memberikan masa tenggang (<em>grace period</em>) selama 7 hari agar pengguna memiliki waktu mengunduh atau merapikan data sebelum akun dibekukan sementara.
                        </li>
                    </ul>
                </section>

                {/* Section 4: Syarat & Ketentuan Pengembalian Dana (Refund) */}
                <section style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(197, 160, 89, 0.15)', color: '#8C6D23' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                            </svg>
                        </div>
                        <h2 style={{ fontSize: '19px', fontWeight: '700', color: '#1C1917', margin: 0, fontFamily: '"Fraunces", Georgia, serif' }}>
                            4. Ketentuan Pengembalian Dana (Refund Policy)
                        </h2>
                    </div>
                    <p style={{ color: '#44403C', fontSize: '15px', marginBottom: '12px' }}>
                        Permohonan pengembalian dana (<em>refund</em>) dapat diproses dan disetujui dalam kondisi-kondisi berikut:
                    </p>
                    <ul style={{ paddingLeft: '20px', color: '#44403C', fontSize: '15px' }}>
                        <li style={{ marginBottom: '10px' }}>
                            <strong>Pembayaran Ganda (Double Payment):</strong> Apabila terjadi pemotongan saldo lebih dari satu kali untuk satu Order ID yang sama akibat kendala koneksi perbankan, kelebihan dana akan dikembalikan 100%.
                        </li>
                        <li style={{ marginBottom: '10px' }}>
                            <strong>Kegagalan Sistem / Tidak Teraktivasi:</strong> Apabila pembayaran telah terkonfirmasi lunas oleh payment gateway namun akun/kuota gagal diaktivasi oleh sistem dalam waktu 1x24 jam dan tim teknis kami tidak dapat menyelesaikannya.
                        </li>
                        <li style={{ marginBottom: '10px' }}>
                            <strong>Ketidaksesuaian Transaksi:</strong> Terjadi ketidaksesuaian nominal yang didebit dengan harga paket yang tertera di faktur resmi sistem.
                        </li>
                    </ul>
                </section>

                {/* Section 5: Pengecualian Refund */}
                <section style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(239,68,68,0.12)', color: '#DC2626' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                            </svg>
                        </div>
                        <h2 style={{ fontSize: '19px', fontWeight: '700', color: '#1C1917', margin: 0, fontFamily: '"Fraunces", Georgia, serif' }}>
                            5. Batasan &amp; Pengecualian Refund
                        </h2>
                    </div>
                    <p style={{ color: '#44403C', fontSize: '15px' }}>
                        Pengembalian dana <strong>tidak berlaku</strong> untuk kondisi berikut:
                    </p>
                    <ul style={{ paddingLeft: '20px', color: '#44403C', fontSize: '15px' }}>
                        <li style={{ marginBottom: '8px' }}>
                            Paket langganan yang telah digunakan secara penuh dan normal sepanjang masa aktif berjalan.
                        </li>
                        <li style={{ marginBottom: '8px' }}>
                            Kesalahan pemilihan paket oleh pengguna setelah layanan berhasil diakses dan digunakan untuk membuat proyek seleksi.
                        </li>
                        <li style={{ marginBottom: '8px' }}>
                            Akun yang dinonaktifkan sementara atau permanen akibat pelanggaran terhadap Syarat & Ketentuan Layanan (misal: penyalahgunaan hak cipta atau konten ilegal).
                        </li>
                    </ul>
                </section>

                {/* Section 6: Prosedur Pengajuan & Waktu Proses */}
                <section style={{ background: '#FFFDF9', border: '1.5px solid rgba(197, 160, 89, 0.35)', borderRadius: '16px', padding: '24px', marginBottom: '32px', boxShadow: '0 6px 20px rgba(197, 160, 89, 0.06)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#8C6D23', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: '"Fraunces", Georgia, serif' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                        Tata Cara &amp; Prosedur Pengajuan Refund
                    </h3>
                    <p style={{ color: '#44403C', fontSize: '14.5px', margin: '0 0 12px 0' }}>
                        Untuk mengajukan klaim pengembalian dana, silakan kirimkan email resmi ke:
                    </p>
                    <div style={{ marginBottom: '14px' }}>
                        <a href={`mailto:${settings.email}?subject=Permohonan%20Refund%20-%20Pick%20Your%20Photo`} style={{
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
                        }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                            {settings.email}
                        </a>
                    </div>
                    <p style={{ color: '#44403C', fontSize: '14px', margin: '0 0 8px 0' }}>
                        <strong>Format lampiran wajib:</strong>
                    </p>
                    <ol style={{ paddingLeft: '20px', color: '#44403C', fontSize: '14px', margin: '0 0 12px 0' }}>
                        <li>Nomor Order ID transaksi (contoh: <code>ORDER-172...</code>).</li>
                        <li>Alamat email akun vendor yang terdaftar.</li>
                        <li>Bukti struk transfer / mutasi debit dari aplikasi bank atau e-wallet.</li>
                        <li>Deskripsi singkat kendala yang dialami.</li>
                    </ol>
                    <p style={{ color: '#78716C', fontSize: '13px', margin: 0 }}>
                        ⏳ <strong>Waktu Proses:</strong> Permohonan akan diverifikasi oleh tim keuangan dalam waktu 1x24 jam kerja, dan dana yang disetujui akan ditransfer kembali dalam waktu 1–5 hari kerja sesuai ketentuan perbankan/payment gateway.
                    </p>
                </section>

                {/* Footer Navigation */}
                <div style={{ borderTop: '1px solid rgba(197, 160, 89, 0.2)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '18px', fontSize: '13px' }}>
                        <Link href="/about" style={{ color: '#8C6D23', textDecoration: 'none', fontWeight: '600' }}>Tentang Kami</Link>
                        <Link href="/privacy" style={{ color: '#8C6D23', textDecoration: 'none', fontWeight: '600' }}>Kebijakan Privasi</Link>
                        <Link href="/terms" style={{ color: '#8C6D23', textDecoration: 'none', fontWeight: '600' }}>Syarat & Ketentuan</Link>
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
