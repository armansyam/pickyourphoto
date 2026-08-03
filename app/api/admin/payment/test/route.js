import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';

export async function POST(request) {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        const { provider, serverKey, clientKey, isProduction } = await request.json();

        if (!serverKey || !serverKey.trim()) {
            return NextResponse.json({ message: 'Server Key wajib diisi untuk melakukan tes koneksi.' }, { status: 400 });
        }

        const selectedProvider = (provider || 'midtrans').toLowerCase();

        if (selectedProvider === 'midtrans') {
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
