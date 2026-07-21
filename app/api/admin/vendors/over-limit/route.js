import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import { getOverLimitVendors } from '@/lib/vendor-status';

export async function GET() {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        const allVendors = getOverLimitVendors();
        const overLimitVendors = allVendors.filter(v => v.isOverLimit === 1);

        return NextResponse.json(overLimitVendors);
    } catch (error) {
        console.error('Failed to retrieve over-limit vendors:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
