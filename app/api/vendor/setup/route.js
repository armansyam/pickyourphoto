import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { validateSubdomain, isSubdomainAvailable, suggestAlternatives, getRootDomain } from '@/lib/subdomain';

export const dynamic = 'force-dynamic';

// GET: Ambil data vendor terkini untuk pre-fill Form Setup Wizard
export async function GET() {
    try {
        const authUser = getAuthVendor();
        if (!authUser) {
            return NextResponse.json({ message: 'Sesi login tidak valid. Silakan login kembali.' }, { status: 401 });
        }

        const vendor = db.prepare(`
            SELECT id, name, email, whatsapp, city, address, brandName, brandLogo, 
                   studio_whatsapp, subdomain, is_setup_completed, status
            FROM vendors 
            WHERE id = ?
        `).get(authUser.id);

        if (!vendor) {
            return NextResponse.json({ message: 'Data vendor tidak ditemukan.' }, { status: 404 });
        }

        const rootDomain = getRootDomain();

        return NextResponse.json({
            success: true,
            vendor: {
                id: vendor.id,
                email: vendor.email,
                name: vendor.name || '',
                whatsapp: vendor.whatsapp || '',
                city: vendor.city || '',
                address: vendor.address || '',
                brandName: vendor.brandName || '',
                brandLogo: vendor.brandLogo || '',
                studio_whatsapp: vendor.studio_whatsapp || vendor.whatsapp || '',
                subdomain: vendor.subdomain || '',
                is_setup_completed: Boolean(vendor.is_setup_completed)
            },
            rootDomain
        });
    } catch (error) {
        console.error('[Setup GET Error]:', error);
        return NextResponse.json({ message: 'Terjadi kesalahan sistem.' }, { status: 500 });
    }
}

// POST: Simpan konfigurasi Setup Wizard dan tandai is_setup_completed = 1
export async function POST(request) {
    try {
        const authUser = getAuthVendor();
        if (!authUser) {
            return NextResponse.json({ message: 'Sesi login tidak valid. Silakan login kembali.' }, { status: 401 });
        }

        const vendor = db.prepare('SELECT id, status, brandLogo, subdomain FROM vendors WHERE id = ?').get(authUser.id);
        if (!vendor) {
            return NextResponse.json({ message: 'Data vendor tidak ditemukan.' }, { status: 404 });
        }

        const formData = await request.formData();
        const name = (formData.get('name')?.toString() || '').trim();
        const rawWhatsapp = (formData.get('whatsapp')?.toString() || '').trim();
        const city = (formData.get('city')?.toString() || '').trim();
        const address = (formData.get('address')?.toString() || '').trim();
        const brandName = (formData.get('brandName')?.toString() || '').trim();
        const rawStudioWhatsapp = (formData.get('studio_whatsapp')?.toString() || '').trim();
        const rawSubdomain = (formData.get('subdomain')?.toString() || '').toLowerCase().trim();
        const logoFile = formData.get('logo'); // File object or null

        // 1. Validasi Biodata Pemilik Wajib
        if (!name) {
            return NextResponse.json({ message: 'Nama pemilik akun wajib diisi.' }, { status: 400 });
        }
        if (!rawWhatsapp) {
            return NextResponse.json({ message: 'Nomor WhatsApp pemilik akun wajib diisi.' }, { status: 400 });
        }

        let cleanWhatsapp = rawWhatsapp.replace(/\D/g, '');
        if (cleanWhatsapp.startsWith('0')) cleanWhatsapp = '62' + cleanWhatsapp.slice(1);
        if (cleanWhatsapp && !cleanWhatsapp.startsWith('62')) cleanWhatsapp = '62' + cleanWhatsapp;

        let cleanStudioWhatsapp = rawStudioWhatsapp.replace(/\D/g, '');
        if (cleanStudioWhatsapp.startsWith('0')) cleanStudioWhatsapp = '62' + cleanStudioWhatsapp.slice(1);
        if (cleanStudioWhatsapp && !cleanStudioWhatsapp.startsWith('62')) cleanStudioWhatsapp = '62' + cleanStudioWhatsapp;

        if (!cleanStudioWhatsapp) {
            cleanStudioWhatsapp = cleanWhatsapp;
        }

        // 2. Validasi Subdomain Wajib
        if (!rawSubdomain) {
            return NextResponse.json({ message: 'Subdomain studio wajib diisi.' }, { status: 400 });
        }

        const validation = validateSubdomain(rawSubdomain);
        if (!validation.valid) {
            return NextResponse.json({
                message: validation.reason,
                suggestions: suggestAlternatives(rawSubdomain)
            }, { status: 400 });
        }

        const available = isSubdomainAvailable(rawSubdomain, vendor.id);
        if (!available) {
            return NextResponse.json({
                message: 'Subdomain ini sudah digunakan oleh studio lain.',
                suggestions: suggestAlternatives(rawSubdomain)
            }, { status: 409 });
        }

        // 3. Handle Logo Upload jika ada
        let brandLogoPath = vendor.brandLogo;
        if (logoFile && typeof logoFile !== 'string' && logoFile.size > 0) {
            if (logoFile.size > 2 * 1024 * 1024) {
                return NextResponse.json({ message: 'Ukuran file logo terlalu besar. Maksimal 2MB.' }, { status: 400 });
            }

            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
            if (!allowedTypes.includes(logoFile.type)) {
                return NextResponse.json({ message: 'Format logo harus JPG, PNG, WEBP, atau SVG.' }, { status: 400 });
            }

            const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'logos');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            const ext = path.extname(logoFile.name) || '.png';
            const fileName = `vendor_${vendor.id}_logo_${Date.now()}${ext}`;
            const filePath = path.join(uploadsDir, fileName);

            const buffer = Buffer.from(await logoFile.arrayBuffer());
            fs.writeFileSync(filePath, buffer);

            // Hapus logo lama jika ada
            if (vendor.brandLogo && vendor.brandLogo.startsWith('/uploads/logos/')) {
                const oldLogoPath = path.join(process.cwd(), 'public', vendor.brandLogo);
                if (fs.existsSync(oldLogoPath)) {
                    try { fs.unlinkSync(oldLogoPath); } catch (_) {}
                }
            }

            brandLogoPath = `/uploads/logos/${fileName}`;
        }

        // 4. Update Database
        db.prepare(`
            UPDATE vendors
            SET name = ?,
                whatsapp = ?,
                city = ?,
                address = ?,
                brandName = ?,
                brandLogo = ?,
                studio_whatsapp = ?,
                subdomain = ?,
                subdomain_active = 1,
                subdomain_set_at = COALESCE(subdomain_set_at, CURRENT_TIMESTAMP),
                is_setup_completed = 1
            WHERE id = ?
        `).run(
            name,
            cleanWhatsapp,
            city || null,
            address || null,
            brandName || null,
            brandLogoPath || null,
            cleanStudioWhatsapp,
            rawSubdomain,
            vendor.id
        );

        return NextResponse.json({
            success: true,
            message: 'Profil studio berhasil dikonfigurasi.',
            redirectUrl: '/dashboard'
        });
    } catch (error) {
        console.error('[Setup POST Error]:', error);
        return NextResponse.json({ message: 'Terjadi kesalahan saat menyimpan data.' }, { status: 500 });
    }
}
