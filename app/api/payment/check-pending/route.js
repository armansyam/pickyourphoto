import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email')?.toLowerCase().trim();

        if (!email) {
            return NextResponse.json({ hasPending: false });
        }

        // Check vendor — include expired_draft so they can regenerate from register page
        const vendor = db.prepare(`
            SELECT id, name, email, whatsapp, planId, status 
            FROM vendors 
            WHERE email = ? AND status IN ('pending_payment', 'expired_draft')
        `).get(email);
        if (!vendor) {
            return NextResponse.json({ hasPending: false });
        }

        // Vendor sudah di-archive (expired_draft) — langsung tampilkan card expired
        if (vendor.status === 'expired_draft') {
            const plan = db.prepare("SELECT id, name, price FROM plans WHERE id = ?").get(vendor.planId);
            // Try to get last order info from payment_sessions
            const lastSession = db.prepare(`
                SELECT orderId, amount FROM payment_sessions 
                WHERE vendorId = ? ORDER BY id DESC LIMIT 1
            `).get(vendor.id);
            return NextResponse.json({
                hasPending: false,
                hasExpired: true,
                vendorId: vendor.id,
                name: vendor.name,
                email: vendor.email,
                whatsapp: vendor.whatsapp,
                orderId: lastSession?.orderId || null,
                planName: plan?.name || 'Paket SaaS',
                planPrice: plan?.price || lastSession?.amount || 0,
                planId: vendor.planId,
                amount: lastSession?.amount || plan?.price || 0,
            });
        }

        // Find active pending payment session (not yet expired)
        const session = db.prepare(`
            SELECT orderId, planId, amount, paymentMethod, qrUrl, expiresAt, rawResponse 
            FROM payment_sessions 
            WHERE vendorId = ? AND status = 'pending' AND expiresAt > CURRENT_TIMESTAMP 
            ORDER BY id DESC LIMIT 1
        `).get(vendor.id);

        // Check if there's an expired session (no active one) — vendor still pending_payment
        if (!session) {
            const expiredSession = db.prepare(`
                SELECT orderId, planId, amount, paymentMethod, expiresAt
                FROM payment_sessions 
                WHERE vendorId = ? AND (status = 'pending' OR status = 'replaced') AND expiresAt <= CURRENT_TIMESTAMP 
                ORDER BY id DESC LIMIT 1
            `).get(vendor.id);

            if (expiredSession) {
                const plan = db.prepare("SELECT id, name, price FROM plans WHERE id = ?").get(expiredSession.planId || vendor.planId);
                return NextResponse.json({
                    hasPending: false,
                    hasExpired: true,
                    vendorId: vendor.id,
                    name: vendor.name,
                    email: vendor.email,
                    whatsapp: vendor.whatsapp,
                    orderId: expiredSession.orderId,
                    planName: plan?.name || 'Paket SaaS',
                    planPrice: plan?.price || expiredSession.amount,
                    planId: expiredSession.planId || vendor.planId,
                    amount: expiredSession.amount,
                });
            }
            return NextResponse.json({ hasPending: false });
        }


        let token = null;
        let redirectUrl = null;
        let qrUrl = session.qrUrl || null;
        try {
            const raw = JSON.parse(session.rawResponse || '{}');
            token = raw.token || null;
            redirectUrl = raw.redirect_url || raw.paymentUrl || null;
            if (!qrUrl && raw.actions) {
                const qrAction = raw.actions.find(a => a.name === 'generate-qr-code');
                if (qrAction) qrUrl = qrAction.url;
            }
        } catch (e) {}

        const plan = db.prepare("SELECT id, name, price, activePeriodDays, maxProjects FROM plans WHERE id = ?").get(session.planId || vendor.planId);

        return NextResponse.json({
            hasPending: true,
            vendorId: vendor.id,
            name: vendor.name,
            email: vendor.email,
            whatsapp: vendor.whatsapp,
            orderId: session.orderId,
            token,
            redirectUrl,
            qrUrl,
            amount: session.amount,
            expiresAt: session.expiresAt,
            planName: plan?.name || 'Paket SaaS',
            planPrice: plan?.price || session.amount,
        });

    } catch (error) {
        console.error('[Check Pending Payment Error]:', error);
        return NextResponse.json({ hasPending: false, message: error.message }, { status: 500 });
    }
}
