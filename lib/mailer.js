import nodemailer from 'nodemailer';
import db from './db.js';

/**
 * Get SMTP Config from SQLite saas_settings table
 */
export function getSmtpConfig() {
    try {
        const rows = db.prepare("SELECT key, value FROM saas_settings WHERE key LIKE 'smtp_%' OR key = 'saas_name'").all();
        const settings = {};
        rows.forEach(r => { settings[r.key] = r.value; });

        return {
            enabled: settings.smtp_enable === '1',
            host: settings.smtp_host || 'smtp.gmail.com',
            port: parseInt(settings.smtp_port) || 465,
            email: settings.smtp_email || '',
            password: settings.smtp_password || '',
            fromName: settings.smtp_from_name || settings.saas_name || 'Photota'
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
 * 1. Send Vendor Account Approval Email Notification
 */
export async function sendVendorApprovalEmail(vendor, plan, orderId = null, paymentMethod = 'QRIS') {
    const config = getSmtpConfig();
    if (!config.enabled || !config.email || !config.password) {
        console.log('[Mailer]: SMTP tidak aktif atau kredensial belum diisi. Email persetujuan dilewati.');
        return false;
    }

    try {
        const transporter = createTransporter(config);
        const loginUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000/login';
        const cleanPaymentMethod = (paymentMethod && (paymentMethod.includes('Midtrans') || paymentMethod === 'qris' || paymentMethod === 'gateway')) ? 'QRIS' : 'Transfer Bank Manual';
        const invNumber = orderId || `INV-${Date.now()}-${vendor.id}`;
        const addonQuotaGb = vendor.addonStorageQuotaBytes ? Math.round(vendor.addonStorageQuotaBytes / (1024 * 1024 * 1024)) : (vendor.pendingAddonQuotaBytes ? Math.round(vendor.pendingAddonQuotaBytes / (1024 * 1024 * 1024)) : 0);

        const mailOptions = {
            from: `"${config.fromName}" <${config.email}>`,
            to: vendor.email,
            subject: `Invoice Lunas: Akun Berlangganan ${config.fromName} Telah Aktif`,
            text: `Yth. ${vendor.name},\n\nPembayaran pendaftaran akun studio Anda di ${config.fromName} telah berhasil diverifikasi dan saat ini akun Anda telah aktif.\n\nNomor Invoice: ${invNumber}\nMetode Pembayaran: ${cleanPaymentMethod}\nPaket Utama: ${plan ? plan.name : 'Starter Plan'}\nAdd-On Storage: ${addonQuotaGb > 0 ? addonQuotaGb + ' GB Cloud Storage' : 'Bawaan Paket'}\nStatus: LUNAS\n\nSilakan masuk ke Dashboard Studio:\n${loginUrl}\n\nSalam hormat,\nTim ${config.fromName}`,
            html: `
                <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; padding: 40px 20px; max-width: 600px; margin: 0 auto; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="text-align: center; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 28px;">
                        <h1 style="color: #818cf8; font-size: 26px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">${config.fromName}</h1>
                        <p style="color: #a1a1aa; font-size: 13px; margin: 6px 0 0 0; font-weight: 500;">Platform Seleksi Foto Digital</p>
                    </div>

                    <div style="background: rgba(18, 18, 24, 0.95); padding: 28px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.08); margin-bottom: 24px;">
                        <h2 style="color: #34d399; font-size: 20px; margin: 0 0 12px 0; font-weight: 700;">Yth. ${vendor.name},</h2>
                        <p style="font-size: 14px; line-height: 1.6; color: #d4d4d8; margin: 0 0 24px 0;">
                            Pendaftaran dan pembayaran paket berlangganan akun studio Anda telah berhasil diverifikasi dan saat ini telah aktif.
                        </p>

                        <!-- Box Invoice Pembayaran -->
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: rgba(16, 185, 129, 0.06); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 12px; margin-bottom: 24px;">
                            <tr>
                                <td style="padding: 20px;">
                                    <div style="font-size: 12px; color: #34d399; font-weight: 800; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.8px;">
                                        BUKTI INVOICE PEMBAYARAN LUNAS
                                    </div>
                                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px; color: #d4d4d8;">
                                        <tr>
                                            <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); color: #a1a1aa; width: 45%;">Nomor Invoice</td>
                                            <td align="right" style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-weight: bold; color: #ffffff;">${invNumber}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); color: #a1a1aa;">Metode Pembayaran</td>
                                            <td align="right" style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-weight: bold; color: #38bdf8;">${cleanPaymentMethod}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); color: #a1a1aa;">Paket Utama</td>
                                            <td align="right" style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-weight: bold; color: #fbbf24;">${plan ? plan.name : 'Starter Plan'} (${plan ? plan.activePeriodDays || 30 : 30} Hari)</td>
                                        </tr>
                                        ${addonQuotaGb > 0 ? `
                                        <tr>
                                            <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); color: #a1a1aa;">Add-On Storage</td>
                                            <td align="right" style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-weight: bold; color: #38bdf8;">Kapasitas ${addonQuotaGb} GB</td>
                                        </tr>
                                        ` : ''}
                                        <tr>
                                            <td style="padding: 12px 0 4px 0; color: #a1a1aa; font-weight: bold;">Status Pembayaran</td>
                                            <td align="right" style="padding: 12px 0 4px 0; font-weight: 800; color: #34d399; font-size: 14px;">LUNAS / VERIFIED</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>

                        <p style="font-size: 13px; color: #a1a1aa; line-height: 1.6; margin: 0 0 24px 0;">
                            Anda dapat masuk ke Dashboard Studio untuk mulai mengelola galeri dan seleksi foto klien.
                        </p>

                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                                <td align="center">
                                    <a href="${loginUrl}" style="background: linear-gradient(135deg, #6366f1, #4f46e5); color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
                                        Masuk ke Dashboard Studio
                                    </a>
                                </td>
                            </tr>
                        </table>
                    </div>

                    <div style="text-align: center; font-size: 11px; color: #71717a; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; line-height: 1.5;">
                        © ${new Date().getFullYear()} ${config.fromName}. Seluruh hak cipta dilindungi.<br/>
                        Email ini merupakan bukti pembayaran lunas resmi dari platform ${config.fromName}.
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('[Mailer Success]: Vendor approval invoice email sent to', vendor.email, info.messageId);
        return true;
    } catch (err) {
        console.error('[Mailer Error]: Failed to send approval invoice email:', err);
        return false;
    }
}

/**
 * 2. Send Test Email from Admin Panel Settings
 */
export async function sendTestEmail(targetEmail, customConfig = null) {
    const config = (customConfig && customConfig.email && customConfig.password)
        ? {
            host: customConfig.host || 'smtp.gmail.com',
            port: parseInt(customConfig.port) || 465,
            email: customConfig.email,
            password: customConfig.password,
            fromName: customConfig.fromName || 'Photota'
          }
        : getSmtpConfig();

    const transporter = createTransporter(config);

    const mailOptions = {
        from: `"${config.fromName}" <${config.email}>`,
        to: targetEmail,
        subject: `Uji Coba Pengiriman Email SMTP — ${config.fromName}`,
        html: `
            <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background: #09090b; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); max-width: 540px; margin: 0 auto;">
                <h2 style="color: #34d399; font-size: 18px; margin-top: 0;">Pesan Uji Coba Berhasil Diterima</h2>
                <p style="font-size: 13px; color: #cbd5e1; line-height: 1.6;">
                    Konfigurasi server SMTP email dan notifikasi pada platform <strong>${config.fromName}</strong> telah terhubung dengan baik.
                </p>
                <p style="color: #71717a; font-size: 11px; margin-top: 20px; border-top: 1px solid rgba(255,255,255,0.06); paddingTop: 10px;">
                    Waktu Pengiriman: ${new Date().toLocaleString('id-ID')}
                </p>
            </div>
        `
    };

    return await transporter.sendMail(mailOptions);
}

/**
 * 3. Send Vendor Rejection Email Notification
 */
export async function sendVendorRejectionEmail(vendor, plan, reason = 'Pendaftaran ditolak oleh administrator.') {
    const config = getSmtpConfig();
    if (!config.enabled || !config.email || !config.password) {
        console.log('[Mailer] SMTP tidak aktif, lewati email penolakan.');
        return false;
    }

    try {
        const transporter = createTransporter(config);

        const mailOptions = {
            from: `"${config.fromName}" <${config.email}>`,
            to: vendor.email,
            subject: `Informasi Status Pendaftaran Akun — ${config.fromName}`,
            html: `
                <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background: #09090b; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #f87171; font-size: 18px; margin-top: 0;">Informasi Status Pendaftaran</h2>
                    <p style="font-size: 14px; color: #e4e4e7;">Yth. <strong>${vendor.name}</strong>,</p>
                    <p style="font-size: 13px; color: #a1a1aa; line-height: 1.6;">
                        Terima kasih atas minat Anda untuk bergabung dengan platform <strong>${config.fromName}</strong>.
                    </p>
                    <p style="font-size: 13px; color: #a1a1aa; line-height: 1.6;">
                        Setelah dilakukan peninjauan, pendaftaran akun Anda saat ini belum dapat disetujui dengan keterangan berikut:
                    </p>
                    <div style="background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.25); border-radius: 8px; padding: 14px; margin: 16px 0;">
                        <p style="margin: 0; color: #f87171; font-size: 13px; font-weight: bold;">${reason}</p>
                    </div>
                    <p style="font-size: 12px; color: #71717a; line-height: 1.5;">
                        Apabila Anda membutuhkan klarifikasi lebih lanjut, silakan hubungi tim administrator.
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`[Mailer Success] Sent rejection email to vendor ${vendor.email}`);
        return true;
    } catch (err) {
        console.error('[Mailer Error] Rejection email failed:', err);
        return false;
    }
}

/**
 * 4. Send Subscription Expiring Warning Email (H-3 / H-1 Expired)
 */
export async function sendSubscriptionExpiringWarningEmail(vendor, daysRemaining) {
    const config = getSmtpConfig();
    if (!config.enabled || !config.email || !config.password) return false;

    try {
        const transporter = createTransporter(config);
        const loginUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000/login';

        const mailOptions = {
            from: `"${config.fromName}" <${config.email}>`,
            to: vendor.email,
            subject: `Pemberitahuan: Masa Aktif Berlangganan ${config.fromName} Berakhir Dalam ${daysRemaining} Hari`,
            html: `
                <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background: #09090b; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); max-width: 600px; margin: 0 auto;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h1 style="color: #fbbf24; font-size: 20px; margin: 0;">Masa Aktif Paket Berlangganan Segera Berakhir</h1>
                    </div>
                    <p style="font-size: 14px; color: #e4e4e7;">Yth. <strong>${vendor.name}</strong>,</p>
                    <p style="font-size: 13px; color: #a1a1aa; line-height: 1.6;">
                        Paket berlangganan Anda pada platform <strong>${config.fromName}</strong> akan berakhir dalam <strong>${daysRemaining} hari</strong> (Tanggal: ${vendor.expiresAt || 'Segera'}).
                    </p>
                    <div style="background: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.25); border-radius: 10px; padding: 14px; margin: 20px 0;">
                        <p style="margin: 0; font-size: 12px; color: #fef08a; line-height: 1.5;">
                            Disarankan untuk melakukan perpanjangan paket sebelum tanggal berakhir agar layanan galeri dan seleksi foto klien tetap berjalan tanpa kendala.
                        </p>
                    </div>
                    <div style="text-align: center; margin: 24px 0;">
                        <a href="${loginUrl}" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px;">
                            Perpanjang Paket Berlangganan
                        </a>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`[Mailer Success] Sent expiring warning (${daysRemaining}d) to vendor ${vendor.email}`);
        return true;
    } catch (err) {
        console.error('[Mailer Error] Expiring warning failed:', err);
        return false;
    }
}

/**
 * 5. Send Vendor Account Expired Win-Back Email
 */
export async function sendVendorAccountExpiredEmail(vendor) {
    const config = getSmtpConfig();
    if (!config.enabled || !config.email || !config.password) return false;

    try {
        const transporter = createTransporter(config);
        const loginUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000/login';

        const mailOptions = {
            from: `"${config.fromName}" <${config.email}>`,
            to: vendor.email,
            subject: `Masa Berlangganan Berakhir — Pengaktifan Kembali Akun ${config.fromName}`,
            html: `
                <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background: #09090b; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #f87171; font-size: 18px; margin-top: 0;">Masa Aktif Berlangganan Telah Berakhir</h2>
                    <p style="font-size: 14px; color: #e4e4e7;">Yth. <strong>${vendor.name}</strong>,</p>
                    <p style="font-size: 13px; color: #a1a1aa; line-height: 1.6;">
                        Masa aktif paket berlangganan akun studio Anda telah berakhir. Saat ini galeri foto Anda dipindahkan ke status arsip sementara.
                    </p>
                    <p style="font-size: 13px; color: #34d399; line-height: 1.5;">
                        Seluruh berkas foto dan data seleksi klien tetap tersimpan aman pada penyimpanan Anda.
                    </p>
                    <div style="text-align: center; margin: 24px 0;">
                        <a href="${loginUrl}" style="background: linear-gradient(135deg, #6366f1, #4f46e5); color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px;">
                            Aktifkan Kembali Akun Studio
                        </a>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`[Mailer Success] Sent expired notification to vendor ${vendor.email}`);
        return true;
    } catch (err) {
        console.error('[Mailer Error] Expired notification failed:', err);
        return false;
    }
}

/**
 * 6. Send Project Quota Warning / Upsell Email
 */
export async function sendProjectQuotaWarningEmail(vendor, plan, currentProjects) {
    const config = getSmtpConfig();
    if (!config.enabled || !config.email || !config.password) return false;

    try {
        const transporter = createTransporter(config);
        const loginUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000/login';

        const mailOptions = {
            from: `"${config.fromName}" <${config.email}>`,
            to: vendor.email,
            subject: `Informasi Kuota Proyek (${currentProjects}/${plan.maxProjects}) — ${config.fromName}`,
            html: `
                <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background: #09090b; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #818cf8; font-size: 18px; margin-top: 0;">Kapasitas Kuota Proyek Mendekati Batas</h2>
                    <p style="font-size: 14px; color: #e4e4e7;">Yth. <strong>${vendor.name}</strong>,</p>
                    <p style="font-size: 13px; color: #a1a1aa; line-height: 1.6;">
                        Saat ini Anda telah menggunakan <strong>${currentProjects} dari total ${plan.maxProjects} kuota proyek</strong> pada paket <strong>${plan.name}</strong>.
                    </p>
                    <p style="font-size: 13px; color: #d4d4d8; line-height: 1.6;">
                        Anda dapat meningkatkan paket langganan untuk menambah kapasitas proyek aktif dan membuka fitur studio tambahan.
                    </p>
                    <div style="text-align: center; margin: 24px 0;">
                        <a href="${loginUrl}" style="background: linear-gradient(135deg, #818cf8, #6366f1); color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px;">
                            Tingkatkan Paket Langganan
                        </a>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`[Mailer Success] Sent quota warning to vendor ${vendor.email}`);
        return true;
    } catch (err) {
        console.error('[Mailer Error] Quota warning failed:', err);
        return false;
    }
}

/**
 * 7. Send Client Gallery Expiration Warning Email (H-2 Expired)
 */
export async function sendClientGalleryExpiringWarningEmail(client, project, vendor) {
    const config = getSmtpConfig();
    if (!config.enabled || !config.email || !config.password || !client.email) return false;

    try {
        const transporter = createTransporter(config);
        const galleryUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/gallery/${project.id}?key=${client.accessKey}`;

        const mailOptions = {
            from: `"${vendor.brandName || vendor.name}" <${config.email}>`,
            to: client.email,
            subject: `Pemberitahuan: Masa Akses Galeri Foto ${project.name} Berakhir Dalam 48 Jam`,
            html: `
                <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background: #09090b; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #fbbf24; font-size: 18px; margin-top: 0;">Masa Akses Galeri Foto Segera Berakhir</h2>
                    <p style="font-size: 14px; color: #e4e4e7;">Yth. Pelanggan,</p>
                    <p style="font-size: 13px; color: #a1a1aa; line-height: 1.6;">
                        Akses galeri seleksi foto Anda untuk sesi <strong>"${project.name}"</strong> dari <strong>${vendor.brandName || vendor.name}</strong> akan berakhir dalam 48 jam.
                    </p>
                    <p style="font-size: 13px; color: #fef08a; line-height: 1.5;">
                        Silakan mengakses galeri dan menyelesaikan pemilihan foto sebelum batas waktu berakhir.
                    </p>
                    <div style="text-align: center; margin: 24px 0;">
                        <a href="${galleryUrl}" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px;">
                            Buka Galeri Foto
                        </a>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`[Mailer Success] Sent client gallery warning to ${client.email}`);
        return true;
    } catch (err) {
        console.error('[Mailer Error] Client gallery warning failed:', err);
        return false;
    }
}

/**
 * 8. Send Subscription Renewal Confirmation Email
 */
export async function sendVendorRenewalConfirmationEmail(vendor, plan, expiresAt, paymentMethodLabel = 'QRIS') {
    const config = getSmtpConfig();
    if (!config.enabled || !config.email || !config.password) return false;

    const cleanMethod = (paymentMethodLabel && paymentMethodLabel.includes('Midtrans')) ? 'QRIS' : paymentMethodLabel;

    try {
        const transporter = createTransporter(config);
        const loginUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000/login';

        const mailOptions = {
            from: `"${config.fromName}" <${config.email}>`,
            to: vendor.email,
            subject: `Invoice Lunas: Perpanjangan Berlangganan ${config.fromName} Berhasil`,
            html: `
                <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background: #09090b; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); max-width: 600px; margin: 0 auto;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h1 style="color: #34d399; font-size: 20px; margin: 0;">Perpanjangan Berlangganan Berhasil</h1>
                    </div>
                    <p style="font-size: 14px; color: #e4e4e7;">Yth. <strong>${vendor.name}</strong>,</p>
                    <p style="font-size: 13px; color: #a1a1aa; line-height: 1.6;">
                        Pembayaran perpanjangan berlangganan untuk paket <strong>${plan ? plan.name : 'Berlangganan'}</strong> telah berhasil diproses dan dinyatakan lunas.
                    </p>
                    <div style="background: rgba(52, 211, 153, 0.08); border: 1px solid rgba(52, 211, 153, 0.25); border-radius: 10px; padding: 16px; margin: 20px 0;">
                        <div style="font-size: 12px; color: #6ee7b7; font-weight: bold; margin-bottom: 8px;">RINCIAN INVOICE PERPANJANGAN:</div>
                        <div style="font-size: 13px; color: #ffffff; line-height: 1.6;">
                            <div>• <strong>Paket Utama:</strong> ${plan ? plan.name : 'Starter Plan'}</div>
                            <div>• <strong>Metode Pembayaran:</strong> ${cleanMethod}</div>
                            <div>• <strong>Tanggal Berakhir Baru:</strong> ${expiresAt || '-'}</div>
                            <div>• <strong>Masa Aktif Tambahan:</strong> ${plan ? plan.activePeriodDays || 30 : 30} Hari</div>
                            <div>• <strong>Status Pembayaran:</strong> <strong style="color: #34d399;">LUNAS / VERIFIED</strong></div>
                        </div>
                    </div>
                    <div style="text-align: center; margin: 24px 0;">
                        <a href="${loginUrl}" style="background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px;">
                            Masuk ke Dashboard Studio
                        </a>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`[Mailer Success] Sent renewal confirmation to vendor ${vendor.email}`);
        return true;
    } catch (err) {
        console.error('[Mailer Error] Renewal confirmation failed:', err);
        return false;
    }
}

/**
 * 9. Send Subscription Upgrade Confirmation Email
 */
export async function sendVendorUpgradeConfirmationEmail(vendor, oldPlanName, newPlan, expiresAt, paymentMethodLabel = 'QRIS') {
    const config = getSmtpConfig();
    if (!config.enabled || !config.email || !config.password) return false;

    const cleanMethod = (paymentMethodLabel && (paymentMethodLabel.includes('Midtrans') || paymentMethodLabel === 'qris' || paymentMethodLabel === 'gateway')) ? 'QRIS' : (paymentMethodLabel || 'Transfer Bank Manual');

    try {
        const transporter = createTransporter(config);
        const loginUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000/login';

        const mailOptions = {
            from: `"${config.fromName}" <${config.email}>`,
            to: vendor.email,
            subject: `Invoice Lunas: Peningkatan Paket Berlangganan ${config.fromName} Berhasil`,
            html: `
                <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background: #09090b; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); max-width: 600px; margin: 0 auto;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h1 style="color: #818cf8; font-size: 20px; margin: 0;">Peningkatan Paket Berhasil</h1>
                    </div>
                    <p style="font-size: 14px; color: #e4e4e7;">Yth. <strong>${vendor.name}</strong>,</p>
                    <p style="font-size: 13px; color: #a1a1aa; line-height: 1.6;">
                        Akun studio Anda telah berhasil ditingkatkan dari <strong>${oldPlanName || 'Paket Sebelumnya'}</strong> ke <strong style="color: #818cf8;">${newPlan ? newPlan.name : 'Paket Baru'}</strong>.
                    </p>
                    <div style="background: rgba(129, 140, 248, 0.08); border: 1px solid rgba(129, 140, 248, 0.25); border-radius: 10px; padding: 16px; margin: 20px 0;">
                        <div style="font-size: 12px; color: #a5b4fc; font-weight: bold; margin-bottom: 8px;">RINCIAN INVOICE PENINGKATAN PAKET:</div>
                        <div style="font-size: 13px; color: #ffffff; line-height: 1.6;">
                            <div>• <strong>Paket Baru:</strong> ${newPlan ? newPlan.name : 'Pro Studio Plan'}</div>
                            <div>• <strong>Metode Pembayaran:</strong> ${cleanMethod}</div>
                            <div>• <strong>Kapasitas Proyek:</strong> ${newPlan ? newPlan.maxProjects : 20} Proyek Aktif</div>
                            <div>• <strong>Tanggal Berakhir:</strong> ${expiresAt || '-'}</div>
                            <div>• <strong>Status Pembayaran:</strong> <strong style="color: #34d399;">LUNAS / VERIFIED</strong></div>
                        </div>
                    </div>
                    <div style="text-align: center; margin: 24px 0;">
                        <a href="${loginUrl}" style="background: linear-gradient(135deg, #6366f1, #4f46e5); color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px;">
                            Buka Dashboard Studio
                        </a>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`[Mailer Success] Sent upgrade confirmation to vendor ${vendor.email}`);
        return true;
    } catch (err) {
        console.error('[Mailer Error] Upgrade confirmation failed:', err);
        return false;
    }
}

/**
 * 10. Send Storage Grace Period Warning Email (H-15 & H-3 before auto-cleanup)
 */
export async function sendStorageGracePeriodWarningEmail(vendor, addonPlanName, daysLeft) {
    const config = getSmtpConfig();
    if (!config.enabled || !config.email || !config.password) return false;

    try {
        const transporter = createTransporter(config);
        const loginUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000/dashboard/storage';

        const isUrgent = daysLeft <= 3;
        const subject = isUrgent
            ? `Pemberitahuan Terakhir (H-${daysLeft}): Pembersihan Penyimpanan Tambahan ${config.fromName}`
            : `Pemberitahuan (H-${daysLeft}): Masa Tenggang Penyimpanan Tambahan ${config.fromName}`;

        const mailOptions = {
            from: `"${config.fromName}" <${config.email}>`,
            to: vendor.email,
            subject,
            html: `
                <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background: #09090b; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid ${isUrgent ? 'rgba(239,68,68,0.3)' : 'rgba(251,191,36,0.3)'}; max-width: 600px; margin: 0 auto;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h1 style="color: ${isUrgent ? '#f87171' : '#fbbf24'}; font-size: 20px; margin: 0;">
                            ${isUrgent ? 'Pemberitahuan Terakhir Pembersihan Penyimpanan' : 'Pemberitahuan Masa Tenggang Penyimpanan'}
                        </h1>
                    </div>
                    <p style="font-size: 14px; color: #e4e4e7;">Yth. <strong>${vendor.name}</strong>,</p>
                    <p style="font-size: 13px; color: #a1a1aa; line-height: 1.6;">
                        Masa aktif paket kapasitas tambahan (<strong>${addonPlanName || 'Cloud Storage'}</strong>) Anda telah berakhir dan saat ini berada dalam masa tenggang.
                    </p>
                    <div style="background: ${isUrgent ? 'rgba(239, 68, 68, 0.08)' : 'rgba(251, 191, 36, 0.08)'}; border: 1px solid ${isUrgent ? 'rgba(239, 68, 68, 0.25)' : 'rgba(251, 191, 36, 0.25)'}; border-radius: 10px; padding: 16px; margin: 20px 0;">
                        <div style="font-size: 12px; color: ${isUrgent ? '#f87171' : '#fbbf24'}; font-weight: bold; margin-bottom: 6px;">
                            SISA WAKTU TERSISA: ${daysLeft} HARI
                        </div>
                        <p style="font-size: 13px; color: #e4e4e7; margin: 0; line-height: 1.5;">
                            ${isUrgent 
                                ? 'Dalam ' + daysLeft + ' hari ke depan, berkas foto pada kapasitas tambahan akan dibersihkan dari server untuk mengosongkan kapasitas. Silakan perpanjang paket untuk mempertahankan berkas.' 
                                : 'Berkas foto Anda masih tersimpan aman. Perpanjang paket kapasitas tambahan untuk memastikan seluruh akses galeri tetap aktif.'
                            }
                        </p>
                    </div>
                    <div style="text-align: center; margin: 24px 0;">
                        <a href="${loginUrl}" style="background: linear-gradient(135deg, #6366f1, #4f46e5); color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px;">
                            Perpanjang Kapasitas Tambahan
                        </a>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`[Mailer Success] Sent storage grace warning (H-${daysLeft}) to vendor ${vendor.email}`);
        return true;
    } catch (err) {
        console.error('[Mailer Error] Storage grace warning failed:', err);
        return false;
    }
}

/**
 * 11. Send Pending QRIS Instructions Email (Sent immediately when QRIS code is generated)
 */
export async function sendPendingQrisEmail(vendor, plan, orderId, amount, addonPlanName = null) {
    const config = getSmtpConfig();
    if (!config.enabled || !config.email || !config.password) return false;

    try {
        const transporter = createTransporter(config);
        const resumeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/register`;

        const mailOptions = {
            from: `"${config.fromName}" <${config.email}>`,
            to: vendor.email,
            subject: `Pendaftaran Akun ${config.fromName} — Instruksi Pembayaran QRIS`,
            html: `
                <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background: #09090b; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid rgba(52, 211, 153, 0.25); max-width: 600px; margin: 0 auto;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h1 style="color: #34d399; font-size: 20px; margin: 0;">Pendaftaran Telah Diterima</h1>
                        <p style="color: #a1a1aa; font-size: 13px; margin-top: 4px;">Selesaikan pembayaran melalui QRIS untuk mengaktifkan akun studio Anda.</p>
                    </div>

                    <p style="font-size: 14px; color: #e4e4e7;">Yth. <strong>${vendor.name}</strong>,</p>
                    <p style="font-size: 13px; color: #a1a1aa; line-height: 1.6;">
                        Pendaftaran akun studio Anda di <strong>${config.fromName}</strong> telah kami terima. Berikut adalah rincian tagihan pembayaran QRIS Anda:
                    </p>

                    <div style="background: rgba(52, 211, 153, 0.08); border: 1px solid rgba(52, 211, 153, 0.25); border-radius: 10px; padding: 16px; margin: 20px 0; font-size: 13px; line-height: 1.7; color: #d4d4d8;">
                        <div>• <strong>Nomor Order:</strong> ${orderId}</div>
                        <div>• <strong>Paket Utama:</strong> ${plan ? plan.name : 'Starter Plan'}</div>
                        ${addonPlanName ? `<div>• <strong>Add-On Cloud Storage:</strong> ${addonPlanName}</div>` : ''}
                        <div>• <strong>Total Tagihan:</strong> <strong style="color: #34d399; font-size: 14px;">Rp ${amount ? amount.toLocaleString('id-ID') : '0'}</strong></div>
                        <div>• <strong>Metode Pembayaran:</strong> QRIS Otomatis</div>
                    </div>

                    <div style="text-align: center; margin: 24px 0;">
                        <a href="${resumeUrl}" style="background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">
                            Lanjutkan Pembayaran QRIS
                        </a>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`[Mailer Success] Sent pending QRIS instructions to ${vendor.email}`);
        return true;
    } catch (err) {
        console.error('[Mailer Error] Pending QRIS mail failed:', err);
        return false;
    }
}

/**
 * 12. Send Pending Manual Transfer Received Email (Sent when user submits registration & uploads proof)
 */
export async function sendPendingManualTransferReceivedEmail(vendor, plan, addonPlanName = null) {
    const config = getSmtpConfig();
    if (!config.enabled || !config.email || !config.password) return false;

    try {
        const transporter = createTransporter(config);

        const mailOptions = {
            from: `"${config.fromName}" <${config.email}>`,
            to: vendor.email,
            subject: `Pendaftaran Akun ${config.fromName} — Verifikasi Pembayaran Sedang Diproses`,
            html: `
                <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background: #09090b; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid rgba(129, 140, 248, 0.25); max-width: 600px; margin: 0 auto;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h1 style="color: #818cf8; font-size: 20px; margin: 0;">Pendaftaran Telah Diterima</h1>
                        <p style="color: #a1a1aa; font-size: 13px; margin-top: 4px;">Bukti pembayaran Anda saat ini sedang dalam proses verifikasi administrator.</p>
                    </div>

                    <p style="font-size: 14px; color: #e4e4e7;">Yth. <strong>${vendor.name}</strong>,</p>
                    <p style="font-size: 13px; color: #a1a1aa; line-height: 1.6;">
                        Pendaftaran akun studio Anda di <strong>${config.fromName}</strong> telah berhasil kami terima.
                    </p>

                    <div style="background: rgba(129, 140, 248, 0.08); border: 1px solid rgba(129, 140, 248, 0.25); border-radius: 10px; padding: 16px; margin: 20px 0; font-size: 13px; line-height: 1.7; color: #d4d4d8;">
                        <div style="font-weight: bold; color: #a5b4fc; margin-bottom: 8px;">RINCIAN PENDAFTARAN:</div>
                        <div>• <strong>Nama Pemilik:</strong> ${vendor.name}</div>
                        <div>• <strong>Email Terdaftar:</strong> ${vendor.email}</div>
                        <div>• <strong>Paket Pilihan:</strong> ${plan ? plan.name : 'Starter Plan'}</div>
                        ${addonPlanName ? `<div>• <strong>Add-On Cloud Storage:</strong> ${addonPlanName}</div>` : ''}
                        <div>• <strong>Metode Pembayaran:</strong> Transfer Bank Manual</div>
                        <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.06);">
                            • <strong>Status:</strong> <strong style="color: #fbbf24;">Menunggu Verifikasi Administrator (Estimasi Maksimal 1x24 Jam)</strong>
                        </div>
                    </div>

                    <p style="font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                        Setelah verifikasi selesai disetujui, Anda akan menerima email konfirmasi invoice lunas dan akun studio Anda akan langsung dapat digunakan.
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`[Mailer Success] Sent manual transfer received notification to ${vendor.email}`);
        return true;
    } catch (err) {
        console.error('[Mailer Error] Manual transfer received mail failed:', err);
        return false;
    }
}

/**
 * 13. Send Pending Manual Transfer Instructions Email (Sent when user selects manual transfer without proof yet, 24h deadline)
 */
export async function sendPendingManualTransferInstructionEmail(vendor, plan, addonPlanName = null) {
    const config = getSmtpConfig();
    if (!config.enabled || !config.email || !config.password) return false;

    try {
        const transporter = createTransporter(config);
        const uploadUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/register`;

        const settingsRows = db.prepare("SELECT key, value FROM saas_settings WHERE key IN ('bank_name', 'bank_account_number', 'bank_account_name')").all() || [];
        const bankInfo = {
            bankName: 'BCA (Bank Central Asia)',
            accountNumber: '1234-5678-90',
            accountName: 'PT Pick Your Photo'
        };
        settingsRows.forEach(r => {
            if (r.key === 'bank_name' && r.value) bankInfo.bankName = r.value;
            if (r.key === 'bank_account_number' && r.value) bankInfo.accountNumber = r.value;
            if (r.key === 'bank_account_name' && r.value) bankInfo.accountName = r.value;
        });

        const mailOptions = {
            from: `"${config.fromName}" <${config.email}>`,
            to: vendor.email,
            subject: `Pendaftaran Akun ${config.fromName} — Instruksi Transfer Bank`,
            html: `
                <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background: #09090b; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid rgba(251, 191, 36, 0.25); max-width: 600px; margin: 0 auto;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h1 style="color: #fbbf24; font-size: 20px; margin: 0;">Instruksi Transfer Bank Manual</h1>
                        <p style="color: #a1a1aa; font-size: 13px; margin-top: 4px;">Batas waktu transfer dan unggah bukti pembayaran adalah 1x24 Jam.</p>
                    </div>

                    <p style="font-size: 14px; color: #e4e4e7;">Yth. <strong>${vendor.name}</strong>,</p>
                    <p style="font-size: 13px; color: #a1a1aa; line-height: 1.6;">
                        Pendaftaran akun studio Anda di <strong>${config.fromName}</strong> telah kami terima. Silakan menyelesaikan transfer bank dan mengunggah bukti pembayaran:
                    </p>

                    <div style="background: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.25); border-radius: 10px; padding: 16px; margin: 20px 0; font-size: 13px; line-height: 1.7; color: #d4d4d8;">
                        <div style="font-weight: bold; color: #fbbf24; margin-bottom: 8px;">REKENING TUJUAN PEMBAYARAN:</div>
                        <div>• <strong>Nama Bank:</strong> ${bankInfo.bankName}</div>
                        <div>• <strong>Nomor Rekening:</strong> ${bankInfo.accountNumber}</div>
                        <div>• <strong>Atas Nama:</strong> ${bankInfo.accountName}</div>
                        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06);">
                            • <strong>Paket Pilihan:</strong> ${plan ? plan.name : 'Starter Plan'} ${addonPlanName ? '(+ ' + addonPlanName + ')' : ''}
                        </div>
                        <div>• <strong>Batas Waktu:</strong> 1x24 Jam dari waktu registrasi</div>
                    </div>

                    <div style="text-align: center; margin: 24px 0;">
                        <a href="${uploadUrl}" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">
                            Unggah Bukti Transfer
                        </a>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`[Mailer Success] Sent manual transfer 24h instructions to ${vendor.email}`);
        return true;
    } catch (err) {
        console.error('[Mailer Error] Manual transfer instruction mail failed:', err);
        return false;
    }
}
