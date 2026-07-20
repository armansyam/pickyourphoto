import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthVendor } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function PUT(request) {
    try {
        const admin = getAuthVendor();
        if (!admin || admin.role !== 'admin') {
            return NextResponse.json({ message: 'Unauthorized. Superadmin access required.' }, { status: 401 });
        }

        const body = await request.json();
        const { 
            password, 
            bank_name, 
            bank_account_number, 
            bank_account_name, 
            contact_email, 
            contact_whatsapp 
        } = body;

        // 1. Update password if provided
        if (password && password.trim() !== '') {
            if (password.length < 6) {
                return NextResponse.json({ message: 'Password must be at least 6 characters.' }, { status: 400 });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            db.prepare("UPDATE vendors SET password = ? WHERE id = ?").run(hashedPassword, admin.id);
        }

        // 2. Update SaaS settings
        const upsertStmt = db.prepare(`
            INSERT INTO saas_settings (key, value) 
            VALUES (?, ?) 
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `);

        if (bank_name !== undefined) upsertStmt.run('bank_name', bank_name);
        if (bank_account_number !== undefined) upsertStmt.run('bank_account_number', bank_account_number);
        if (bank_account_name !== undefined) upsertStmt.run('bank_account_name', bank_account_name);
        if (contact_email !== undefined) upsertStmt.run('contact_email', contact_email);
        if (contact_whatsapp !== undefined) upsertStmt.run('contact_whatsapp', contact_whatsapp);

        return NextResponse.json({ message: 'Profile and SaaS settings updated successfully.' }, { status: 200 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
    }
}
