import Link from 'next/link';

export const metadata = {
    title: 'Privacy Policy — Pick Your Photo',
    description: 'Privacy Policy and Data Handling Terms for Pick Your Photo Platform.'
};

export default function PrivacyPage() {
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
                        Privacy Policy (Kebijakan Privasi)
                    </h1>
                    <p style={{ fontSize: '14px', color: '#9791B8' }}>Terakhir diperbarui: 3 Agustus 2026</p>
                </div>

                <hr style={{ borderColor: 'rgba(129,140,248,0.16)', margin: '24px 0' }} />

                <section style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '20px', color: '#818CF8', marginBottom: '12px' }}>1. Pendahuluan</h2>
                    <p style={{ color: '#D8D5EE', fontSize: '15px' }}>
                        Selamat datang di <strong>Pick Your Photo</strong> ("Kami"). Kami menghargai privasi Anda dan berkomitmen untuk melindungi data pribadi pengguna platform kami, baik fotografer, studio foto, maupun klien seleksi foto.
                    </p>
                </section>

                <section style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '20px', color: '#818CF8', marginBottom: '12px' }}>2. Data yang Kami Kumpulkan</h2>
                    <p style={{ color: '#D8D5EE', fontSize: '15px', marginBottom: '10px' }}>
                        Ketika Anda mendaftar atau menggunakan fitur **Google Sign-In**, kami hanya mengumpulkan informasi dasar akun publik Anda:
                    </p>
                    <ul style={{ paddingLeft: '20px', color: '#D8D5EE', fontSize: '15px' }}>
                        <li><strong>Alamat Email:</strong> Digunakan sebagai identitas unik login akun vendor.</li>
                        <li><strong>Nama Profil:</strong> Digunakan untuk menampilkan sapaan di dashboard akun.</li>
                        <li><strong>Foto Profil (Opsional):</strong> Digunakan untuk identifikasi avatar akun vendor.</li>
                    </ul>
                </section>

                <section style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '20px', color: '#818CF8', marginBottom: '12px' }}>3. Penggunaan Data Google OAuth &amp; Kepatuhan Kebijakan Google</h2>
                    <p style={{ color: '#D8D5EE', fontSize: '15px', marginBottom: '10px' }}>
                        Data yang diperoleh dari integrasi Google OAuth hanya digunakan secara eksklusif untuk proses otentikasi dan pembuatan akun vendor di platform Pick Your Photo. Kami <strong>TIDAK PERNAH</strong> menjual, menyewakan, atau membagikan data identitas atau file foto Anda kepada pihak ketiga mana pun.
                    </p>
                    <p style={{ color: '#D8D5EE', fontSize: '15px' }}>
                        Penggunaan dan pengalihan informasi yang diterima dari Google APIs oleh platform Pick Your Photo ke aplikasi lain akan sepenuhnya mematuhi <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style={{ color: '#A5B4FC', textDecoration: 'underline' }}>Google API Services User Data Policy</a>, termasuk persyaratan <strong>Penggunaan Terbatas (Limited Use Requirements)</strong>.
                    </p>
                </section>

                <section style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '20px', color: '#818CF8', marginBottom: '12px' }}>4. Manajemen Foto & Zero-Storage CDN Streaming</h2>
                    <p style={{ color: '#D8D5EE', fontSize: '15px' }}>
                        Platform kami menggunakan metode <em>Zero-Storage Drive Streaming</em>. Foto-foto di galeri klien dialirkan secara langsung dari tautan Google Drive milik pengguna tanpa menyimpan salinan fisik foto asli di server kami. Hal ini menjamin bahwa seluruh aset hak cipta foto Anda tetap 100% aman di dalam Google Drive Anda sendiri.
                    </p>
                </section>

                <section style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '20px', color: '#818CF8', marginBottom: '12px' }}>5. Keamanan Data</h2>
                    <p style={{ color: '#D8D5EE', fontSize: '15px' }}>
                        Kami menerapkan standar enkripsi HTTPS/TLS dan enkripsi token JWT untuk memastikan seluruh komunikasi antara browser Anda dan server kami terenkripsi dengan aman.
                    </p>
                </section>

                <section style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '20px', color: '#818CF8', marginBottom: '12px' }}>6. Kontak Kami</h2>
                    <p style={{ color: '#D8D5EE', fontSize: '15px' }}>
                        Jika Anda memiliki pertanyaan mengenai Kebijakan Privasi ini, silakan hubungi tim dukungan kami di email: <a href="mailto:man09project@gmail.com" style={{ color: '#A5B4FC' }}>man09project@gmail.com</a>.
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
