import TrialWidget from '@/components/TrialWidget';

export const metadata = {
  title: 'Free Instant Trial — Pick Your Photo',
  description: 'Uji coba instan galeri seleksi foto selama 1 jam gratis tanpa perlu mendaftar akun.',
};

export default function TrialPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <TrialWidget />
    </div>
  );
}
