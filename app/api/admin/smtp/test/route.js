import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import { sendTestEmail } from '@/lib/mailer';

export async function POST(request) {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        const { targetEmail } = await request.json();
        if (!targetEmail) {
            return NextResponse.json({ message: 'Target email is required.' }, { status: 400 });
        }

        await sendTestEmail(targetEmail);
        return NextResponse.json({ success: true, message: `Email uji coba berhasil dikirim ke ${targetEmail}!` });
    } catch (error) {
        console.error('[SMTP Test Error]:', error);
        return NextResponse.json({ message: error.message || 'Gagal mengirim email uji coba.' }, { status: 500 });
    }
}
