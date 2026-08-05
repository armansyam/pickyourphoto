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

        const contentType = request.headers.get('content-type') || '';
        let name, email, whatsapp, password, plan, paymentProofFile, rawPaymentMethod;

        if (contentType.includes('application/json')) {
            const body = await request.json();
            name = body.name;
            email = body.email;
            whatsapp = body.whatsapp;
            password = body.password;
            plan = body.plan;
            paymentProofFile = body.paymentProof;
            rawPaymentMethod = body.paymentMethod;
        } else {
            const formData = await request.formData();
            name = formData.get('name');
            email = formData.get('email');
            whatsapp = formData.get('whatsapp');
            password = formData.get('password');
            plan = formData.get('plan');
            paymentProofFile = formData.get('paymentProof');
            rawPaymentMethod = formData.get('paymentMethod');
        }

        if (!email || !plan) {
            return NextResponse.json({ message: 'Email dan pilihan paket wajib diisi.' }, { status: 400 });
        }
        const finalWhatsapp = whatsapp ? whatsapp.trim() : '';



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
        }


        const initialStatus = isGateway ? 'pending_payment' : 'pending_manual';

        if (existingVendor && existingVendor.status !== 'active') {
            const hashedPassword = password ? await bcrypt.hash(password, 10) : existingVendor.password;
            const vendorName = name || existingVendor.name || email.split('@')[0];

            // Mark previous expired sessions as replaced so auto-cleanup worker does not re-archive
            try {
                db.prepare("UPDATE payment_sessions SET status = 'replaced' WHERE vendorId = ? AND status = 'expired'").run(existingVendor.id);
            } catch (e) {}

            const updateStmt = db.prepare(`
                UPDATE vendors 
                SET name = ?, whatsapp = ?, password = ?, planId = ?, maxProjects = ?, paymentProof = ?, status = ?, archivedAt = NULL
                WHERE id = ?
            `);
            updateStmt.run(vendorName, finalWhatsapp, hashedPassword, planDetails.id, planDetails.maxProjects, paymentProofPath, initialStatus, existingVendor.id);

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
        const info = insertStmt.run(name || email.split('@')[0], email, finalWhatsapp, hashedPassword, 'vendor', initialStatus, planDetails.maxProjects, planDetails.id, paymentProofPath);


        return NextResponse.json({ 
            message: isGateway ? 'Registration submitted successfully. Waiting for QRIS payment.' : 'Registration submitted successfully. Waiting for admin approval.', 
            vendorId: info.lastInsertRowid 
        }, { status: 201 });


    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
    }
}