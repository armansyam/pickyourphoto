import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import { sendTestEmail } from '@/lib/mailer';

export async function POST(request) {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        const { targetEmail, smtpEmail, smtpPassword, smtpHost, smtpPort, smtpFromName } = await request.json();
        const testTarget = targetEmail || smtpEmail;
        if (!testTarget) {
            return NextResponse.json({ message: 'Target email is required.' }, { status: 400 });
        }

        const customConfig = (smtpEmail && smtpPassword) ? {
            email: smtpEmail,
            password: smtpPassword,
            host: smtpHost,
            port: smtpPort,
            fromName: smtpFromName
        } : null;

        await sendTestEmail(testTarget, customConfig);
        return NextResponse.json({ success: true, message: `Email uji coba berhasil dikirim ke ${testTarget}!` });

    } catch (error) {
        console.error('[SMTP Test Error]:', error);
        return NextResponse.json({ message: error.message || 'Gagal mengirim email uji coba.' }, { status: 500 });
    }
}
