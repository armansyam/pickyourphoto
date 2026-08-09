import { NextResponse } from 'next/server';
import { getPaymentGatewayConfig } from '@/lib/payment-gateway';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Proxy route: /api/payment/qr-image?orderId=ORDER-xxx
 * Fetches the real QRIS image from Midtrans sandbox/production
 * with Authorization header, then serves it to the browser.
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const orderId = searchParams.get('orderId');

        if (!orderId) {
            return NextResponse.json({ message: 'orderId required' }, { status: 400 });
        }

        const config = getPaymentGatewayConfig();
        const serverKey = config.serverKey || '';

        // QR image proxy hanya tersedia untuk Midtrans (provider lain tidak punya QRIS URL yang dapat di-proxy)
        if (config.provider !== 'midtrans') {
            return NextResponse.json({
                message: `Provider aktif (${config.provider}) tidak mendukung QR image proxy. QR Code ditampilkan langsung dari URL payment.`
            }, { status: 400 });
        }

        if (!serverKey) {
            return NextResponse.json({ message: 'Server key not configured' }, { status: 500 });
        }

        const isProduction = config.isProduction || false;
        const authHeader = 'Basic ' + Buffer.from(serverKey + ':').toString('base64');

        // First try: use stored qrUrl from DB
        const session = db.prepare(`SELECT qrUrl, rawResponse FROM payment_sessions WHERE orderId = ? LIMIT 1`).get(orderId);
        let qrImageUrl = session?.qrUrl || null;

        // If qrUrl isn't a valid Midtrans URL, derive it from orderId
        if (!qrImageUrl || !qrImageUrl.startsWith('http')) {
            qrImageUrl = isProduction
                ? `https://api.midtrans.com/v2/qris/${orderId}/qr-code`
                : `https://api.sandbox.midtrans.com/v2/qris/${orderId}/qr-code`;
        }

        // Also try to get from rawResponse actions
        if (session?.rawResponse) {
            try {
                const raw = JSON.parse(session.rawResponse);
                if (Array.isArray(raw.actions)) {
                    const act = raw.actions.find(a => a.name === 'generate-qr-code');
                    if (act?.url) qrImageUrl = act.url;
                }
            } catch {}
        }

        // Fetch QR image from Midtrans with auth
        const imgRes = await fetch(qrImageUrl, {
            headers: { 'Authorization': authHeader },
        });

        if (!imgRes.ok) {
            return NextResponse.json({ message: `Midtrans QR fetch failed: ${imgRes.status}` }, { status: 502 });
        }

        const imageBuffer = await imgRes.arrayBuffer();
        const contentType = imgRes.headers.get('content-type') || 'image/png';

        return new Response(imageBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=300',
            },
        });

    } catch (error) {
        console.error('[QR Image Proxy Error]:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
