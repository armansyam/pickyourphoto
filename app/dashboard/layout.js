import { redirect } from 'next/navigation';
import { getAuthVendor } from '@/lib/auth';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function DashboardLayout({ children }) {
    const vendor = getAuthVendor();

    // Server-side redirect if not authenticated
    if (!vendor) {
        redirect('/login');
    }

    // Redirect admins to the Superadmin Console
    if (vendor.role === 'admin') {
        redirect('/admin');
    }

    return (
        <div>
            <header className="dashboard-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src="/ams-logo.png" alt="AMS Logo" style={{ height: '36px', objectFit: 'contain' }} />
                    <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                        <span className="title-gradient" style={{ fontSize: '20px', fontWeight: 'bold' }}>
                            Pick Your Photo
                        </span>
                    </Link>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {vendor.role === 'admin' && (
                        <Link href="/admin" className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px', textDecoration: 'none', background: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.3)', color: '#a5b4fc' }}>
                            Admin Panel
                        </Link>
                    )}
                    <span style={{ fontSize: '14px', color: '#a1a1aa' }}>
                        Hello, <strong>{vendor.name}</strong>
                    </span>
                    <a href="/api/auth/logout" className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px', textDecoration: 'none' }}>
                        Log Out
                    </a>
                </div>
            </header>
            <main style={{ minHeight: '80vh' }}>{children}</main>
        </div>
    );
}
