import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export async function POST(request) {
    try {
        const vendor = getAuthVendor();
        if (!vendor) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // Check if there is already a pending request
        const checkPending = db.prepare('SELECT id FROM subscription_requests WHERE vendorId = ? AND status = ?').get(vendor.id, 'pending');
        if (checkPending) {
            return NextResponse.json({ message: 'Anda memiliki permintaan upgrade plan yang sedang ditinjau.' }, { status: 400 });
        }

        const formData = await request.formData();
        const planId = parseInt(formData.get('planId'));
        const file = formData.get('transferProof');

        if (!planId || !file) {
            return NextResponse.json({ message: 'Plan ID dan bukti transfer wajib diisi.' }, { status: 400 });
        }

        // Fetch new plan details
        const newPlan = db.prepare('SELECT * FROM plans WHERE id = ?').get(planId);
        if (!newPlan) {
            return NextResponse.json({ message: 'Plan tujuan tidak ditemukan.' }, { status: 404 });
        }

        // Fetch current plan details
        const currentPlan = db.prepare('SELECT * FROM plans WHERE id = ?').get(vendor.planId);

        // Check active project count against target plan maxProjects
        const activeCount = db.prepare("SELECT COUNT(*) as count FROM projects WHERE vendorId = ? AND status != 'archived'").get(vendor.id)?.count || 0;
        if (activeCount > newPlan.maxProjects) {
            return NextResponse.json({ 
                message: `Arsip ${activeCount - newPlan.maxProjects} project terlebih dahulu untuk memilih paket ini (Batas: ${newPlan.maxProjects} project).` 
            }, { status: 400 });
        }

        // Check renewal H-10 window for same plan renewal
        if (planId === vendor.planId && vendor.expiresAt) {
            const expires = new Date(vendor.expiresAt);
            const now = new Date();
            const daysRemaining = Math.max(0, Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
            if (daysRemaining > 10) {
                return NextResponse.json({ 
                    message: `Perpanjangan hanya dapat dilakukan mulai H-10 sebelum expired (Sisa: ${daysRemaining} hari).` 
                }, { status: 400 });
            }
        }

        // Check active Flash Sale Promo for target plan price
        let targetPlanPrice = newPlan.price;
        let isBundlePromo = 0;
        let bundleAddonName = null;
        let bundleAddonType = null;
        let bundleAddonValue = 0;

        if (newPlan.price > 0) {
            const settings = db.prepare("SELECT enable_flash_promo, flash_promo_discount_percent, flash_promo_ends_at, flash_promo_type, flash_bundle_plan_id, flash_bundle_addon_name, flash_bundle_addon_type, flash_bundle_addon_value FROM system_settings WHERE id = 1").get() || {};
            const promoEnds = settings.flash_promo_ends_at ? new Date(settings.flash_promo_ends_at) : null;
            if (settings.enable_flash_promo === 1 && promoEnds && promoEnds > new Date()) {
                const promoType = settings.flash_promo_type || 'percent';
                if (promoType === 'percent') {
                    const pct = settings.flash_promo_discount_percent || 20;
                    targetPlanPrice = Math.round(newPlan.price * (1 - pct / 100));
                } else if (promoType === 'bundle') {
                    const isTarget = !settings.flash_bundle_plan_id || settings.flash_bundle_plan_id === planId;
                    if (isTarget) {
                        isBundlePromo = 1;
                        bundleAddonName = settings.flash_bundle_addon_name || 'Gratis +2 Extra Sub-Event Link';
                        bundleAddonType = settings.flash_bundle_addon_type || 'sub_event';
                        bundleAddonValue = settings.flash_bundle_addon_value || 2;
                    }
                }
            }
        }

        // Calculate proration with smart tiered discount multiplier
        let proratedPrice = targetPlanPrice;

        if (currentPlan && newPlan.price > currentPlan.price && currentPlan.price > 0 && vendor.expiresAt) {
            const expires = new Date(vendor.expiresAt);
            const now = new Date();
            const diffTime = expires.getTime() - now.getTime();
            const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

            if (diffDays > 0) {
                const planDuration = currentPlan.activePeriodDays || 30;
                const daysUsed = Math.max(0, planDuration - diffDays);

                // Determine if target plan is the highest tier active plan
                const maxPlanPrice = db.prepare("SELECT MAX(price) as maxPrice FROM plans WHERE status = 'active'").get()?.maxPrice || 0;
                const isTopTierPlan = newPlan.price >= maxPlanPrice;

                // Smart proration credit factor:
                // 1.0 (100%) if upgrading to top tier plan (upsell promo)
                // 0.85 (85%) if used <= 7 days (early upgrade bonus)
                // 0.70 (70%) if used > 7 days (standard retention)
                let prorationFactor = 0.70;
                if (isTopTierPlan) {
                    prorationFactor = 1.0;
                } else if (daysUsed <= 7) {
                    prorationFactor = 0.85;
                }

                const rawUnusedValue = (currentPlan.price / planDuration) * diffDays;
                const discountValue = Math.round(rawUnusedValue * prorationFactor);
                proratedPrice = Math.max(0, targetPlanPrice - discountValue);
            }
        }

        // Handle File upload
        // 1. Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            return NextResponse.json({ message: 'Ukuran berkas bukti transfer terlalu besar. Maksimal 2MB.' }, { status: 400 });
        }

        // 2. Validate file type (must be image)
        if (!file.type || !file.type.startsWith('image/')) {
            return NextResponse.json({ message: 'Format berkas bukti transfer harus berupa gambar (JPG, PNG, WebP).' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Setup private storage folder
        const uploadDir = path.join(process.cwd(), 'data', 'private_storage', 'proofs');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const ext = file.name ? path.extname(file.name) || '.png' : '.png';
        const fileName = `proof_${vendor.id}_${Date.now()}${ext}`;
        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, buffer);
        const webPath = `/api/admin/proofs/${fileName}`;

        const addonPlanId = formData.get('addonPlanId');
        let addonQuotaBytes = 0;
        if (addonPlanId === 'addon-10gb') addonQuotaBytes = 10 * 1024 * 1024 * 1024;
        else if (addonPlanId === 'addon-25gb') addonQuotaBytes = 25 * 1024 * 1024 * 1024;
        else if (addonPlanId === 'addon-50gb') addonQuotaBytes = 50 * 1024 * 1024 * 1024;

        if (addonPlanId && addonQuotaBytes > 0) {
            db.prepare(`
                UPDATE vendors 
                SET pendingAddonPlanId = ?, pendingAddonQuotaBytes = ?, paymentProof = ? 
                WHERE id = ?
            `).run(addonPlanId, addonQuotaBytes, webPath, vendor.id);
        } else {
            db.prepare('UPDATE vendors SET paymentProof = ? WHERE id = ?').run(webPath, vendor.id);
        }

        // Insert request (include addonPlanId if bundled with storage Add-On & Flash Sale Bundle metadata)
        const insertStmt = db.prepare(`
            INSERT INTO subscription_requests (vendorId, planId, addonPlanId, requestType, proratedPrice, transferProof, isBundlePromo, bundleAddonName, bundleAddonType, bundleAddonValue, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `);
        const reqType = (addonPlanId && addonQuotaBytes > 0) ? 'plan_addon' : 'plan';
        insertStmt.run(vendor.id, planId, addonPlanId || null, reqType, Math.round(proratedPrice), webPath, isBundlePromo, bundleAddonName, bundleAddonType, bundleAddonValue);

        return NextResponse.json({ message: 'Permintaan upgrade berhasil diajukan.', proratedPrice });

    } catch (error) {
        console.error('Upgrade request error:', error);
        return NextResponse.json({ message: 'Gagal memproses permintaan upgrade.' }, { status: 500 });
    }
}
