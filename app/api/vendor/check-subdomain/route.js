import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import { validateSubdomain, isSubdomainAvailable, suggestAlternatives } from '@/lib/subdomain';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const authUser = getAuthVendor();
        const { searchParams } = new URL(request.url);
        const rawSlug = searchParams.get('subdomain') || searchParams.get('slug') || '';
        const slug = rawSlug.toLowerCase().trim();

        if (!slug) {
            return NextResponse.json({ 
                valid: false, 
                available: false, 
                reason: 'Subdomain tidak boleh kosong.' 
            });
        }

        const validation = validateSubdomain(slug);
        if (!validation.valid) {
            return NextResponse.json({
                valid: false,
                available: false,
                reason: validation.reason,
                suggestions: suggestAlternatives(slug)
            });
        }

        const available = isSubdomainAvailable(slug, authUser ? authUser.id : null);
        if (!available) {
            return NextResponse.json({
                valid: true,
                available: false,
                reason: 'Subdomain ini telah digunakan oleh studio lain.',
                suggestions: suggestAlternatives(slug)
            });
        }

        return NextResponse.json({
            valid: true,
            available: true,
            subdomain: slug,
            message: 'Subdomain tersedia.'
        });
    } catch (error) {
        console.error('[Check Subdomain Error]:', error);
        return NextResponse.json({ valid: false, available: false, reason: 'Terjadi kesalahan server.' }, { status: 500 });
    }
}
