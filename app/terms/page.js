import Link from 'next/link';

export const metadata = {
    title: 'Terms of Service — Pick Your Photo',
    description: 'Terms of Service and Usage Agreement for Pick Your Photo Platform.'
};

export default function TermsPage() {
    return (
        <div style={{
            minHeight: '100vh',
            background: 'radial-gradient(90% 50% at 50% 0%, rgba(99,102,241,0.10), transparent 60%), #0B0918',
            color: '#EAE8F7',
            fontFamily: '"Inter", sans-serif',
            padding: '40px 20px',
            lineHeight: '1.7'
        }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', background: '#131024', border: '1px solid rgba(129,140,248,0.16)', borderRadius: '12px', padding: '40px' }}>
                <div style={{ marginBottom: '30px' }}>
                    <Link href="/" style={{ color: '#818CF8', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}>
                        ← Kembali ke Beranda
                    </Link>
                    <h1 style={{ fontSize: '32px', fontFamily: '"Fraunces", Georgia, serif', color: '#EAE8F7', marginTop: '16px', marginBottom: '8px' }}>
                        Terms of Service (Syarat & Ketentuan)
                    </h1>
                    <p style={{ fontSize: '14px', color: '#9791B8' }}>Terakhir diperbarui: 3 Agustus 2026</p>
                </div>

                <hr style={{ borderColor: 'rgba(129,140,248,0.16)', margin: '24px 0' }} />

                <section style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '20px', color: '#818CF8', marginBottom: '12px' }}>1. Ketentuan Umum</h2>
                    <p style={{ color: '#D8D5EE', fontSize: '15px' }}>
                        Dengan mendaftar dan menggunakan platform <strong>Pick Your Photo</strong>, Anda menyetujui untuk terikat oleh Syarat dan Ketentuan Layanan ini. Platform ini disediakan khusus untuk membantu vendor studio foto, fotografer freelance, dan kreator visual mengelola alur seleksi foto klien secara profesional.
                    </p>
                </section>

                <section style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '20px', color: '#818CF8', marginBottom: '12px' }}>2. Akun Vendor & Login Google</h2>
                    <p style={{ color: '#D8D5EE', fontSize: '15px' }}>
                        Setiap vendor bertanggung jawab untuk menjaga kerahasiaan sesi login dan kredensial akun mereka. Pendaftaran akun dapat dilakukan secara praktis menggunakan akun Google melalui integrasi Google Sign-In.
                    </p>
                </section>

                <section style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '20px', color: '#818CF8', marginBottom: '12px' }}>3. Penggunaan Layanan & Batasan Paket</h2>
                    <p style={{ color: '#D8D5EE', fontSize: '15px' }}>
                        Pengguna wajib mematuhi kuota proyek dan batasan galeri sesuai dengan Paket Layanan yang dipilih (Starter, Pro Studio, atau Business Studio). Penggunaan platform untuk mendistribusikan konten yang melanggar hukum atau hak cipta orang lain secara tegas dilarang.
                    </p>
                </section>

                <section style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '20px', color: '#818CF8', marginBottom: '12px' }}>4. Hak Cipta & Kepemilikan Foto</h2>
                    <p style={{ color: '#D8D5EE', fontSize: '15px' }}>
                        Pick Your Photo tidak klaim hak milik atas foto atau aset visual yang diunggah atau disambungkan melalui galeri. Seluruh hak cipta foto sepenuhnya tetap menjadi milik fotografer/kreator asli.
                    </p>
                </section>

                <section style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '20px', color: '#818CF8', marginBottom: '12px' }}>5. Pembatalan & Perubahan Ketentuan</h2>
                    <p style={{ color: '#D8D5EE', fontSize: '15px' }}>
                        Kami berhak untuk memperbarui atau mengubah Syarat dan Ketentuan ini sewaktu-waktu. Perubahan akan diberitahukan melalui pembaruan pada halaman ini.
                    </p>
                </section>

                <section style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '20px', color: '#818CF8', marginBottom: '12px' }}>6. Kontak Dukungan</h2>
                    <p style={{ color: '#D8D5EE', fontSize: '15px' }}>
                        Pertanyaan seputar Syarat & Ketentuan Layanan ini dapat dikirimkan ke: <a href="mailto:man09project@gmail.com" style={{ color: '#A5B4FC' }}>man09project@gmail.com</a>.
                    </p>
                </section>

                <hr style={{ borderColor: 'rgba(129,140,248,0.16)', margin: '24px 0' }} />

                <div style={{ textAlign: 'center', color: '#9791B8', fontSize: '13px' }}>
                    &copy; 2026 Pick Your Photo. All rights reserved.
                </div>
            </div>
        </div>
    );
}
