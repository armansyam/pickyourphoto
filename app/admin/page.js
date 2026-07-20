import { redirect } from 'next/navigation';
import { getAuthVendor } from '@/lib/auth';
import AdminDashboard from './AdminDashboard';

export const metadata = {
    title: 'Superadmin Console - Pick Your Photo',
    description: 'Owner console to manage SaaS vendor accounts.'
};

export const dynamic = 'force-dynamic';

export default function AdminPage() {
    const admin = getAuthVendor();

    // Enforce authentication
    if (!admin) {
        redirect('/login');
    }

    // Restrict to superadmin role only
    if (admin.role !== 'admin') {
        redirect('/dashboard');
    }

    // Render client component, passing safe admin details
    return (
        <AdminDashboard 
            adminUser={{
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }} 
        />
    );
}
