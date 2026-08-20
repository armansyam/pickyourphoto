import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';

export async function POST(request) {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        let _body; try { _body = await request.json(); } catch (_) { return NextResponse.json({ message: 'Format body tidak valid.' }, { status: 400 }); }

        const { provider, serverKey, clientKey, isProduction } = _body || {};

        if (!serverKey || !serverKey.trim()) {
            return NextResponse.json({ message: 'Server Key wajib diisi untuk melakukan tes koneksi.' }, { status: 400 });
        }

        const selectedProvider = (provider || 'midtrans').toLowerCase();

        if (selectedProvider === 'ipaymu') {
            const va = (clientKey || '').trim();
            const apiKey = (serverKey || '').trim();

            if (!va) {
                return NextResponse.json({ message: 'Nomor VA IPaymu wajib diisi untuk melakukan tes koneksi.' }, { status: 400 });
            }

            const baseUrl = isProduction 
                ? 'https://my.ipaymu.com/api/v2/balance' 
                : 'https://sandbox.ipaymu.com/api/v2/balance';

            const { generateIPaymuSignature } = await import('@/lib/payment-gateway/ipaymu.js');
            const d = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            const timestamp = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
            const payload = { account: va };
            const signature = generateIPaymuSignature('POST', va, payload, apiKey);

            const res = await fetch(baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'va': va,
                    'signature': signature,
                    'timestamp': timestamp,
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok && data.Status === 200) {
                const merchantName = data.Data?.Merchant || 'Merchant IPaymu';
                return NextResponse.json({
                    success: true,
                    message: `✅ Tes Koneksi IPaymu (${isProduction ? 'Production' : 'Sandbox'}) BERHASIL! Terhubung sebagai \"${merchantName}\" (VA: ${va}).`,
                });
            } else {
                return NextResponse.json({
                    success: false,
                    message: `❌ Tes Koneksi IPaymu Gagal: ${data.Message || data.message || 'Kredensial VA / API Key tidak valid atau ditolak IPaymu.'}`
                }, { status: 400 });
            }

        } else if (selectedProvider === 'midtrans') {
            const baseUrl = isProduction 
                ? 'https://app.midtrans.com/snap/v1/transactions' 
                : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

            const authHeader = 'Basic ' + Buffer.from(serverKey.trim() + ':').toString('base64');

            // Send dummy ping payload to Midtrans Snap API to verify authentication
            const res = await fetch(baseUrl, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                body: JSON.stringify({
                    transaction_details: {
                        order_id: `PING-TEST-${Date.now()}`,
                        gross_amount: 10000
                    }
                })
            });

            const data = await res.json();

            // If 401 Unauthorized -> Invalid Key
            if (res.status === 401 || (data.error_messages && data.error_messages.some(m => m.toLowerCase().includes('access denied') || m.toLowerCase().includes('invalid key')))) {
                return NextResponse.json({
                    success: false,
                    message: '❌ Tes Koneksi Gagal: Server Key Midtrans tidak valid atau ditolak oleh Midtrans.'
                }, { status: 400 });
            }

            // HTTP 200/201 -> Valid Snap Token generated or valid authorization!
            if (res.ok || data.token || data.redirect_url) {
                return NextResponse.json({
                    success: true,
                    message: `✅ Tes Koneksi Midtrans (${isProduction ? 'Production' : 'Sandbox'}) BERHASIL! Kredensial API 100% Valid & Terhubung.`,
                    token: data.token
                });
            }

            // Fallback error message from Midtrans
            return NextResponse.json({
                success: false,
                message: `Tes Koneksi Midtrans: ${data.error_messages ? data.error_messages.join(', ') : 'Respon tidak dikenal'}`
            }, { status: 400 });

        } else {
            return NextResponse.json({
                success: true,
                message: `✅ Kredensial untuk provider ${selectedProvider.toUpperCase()} tersimpan.`
            });
        }

    } catch (error) {
        console.error('[Payment API Test Error]:', error);
        return NextResponse.json({ message: error.message || 'Terjadi kesalahan saat menguji koneksi API.' }, { status: 500 });
    }
}
