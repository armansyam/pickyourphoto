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
            subject: `🎉 Invoice Lunas: Akun Berlangganan ${config.fromName} Telah Aktif!`,
            text: `Halo ${vendor.name},\n\nSelamat! Pembayaran pendaftaran akun fotografer/vendor Anda di ${config.fromName} telah BERHASIL DIVERIFIKASI & SEKARANG AKTIF.\n\nNo. Invoice: ${invNumber}\nMetode Pembayaran: ${cleanPaymentMethod}\n\nPaket Utama: ${plan ? plan.name : 'Starter Plan'}\nAdd-On Storage: ${addonQuotaGb > 0 ? addonQuotaGb + ' GB Drive' : 'Bawaan Plan'}\nStatus: LUNAS\n\nSilakan masuk ke dashboard:\n${loginUrl}\n\nTerima kasih,\nTim ${config.fromName}`,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #09090b; color: #f4f4f5; padding: 40px 20px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #818cf8; font-size: 26px; margin: 0; font-weight: 800;">${config.fromName}</h1>
                        <p style="color: #a1a1aa; font-size: 14px; margin-top: 6px;">Platform Seleksi Foto Digital Terpercaya</p>
                    </div>

                    <div style="background: rgba(18, 18, 24, 0.9); padding: 24px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); margin-bottom: 24px;">
                        <h2 style="color: #34d399; font-size: 20px; margin-top: 0;">Halo, ${vendor.name}! 👋</h2>
                        <p style="font-size: 15px; line-height: 1.6; color: #d4d4d8;">
                            Selamat! Pendaftaran & paket berlangganan akun fotografer/vendor Anda telah <strong style="color: #34d399;">BERHASIL DIVERIFIKASI & SEKARANG AKTIF</strong>.
                        </p>

                        {/* Invoice Box */}
                        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); padding: 18px; border-radius: 12px; margin: 20px 0;">
                            <div style="font-size: 13px; color: #34d399; font-weight: bold; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                                🧾 BUKTI INVOICE PEMBAYARAN LUNAS
                            </div>
                            <div style="font-size: 13px; color: #d4d4d8; line-height: 1.8;">
                                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 4px; margin-bottom: 6px;">
                                    <span>No. Invoice:</span>
                                    <strong style="color: #ffffff;">${invNumber}</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 4px; margin-bottom: 6px;">
                                    <span>Metode Pembayaran:</span>
                                    <strong style="color: #38bdf8;">${cleanPaymentMethod}</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 4px; margin-bottom: 6px;">
                                    <span>Paket Utama:</span>
                                    <strong style="color: #fbbf24;">${plan ? plan.name : 'Starter Plan'} (${plan ? plan.activePeriodDays || 30 : 30} Hari)</strong>
                                </div>
                                ${addonQuotaGb > 0 ? `
                                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 4px; margin-bottom: 6px;">
                                    <span>Add-On Cloud Storage:</span>
                                    <strong style="color: #38bdf8;">💾 Drive ${addonQuotaGb} GB</strong>
                                </div>
                                ` : ''}
                                <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 14px;">
                                    <span>Status Pembayaran:</span>
                                    <strong style="color: #34d399;">🟢 PAID / LUNAS (VERIFIED)</strong>
                                </div>
                            </div>
                        </div>

                        <p style="font-size: 14px; color: #a1a1aa; line-height: 1.5;">
                            Anda sudah dapat masuk ke dashboard untuk mulai membuat galeri seleksi foto klien Anda.
                        </p>

                        <div style="text-align: center; margin-top: 30px; margin-bottom: 10px;">
                            <a href="${loginUrl}" style="background: linear-gradient(135deg, #6366f1, #4f46e5); color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);">
                                🚀 Masuk ke Dashboard Sekarang
                            </a>
                        </div>
                    </div>

                    <div style="text-align: center; font-size: 12px; color: #71717a; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px;">
                        © ${new Date().getFullYear()} ${config.fromName}. All rights reserved.<br/>
                        Email ini merupakan bukti pembayaran lunas resmi dari sistem ${config.fromName}.
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

/**
 * Send Vendor Rejection Email Notification
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
            subject: `Informasi Pendaftaran ${config.fromName} — ${vendor.name}`,
            html: `
                <div style="font-family: sans-serif; background: #09090b; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #f87171; margin-top: 0;">Informasi Status Pendaftaran</h2>
                    <p style="font-size: 15px; color: #e4e4e7;">Halo <strong>${vendor.name}</strong>,</p>
                    <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">
                        Terima kasih atas minat Anda bergabung dengan <strong>${config.fromName}</strong>.
                    </p>
                    <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">
                        Setelah kami tinjau, pendaftaran Anda saat ini <strong>belum dapat kami proses</strong> dengan keterangan berikut:
                    </p>
                    <div style="background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.3); border-radius: 8px; padding: 16px; margin: 16px 0;">
                        <p style="margin: 0; color: #f87171; font-weight: bold;">${reason}</p>
                    </div>
                    <p style="font-size: 13px; color: #a1a1aa;">
                        Jika Anda memiliki pertanyaan atau ingin mendaftar ulang, silakan hubungi administrator atau kunjungi halaman pendaftaran kembali.
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
 * Send Subscription Expiring Warning Email (H-3 / H-1 Expired)
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
            subject: `⏰ Peringatan: Masa Aktif Berlangganan ${config.fromName} Berakhir Dalam ${daysRemaining} Hari!`,
            html: `
                <div style="font-family: sans-serif; background: #09090b; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); max-width: 600px; margin: 0 auto;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h1 style="color: #fbbf24; font-size: 24px; margin: 0;">⏳ Masa Aktif Paket Segera Berakhir</h1>
                    </div>
                    <p style="font-size: 15px; color: #e4e4e7;">Halo <strong>${vendor.name}</strong>,</p>
                    <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">
                        Paket berlangganan Anda di <strong>${config.fromName}</strong> akan berakhir dalam <strong style="color: #fbbf24;">${daysRemaining} hari lagi</strong> (Tanggal: ${vendor.expiresAt || 'Segera'}).
                    </p>
                    <div style="background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 10px; padding: 16px; margin: 20px 0;">
                        <p style="margin: 0; font-size: 13px; color: #fef08a;">
                            ⚠️ <strong>Perhatian:</strong> Perpanjang paket Anda sebelum kedaluwarsa agar galeri foto klien Anda tidak diarsip otomatis dan pelayanan tetap lancar.
                        </p>
                    </div>
                    <div style="text-align: center; margin: 28px 0;">
                        <a href="${loginUrl}" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
                            🔄 Perpanjang Paket Langganan Sekarang
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
 * Send Vendor Account Expired Win-Back Email
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
            subject: `🔒 Masa Langganan Berakhir — Aktifkan Kembali Akun ${config.fromName} Anda`,
            html: `
                <div style="font-family: sans-serif; background: #09090b; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #f87171; margin-top: 0;">Masa Aktif Langganan Telah Berakhir</h2>
                    <p style="font-size: 15px; color: #e4e4e7;">Halo <strong>${vendor.name}</strong>,</p>
                    <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">
                        Masa aktif paket berlangganan akun fotografer Anda telah berakhir. Saat ini galeri foto Anda dipindahkan ke status <strong>Arsip Aman</strong>.
                    </p>
                    <p style="font-size: 13px; color: #34d399;">
                        ✓ Data foto dan daftar pilihan klien Anda tetap tersimpan aman di Google Drive Anda.
                    </p>
                    <div style="text-align: center; margin: 28px 0;">
                        <a href="${loginUrl}" style="background: linear-gradient(135deg, #6366f1, #4f46e5); color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
                            🔓 Aktifkan Kembali Akun Sekarang
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
 * Send Project Quota Warning / Upsell Email
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
            subject: `🚀 Kuota Project Hampir Penuh (${currentProjects}/${plan.maxProjects}) — Upgrade Paket ${config.fromName}`,
            html: `
                <div style="font-family: sans-serif; background: #09090b; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #818cf8; margin-top: 0;">Kuota Proyek Anda Hampir Mencapai Batas</h2>
                    <p style="font-size: 15px; color: #e4e4e7;">Halo <strong>${vendor.name}</strong>,</p>
                    <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">
                        Anda saat ini telah menggunakan <strong>${currentProjects} dari ${plan.maxProjects} kuota proyek</strong> pada paket <strong>${plan.name}</strong>.
                    </p>
                    <p style="font-size: 13px; color: #d4d4d8;">
                        Tingkatkan paket Anda ke tier lebih tinggi untuk menambah kapasitas kuota proyek dan membuka fitur premium seperti Custom Logo Studio & RAW File Selector.
                    </p>
                    <div style="text-align: center; margin: 28px 0;">
                        <a href="${loginUrl}" style="background: linear-gradient(135deg, #818cf8, #6366f1); color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
                            ⚡ Upgrade Paket Sekarang
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
 * Send Client Gallery Expiration Warning Email (H-2 Expired)
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
            subject: `⏰ Pengingat: Galeri Foto ${project.name} Berakhir Dalam 48 Jam!`,
            html: `
                <div style="font-family: sans-serif; background: #09090b; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #fbbf24; margin-top: 0;">Masa Akses Galeri Foto Segera Berakhir</h2>
                    <p style="font-size: 15px; color: #e4e4e7;">Halo Pelanggan,</p>
                    <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">
                        Akses galeri seleksi foto Anda untuk proyek <strong>"${project.name}"</strong> dari <strong>${vendor.brandName || vendor.name}</strong> akan berakhir dalam 48 jam.
                    </p>
                    <p style="font-size: 13px; color: #fef08a;">
                        Silakan buka galeri dan selesaikan pemilihan foto favorit Anda sebelum waktu berakhir.
                    </p>
                    <div style="text-align: center; margin: 28px 0;">
                        <a href="${galleryUrl}" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
                            📸 Buka Galeri & Pilih Foto Sekarang
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
 * Send Subscription Renewal Confirmation Email
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
            subject: `🎉 Invoice Lunas: Perpanjangan Berlangganan ${config.fromName} Berhasil!`,
            html: `
                <div style="font-family: sans-serif; background: #09090b; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); max-width: 600px; margin: 0 auto;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h1 style="color: #34d399; font-size: 24px; margin: 0;">🎉 Perpanjangan Langganan Berhasil!</h1>
                    </div>
                    <p style="font-size: 15px; color: #e4e4e7;">Halo <strong>${vendor.name}</strong>,</p>
                    <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">
                        Pembayaran perpanjangan berlangganan Anda untuk paket <strong>${plan ? plan.name : 'Berlangganan'}</strong> telah berhasil diproses & diverifikasi LUNAS.
                    </p>
                    <div style="background: rgba(52, 211, 153, 0.1); border: 1px solid rgba(52, 211, 153, 0.3); border-radius: 10px; padding: 16px; margin: 20px 0;">
                        <div style="font-size: 13px; color: #6ee7b7; font-weight: bold; margin-bottom: 6px;">🧾 INVOICE PERPANJANGAN LUNAS:</div>
                        <div style="font-size: 14px; color: #ffffff; line-height: 1.6;">
                            <div>• <strong>Paket Utama:</strong> ${plan ? plan.name : 'Starter Plan'}</div>
                            <div>• <strong>Metode Pembayaran:</strong> ${cleanMethod}</div>
                            <div>• <strong>Tanggal Berakhir Baru:</strong> ${expiresAt || '-'}</div>
                            <div>• <strong>Masa Aktif Tambahan:</strong> ${plan ? plan.activePeriodDays || 30 : 30} Hari</div>
                            <div>• <strong>Status Pembayaran:</strong> <strong style="color: #34d399;">🟢 PAID / LUNAS</strong></div>
                        </div>
                    </div>
                    <div style="text-align: center; margin: 28px 0;">
                        <a href="${loginUrl}" style="background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
                            🚀 Masuk ke Dashboard
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
 * Send Subscription Upgrade Confirmation Email
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
            subject: `🚀 Invoice Lunas: Upgrade Paket Berlangganan ${config.fromName} Berhasil!`,
            html: `
                <div style="font-family: sans-serif; background: #09090b; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); max-width: 600px; margin: 0 auto;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h1 style="color: #818cf8; font-size: 24px; margin: 0;">🚀 Upgrade Paket Berhasil!</h1>
                    </div>
                    <p style="font-size: 15px; color: #e4e4e7;">Halo <strong>${vendor.name}</strong>,</p>
                    <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">
                        Selamat! Akun Anda telah berhasil di-upgrade dari <strong>${oldPlanName || 'Paket Sebelumnya'}</strong> ke <strong style="color: #818cf8;">${newPlan ? newPlan.name : 'Paket Baru'}</strong>!
                    </p>
                    <div style="background: rgba(129, 140, 248, 0.1); border: 1px solid rgba(129, 140, 248, 0.3); border-radius: 10px; padding: 16px; margin: 20px 0;">
                        <div style="font-size: 13px; color: #a5b4fc; font-weight: bold; margin-bottom: 6px;">🧾 INVOICE UPGRADE LUNAS:</div>
                        <div style="font-size: 14px; color: #ffffff; line-height: 1.6;">
                            <div>• <strong>Paket Baru:</strong> ${newPlan ? newPlan.name : 'Pro Studio Plan'}</div>
                            <div>• <strong>Metode Pembayaran:</strong> ${cleanMethod}</div>
                            <div>• <strong>Kapasitas Proyek:</strong> ${newPlan ? newPlan.maxProjects : 20} Proyek Aktif</div>
                            <div>• <strong>Tanggal Berakhir Baru:</strong> ${expiresAt || '-'}</div>
                            <div>• <strong>Status Pembayaran:</strong> <strong style="color: #34d399;">🟢 PAID / LUNAS</strong></div>
                            ${newPlan?.allowCustomLogo ? '<div>• <strong>Custom Logo Studio:</strong> ✅ Aktif</div>' : ''}
                            ${newPlan?.allowRawSelector ? '<div>• <strong>RAW Selector Sorter:</strong> ✅ Aktif</div>' : ''}
                        </div>
                    </div>
                    <div style="text-align: center; margin: 28px 0;">
                        <a href="${loginUrl}" style="background: linear-gradient(135deg, #6366f1, #4f46e5); color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
                            ⚡ Buka Dashboard & Nikmati Fitur Baru
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
 * Send Storage Grace Period Warning Email (H-15 & H-3 before auto-cleanup)
 */
export async function sendStorageGracePeriodWarningEmail(vendor, addonPlanName, daysLeft) {
    const config = getSmtpConfig();
    if (!config.enabled || !config.email || !config.password) return false;

    try {
        const transporter = createTransporter(config);
        const loginUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000/dashboard/storage';

        const isUrgent = daysLeft <= 3;
        const subject = isUrgent
            ? `⚠️ PERINGATAN FINAL (H-${daysLeft}): Cloud Storage Foto Anda Akan Dihapus Permanen!`
            : `⚠️ Peringatan H-${daysLeft}: Masa Tenggang Cloud Storage ${config.fromName}`;

        const mailOptions = {
            from: `"${config.fromName}" <${config.email}>`,
            to: vendor.email,
            subject,
            html: `
                <div style="font-family: sans-serif; background: #09090b; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid ${isUrgent ? 'rgba(239,68,68,0.4)' : 'rgba(251,191,36,0.4)'}; max-width: 600px; margin: 0 auto;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <span style="font-size: 40px;">⚠️</span>
                        <h1 style="color: ${isUrgent ? '#f87171' : '#fbbf24'}; font-size: 22px; margin: 8px 0 0 0;">
                            ${isUrgent ? 'PERINGATAN FINAL PEMBERSIHAN STORAGE' : 'PERINGATAN MASA TENGGANG CLOUD STORAGE'}
                        </h1>
                    </div>
                    <p style="font-size: 15px; color: #e4e4e7;">Halo <strong>${vendor.name}</strong>,</p>
                    <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">
                        Masa aktif paket Add-On Storage (<strong>${addonPlanName || 'Cloud Storage'}</strong>) Anda telah kedaluwarsa dan saat ini berada di masa tenggang.
                    </p>
                    <div style="background: ${isUrgent ? 'rgba(239, 68, 68, 0.12)' : 'rgba(251, 191, 36, 0.12)'}; border: 1px solid ${isUrgent ? 'rgba(239, 68, 68, 0.3)' : 'rgba(251, 191, 36, 0.3)'}; border-radius: 10px; padding: 16px; margin: 20px 0;">
                        <div style="font-size: 13px; color: ${isUrgent ? '#f87171' : '#fbbf24'}; font-weight: bold; margin-bottom: 6px;">
                            SISA WAKTU TERSISA: ${daysLeft} HARI
                        </div>
                        <p style="font-size: 13px; color: #e4e4e7; margin: 0; line-height: 1.5;">
                            ${isUrgent 
                                ? 'Dalam ' + daysLeft + ' hari ke depan, seluruh berkas foto di Cloud Storage Anda akan DIHAPUS PERMANEN dari server untuk mengosongkan kapasitas. Galeri klien saat ini dalam posisi TERKUNCI (Lock Overlay).' 
                                : 'Seluruh foto Anda masih tersimpan aman namun galeri klien sedang dikunci sementara. Perpanjang Add-On Storage sekarang untuk membuka kembali akses galeri secara instan.'
                            }
                        </p>
                    </div>
                    <div style="text-align: center; margin: 28px 0;">
                        <a href="${loginUrl}" style="background: linear-gradient(135deg, #6366f1, #4f46e5); color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
                            ⚡ Perpanjang Add-On Storage Sekarang
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
 * Send Pending QRIS Instructions Email (Sent immediately when QRIS code is generated)
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
            subject: `💳 Pendaftaran Akun ${config.fromName} Telah Diterima — Instruksi Pembayaran QRIS`,
            html: `
                <div style="font-family: sans-serif; background: #09090b; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid rgba(52, 211, 153, 0.3); max-width: 600px; margin: 0 auto;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h1 style="color: #34d399; font-size: 22px; margin: 0;">💳 Pendaftaran Telah Diterima</h1>
                        <p style="color: #a1a1aa; font-size: 13px; margin-top: 4px;">Silakan selesaikan pembayaran via QRIS untuk mengaktifkan akun Anda.</p>
                    </div>

                    <p style="font-size: 15px; color: #e4e4e7;">Halo <strong>${vendor.name}</strong> 👋,</p>
                    <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">
                        Pendaftaran akun Anda di <strong>${config.fromName}</strong> telah berhasil diterima. Berikut adalah rincian tagihan pembayaran QRIS Anda:
                    </p>

                    <div style="background: rgba(52, 211, 153, 0.08); border: 1px solid rgba(52, 211, 153, 0.25); border-radius: 10px; padding: 16px; margin: 20px 0; font-size: 13px; line-height: 1.7; color: #d4d4d8;">
                        <div>• <strong>No. Order Tagihan:</strong> ${orderId}</div>
                        <div>• <strong>Paket Utama:</strong> ${plan ? plan.name : 'Starter Plan'}</div>
                        ${addonPlanName ? `<div>• <strong>Add-On Cloud Storage:</strong> 💾 ${addonPlanName}</div>` : ''}
                        <div>• <strong>Total Tagihan:</strong> <strong style="color: #34d399; font-size: 15px;">Rp ${amount ? amount.toLocaleString('id-ID') : '0'}</strong></div>
                        <div>• <strong>Metode Pembayaran:</strong> QRIS</div>
                        <div>• <strong>Batas Waktu Bayar:</strong> 15–30 Menit (Sebelum Expired)</div>
                    </div>

                    <div style="text-align: center; margin: 28px 0;">
                        <a href="${resumeUrl}" style="background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);">
                            🚀 Selesaikan Pembayaran QRIS Sekarang
                        </a>
                    </div>

                    <p style="font-size: 12px; color: #71717a; text-align: center;">
                        Jika Anda sudah membayar, akun Anda akan aktif secara otomatis.
                    </p>
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
 * Send Pending Manual Transfer Received Email (Sent when user submits registration & uploads proof)
 */
export async function sendPendingManualTransferReceivedEmail(vendor, plan, addonPlanName = null) {
    const config = getSmtpConfig();
    if (!config.enabled || !config.email || !config.password) return false;

    try {
        const transporter = createTransporter(config);

        const mailOptions = {
            from: `"${config.fromName}" <${config.email}>`,
            to: vendor.email,
            subject: `📩 Pendaftaran Akun ${config.fromName} Telah Diterima — Menunggu Verifikasi Pembayaran`,
            html: `
                <div style="font-family: sans-serif; background: #09090b; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid rgba(129, 140, 248, 0.3); max-width: 600px; margin: 0 auto;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h1 style="color: #818cf8; font-size: 22px; margin: 0;">📩 Pendaftaran Akun Telah Diterima</h1>
                        <p style="color: #a1a1aa; font-size: 13px; margin-top: 4px;">Bukti pembayaran Anda sedang dalam proses verifikasi oleh Tim Admin.</p>
                    </div>

                    <p style="font-size: 15px; color: #e4e4e7;">Halo <strong>${vendor.name}</strong> 👋,</p>
                    <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">
                        Terima kasih! Pendaftaran akun fotografer/vendor Anda di <strong>${config.fromName}</strong> telah <strong>BERHASIL DITERIMA</strong>.
                    </p>

                    <div style="background: rgba(129, 140, 248, 0.08); border: 1px solid rgba(129, 140, 248, 0.25); border-radius: 10px; padding: 16px; margin: 20px 0; font-size: 13px; line-height: 1.7; color: #d4d4d8;">
                        <div style="font-weight: bold; color: #a5b4fc; margin-bottom: 8px;">📋 RINCIAN PENDAFTARAN:</div>
                        <div>• <strong>Nama Vendor:</strong> ${vendor.name}</div>
                        <div>• <strong>Email Registrasi:</strong> ${vendor.email}</div>
                        <div>• <strong>Paket Yang Dipilih:</strong> ${plan ? plan.name : 'Starter Plan'}</div>
                        ${addonPlanName ? `<div>• <strong>Add-On Cloud Storage:</strong> 💾 ${addonPlanName}</div>` : ''}
                        <div>• <strong>Metode Pembayaran:</strong> Transfer Bank Manual</div>
                        <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.06);">
                            • <strong>STATUS SAAT INI:</strong> <strong style="color: #fbbf24;">⏳ MENUNGGU VERIFIKASI ADMIN (Est. Max 1x24 Jam)</strong>
                        </div>
                    </div>

                    <p style="font-size: 13px; color: #a1a1aa; line-height: 1.6;">
                        Foto bukti transfer yang Anda unggah sedang diperiksa oleh tim admin kami. Setelah verifikasi selesai disetujui, Anda akan menerima email <strong>Invoice Lunas Resmi & Akses Masuk Dashboard</strong>.
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
 * Send Pending Manual Transfer Instructions Email (Sent when user selects manual transfer without proof yet, 24h deadline)
 */
export async function sendPendingManualTransferInstructionEmail(vendor, plan, addonPlanName = null) {
    const config = getSmtpConfig();
    if (!config.enabled || !config.email || !config.password) return false;

    try {
        const transporter = createTransporter(config);
        const uploadUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/register`;

        const mailOptions = {
            from: `"${config.fromName}" <${config.email}>`,
            to: vendor.email,
            subject: `📩 Pendaftaran Akun ${config.fromName} Telah Diterima — Instruksi Transfer Bank (Berlaku 24 Jam)`,
            html: `
                <div style="font-family: sans-serif; background: #09090b; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid rgba(251, 191, 36, 0.3); max-width: 600px; margin: 0 auto;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h1 style="color: #fbbf24; font-size: 22px; margin: 0;">🏦 Instruksi Transfer Bank Manual</h1>
                        <p style="color: #a1a1aa; font-size: 13px; margin-top: 4px;">Batas waktu transfer & upload bukti bayar adalah 1x24 Jam.</p>
                    </div>

                    <p style="font-size: 15px; color: #e4e4e7;">Halo <strong>${vendor.name}</strong> 👋,</p>
                    <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">
                        Pendaftaran akun Anda di <strong>${config.fromName}</strong> telah diterima. Silakan selesaikan transfer bank dan unggah bukti bayar dalam waktu <strong>24 Jam</strong>:
                    </p>

                    <div style="background: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.25); border-radius: 10px; padding: 16px; margin: 20px 0; font-size: 13px; line-height: 1.7; color: #d4d4d8;">
                        <div style="font-weight: bold; color: #fbbf24; margin-bottom: 8px;">🏦 REKENING BANK TUJUAN:</div>
                        <div>• <strong>Nama Bank:</strong> BCA (Bank Central Asia)</div>
                        <div>• <strong>No. Rekening:</strong> 123-456-7890</div>
                        <div>• <strong>Atas Nama:</strong> PT Pick Your Photo Digital</div>
                        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06);">
                            • <strong>Paket Dipilih:</strong> ${plan ? plan.name : 'Starter Plan'} ${addonPlanName ? '(+ ' + addonPlanName + ')' : ''}
                        </div>
                        <div>• <strong>Batas Waktu Transfer:</strong> <strong style="color: #f87171;">1x24 Jam dari Waktu Registrasi</strong></div>
                    </div>

                    <div style="text-align: center; margin: 28px 0;">
                        <a href="${uploadUrl}" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);">
                            📤 Upload Bukti Transfer Sekarang
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



