import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;

  let title = 'Galeri Seleksi Foto (Trial)';
  let description = 'Uji coba galeri seleksi foto online.';
  let images = [];

  try {
    if (slug) {
      const trial = db.prepare('SELECT title, logoUrl FROM trial_galleries WHERE slug = ?').get(slug);
      const saasRow = db.prepare("SELECT value FROM saas_settings WHERE key = 'saas_name'").get();
      const brandName = saasRow?.value || 'Platform';

      if (trial) {
        title = `${trial.title || 'Galeri Seleksi Foto'} — ${brandName} Trial`;
        description = `Pilih foto favorit Anda secara online melalui galeri seleksi interaktif ini.`;
        if (trial.logoUrl) {
          images = [{ url: trial.logoUrl }];
        }
      }
    }
  } catch (_) {}

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: images.map(i => i.url)
    }
  };
}

export default function TrialGalleryLayout({ children }) {
  return children;
}
