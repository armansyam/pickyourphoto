import { redirect } from 'next/navigation';
import { getAuthVendor } from '@/lib/auth';
import Link from 'next/link';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export default function DashboardLayout({ children }) {
    let vendor = null;
    try {
        vendor = getAuthVendor();
    } catch (err) {
        console.error('[DashboardLayout Auth Exception]:', err);
        redirect('/login');
    }

    // Server-side redirect if not authenticated
    if (!vendor) {
        redirect('/login');
    }

    // Redirect admins to the Superadmin Console
    if (vendor.role === 'admin') {
        redirect('/admin');
    }

    // Direct first-time active vendor to Onboarding Setup Wizard
    if (vendor && vendor.role !== 'admin') {
        try {
            const checkSetup = db.prepare('SELECT is_setup_completed, status FROM vendors WHERE id = ?').get(vendor.id);
            if (checkSetup && checkSetup.status === 'active' && !checkSetup.is_setup_completed) {
                redirect('/setup');
            }
        } catch (_) {}
    }

    let brandName = 'Pick Your Photo';
    let brandLogo = '/ams-logo.png';
    try {
        const rows = db.prepare("SELECT key, value FROM saas_settings WHERE key IN ('saas_name', 'saas_logo_url')").all() || [];
        for (const r of rows) {
            if (r.key === 'saas_name' && r.value) brandName = r.value;
            if (r.key === 'saas_logo_url' && r.value) brandLogo = r.value;
        }
    } catch (_) {}

    return (
        <div>
            <header className="dashboard-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src={brandLogo} alt={brandName} style={{ height: '36px', objectFit: 'contain' }} />
                    <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                        <span className="title-gradient" style={{ fontSize: '20px', fontWeight: 'bold' }}>
                            {brandName}
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
