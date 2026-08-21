import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';
import { validateSubdomain, isSubdomainAvailable, suggestAlternatives, getRootDomain } from '@/lib/subdomain';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const authUser = getAuthVendor();
        if (!authUser) {
            return NextResponse.json({ message: 'Sesi login tidak valid. Silakan login kembali.' }, { status: 401 });
        }

        // Ambil data vendor terkini dari DB
        const vendor = db.prepare(`
            SELECT v.*, p.name as planName 
            FROM vendors v 
            LEFT JOIN plans p ON v.planId = p.id 
            WHERE v.id = ?
        `).get(authUser.id);

        if (!vendor) {
            return NextResponse.json({ message: 'Akun studio tidak ditemukan.' }, { status: 404 });
        }

        // Cek status keanggotaan vendor
        if (vendor.status !== 'active') {
            return NextResponse.json({ 
                message: 'Fitur subdomain eksklusif hanya tersedia untuk akun studio yang berlangganan aktif.' 
            }, { status: 403 });
        }

        const body = await request.json();
        const rawSlug = body.subdomain || body.slug || '';
        const slug = rawSlug.toLowerCase().trim();

        if (!slug) {
            return NextResponse.json({ message: 'Nama subdomain wajib diisi.' }, { status: 400 });
        }

        const validation = validateSubdomain(slug);
        if (!validation.valid) {
            return NextResponse.json({ 
                message: validation.reason,
                suggestions: suggestAlternatives(slug)
            }, { status: 400 });
        }

        // Periksa ketersediaan (izinkan jika milik vendor ini sendiri)
        const available = isSubdomainAvailable(slug, vendor.id);
        if (!available) {
            return NextResponse.json({ 
                message: 'Subdomain ini sudah digunakan oleh studio lain.',
                suggestions: suggestAlternatives(slug)
            }, { status: 409 });
        }

        const rootDomain = getRootDomain();

        // Simpan subdomain ke database
        db.prepare(`
            UPDATE vendors 
            SET subdomain = ?, subdomain_active = 1, subdomain_set_at = datetime('now') 
            WHERE id = ?
        `).run(slug, vendor.id);

        return NextResponse.json({
            success: true,
            subdomain: slug,
            fullUrl: `https://${slug}.${rootDomain}`,
            message: `Subdomain ${slug}.${rootDomain} berhasil diaktifkan untuk studio Anda!`
        });
    } catch (error) {
        console.error('[Subdomain Claim API Error]:', error);
        return NextResponse.json({ message: 'Gagal mengaktifkan subdomain studio.' }, { status: 500 });
    }
}
