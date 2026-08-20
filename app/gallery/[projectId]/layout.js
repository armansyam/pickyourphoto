import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const projectId = resolvedParams?.projectId;

  let title = 'Galeri Seleksi Foto';
  let description = 'Silakan buka galeri dan pilih foto favorit Anda.';
  let images = [];

  try {
    if (projectId && /^\d+$/.test(String(projectId))) {
      const project = db.prepare(`
        SELECT p.name as projectName, v.brandName, v.brandLogo, v.name as vendorName 
        FROM projects p 
        LEFT JOIN vendors v ON p.vendorId = v.id 
        WHERE p.id = ?
      `).get(projectId);

      if (project) {
        const studioName = project.brandName || project.vendorName || 'Studio Fotografi';
        const projName = project.projectName || 'Galeri Klien';
        title = `${projName} — ${studioName}`;
        description = `Galeri seleksi foto ${projName} oleh ${studioName}. Silakan pilih foto terbaik Anda.`;
        if (project.brandLogo) {
          images = [{ url: project.brandLogo }];
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

export default function ClientGalleryLayout({ children }) {
  return children;
}
