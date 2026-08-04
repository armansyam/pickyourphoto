import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request) {
    try {
        const clientIp = getClientIp(request);
        const rateCheck = checkRateLimit(`register_ip_${clientIp}`, 5, 60);

        if (!rateCheck.success) {
            return NextResponse.json({
                message: `Terlalu banyak percobaan pendaftaran. Harap tunggu ${rateCheck.resetSeconds} detik.`
            }, { status: 429 });
        }

        const formData = await request.formData();
        const name = formData.get('name');
        const email = formData.get('email');
        const whatsapp = formData.get('whatsapp');
        const password = formData.get('password');
        const plan = formData.get('plan');
        const paymentProofFile = formData.get('paymentProof');

        if (!email || !whatsapp || !plan) {
            return NextResponse.json({ message: 'Email, nomor WhatsApp, dan pilihan paket wajib diisi.' }, { status: 400 });
        }


        // --- Registration Settings & Quota Check ---
        const settings = db.prepare("SELECT * FROM system_settings WHERE id = 1").get() || {
            enable_registration: 1,
            enable_free_trial: 1,
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

        const checkWaStmt = db.prepare('SELECT id FROM vendors WHERE whatsapp = ?');
        const existingWa = checkWaStmt.get(whatsapp);
        if (existingWa) {
            return NextResponse.json({ message: 'WhatsApp number already in use.' }, { status: 409 });
        }

        // Lookup plan
        const planStmt = db.prepare('SELECT * FROM plans WHERE id = ?');
        let planDetails = planStmt.get(plan);

        if (!planDetails) {
            planDetails = db.prepare('SELECT * FROM plans ORDER BY price ASC LIMIT 1').get();
        }

        const isFreePlan = planDetails.price === 0;

        if (isFreePlan && settings.enable_free_trial === 0) {
            return NextResponse.json({ message: 'Paket uji coba gratis tidak tersedia saat ini.' }, { status: 400 });
        }

        const isGateway = formData.get('paymentMethod') === 'gateway';

        if (!isFreePlan && !paymentProofFile && !isGateway) {
            return NextResponse.json({ message: 'Bukti transfer pembayaran wajib diupload untuk paket berbayar.' }, { status: 400 });
        }

        // Save payment proof file without sharp compression
        let paymentProofPath = '';
        if (paymentProofFile && paymentProofFile.size > 0 && typeof paymentProofFile !== 'string') {
            try {
                const arrayBuffer = await paymentProofFile.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                const proofDir = path.join(process.cwd(), 'public', 'staging_uploads', 'payment_proofs');
                if (!fs.existsSync(proofDir)) {
                    fs.mkdirSync(proofDir, { recursive: true });
                }

                const originalName = paymentProofFile.name || 'proof.jpg';
                const ext = path.extname(originalName) || '.jpg';
                const filename = `${Date.now()}_proof${ext}`;
                const filepath = path.join(proofDir, filename);
                await fs.promises.writeFile(filepath, buffer);
                
                paymentProofPath = `/staging_uploads/payment_proofs/${filename}`;
            } catch (err) {
                console.error('Failed to save payment proof:', err);
                return NextResponse.json({ message: 'Failed to process payment proof image.' }, { status: 400 });
            }
        } else if (isGateway) {
            paymentProofPath = 'Midtrans Automatic Payment';
        } else if (isFreePlan) {
            paymentProofPath = 'Free Trial';
        }


        const initialStatus = isGateway ? 'pending_payment' : 'pending';

        if (existingVendor && (existingVendor.status === 'pending' || existingVendor.status === 'pending_payment')) {
            const updateStmt = db.prepare(`
                UPDATE vendors 
                SET whatsapp = ?, planId = ?, maxProjects = ?, paymentProof = ?, status = ?
                WHERE id = ?
            `);
            updateStmt.run(whatsapp, planDetails.id, planDetails.maxProjects, paymentProofPath, initialStatus, existingVendor.id);

            return NextResponse.json({ 
                message: isGateway ? 'Registration submitted successfully. Waiting for QRIS payment.' : 'Registration submitted successfully. Waiting for admin approval.', 
                vendorId: existingVendor.id 
            }, { status: 200 });
        }

        const hashedPassword = await bcrypt.hash(password || Math.random().toString(36), 10);

        const insertStmt = db.prepare(`
            INSERT INTO vendors (name, email, whatsapp, password, role, status, maxProjects, planId, paymentProof, resetRequested) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `);
        const info = insertStmt.run(name || email.split('@')[0], email, whatsapp, hashedPassword, 'vendor', initialStatus, planDetails.maxProjects, planDetails.id, paymentProofPath);

        return NextResponse.json({ 
            message: isGateway ? 'Registration submitted successfully. Waiting for QRIS payment.' : 'Registration submitted successfully. Waiting for admin approval.', 
            vendorId: info.lastInsertRowid 
        }, { status: 201 });


    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
    }
}