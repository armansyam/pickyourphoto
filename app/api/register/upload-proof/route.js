import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import db from '@/lib/db';
import { sendPendingManualTransferReceivedEmail } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const email = (formData.get('email') || '').toLowerCase().trim();
        const proofFile = formData.get('paymentProof');

        if (!email) {
            return NextResponse.json({ success: false, message: 'Email vendor wajib disertakan.' }, { status: 400 });
        }

        if (!proofFile || typeof proofFile !== 'object' || !proofFile.name) {
            return NextResponse.json({ success: false, message: 'File bukti transfer wajib dipilih.' }, { status: 400 });
        }

        const vendor = db.prepare('SELECT * FROM vendors WHERE lower(email) = ?').get(email);
        if (!vendor) {
            return NextResponse.json({ success: false, message: 'Akun vendor tidak ditemukan.' }, { status: 404 });
        }

        // Save proof file to data/payment_proofs
        const buffer = Buffer.from(await proofFile.arrayBuffer());
        const ext = path.extname(proofFile.name || '.png') || '.png';
        const filename = `proof_${Date.now()}_${Math.random().toString(36).slice(2, 7)}${ext}`;
        const uploadDir = path.join(process.cwd(), 'data', 'payment_proofs');

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, buffer);
        const paymentProofPath = `/api/admin/proofs/${filename}`;

        // Update vendor status & proof in DB
        db.prepare(`
            UPDATE vendors 
            SET paymentProof = ?, status = 'pending_manual', archivedAt = NULL
            WHERE id = ?
        `).run(paymentProofPath, vendor.id);

        // Notify Admin / Vendor by Email
        try {
            const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(vendor.planId);
            const addonName = vendor.pendingAddonPlanId ? (vendor.pendingAddonPlanId === 'addon-10gb' ? 'Drive 10 GB' : vendor.pendingAddonPlanId === 'addon-25gb' ? 'Drive 25 GB' : 'Drive 50 GB') : null;
            sendPendingManualTransferReceivedEmail(vendor, plan || { name: 'Paket Langganan', price: 0 }, addonName).catch(() => {});
        } catch (mailErr) {
            console.warn('[Upload Proof Email Error]:', mailErr.message);
        }

        return NextResponse.json({
            success: true,
            proofUrl: paymentProofPath,
            message: 'Bukti transfer berhasil diunggah. Admin akan segera memverifikasi akun Anda.'
        });

    } catch (error) {
        console.error('[Upload Proof Error]:', error);
        return NextResponse.json({ success: false, message: 'Gagal mengunggah bukti transfer: ' + error.message }, { status: 500 });
    }
}
