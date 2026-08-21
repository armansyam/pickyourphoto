import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';
import { validateSubdomain, isSubdomainAvailable, suggestAlternatives, getRootDomain } from '@/lib/subdomain';

export const dynamic = 'force-dynamic';

export async function PUT(request) {
    try {
        const authUser = getAuthVendor();
        if (!authUser) {
            return NextResponse.json({ message: 'Sesi login tidak valid. Silakan login kembali.' }, { status: 401 });
        }

        const vendor = db.prepare(`
            SELECT v.*, p.name as planName 
            FROM vendors v 
            LEFT JOIN plans p ON v.planId = p.id 
            WHERE v.id = ?
        `).get(authUser.id);

        if (!vendor) {
            return NextResponse.json({ message: 'Akun studio tidak ditemukan.' }, { status: 404 });
        }

        if (vendor.status !== 'active') {
            return NextResponse.json({ 
                message: 'Fitur subdomain eksklusif hanya tersedia untuk akun studio yang berlangganan aktif.' 
            }, { status: 403 });
        }

        const isPro = (vendor.planName && vendor.planName.toLowerCase().includes('pro')) || (vendor.planName && vendor.planName.toLowerCase().includes('business'));

        // Cek batasan cooldown ubah subdomain untuk tier reguler (1 kali per 30 hari)
        if (!isPro && vendor.subdomain_set_at) {
            const lastSetMs = new Date(vendor.subdomain_set_at).getTime();
            const daysPassed = (Date.now() - lastSetMs) / (1000 * 60 * 60 * 24);
            if (daysPassed < 30) {
                const daysRemaining = Math.ceil(30 - daysPassed);
                return NextResponse.json({ 
                    message: `Paket Anda dapat mengubah subdomain 1x setiap 30 hari. Sisa waktu tunggu: ${daysRemaining} hari lagi (atau upgrade ke Pro untuk ubah bebas kapan saja).` 
                }, { status: 429 });
            }
        }

        const body = await request.json();
        const rawSlug = body.subdomain || body.slug || '';
        const slug = rawSlug.toLowerCase().trim();

        if (!slug) {
            return NextResponse.json({ message: 'Nama subdomain baru wajib diisi.' }, { status: 400 });
        }

        if (slug === vendor.subdomain) {
            return NextResponse.json({ message: 'Subdomain baru sama dengan subdomain aktif saat ini.' }, { status: 400 });
        }

        const validation = validateSubdomain(slug);
        if (!validation.valid) {
            return NextResponse.json({ 
                message: validation.reason,
                suggestions: suggestAlternatives(slug)
            }, { status: 400 });
        }

        const available = isSubdomainAvailable(slug, vendor.id);
        if (!available) {
            return NextResponse.json({ 
                message: 'Subdomain ini sudah digunakan oleh studio lain.',
                suggestions: suggestAlternatives(slug)
            }, { status: 409 });
        }

        const rootDomain = getRootDomain();
        const oldSubdomain = vendor.subdomain;

        db.transaction(() => {
            // 1. Simpan riwayat subdomain lama untuk redirect 30 hari
            if (oldSubdomain) {
                const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                db.prepare(`
                    INSERT INTO subdomain_history (vendorId, oldSubdomain, newSubdomain, expiresAt)
                    VALUES (?, ?, ?, ?)
                `).run(vendor.id, oldSubdomain, slug, expiresAt);
            }

            // 2. Update subdomain aktif vendor
            db.prepare(`
                UPDATE vendors 
                SET subdomain = ?, subdomain_active = 1, subdomain_set_at = datetime('now') 
                WHERE id = ?
            `).run(slug, vendor.id);
        })();

        return NextResponse.json({
            success: true,
            subdomain: slug,
            oldSubdomain,
            fullUrl: `https://${slug}.${rootDomain}`,
            message: `Subdomain studio berhasil diperbarui menjadi ${slug}.${rootDomain}!`
        });
    } catch (error) {
        console.error('[Subdomain Update API Error]:', error);
        return NextResponse.json({ message: 'Gagal memperbarui subdomain studio.' }, { status: 500 });
    }
}
