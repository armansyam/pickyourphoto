import { NextResponse } from 'next/server';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ message: 'orderId wajib diisi.' }, { status: 400 });
    }

    const transaction = db.prepare('SELECT * FROM payment_transactions WHERE orderId = ?').get(orderId);
    if (!transaction) {
      return NextResponse.json({ paid: false, message: 'Transaksi tidak ditemukan.' });
    }

    if (transaction.status === 'paid') {
      const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(transaction.vendorId);
      if (vendor) {
        // Generate auth session token matching login route
        const secret = process.env.JWT_SECRET || 'pick-your-photo-super-secret-key-2026';
        const token = jwt.sign(
          { id: vendor.id, name: vendor.name, email: vendor.email },
          secret,
          { expiresIn: '7d' }
        );

        const response = NextResponse.json({
          paid: true,
          status: 'paid',
          redirectUrl: '/dashboard',
          message: 'Pembayaran lunas. Mengarahkan ke Dashboard...'
        });

        // Set token cookie
        response.cookies.set('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 60 * 60 * 24, // 1 day
          path: '/',
        });

        return response;
      }
    }

    return NextResponse.json({ paid: false, status: transaction.status });

  } catch (error) {
    console.error('[Payment Status Check Error]:', error);
    return NextResponse.json({ paid: false, message: 'Internal server error' }, { status: 500 });
  }
}
