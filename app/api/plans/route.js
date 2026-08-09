import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const stmt = db.prepare("SELECT id, name, maxProjects, price, maxPhotosPerProject, activePeriodDays, allowCustomLogo, allowRawSelector, status, planType FROM plans WHERE status = 'active' ORDER BY price ASC");
        const rawPlans = stmt.all();

        // Check system_settings for active Flash Sale Promo and Free Trial status
        const settings = db.prepare("SELECT enable_free_trial, enable_flash_promo, flash_promo_discount_percent, flash_promo_ends_at, flash_promo_title, flash_promo_banner_text, flash_promo_type, flash_bundle_plan_id, flash_bundle_addon_name, flash_bundle_addon_type, flash_bundle_addon_value, flash_bundle_anchor_price FROM system_settings WHERE id = 1").get() || {};

        const now = new Date();
        const promoEnds = settings.flash_promo_ends_at ? new Date(settings.flash_promo_ends_at) : null;
        const isFlashPromoActive = settings.enable_flash_promo === 1 && promoEnds && promoEnds > now;

        const promoType = settings.flash_promo_type || 'percent';
        const discountPercent = (isFlashPromoActive && promoType === 'percent') ? (settings.flash_promo_discount_percent || 20) : 0;

        const plans = rawPlans.map(p => {
            const originalPrice = p.price;
            let discountedPrice = originalPrice;

            if (isFlashPromoActive && originalPrice > 0 && promoType === 'percent') {
                discountedPrice = Math.round(originalPrice * (1 - discountPercent / 100));
            }

            const isBundleTarget = Boolean(promoType === 'bundle' && isFlashPromoActive && (settings.flash_bundle_plan_id ? p.id === settings.flash_bundle_plan_id : true));

            return {
                ...p,
                originalPrice,
                discountedPrice,
                discountPercent: (isFlashPromoActive && promoType === 'percent') ? discountPercent : 0,
                isBundleTarget,
                bundleAddonName: isBundleTarget ? (settings.flash_bundle_addon_name || 'Gratis +2 Extra Sub-Event Link') : null,
                bundleAnchorPrice: isBundleTarget ? (settings.flash_bundle_anchor_price || (p.price + 70000)) : null,
            };
        });

        return NextResponse.json({
            plans,
            enableFreeTrial: settings.enable_free_trial !== 0,
            flashPromo: {
                active: isFlashPromoActive,
                promoType,
                discountPercent,
                endsAt: settings.flash_promo_ends_at,
                title: settings.flash_promo_title || (promoType === 'bundle' ? '⚡ FLASHSALE BUNDLE KILAT' : '⚡ FLASH SALE PROMO'),
                bannerText: settings.flash_promo_banner_text || (promoType === 'bundle' ? 'Dapatkan Paket Berlangganan + Bonus Add-on Gratis!' : 'Diskon Spesial Paket Berlangganan!'),
                bundlePlanId: settings.flash_bundle_plan_id,
                bundleAddonName: settings.flash_bundle_addon_name || 'Gratis +2 Extra Sub-Event Link',
                bundleAddonType: settings.flash_bundle_addon_type || 'sub_event',
                bundleAddonValue: settings.flash_bundle_addon_value || 2,
                bundleAnchorPrice: settings.flash_bundle_anchor_price || 199000
            }
        });
    } catch (error) {
        console.error('Failed to fetch public plans:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
