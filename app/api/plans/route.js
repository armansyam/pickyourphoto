import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        const stmt = db.prepare("SELECT id, name, maxProjects, price, maxPhotosPerProject, activePeriodDays, allowCustomLogo, allowRawSelector, status, planType FROM plans WHERE status = 'active' ORDER BY price ASC");
        const rawPlans = stmt.all();

        // Check system_settings for active Flash Sale Promo
        const settings = db.prepare("SELECT enable_flash_promo, flash_promo_discount_percent, flash_promo_ends_at, flash_promo_title, flash_promo_banner_text FROM system_settings WHERE id = 1").get() || {};

        const now = new Date();
        const promoEnds = settings.flash_promo_ends_at ? new Date(settings.flash_promo_ends_at) : null;
        const isFlashPromoActive = settings.enable_flash_promo === 1 && promoEnds && promoEnds > now;

        const discountPercent = isFlashPromoActive ? (settings.flash_promo_discount_percent || 20) : 0;

        const plans = rawPlans.map(p => {
            const originalPrice = p.price;
            let discountedPrice = originalPrice;

            if (isFlashPromoActive && originalPrice > 0) {
                discountedPrice = Math.round(originalPrice * (1 - discountPercent / 100));
            }

            return {
                ...p,
                originalPrice,
                discountedPrice,
                discountPercent: isFlashPromoActive ? discountPercent : 0
            };
        });

        return NextResponse.json({
            plans,
            flashPromo: {
                active: isFlashPromoActive,
                discountPercent,
                endsAt: settings.flash_promo_ends_at,
                title: settings.flash_promo_title || '⚡ FLASH SALE PROMO',
                bannerText: settings.flash_promo_banner_text || 'Diskon Spesial Paket Berlangganan!'
            }
        });
    } catch (error) {
        console.error('Failed to fetch public plans:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
