import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function cleanPhoneNumber(phone) {
    if (!phone) return '';
    let digits = String(phone).replace(/\D/g, '');
    if (digits.startsWith('62')) {
        digits = '0' + digits.slice(2);
    } else if (digits.startsWith('8')) {
        digits = '0' + digits;
    }
    return digits;
}

export async function POST(request, { params }) {
    try {
        const resolvedParams = await params;
        const subdomain = (resolvedParams?.subdomain || params?.subdomain || '').toLowerCase().trim();

        if (!subdomain) {
            return NextResponse.json({ success: false, message: 'Subdomain tidak valid.' }, { status: 400 });
        }

        // 1. Dapatkan Vendor berdasarkan subdomain
        const vendor = db.prepare(`
            SELECT id, name, brandName, brandLogo, email, whatsapp, city, address
            FROM vendors 
            WHERE LOWER(subdomain) = ? AND subdomain_active = 1
        `).get(subdomain);

        if (!vendor) {
            return NextResponse.json({ success: false, message: 'Studio tidak ditemukan atau subdomain belum aktif.' }, { status: 404 });
        }

        const body = await request.json();
        const rawPhone = (body?.phone || '').trim();
        const cleaned = cleanPhoneNumber(rawPhone);

        if (!cleaned || cleaned.length < 8) {
            return NextResponse.json({ 
                success: false, 
                message: 'Silakan masukkan nomor WhatsApp yang valid (minimal 8 digit).' 
            }, { status: 400 });
        }

        // Cari dengan beberapa kemungkinan format nomor (misal 0812..., 62812..., 812...)
        const searchVariations = [
            `%${cleaned}%`,
            `%${cleaned.replace(/^0/, '62')}%`,
            `%${cleaned.replace(/^0/, '')}%`
        ];

        const query = `
            SELECT 
                p.id, 
                p.name, 
                p.slug, 
                p.status, 
                p.expiresAt, 
                p.createdAt,
                c.clientPhone,
                c.accessKey,
                (SELECT COUNT(*) FROM photos ph WHERE ph.projectId = p.id) as photoCount,
                (SELECT COUNT(*) FROM photos ph WHERE ph.projectId = p.id AND ph.is_selected = 1) as selectedCount
            FROM projects p
            JOIN clients c ON c.projectId = p.id
            WHERE p.vendorId = ? 
              AND (
                REPLACE(REPLACE(REPLACE(c.clientPhone, ' ', ''), '-', ''), '+', '') LIKE ?
                OR REPLACE(REPLACE(REPLACE(c.clientPhone, ' ', ''), '-', ''), '+', '') LIKE ?
                OR REPLACE(REPLACE(REPLACE(c.clientPhone, ' ', ''), '-', ''), '+', '') LIKE ?
              )
            ORDER BY p.id DESC
        `;

        const projects = db.prepare(query).all(
            vendor.id, 
            searchVariations[0], 
            searchVariations[1], 
            searchVariations[2]
        ) || [];

        const now = new Date();
        const formattedProjects = projects.map(p => {
            const exp = p.expiresAt ? new Date(p.expiresAt) : null;
            const isExpired = exp && exp < now;
            let displayStatus = 'active'; // active, completed, expired

            if (isExpired) {
                displayStatus = 'expired';
            } else if (p.selectedCount > 0 && p.status === 'completed') {
                displayStatus = 'completed';
            } else {
                displayStatus = 'active';
            }

            return {
                id: p.id,
                name: p.name,
                slug: p.slug,
                galleryUrl: `/gallery/${p.slug}`,
                photoCount: p.photoCount || 0,
                selectedCount: p.selectedCount || 0,
                displayStatus,
                isExpired,
                expiresAt: p.expiresAt,
                createdAt: p.createdAt
            };
        });

        return NextResponse.json({
            success: true,
            vendor: {
                id: vendor.id,
                name: vendor.brandName || vendor.name,
                whatsapp: vendor.whatsapp || ''
            },
            totalFound: formattedProjects.length,
            projects: formattedProjects
        });
    } catch (error) {
        console.error('[Studio Lookup Error]:', error);
        return NextResponse.json({ success: false, message: 'Terjadi kesalahan sistem saat mencari galeri.' }, { status: 500 });
    }
}
