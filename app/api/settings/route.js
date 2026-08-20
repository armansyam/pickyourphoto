import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

// Field yang aman diekspos ke public frontend (tanpa auth)
// Server Key, SMTP password, Google secrets, bank account TIDAK boleh ada di sini
const PUBLIC_SAFE_FIELDS = new Set([
    // Payment Gateway — hanya client key (bukan server key!) untuk load Snap.js
    'payment_gateway_provider',
    'payment_gateway_client_key',
    'payment_gateway_is_production',
    'enable_payment_gateway',
    // Branding / UI
    'saas_name',
    'saas_domain',
    'saas_tagline',
    'saas_description',
    'saas_logo_url',
    'saas_favicon_url',
    'saas_primary_color',
    'saas_support_whatsapp',
    'saas_support_email',
    'contact_whatsapp',
    'contact_email',
    // Flash Sale (UI display only)
    'enable_flash_promo',
    'flash_promo_discount_percent',
    'flash_promo_ends_at',
    'flash_promo_type',
    'flash_bundle_plan_id',
    'flash_bundle_addon_name',
    'flash_bundle_addon_type',
    'flash_bundle_addon_value',
    // Trial Public Configuration
    'trial_max_photos',
    'trial_max_selection',
    'trial_preview_photos',
    'trial_max_subfolders',
    'raw_sorter_trial_limit',
    'trial_cta_text',
    'trial_cta_subtext',
]);

export async function GET() {
    try {
        const sysSetting = db.prepare("SELECT enable_free_trial, trial_expiration_minutes FROM system_settings WHERE id = 1").get() || {};
        const rows = db.prepare('SELECT key, value FROM saas_settings').all();
        
        // Only expose safe public fields — never server keys, passwords, or secrets
        const settings = {
            enable_free_trial: sysSetting.enable_free_trial ?? 1,
            trial_expiration_minutes: sysSetting.trial_expiration_minutes ?? 60,
        };
        rows.forEach(row => {
            if (PUBLIC_SAFE_FIELDS.has(row.key)) {
                settings[row.key] = row.value;
            }
        });

        return NextResponse.json(settings, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Failed to retrieve SaaS settings.' }, { status: 500 });
    }
}
