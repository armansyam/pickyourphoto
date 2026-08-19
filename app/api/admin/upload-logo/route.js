import { NextResponse } from 'next/server';
import { getAuthAdmin } from '@/lib/auth';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const admin = getAuthAdmin();
        if (!admin) {
            return NextResponse.json({ message: 'Unauthorized. Akses Superadmin diperlukan.' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('logoFile');

        if (!file || typeof file === 'string') {
            return NextResponse.json({ message: 'Berkas logo tidak ditemukan dalam permintaan.' }, { status: 400 });
        }

        // Validate File Size (Max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ message: 'Ukuran berkas logo terlalu besar. Maksimal 5MB.' }, { status: 400 });
        }

        // Validate extension
        const originalName = file.name || 'logo.png';
        const ext = path.extname(originalName).toLowerCase() || '.png';
        const allowedExts = ['.png', '.jpg', '.jpeg', '.svg', '.ico', '.webp'];
        if (!allowedExts.includes(ext)) {
            return NextResponse.json({ message: 'Format berkas tidak didukung. Gunakan PNG, JPG, SVG, ICO, atau WebP.' }, { status: 400 });
        }

        // Target Directory: public/uploads/
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const timestamp = Date.now();
        const fileName = `saas_logo_${timestamp}${ext}`;
        const filePath = path.join(uploadsDir, fileName);

        fs.writeFileSync(filePath, buffer);

        // Also sync to public/logo.png, public/favicon.png, public/favicon.ico for universal static fallbacks
        try {
            const publicDir = path.join(process.cwd(), 'public');
            fs.writeFileSync(path.join(publicDir, 'logo.png'), buffer);
            fs.writeFileSync(path.join(publicDir, 'favicon.png'), buffer);
            fs.writeFileSync(path.join(publicDir, 'favicon.ico'), buffer);
        } catch (copyErr) {
            console.warn('[Sync Favicon Warn]:', copyErr);
        }

        const logoUrl = `/uploads/${fileName}`;

        // Update database saas_settings
        db.prepare("INSERT OR REPLACE INTO saas_settings (key, value) VALUES ('saas_logo_url', ?)").run(logoUrl);
        db.prepare("INSERT OR REPLACE INTO saas_settings (key, value) VALUES ('saas_favicon_url', ?)").run(logoUrl);

        return NextResponse.json({
            success: true,
            logoUrl,
            message: 'Logo & Favicon platform berhasil diperbarui!'
        });
    } catch (err) {
        console.error('[Upload Logo API Error]:', err);
        return NextResponse.json({ message: 'Gagal mengunggah berkas logo: ' + err.message }, { status: 500 });
    }
}

// DELETE: Reset to default logo
export async function DELETE() {
    try {
        const admin = getAuthAdmin();
        if (!admin) {
            return NextResponse.json({ message: 'Unauthorized. Akses Superadmin diperlukan.' }, { status: 401 });
        }

        db.prepare("DELETE FROM saas_settings WHERE key IN ('saas_logo_url', 'saas_favicon_url')").run();

        return NextResponse.json({
            success: true,
            logoUrl: '/logo.png',
            message: 'Logo & Favicon berhasil dikembalikan ke default!'
        });
    } catch (err) {
        return NextResponse.json({ message: err.message }, { status: 500 });
    }
}
