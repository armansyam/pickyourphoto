import TrialWidget from '@/components/TrialWidget';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  let brandName = 'Pick Your Photo';
  let description = 'Uji coba instan galeri seleksi foto online gratis tanpa perlu mendaftar akun.';
  let logoUrl = '/ams-logo.png';

  try {
    const rows = db.prepare("SELECT key, value FROM saas_settings WHERE key IN ('saas_name', 'saas_tagline', 'saas_description', 'saas_logo_url')").all() || [];
    for (const r of rows) {
      if (r.key === 'saas_name' && r.value) brandName = r.value;
      if (r.key === 'saas_description' && r.value) description = r.value;
      else if (r.key === 'saas_tagline' && r.value && !description) description = r.value;
      if (r.key === 'saas_logo_url' && r.value) logoUrl = r.value;
    }
  } catch (_) {}

  const title = `Free Instant Trial — ${brandName}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: logoUrl ? [{ url: logoUrl }] : []
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: logoUrl ? [logoUrl] : []
    }
  };
}

export default function TrialPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <TrialWidget />
    </div>
  );
}
