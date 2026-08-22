import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function maskPhoneNumber(phone) {
    if (!phone) return '';
    const clean = phone.trim();
    if (clean.length <= 6) return '****';
    const start = clean.slice(0, 4);
    const end = clean.slice(-3);
    return `${start}****${end}`;
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const email = (searchParams.get('email') || '').toLowerCase().trim();

        // 1. Check registration status
        const sysSettings = db.prepare("SELECT * FROM system_settings WHERE id = 1").get() || {
            enable_registration: 1,
            enable_free_trial: 1,
            max_vendor_quota: null
        };

        let registrationOpen = true;
        let reasonClosed = null;

        if (sysSettings.enable_registration === 0) {
            registrationOpen = false;
            reasonClosed = 'Pendaftaran vendor baru saat ini sedang ditutup oleh administrator.';
        } else if (sysSettings.max_vendor_quota !== null && sysSettings.max_vendor_quota > 0) {
            const activeVendorCount = db.prepare(`
                SELECT COUNT(*) as count FROM vendors WHERE role = 'vendor' AND status = 'active'
            `).get()?.count || 0;

            if (activeVendorCount >= sysSettings.max_vendor_quota) {
                registrationOpen = false;
                reasonClosed = 'Kuota registrasi kami sudah penuh saat ini.';
            }
        }

        // 2. Fetch SaaS settings (Brand, Logo, Flash Promo)
        const saasRows = db.prepare("SELECT key, value FROM saas_settings").all() || [];
        const saasMap = {};
        saasRows.forEach(r => { saasMap[r.key] = r.value; });

        const platformName = saasMap.saas_name || 'Photota';
        const logoUrl = saasMap.saas_logo_url || saasMap.logo_url || null;

        // Flash Promo config from system_settings
        const sysSettingsFull = db.prepare("SELECT * FROM system_settings WHERE id = 1").get() || {};
        const now = new Date();
        const promoEnds = sysSettingsFull.flash_promo_ends_at ? new Date(sysSettingsFull.flash_promo_ends_at) : null;
        const isFlashPromoActive = sysSettingsFull.enable_flash_promo === 1 && promoEnds && promoEnds > now;

        const promoType = sysSettingsFull.flash_promo_type || 'percent';
        const discountPercent = (isFlashPromoActive && promoType === 'percent') ? (sysSettingsFull.flash_promo_discount_percent || 20) : 0;

        let flashPromo = null;
        if (isFlashPromoActive) {
            flashPromo = {
                active: true,
                title: sysSettingsFull.flash_promo_title || 'Flash Promo Terbatas',
                bannerText: sysSettingsFull.flash_promo_banner_text || null,
                discountPercent: discountPercent,
                endsAt: sysSettingsFull.flash_promo_ends_at || null
            };
        }

        // 3. Fetch Plans
        const rawPlans = db.prepare(`
            SELECT id, name, maxProjects, price, maxPhotosPerProject, activePeriodDays, allowCustomLogo, allowRawSelector, status, planType 
            FROM plans 
            WHERE status = 'active' 
            ORDER BY price ASC
        `).all() || [];

        const plans = rawPlans.map(p => {
            const originalPrice = p.price;
            let discountedPrice = originalPrice;

            if (isFlashPromoActive && originalPrice > 0 && promoType === 'percent') {
                discountedPrice = Math.round(originalPrice * (1 - discountPercent / 100));
            }

            return {
                ...p,
                originalPrice,
                discountedPrice,
                discountPercent: (isFlashPromoActive && promoType === 'percent') ? discountPercent : 0,
            };
        });

        // 3b. Fetch Active Addon Storage Plans dynamically
        let addonPlans = [];
        try {
            addonPlans = db.prepare(`
                SELECT id, planKey, name, quotaBytes, price, sortOrder 
                FROM addon_plans 
                WHERE status = 'active' 
                ORDER BY sortOrder ASC, price ASC
            `).all() || [];
        } catch (addonErr) {
            console.warn('[Register Init] addon_plans lookup warning:', addonErr.message);
        }

        // 3c. Payment Configuration (Gateway vs Manual Bank Transfer)
        const isGatewayEnabled = String(saasMap.enable_payment_gateway) === '1' || saasMap.enable_payment_gateway === 1 || saasMap.enable_payment_gateway === true;
        const paymentConfig = {
            enableGateway: isGatewayEnabled,
            provider: saasMap.payment_gateway_provider || 'ipaymu',
            bankName: saasMap.bank_name || 'BCA (Bank Central Asia)',
            bankAccountNumber: saasMap.bank_account_number || '',
            bankAccountName: saasMap.bank_account_name || ''
        };

        // 4. Vendor Session & Active Payment Check (if email provided)
        let vendorSession = null;
        if (email && email.includes('@')) {
            const vendor = db.prepare(`
                SELECT id, name, email, whatsapp, planId, status, is_setup_completed
                FROM vendors 
                WHERE lower(email) = ?
            `).get(email);

            if (vendor) {
                const maskedPhone = maskPhoneNumber(vendor.whatsapp);

                // A. VENDOR SUDAH AKTIF (Disetujui Admin / Lunas) -> Redirect Langsung ke Setup/Dashboard
                if (vendor.status === 'active') {
                    vendorSession = {
                        vendorId: vendor.id,
                        name: vendor.name,
                        email: vendor.email,
                        whatsapp: vendor.whatsapp || '',
                        status: 'active',
                        is_setup_completed: vendor.is_setup_completed || 0,
                        redirectUrl: vendor.is_setup_completed ? '/dashboard' : '/setup'
                    };
                }
                // B. VENDOR MENUNGGU VERIFIKASI TRANSFER MANUAL -> Tidak Pernah Expired
                else if (vendor.status === 'pending_manual') {
                    const targetPlan = plans.find(p => p.id === vendor.planId);
                    vendorSession = {
                        vendorId: vendor.id,
                        name: vendor.name,
                        email: vendor.email,
                        whatsapp: vendor.whatsapp || '',
                        maskedWhatsapp: maskedPhone,
                        status: 'pending_manual',
                        planId: vendor.planId,
                        hasPending: true,
                        hasExpired: false,
                        pendingOrder: {
                            isManual: true,
                            hasPending: true,
                            vendorId: vendor.id,
                            name: vendor.name,
                            email: vendor.email,
                            planId: vendor.planId,
                            planName: targetPlan?.name || 'Paket Langganan',
                            planPrice: targetPlan?.price || 0,
                            bankName: paymentConfig.bankName,
                            bankAccountNumber: paymentConfig.bankAccountNumber,
                            bankAccountName: paymentConfig.bankAccountName
                        }
                    };
                }
                // C. VENDOR MENUNGGU PEMBAYARAN QRIS -> Cek Sesi QRIS
                else if (vendor.status === 'pending_payment') {
                    const activeSession = db.prepare(`
                        SELECT orderId, planId, amount, paymentMethod, qrUrl, expiresAt, rawResponse 
                        FROM payment_sessions 
                        WHERE vendorId = ? AND status = 'pending' AND expiresAt > CURRENT_TIMESTAMP 
                        ORDER BY id DESC LIMIT 1
                    `).get(vendor.id);

                    if (activeSession) {
                        let token = null;
                        let redirectUrl = null;
                        let qrUrl = activeSession.qrUrl || null;
                        try {
                            const raw = JSON.parse(activeSession.rawResponse || '{}');
                            token = raw.token || null;
                            redirectUrl = raw.redirect_url || raw.paymentUrl || null;
                            if (!qrUrl && raw.actions) {
                                const qrAction = raw.actions.find(a => a.name === 'generate-qr-code');
                                if (qrAction) qrUrl = qrAction.url;
                            }
                        } catch (e) {}

                        const targetPlan = plans.find(p => p.id === (activeSession.planId || vendor.planId));

                        vendorSession = {
                            vendorId: vendor.id,
                            name: vendor.name,
                            email: vendor.email,
                            whatsapp: vendor.whatsapp || '',
                            maskedWhatsapp: maskedPhone,
                            status: 'pending_payment',
                            planId: activeSession.planId || vendor.planId,
                            hasPending: true,
                            hasExpired: false,
                            pendingOrder: {
                                hasPending: true,
                                vendorId: vendor.id,
                                name: vendor.name,
                                email: vendor.email,
                                whatsapp: vendor.whatsapp || '',
                                orderId: activeSession.orderId,
                                provider: activeSession.paymentMethod || 'midtrans',
                                token,
                                redirectUrl,
                                qrUrl,
                                qrImage: qrUrl,
                                amount: activeSession.amount,
                                expiresAt: activeSession.expiresAt,
                                planId: activeSession.planId || vendor.planId,
                                planName: targetPlan?.name || 'Paket SaaS',
                                planPrice: targetPlan?.price || activeSession.amount
                            }
                        };
                    } else {
                        // QRIS sudah lewat 5 menit -> Kembalikan status vendor ke draft_plan secara aman
                        db.prepare("UPDATE vendors SET status = 'draft_plan' WHERE id = ?").run(vendor.id);
                        vendorSession = {
                            vendorId: vendor.id,
                            name: vendor.name,
                            email: vendor.email,
                            whatsapp: vendor.whatsapp || '',
                            maskedWhatsapp: maskedPhone,
                            status: 'draft_plan',
                            planId: vendor.planId,
                            hasPending: false,
                            hasExpired: true,
                            pendingOrder: null
                        };
                    }
                }
                // D. DRAFT PLAN (Tahap 2 / Tahap 3) -> Bebas dari Expired
                else {
                    vendorSession = {
                        vendorId: vendor.id,
                        name: vendor.name,
                        email: vendor.email,
                        whatsapp: vendor.whatsapp || '',
                        maskedWhatsapp: maskedPhone,
                        status: 'draft_plan',
                        planId: vendor.planId || null,
                        hasPending: false,
                        hasExpired: false,
                        pendingOrder: null
                    };
                }
            }
        }

        return NextResponse.json({
            registrationOpen,
            reasonClosed,
            platformName,
            logoUrl,
            flashPromo,
            plans,
            addonPlans,
            paymentConfig,
            vendorSession
        });

    } catch (error) {
        console.error('[Register Init Error]:', error);
        return NextResponse.json({ message: 'Internal server error in registration init.' }, { status: 500 });
    }
}
