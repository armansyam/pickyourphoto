import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

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
        const clientIp = getClientIp(request);
        const rateCheck = checkRateLimit(`check_pending_ip_${clientIp}`, 30, 60);
        if (!rateCheck.success) {
            return NextResponse.json({ 
                hasPending: false, 
                message: `Terlalu banyak permintaan. Harap tunggu ${rateCheck.resetSeconds} detik.` 
            }, { status: 429 });
        }

        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email')?.toLowerCase().trim();

        if (!email) {
            return NextResponse.json({ hasPending: false });
        }

        // Check vendor — include pending_payment, draft_plan, and expired_draft
        const vendor = db.prepare(`
            SELECT id, name, email, whatsapp, planId, status 
            FROM vendors 
            WHERE email = ? AND status IN ('pending_payment', 'expired_draft', 'draft_plan')
        `).get(email);
        if (!vendor) {
            return NextResponse.json({ hasPending: false });
        }

        const maskedPhone = maskPhoneNumber(vendor.whatsapp);

        // Find active pending payment session (not yet expired)
        const session = db.prepare(`
            SELECT orderId, planId, amount, paymentMethod, qrUrl, expiresAt, rawResponse 
            FROM payment_sessions 
            WHERE vendorId = ? AND status = 'pending' AND expiresAt > CURRENT_TIMESTAMP 
            ORDER BY id DESC LIMIT 1
        `).get(vendor.id);

        // If no active QRIS session, check if there was an actual expired payment session or selected plan
        if (!session) {
            const lastSession = db.prepare(`
                SELECT orderId, planId, amount, paymentMethod, expiresAt, status
                FROM payment_sessions 
                WHERE vendorId = ? 
                ORDER BY id DESC LIMIT 1
            `).get(vendor.id);

            // 1. Only mark as expired if there was a real payment session that has expired
            if (lastSession && (lastSession.status === 'expired' || (lastSession.expiresAt && new Date(lastSession.expiresAt) <= new Date()))) {
                const plan = lastSession.planId ? db.prepare("SELECT id, name, price FROM plans WHERE id = ?").get(lastSession.planId) : null;
                if (plan) {
                    return NextResponse.json({
                        hasPending: false,
                        hasExpired: true,
                        vendorId: vendor.id,
                        name: vendor.name,
                        email: vendor.email,
                        rawWhatsapp: vendor.whatsapp || '',
                        whatsapp: maskedPhone,
                        orderId: lastSession.orderId || null,
                        planName: plan.name,
                        planPrice: plan.price,
                        planId: plan.id,
                        amount: lastSession.amount || plan.price,
                    });
                }
            }

            // 2. If vendor already selected a plan (Step 3: Detail), return plan details without expired alert
            if (vendor.planId) {
                const plan = db.prepare("SELECT id, name, price FROM plans WHERE id = ?").get(vendor.planId);
                if (plan) {
                    return NextResponse.json({
                        hasPending: false,
                        hasExpired: false,
                        vendorId: vendor.id,
                        name: vendor.name,
                        email: vendor.email,
                        rawWhatsapp: vendor.whatsapp || '',
                        whatsapp: maskedPhone,
                        planName: plan.name,
                        planPrice: plan.price,
                        planId: plan.id,
                        amount: plan.price,
                    });
                }
            }

            // 3. New registrant with no plan selected (Step 2: Choose Plan)
            return NextResponse.json({ 
                hasPending: false, 
                hasExpired: false, 
                planId: null,
                vendorId: vendor.id, 
                email: vendor.email, 
                rawWhatsapp: vendor.whatsapp || '' 
            });
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
            rawWhatsapp: vendor.whatsapp || '',
            whatsapp: maskedPhone,
            orderId: session.orderId,
            provider: session.paymentMethod || 'midtrans',
            token,
            redirectUrl,
            qrUrl,
            qrImage: qrUrl,
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
