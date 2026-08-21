import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { getPaymentGatewayConfig } from '@/lib/payment-gateway';
import { autoGenerateUniqueSubdomain } from '@/lib/subdomain';

export async function POST(request) {
    try {
        const clientIp = getClientIp(request);
        const rateCheck = checkRateLimit(`register_ip_${clientIp}`, 5, 60);

        if (!rateCheck.success) {
            return NextResponse.json({
                message: `Terlalu banyak percobaan pendaftaran. Harap tunggu ${rateCheck.resetSeconds} detik.`
            }, { status: 429 });
        }

        const contentType = request.headers.get('content-type') || '';
        let name, email, whatsapp, password, plan, paymentProofFile, rawPaymentMethod, addonPlanId;

        if (contentType.includes('application/json')) {
            const body = await request.json();
            name = body.name;
            email = body.email;
            whatsapp = body.whatsapp;
            password = body.password;
            plan = body.plan;
            paymentProofFile = body.paymentProof;
            rawPaymentMethod = body.paymentMethod;
            addonPlanId = body.addonPlanId;
        } else {
            const formData = await request.formData();
            name = formData.get('name');
            email = formData.get('email');
            whatsapp = formData.get('whatsapp');
            password = formData.get('password');
            plan = formData.get('plan');
            paymentProofFile = formData.get('paymentProof');
            rawPaymentMethod = formData.get('paymentMethod');
            addonPlanId = formData.get('addonPlanId');
        }

        if (!email || !plan) {
            return NextResponse.json({ message: 'Email dan pilihan paket wajib diisi.' }, { status: 400 });
        }
        const finalWhatsapp = whatsapp ? whatsapp.trim() : '';

        // Determine Add-On Storage Quota Bytes if addonPlanId is provided (only if active)
        let addonQuotaBytes = 0;
        let selectedAddonKey = addonPlanId || null;
        if (selectedAddonKey) {
            const addonRow = db.prepare('SELECT id, quotaBytes, status FROM addon_plans WHERE planKey = ? OR id = ?').get(selectedAddonKey, selectedAddonKey);
            if (addonRow) {
                if (addonRow.status === 'active') {
                    addonQuotaBytes = addonRow.quotaBytes;
                } else {
                    return NextResponse.json({ message: 'Paket Add-On Storage yang dipilih sedang dinonaktifkan.' }, { status: 400 });
                }
            } else {
                if (selectedAddonKey === 'addon-10gb') addonQuotaBytes = 10 * 1024 * 1024 * 1024;
                else if (selectedAddonKey === 'addon-25gb') addonQuotaBytes = 25 * 1024 * 1024 * 1024;
                else if (selectedAddonKey === 'addon-50gb') addonQuotaBytes = 50 * 1024 * 1024 * 1024;
            }
        }

        // --- Registration Settings & Quota Check ---
        const settings = db.prepare("SELECT enable_registration, max_vendor_quota FROM system_settings WHERE id = 1").get() || {
            enable_registration: 1,
            max_vendor_quota: null
        };

        if (settings.enable_registration === 0) {
            return NextResponse.json({ message: 'Pendaftaran ditutup oleh administrator.' }, { status: 403 });
        }

        if (settings.max_vendor_quota !== null && settings.max_vendor_quota > 0) {
            const activeVendorCount = db.prepare(`
                SELECT COUNT(*) as count 
                FROM vendors 
                WHERE role = 'vendor' AND status = 'active'
            `).get()?.count || 0;

            if (activeVendorCount >= settings.max_vendor_quota) {
                return NextResponse.json({ message: 'Kuota registrasi kami sudah penuh saat ini.' }, { status: 403 });
            }
        }

        const checkStmt = db.prepare('SELECT * FROM vendors WHERE email = ?');
        const existingVendor = checkStmt.get(email);

        if (existingVendor && existingVendor.status === 'active') {
            return NextResponse.json({ message: 'Email sudah terdaftar. Silakan login.' }, { status: 409 });
        }

        // Blokir registrasi jika email sudah digunakan oleh admin
        const existingAdmin = db.prepare('SELECT id FROM admins WHERE email = ?').get(email.toLowerCase().trim());
        if (existingAdmin) {
            return NextResponse.json({ message: 'Email sudah terdaftar. Silakan login.' }, { status: 409 });
        }

        // Lookup plan
        const planStmt = db.prepare('SELECT * FROM plans WHERE id = ?');
        let planDetails = planStmt.get(plan);

        if (!planDetails) {
            planDetails = db.prepare('SELECT * FROM plans ORDER BY price ASC LIMIT 1').get();
        }

        // Block free plans (price=0) from registration — use trial gallery on landing page
        if (planDetails.price === 0) {
            return NextResponse.json({ message: 'Paket gratis tidak tersedia di form registrasi. Gunakan fitur trial di halaman utama untuk mencoba platform.' }, { status: 400 });
        }

        const selectedPaymentMethod = rawPaymentMethod || 'manual';
        const isGateway = selectedPaymentMethod === 'gateway' || selectedPaymentMethod === 'qris';
        const isManual = selectedPaymentMethod === 'manual';

        if (!paymentProofFile && !isGateway) {
            return NextResponse.json({ message: 'Bukti transfer pembayaran wajib diupload untuk paket berbayar.' }, { status: 400 });
        }

        // Save payment proof file without sharp compression
        let paymentProofPath = '';
        if (isManual && paymentProofFile && typeof paymentProofFile === 'object') {
            try {
                const buffer = Buffer.from(await paymentProofFile.arrayBuffer());
                const ext = path.extname(paymentProofFile.name || '.png') || '.png';
                const filename = `proof_${Date.now()}_${Math.random().toString(36).slice(2, 7)}${ext}`;
                const uploadDir = path.join(process.cwd(), 'data', 'payment_proofs');

                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                const filePath = path.join(uploadDir, filename);
                fs.writeFileSync(filePath, buffer);
                paymentProofPath = `/api/admin/proofs/${filename}`;
            } catch (err) {
                console.error('Failed to save payment proof image:', err);
                return NextResponse.json({ message: 'Failed to process payment proof image.' }, { status: 400 });
            }
        } else if (isGateway) {
            // Gunakan nama provider aktif secara dinamis (bukan hardcode Midtrans)
            const pgConfig = getPaymentGatewayConfig();
            const providerLabel = (pgConfig?.provider || 'gateway').charAt(0).toUpperCase() + (pgConfig?.provider || 'gateway').slice(1);
            paymentProofPath = `${providerLabel} Automatic Payment`;
        }


        const initialStatus = isGateway ? 'pending_payment' : 'pending_manual';

        if (existingVendor && existingVendor.status !== 'active') {
            const hashedPassword = password ? await bcrypt.hash(password, 10) : existingVendor.password;
            const vendorName = name || existingVendor.name || email.split('@')[0];

            // Mark previous expired sessions as replaced so auto-cleanup worker does not re-archive
            try {
                db.prepare("UPDATE payment_sessions SET status = 'replaced' WHERE vendorId = ? AND status = 'expired'").run(existingVendor.id);
            } catch (e) {}

            const currentSub = existingVendor.subdomain || autoGenerateUniqueSubdomain(vendorName, existingVendor.id);
            const updateStmt = db.prepare(`
                UPDATE vendors 
                SET name = ?, whatsapp = ?, password = ?, planId = ?, maxProjects = ?, paymentProof = ?, status = ?, pendingAddonPlanId = ?, pendingAddonQuotaBytes = ?, archivedAt = NULL, subdomain = ?, subdomain_active = 1, subdomain_set_at = COALESCE(subdomain_set_at, datetime('now'))
                WHERE id = ?
            `);
            updateStmt.run(vendorName, finalWhatsapp, hashedPassword, planDetails.id, planDetails.maxProjects, paymentProofPath, initialStatus, selectedAddonKey, addonQuotaBytes, currentSub, existingVendor.id);

            const targetVendorId = existingVendor.id;
            
            // Trigger Manual Transfer Pending Email if not gateway
            if (!isGateway) {
                const mailer = await import('@/lib/mailer.js');
                const addonName = selectedAddonKey ? (selectedAddonKey === 'addon-10gb' ? 'Drive 10 GB' : selectedAddonKey === 'addon-25gb' ? 'Drive 25 GB' : 'Drive 50 GB') : null;
                if (paymentProofPath) {
                    mailer.sendPendingManualTransferReceivedEmail({ name: vendorName, email }, planDetails, addonName).catch(() => {});
                } else {
                    mailer.sendPendingManualTransferInstructionEmail({ name: vendorName, email }, planDetails, addonName).catch(() => {});
                }
            }

            return NextResponse.json({ 
                message: isGateway ? 'Registration submitted successfully. Waiting for QRIS payment.' : 'Registration submitted successfully. Waiting for admin approval.', 
                vendorId: targetVendorId 
            }, { status: 200 });
        }

        const hashedPassword = await bcrypt.hash(password || Math.random().toString(36), 10);
        const autoSubdomain = autoGenerateUniqueSubdomain(name || email.split('@')[0]);

        const insertStmt = db.prepare(`
            INSERT INTO vendors (name, email, whatsapp, password, role, status, maxProjects, planId, paymentProof, pendingAddonPlanId, pendingAddonQuotaBytes, resetRequested, subdomain, subdomain_active, subdomain_set_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 1, datetime('now'))
        `);
        const info = insertStmt.run(name || email.split('@')[0], email, finalWhatsapp, hashedPassword, 'vendor', initialStatus, planDetails.maxProjects, planDetails.id, paymentProofPath, selectedAddonKey, addonQuotaBytes, autoSubdomain);
        const newVendorId = info.lastInsertRowid;

        // Trigger Manual Transfer Pending Email if not gateway
        if (!isGateway) {
            const mailer = await import('@/lib/mailer.js');
            const addonName = selectedAddonKey ? (selectedAddonKey === 'addon-10gb' ? 'Drive 10 GB' : selectedAddonKey === 'addon-25gb' ? 'Drive 25 GB' : 'Drive 50 GB') : null;
            if (paymentProofPath) {
                mailer.sendPendingManualTransferReceivedEmail({ name: name || email.split('@')[0], email }, planDetails, addonName).catch(() => {});
            } else {
                mailer.sendPendingManualTransferInstructionEmail({ name: name || email.split('@')[0], email }, planDetails, addonName).catch(() => {});
            }
        }

        return NextResponse.json({ 
            message: isGateway ? 'Registration submitted successfully. Waiting for QRIS payment.' : 'Registration submitted successfully. Waiting for admin approval.', 
            vendorId: newVendorId 
        }, { status: 201 });


    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
    }
}