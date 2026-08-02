import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';

// GET: Retrieve current vendor profile & branding
export async function GET() {
    try {
        const vendor = getAuthVendor();
        if (!vendor) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const freshVendor = db.prepare('SELECT id, name, email, brandName, brandLogo, copyDelimiter, copyIncludeExt, copySortOrder FROM vendors WHERE id = ?').get(vendor.id);
        return NextResponse.json(freshVendor);
    } catch (error) {
        console.error('Failed to get vendor profile:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

// PUT/POST: Update vendor profile & branding name / logo file upload
export async function PUT(request) {
    try {
        const vendor = getAuthVendor();
        if (!vendor) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const name = formData.get('name')?.toString();
        const brandName = formData.get('brandName')?.toString();
        const copyDelimiter = formData.get('copyDelimiter')?.toString() || ', ';
        const copyIncludeExt = parseInt(formData.get('copyIncludeExt')?.toString() || '0') || 0;
        const copySortOrder = formData.get('copySortOrder')?.toString() || 'name_asc';
        const logoFile = formData.get('logo'); // File object or null

        if (!name) {
            return NextResponse.json({ message: 'Name is required.' }, { status: 400 });
        }

        let brandLogoPath = null;
        
        // Handle logo file upload if provided
        if (logoFile && typeof logoFile !== 'string') {
            // 1. Validate file size (max 2MB)
            if (logoFile.size > 2 * 1024 * 1024) {
                return NextResponse.json({ message: 'Ukuran file logo terlalu besar. Maksimal 2MB.' }, { status: 400 });
            }

            // 2. Validate file type (must be image)
            if (!logoFile.type || !logoFile.type.startsWith('image/')) {
                return NextResponse.json({ message: 'Format berkas logo harus berupa gambar (PNG, JPG, WebP).' }, { status: 400 });
            }

            const logoDir = path.join(process.cwd(), 'public', 'vendor_logos');
            if (!fs.existsSync(logoDir)) {
                fs.mkdirSync(logoDir, { recursive: true });
            }

            const arrayBuffer = await logoFile.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            const ext = logoFile.name ? path.extname(logoFile.name) || '.png' : '.png';
            const fileName = `${vendor.id}_${Date.now()}_brandlogo${ext}`;
            const filePath = path.join(logoDir, fileName);
            
            fs.writeFileSync(filePath, buffer);
            brandLogoPath = `/vendor_logos/${fileName}`;

            // Optional: delete old logo if exists
            const currentVendor = db.prepare('SELECT brandLogo FROM vendors WHERE id = ?').get(vendor.id);
            if (currentVendor && currentVendor.brandLogo) {
                const oldPath = path.join(process.cwd(), 'public', currentVendor.brandLogo);
                if (fs.existsSync(oldPath)) {
                    try {
                        fs.unlinkSync(oldPath);
                    } catch (e) {
                        console.error('Failed to delete old brand logo:', e);
                    }
                }
            }
        }

        // Update database
        if (brandLogoPath) {
            db.prepare('UPDATE vendors SET name = ?, brandName = ?, brandLogo = ?, copyDelimiter = ?, copyIncludeExt = ?, copySortOrder = ? WHERE id = ?')
              .run(name, brandName || null, brandLogoPath, copyDelimiter, copyIncludeExt, copySortOrder, vendor.id);
        } else {
            db.prepare('UPDATE vendors SET name = ?, brandName = ?, copyDelimiter = ?, copyIncludeExt = ?, copySortOrder = ? WHERE id = ?')
              .run(name, brandName || null, copyDelimiter, copyIncludeExt, copySortOrder, vendor.id);
        }

        // Get updated details
        const updated = db.prepare('SELECT id, name, email, brandName, brandLogo, copyDelimiter, copyIncludeExt, copySortOrder FROM vendors WHERE id = ?').get(vendor.id);

        return NextResponse.json({
            message: 'Profile branding updated successfully.',
            vendor: updated
        });

    } catch (error) {
        console.error('Failed to update vendor profile:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
