import nodemailer from 'nodemailer';
import db from './db.js';

/**
 * Get SMTP Config from SQLite saas_settings table
 */
export function getSmtpConfig() {
    try {
        const rows = db.prepare("SELECT key, value FROM saas_settings WHERE key LIKE 'smtp_%'").all();
        const settings = {};
        rows.forEach(r => { settings[r.key] = r.value; });

        return {
            enabled: settings.smtp_enable === '1',
            host: settings.smtp_host || 'smtp.gmail.com',
            port: parseInt(settings.smtp_port) || 465,
            email: settings.smtp_email || '',
            password: settings.smtp_password || '',
            fromName: settings.smtp_from_name || 'Pick Your Photo'
        };
    } catch (err) {
        console.error('[Mailer Config Error]:', err);
        return { enabled: false };
    }
}

/**
 * Create Nodemailer Transporter
 */
function createTransporter(config) {
    if (!config.email || !config.password) {
        throw new Error('Kredensial SMTP Email & App Password belum diisi di Admin Panel.');
    }

    return nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465, // true for 465, false for 587
        auth: {
            user: config.email,
            pass: config.password
        },
        tls: {
            rejectUnauthorized: false
        }
    });
}

/**
 * Send Vendor Account Approval Email Notification
 */
export async function sendVendorApprovalEmail(vendor, plan) {
    const config = getSmtpConfig();
    if (!config.enabled || !config.email || !config.password) {
        console.log('[Mailer]: SMTP tidak aktif atau kredensial belum diisi. Email persetujuan dilewati.');
        return false;
    }

    try {
        const transporter = createTransporter(config);
        const loginUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000/login';

        const mailOptions = {
            from: `"${config.fromName}" <${config.email}>`,
            to: vendor.email,
            subject: `Pendaftaran Akun ${config.fromName} Anda Telah Disetujui!`,
            text: `Halo ${vendor.name},\n\nSelamat! Pendaftaran akun fotografer/vendor Anda di ${config.fromName} telah DISETUJUI OLEH ADMIN.\n\nRINCIAN AKUN AKTIF:\n- Email Login: ${vendor.email}\n- Paket Berlangganan: ${plan ? plan.name : 'Starter Plan'}\n- Kuota Project: ${plan ? plan.maxProjects : 5} Project Aktif\n- Foto/Project: Tanpa Batas (Unlimited)\n- Masa Simpan Galeri: Permanen (Selama Project Ada)\n\nSilakan masuk ke dashboard melalui link berikut:\n${loginUrl}\n\nTerima kasih,\nTim ${config.fromName}`,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #09090b; color: #f4f4f5; padding: 40px 20px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #818cf8; font-size: 26px; margin: 0; font-weight: 800;">${config.fromName}</h1>
                        <p style="color: #a1a1aa; font-size: 14px; margin-top: 6px;">Platform Seleksi Foto Digital Terpercaya</p>
                    </div>

                    <div style="background: rgba(18, 18, 24, 0.9); padding: 24px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); margin-bottom: 24px;">
                        <h2 style="color: #34d399; font-size: 20px; margin-top: 0;">Halo, ${vendor.name}! 👋</h2>
                        <p style="font-size: 15px; line-height: 1.6; color: #d4d4d8;">
                            Selamat! Pendaftaran akun fotografer/vendor Anda telah <strong style="color: #34d399;">DISETUJU OLEH ADMIN</strong>.
                        </p>

                        <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); padding: 16px; border-radius: 10px; margin: 20px 0;">
                            <div style="font-size: 13px; color: #a5b4fc; font-weight: bold; margin-bottom: 8px;">RINCIAN AKUN AKTIF ANDA:</div>
                            <div style="font-size: 14px; color: #ffffff; line-height: 1.7;">
                                <div>• <strong>Email Login:</strong> ${vendor.email}</div>
                                <div>• <strong>Paket Berlangganan:</strong> ${plan ? plan.name : 'Starter Plan'}</div>
                                <div>• <strong>Kuota Project:</strong> ${plan ? plan.maxProjects : 5} Project Aktif</div>
                                <div>• <strong>Foto/Project:</strong> Tanpa Batas (Unlimited)</div>
                                <div>• <strong>Masa Simpan Galeri:</strong> Permanen (Selama Project Ada)</div>
                            </div>
                        </div>

                        <p style="font-size: 14px; color: #a1a1aa; line-height: 1.5;">
                            Anda sudah dapat masuk ke dashboard untuk mulai mengunggah galeri seleksi foto klien Anda.
                        </p>

                        <div style="text-align: center; margin-top: 30px; margin-bottom: 10px;">
                            <a href="${loginUrl}" style="background: linear-gradient(135deg, #6366f1, #4f46e5); color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);">
                                🚀 Masuk ke Dashboard Sekarang
                            </a>
                        </div>
                    </div>

                    <div style="text-align: center; font-size: 12px; color: #71717a; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px;">
                        © ${new Date().getFullYear()} ${config.fromName}. All rights reserved.<br/>
                        Email ini dikirimkan secara otomatis oleh sistem ${config.fromName}.
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('[Mailer Success]: Vendor approval email sent to', vendor.email, info.messageId);
        return true;
    } catch (err) {
        console.error('[Mailer Error]: Failed to send approval email:', err);
        return false;
    }
}

/**
 * Send Test Email from Admin Panel Settings
 */
export async function sendTestEmail(targetEmail, customConfig = null) {
    const config = (customConfig && customConfig.email && customConfig.password)
        ? {
            host: customConfig.host || 'smtp.gmail.com',
            port: parseInt(customConfig.port) || 465,
            email: customConfig.email,
            password: customConfig.password,
            fromName: customConfig.fromName || 'Pick Your Photo'
          }
        : getSmtpConfig();

    const transporter = createTransporter(config);

    const mailOptions = {
        from: `"${config.fromName}" <${config.email}>`,
        to: targetEmail,
        subject: `✅ Uji Coba SMTP Email ${config.fromName} Berhasil!`,
        html: `
            <div style="font-family: sans-serif; background: #09090b; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                <h2 style="color: #34d399;">Pesan Uji Coba Berhasil Diterima! 🚀</h2>
                <p>Selamat! Konfigurasi SMTP Email Google Sign-In & Notifikasi pada <strong>${config.fromName}</strong> sudah berjalan sempurna 100%.</p>
                <p style="color: #a1a1aa; font-size: 12px;">Waktu Kirim: ${new Date().toLocaleString('id-ID')}</p>
            </div>
        `
    };

    return await transporter.sendMail(mailOptions);
}

