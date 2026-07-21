import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const name = formData.get('name');
        const email = formData.get('email');
        const whatsapp = formData.get('whatsapp');
        const password = formData.get('password');
        const plan = formData.get('plan');
        const paymentProofFile = formData.get('paymentProof');

        if (!name || !email || !whatsapp || !password || !plan) {
            return NextResponse.json({ message: 'Name, email, WhatsApp, password, and plan are required.' }, { status: 400 });
        }

        // --- NEW: Registration Settings & Disk Protection Backend Check ---
        const settings = db.prepare("SELECT * FROM system_settings WHERE id = 1").get() || {
            enable_registration: 1,
            enable_free_trial: 1,
            max_vendor_quota: null,
            disk_critical_threshold_percent: 10
        };

        if (settings.enable_registration === 0) {
            return NextResponse.json({ message: 'Pendaftaran ditutup oleh administrator.' }, { status: 403 });
        }

        try {
            const { statfs } = require('fs/promises');
            const stats = await statfs(process.cwd());
            const totalBytes = stats.blocks * stats.bsize;
            const freeBytes = stats.bfree * stats.bsize;
            const freePercent = (freeBytes / totalBytes) * 100;

            if (freePercent < settings.disk_critical_threshold_percent) {
                return NextResponse.json({ message: 'Kuota registrasi kami sudah penuh saat ini.' }, { status: 403 });
            }
        } catch (diskErr) {
            console.error('Failed to read disk space during registration POST check:', diskErr);
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
        // ------------------------------------------------------------------

        const checkStmt = db.prepare('SELECT id FROM vendors WHERE email = ?');
        const existingVendor = checkStmt.get(email);

        if (existingVendor) {
            return NextResponse.json({ message: 'Email already in use.' }, { status: 409 });
        }

        const checkWaStmt = db.prepare('SELECT id FROM vendors WHERE whatsapp = ?');
        const existingWa = checkWaStmt.get(whatsapp);
        if (existingWa) {
            return NextResponse.json({ message: 'WhatsApp number already in use.' }, { status: 409 });
        }

        // 1. Lookup plan
        const planStmt = db.prepare('SELECT * FROM plans WHERE id = ?');
        let planDetails = planStmt.get(plan);

        if (!planDetails) {
            // Default to basic plan
            planDetails = db.prepare('SELECT * FROM plans ORDER BY price ASC LIMIT 1').get();
        }

        const isFreePlan = planDetails.price === 0;

        // Reject if free trials are disabled but user requests a free plan
        if (isFreePlan && settings.enable_free_trial === 0) {
            return NextResponse.json({ message: 'Paket uji coba gratis tidak tersedia saat ini.' }, { status: 400 });
        }

        // Verify payment proof file if plan is paid
        if (!isFreePlan && !paymentProofFile) {
            return NextResponse.json({ message: 'Bukti transfer pembayaran wajib diupload untuk paket berbayar.' }, { status: 400 });
        }

        // 2. Process payment proof file with Sharp compression if provided
        let paymentProofPath = '';
        if (paymentProofFile && paymentProofFile.size > 0) {
            try {
                const arrayBuffer = await paymentProofFile.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                // Resize and compress
                const compressedBuffer = await sharp(buffer)
                    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: 70 })
                    .toBuffer();

                // Setup directories
                const proofDir = path.join(process.cwd(), 'public', 'staging_uploads', 'payment_proofs');
                if (!fs.existsSync(proofDir)) {
                    fs.mkdirSync(proofDir, { recursive: true });
                }

                const filename = `${Date.now()}_proof.jpg`;
                const filepath = path.join(proofDir, filename);
                await fs.promises.writeFile(filepath, compressedBuffer);
                
                paymentProofPath = `/staging_uploads/payment_proofs/${filename}`;
            } catch (err) {
                console.error('Failed to compress/save payment proof:', err);
                return NextResponse.json({ message: 'Failed to process payment proof image.' }, { status: 400 });
            }
        } else if (isFreePlan) {
            paymentProofPath = 'Free Trial';
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Insert vendor (default expiresAt to NULL, it will be calculated during superadmin approval)
        const insertStmt = db.prepare(`
            INSERT INTO vendors (name, email, whatsapp, password, role, status, maxProjects, planId, paymentProof, resetRequested) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `);
        const info = insertStmt.run(name, email, whatsapp, hashedPassword, 'vendor', 'pending', planDetails.maxProjects, planDetails.id, paymentProofPath);

        return NextResponse.json({ 
            message: 'Registration submitted successfully. Waiting for admin approval.', 
            vendorId: info.lastInsertRowid 
        }, { status: 201 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
    }
}