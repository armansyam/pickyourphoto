import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { getAuthVendor } from '@/lib/auth';

export async function GET(request, { params }) {
    try {
        const user = getAuthVendor();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Akses ditolak. Hanya Superadmin yang diizinkan.' }, { status: 403 });
        }

        const resolvedParams = await params;
        const rawFilename = resolvedParams?.filename || params?.filename;
        if (!rawFilename) {
            return NextResponse.json({ success: false, error: 'Nama berkas tidak valid.' }, { status: 400 });
        }

        // Sanitasi filename untuk mencegah path traversal (Directory Traversal Attack)
        const safeFilename = path.basename(rawFilename);
        if (!safeFilename || safeFilename.includes('..')) {
            return NextResponse.json({ success: false, error: 'Nama berkas tidak valid.' }, { status: 400 });
        }

        // Cari lokasi berkas di private storage terlebih dahulu, lalu fallback ke lokasi legacy
        const candidatePaths = [
            path.join(process.cwd(), 'data', 'private_storage', 'proofs', safeFilename),
            path.join(process.cwd(), 'public', 'uploads', 'proofs', safeFilename),
            path.join(process.cwd(), 'public', 'staging_uploads', 'payment_proofs', safeFilename)
        ];

        let targetFilePath = null;
        for (const candidate of candidatePaths) {
            if (fs.existsSync(candidate)) {
                targetFilePath = candidate;
                break;
            }
        }

        if (!targetFilePath) {
            return NextResponse.json({ success: false, error: 'Berkas bukti transfer tidak ditemukan.' }, { status: 404 });
        }

        const fileBuffer = fs.readFileSync(targetFilePath);
        const ext = path.extname(safeFilename).toLowerCase();

        let contentType = 'image/jpeg';
        if (ext === '.png') contentType = 'image/png';
        else if (ext === '.webp') contentType = 'image/webp';
        else if (ext === '.gif') contentType = 'image/gif';
        else if (ext === '.pdf') contentType = 'application/pdf';

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Length': fileBuffer.length.toString(),
                'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
                'X-Content-Type-Options': 'nosniff'
            }
        });
    } catch (error) {
        console.error('Error serving private payment proof:', error);
        return NextResponse.json({ success: false, error: 'Terjadi kesalahan sistem.' }, { status: 500 });
    }
}
