import { redirect } from 'next/navigation';
import { getAuthVendor } from '@/lib/auth';
import AdminDashboard from './AdminDashboard';

export async function generateMetadata() {
    let saasName = 'Pick Your Photo';
    try {
        const db = (await import('@/lib/db')).default;
        const row = db.prepare("SELECT value FROM saas_settings WHERE key = 'saas_name'").get();
        if (row?.value) saasName = row.value;
    } catch (_) {}
    return {
        title: `Superadmin Console — ${saasName}`,
        description: `Owner console to manage ${saasName} accounts.`
    };
}

export const dynamic = 'force-dynamic';

export default function AdminPage() {
    const admin = getAuthVendor();

    // Enforce authentication — redirect unauthenticated to dedicated admin login
    if (!admin) {
        redirect('/admin/login');
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
