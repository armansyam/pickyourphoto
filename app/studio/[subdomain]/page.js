import db from '@/lib/db';
import { getRootDomain } from '@/lib/subdomain';
import StudioPortalLanding from '@/components/studio/StudioPortalLanding';
import { getRandomPortfolioPhotos } from '@/lib/studio-portfolio';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function StudioLandingPage({ params }) {
    const resolvedParams = await params;
    const rawSlug = (resolvedParams?.subdomain || params?.subdomain || '').toLowerCase().trim();
    const slug = rawSlug.replace(/[^a-z0-9-]/g, '');
    const rootDomain = getRootDomain();

    const vendor = db.prepare(`
        SELECT id, name, brandName, brandLogo, email, whatsapp, city, address, portfolioDriveUrl 
        FROM vendors 
        WHERE LOWER(subdomain) = ? AND subdomain_active = 1
    `).get(slug);

    if (!vendor) {
        return (
            <div style={{ maxWidth: '640px', margin: '80px auto', textAlign: 'center', padding: '0 20px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                    Studio Tidak Ditemukan
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b' }}>
                    Alamat subdomain yang Anda akses belum terdaftar atau sedang tidak aktif.
                </p>
            </div>
        );
    }

    const portfolioItems = await getRandomPortfolioPhotos(vendor.portfolioDriveUrl);

    return (
        <StudioPortalLanding 
            vendor={vendor} 
            subdomain={slug} 
            rootDomain={rootDomain} 
            portfolioItems={portfolioItems}
        />
    );
}
