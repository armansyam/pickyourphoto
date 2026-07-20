import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';

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

        // Calculate proration
        let proratedPrice = newPlan.price;

        // If target plan is more expensive than current plan, apply proration discount
        if (currentPlan && newPlan.price > currentPlan.price && currentPlan.price > 0 && vendor.expiresAt) {
            const expires = new Date(vendor.expiresAt);
            const now = new Date();
            const diffTime = expires.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 0) {
                // Calculate plan duration based on standard 30-day monthly billing cycle
                const planDuration = 30;
                const unusedValue = (currentPlan.price / planDuration) * diffDays;
                proratedPrice = Math.max(0, newPlan.price - unusedValue);
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

        // Compress and resize payment proof using Sharp
        let compressedBuffer;
        try {
            compressedBuffer = await sharp(buffer)
                .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 75 })
                .toBuffer();
        } catch (err) {
            console.error('Failed to compress transfer proof:', err);
            return NextResponse.json({ message: 'Gagal memproses berkas bukti transfer.' }, { status: 400 });
        }

        // Setup uploads folder
        const uploadDir = path.join(process.cwd(), 'public', 'staging_uploads', 'payment_proofs');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Generate safe unique filename
        const uniqueName = `${crypto.randomBytes(16).toString('hex')}.jpg`;
        const filePath = path.join(uploadDir, uniqueName);

        // Write file
        fs.writeFileSync(filePath, compressedBuffer);
        const webPath = `/staging_uploads/payment_proofs/${uniqueName}`;

        // Insert request
        const insertStmt = db.prepare(`
            INSERT INTO subscription_requests (vendorId, planId, proratedPrice, transferProof, status)
            VALUES (?, ?, ?, ?, 'pending')
        `);
        insertStmt.run(vendor.id, planId, Math.round(proratedPrice), webPath);

        return NextResponse.json({ message: 'Permintaan upgrade berhasil diajukan.', proratedPrice });

    } catch (error) {
        console.error('Upgrade request error:', error);
        return NextResponse.json({ message: 'Gagal memproses permintaan upgrade.' }, { status: 500 });
    }
}
