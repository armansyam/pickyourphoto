import { NextResponse } from 'next/server';
import { validateSubdomain, isSubdomainAvailable, suggestAlternatives, getRootDomain } from '@/lib/subdomain';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const rawSlug = searchParams.get('slug') || '';
        const slug = rawSlug.toLowerCase().trim();

        if (!slug) {
            return NextResponse.json({ available: false, reason: 'Slug subdomain wajib diisi.' }, { status: 400 });
        }

        const validation = validateSubdomain(slug);
        if (!validation.valid) {
            return NextResponse.json({
                available: false,
                reason: validation.reason,
                suggestions: suggestAlternatives(slug)
            });
        }

        const available = isSubdomainAvailable(slug);
        if (!available) {
            const suggestions = suggestAlternatives(slug);
            return NextResponse.json({
                available: false,
                reason: 'Subdomain ini sudah digunakan oleh studio lain.',
                suggestions
            });
        }

        const rootDomain = getRootDomain(request);

        return NextResponse.json({
            available: true,
            slug,
            previewUrl: rootDomain ? `https://${slug}.${rootDomain}` : slug
        });
    } catch (error) {
        console.error('[Subdomain Check API Error]:', error);
        return NextResponse.json({ available: false, reason: 'Terjadi kesalahan sistem saat memeriksa subdomain.' }, { status: 500 });
    }
}
