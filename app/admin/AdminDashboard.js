"use client";

import { useState, useEffect, useCallback } from 'react';

export default function AdminDashboard({ adminUser }) {
    const [activeTab, setActiveTab] = useState('vendors'); // 'vendors' | 'plans' | 'upgrades' | 'settings'
    const [vendorSubTab, setVendorSubTab] = useState('active'); // 'active' | 'inactive'
    const [vendors, setVendors] = useState([]);
    const [plans, setPlans] = useState([]);
    const [upgradeRequests, setUpgradeRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modal Vendor Edit states
    const [editingVendor, setEditingVendor] = useState(null);
    const [vendorPlanId, setVendorPlanId] = useState('');
    const [vendorStatus, setVendorStatus] = useState('active');
    const [vendorExpiresAt, setVendorExpiresAt] = useState('');
    const [vendorResetPassword, setVendorResetPassword] = useState('');

    // Additional projects subsidy states
    const [vendorAdditionalProjects, setVendorAdditionalProjects] = useState(0);
    const [vendorAdditionalPhotos, setVendorAdditionalPhotos] = useState(0);
    const [vendorAdditionalProjectsExpiresAt, setVendorAdditionalProjectsExpiresAt] = useState('');
    const [savingVendor, setSavingVendor] = useState(false);

    // Custom vendor deletion state
    const [vendorToDelete, setVendorToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Custom admin modal confirmation states
    const [vendorToApprove, setVendorToApprove] = useState(null);
    const [approving, setApproving] = useState(false);

    const [upgradeToProcess, setUpgradeToProcess] = useState(null);
    const [processingUpgrade, setProcessingUpgrade] = useState(false);

    const [planToDelete, setPlanToDelete] = useState(null);
    const [deletingPlan, setDeletingPlan] = useState(false);

    const [toasts, setToasts] = useState([]);
    const addToast = useCallback((message, type = 'info', duration = 5000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type, duration }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    // Modal Plan CRUD states
    const [editingPlan, setEditingPlan] = useState(null); // null for create
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [planName, setPlanName] = useState('');
    const [planMaxProjects, setPlanMaxProjects] = useState(5);
    const [planPrice, setPlanPrice] = useState(0);
    const [planExpireDays, setPlanExpireDays] = useState(30);
    const [planMaxPhotos, setPlanMaxPhotos] = useState(100);
    const [planActivePeriodDays, setPlanActivePeriodDays] = useState(30);
    const [planStatus, setPlanStatus] = useState('active');
    const [savingPlan, setSavingPlan] = useState(false);
    const [planType, setPlanType] = useState('limit');
    const [planMaxStorageMB, setPlanMaxStorageMB] = useState(0);

    // Lightbox for payment proof
    const [activeProofUrl, setActiveProofUrl] = useState(null);

    // Admin Profile & Settings states
    const [newPassword, setNewPassword] = useState('');
    const [bankName, setBankName] = useState('');
    const [bankAccountNumber, setBankAccountNumber] = useState('');
    const [bankAccountName, setBankAccountName] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [contactWhatsapp, setContactWhatsapp] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
    const [profileErrorMsg, setProfileErrorMsg] = useState('');

    // --- NEW: System settings and disk stats states ---
    const [sysEnableReg, setSysEnableReg] = useState(true);
    const [sysEnableTrial, setSysEnableTrial] = useState(true);
    const [sysMaxQuota, setSysMaxQuota] = useState(null);
    const [sysWarnThreshold, setSysWarnThreshold] = useState(20);
    const [sysCritThreshold, setSysCritThreshold] = useState(10);

    const [diskStats, setDiskStats] = useState({
        total_gb: '0',
        used_gb: '0',
        free_gb: '0',
        free_percent: '100',
        status: 'safe'
    });

    const fetchSystemSettings = async () => {
        try {
            const res = await fetch('/api/admin/settings');
            if (res.ok) {
                const data = await res.json();
                setSysEnableReg(data.enable_registration === 1);
                setSysEnableTrial(data.enable_free_trial === 1);
                setSysMaxQuota(data.max_vendor_quota);
                setSysWarnThreshold(data.disk_warning_threshold_percent);
                setSysCritThreshold(data.disk_critical_threshold_percent);
            }
        } catch (err) {
            console.error('Failed to fetch system settings:', err);
        }
    };

    const fetchDiskStats = async () => {
        try {
            const res = await fetch('/api/admin/disk-stats');
            if (res.ok) {
                const data = await res.json();
                setDiskStats(data);
            }
        } catch (err) {
            console.error('Failed to fetch disk stats:', err);
        }
    };

    // Load initial data
    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            // Fetch vendors
            const resVendors = await fetch('/api/admin/vendors');
            if (!resVendors.ok) throw new Error('Failed to retrieve vendors.');
            const dataVendors = await resVendors.json();
            setVendors(dataVendors);

            // Fetch plans
            const resPlans = await fetch('/api/admin/plans');
            if (!resPlans.ok) throw new Error('Failed to retrieve plans.');
            const dataPlans = await resPlans.json();
            setPlans(dataPlans);

            // Fetch upgrade requests
            const resUpgrades = await fetch('/api/admin/upgrades');
            if (resUpgrades.ok) {
                const dataUpgrades = await resUpgrades.json();
                setUpgradeRequests(dataUpgrades);
            }

            // Fetch settings
            const resSettings = await fetch('/api/settings');
            if (resSettings.ok) {
                const dataSettings = await resSettings.json();
                setBankName(dataSettings.bank_name || '');
                setBankAccountNumber(dataSettings.bank_account_number || '');
                setBankAccountName(dataSettings.bank_account_name || '');
                setContactEmail(dataSettings.contact_email || '');
                setContactWhatsapp(dataSettings.contact_whatsapp || '');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        fetchSystemSettings();
        fetchDiskStats();

        const interval = setInterval(fetchDiskStats, 30000);
        return () => clearInterval(interval);
    }, []);

    // Calculate Analytics
    const totalVendors = vendors.length;
    const activeVendors = vendors.filter(v => v.status === 'active').length;
    const pendingApprovals = vendors.filter(v => v.status === 'pending').length;
    const suspendedVendors = vendors.filter(v => v.status === 'suspended').length;

    const totalProjects = vendors.reduce((acc, curr) => acc + (curr.projectCount || 0), 0);
    const completedProjects = vendors.reduce((acc, curr) => acc + (curr.completedProjectsCount || 0), 0);
    const pendingProjects = totalProjects - completedProjects;

    const completionRate = totalProjects > 0 ? ((completedProjects / totalProjects) * 100).toFixed(1) : '0';

    // Estimasi Pendapatan SaaS per Bulan (Hanya dari vendor aktif yang membayar)
    const monthlyRevenue = vendors
        .filter(v => v.status === 'active')
        .reduce((acc, curr) => acc + (curr.planPrice || 0), 0);

    // ── VENDOR ACTIONS ──

    const handleOpenEditVendor = (vendor) => {
        setEditingVendor(vendor);
        setVendorPlanId(vendor.planId || '');
        setVendorStatus(vendor.status);
        setVendorResetPassword('');
        setVendorAdditionalProjects(vendor.additionalProjects || 0);
        setVendorAdditionalPhotos(vendor.additionalPhotosPerProject || 0);
        
        // Format expiration date for HTML date input: YYYY-MM-DD
        if (vendor.expiresAt) {
            const d = new Date(vendor.expiresAt);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const date = String(d.getDate()).padStart(2, '0');
            setVendorExpiresAt(`${y}-${m}-${date}`);
        } else {
            // Default: 30 days from now if new approval
            const d = new Date();
            d.setDate(d.getDate() + 30);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const date = String(d.getDate()).padStart(2, '0');
            setVendorExpiresAt(`${y}-${m}-${date}`);
        }

        // Format subsidy expiration date: default to plan expiresAt if not set
        const subsidyExpireSource = vendor.additionalProjectsExpiresAt || vendor.expiresAt;
        if (subsidyExpireSource) {
            const d = new Date(subsidyExpireSource);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const date = String(d.getDate()).padStart(2, '0');
            setVendorAdditionalProjectsExpiresAt(`${y}-${m}-${date}`);
        } else {
            setVendorAdditionalProjectsExpiresAt('');
        }
    };

    const handleSaveVendor = async (e) => {
        e.preventDefault();
        setSavingVendor(true);

        try {
            const res = await fetch(`/api/admin/vendors/${editingVendor.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    planId: parseInt(vendorPlanId), 
                    status: vendorStatus, 
                    expiresAt: vendorExpiresAt ? new Date(vendorExpiresAt).toISOString() : null,
                    password: vendorResetPassword,
                    additionalProjects: parseInt(vendorAdditionalProjects) || 0,
                    additionalPhotosPerProject: parseInt(vendorAdditionalPhotos) || 0,
                    additionalProjectsExpiresAt: vendorAdditionalProjectsExpiresAt ? new Date(vendorAdditionalProjectsExpiresAt).toISOString() : null
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to update vendor settings.');
            }

            setEditingVendor(null);
            fetchData();
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setSavingVendor(false);
        }
    };

    const handleApproveVendorQuick = (vendor) => {
        setVendorToApprove(vendor);
    };

    const confirmApproveVendor = async () => {
        if (!vendorToApprove) return;
        const activeDays = vendorToApprove.planActivePeriodDays !== undefined ? vendorToApprove.planActivePeriodDays : 30;
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + activeDays);

        setApproving(true);
        try {
            const res = await fetch(`/api/admin/vendors/${vendorToApprove.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    planId: vendorToApprove.planId || (plans[0]?.id || 1), 
                    status: 'active', 
                    expiresAt: expiry.toISOString() 
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to approve vendor.');
            }

            addToast(`Pendaftaran vendor "${vendorToApprove.name}" berhasil disetujui!`, 'success');
            setVendorToApprove(null);
            fetchData();
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setApproving(false);
        }
    };

    const handleDeleteVendor = (vendor) => {
        setVendorToDelete(vendor);
    };

    const confirmDeleteVendor = async () => {
        if (!vendorToDelete) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/admin/vendors/${vendorToDelete.id}`, {
                method: 'DELETE'
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Gagal menghapus vendor.');
            }

            addToast(data.message || 'Vendor berhasil dihapus.', 'success');
            setVendorToDelete(null);
            fetchData();
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setDeleting(false);
        }
    };

    const handleProcessUpgrade = (req, action) => {
        setUpgradeToProcess({
            id: req.id,
            action,
            vendorName: req.vendorName,
            planName: req.planName
        });
    };

    const confirmProcessUpgrade = async () => {
        if (!upgradeToProcess) return;
        setProcessingUpgrade(true);
        try {
            const res = await fetch('/api/admin/upgrades', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: upgradeToProcess.id, action: upgradeToProcess.action })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to process upgrade request.');
            }

            addToast(upgradeToProcess.action === 'approve' ? 'Permintaan upgrade berhasil disetujui!' : 'Permintaan upgrade berhasil ditolak.', 'success');
            setUpgradeToProcess(null);
            fetchData();
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setProcessingUpgrade(false);
        }
    };

    // ── PLAN CRUD ACTIONS ──

    const handleOpenCreatePlan = () => {
        setEditingPlan(null);
        setPlanName('');
        setPlanMaxProjects(5);
        setPlanPrice(0);
        setPlanExpireDays(30);
        setPlanMaxPhotos(100);
        setPlanActivePeriodDays(30);
        setPlanStatus('active');
        setPlanType('limit');
        setPlanMaxStorageMB(0);
        setShowPlanModal(true);
    };

    const handleOpenEditPlan = (plan) => {
        setEditingPlan(plan);
        setPlanName(plan.name);
        setPlanMaxProjects(plan.maxProjects);
        setPlanPrice(plan.price);
        setPlanExpireDays(plan.projectExpireDays || 0);
        setPlanMaxPhotos(plan.maxPhotosPerProject || 0);
        setPlanActivePeriodDays(plan.activePeriodDays !== undefined ? plan.activePeriodDays : 30);
        setPlanStatus(plan.status || 'active');
        setPlanType(plan.planType || 'limit');
        setPlanMaxStorageMB(plan.maxStorageMB || 0);
        setShowPlanModal(true);
    };

    const handleSavePlan = async (e) => {
        e.preventDefault();
        setSavingPlan(true);

        const method = editingPlan ? 'PUT' : 'POST';
        const url = editingPlan ? `/api/admin/plans/${editingPlan.id}` : '/api/admin/plans';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name: planName, 
                    maxProjects: planMaxProjects, 
                    price: planPrice,
                    projectExpireDays: planExpireDays,
                    maxPhotosPerProject: planMaxPhotos,
                    activePeriodDays: planActivePeriodDays,
                    status: planStatus,
                    planType,
                    maxStorageMB: planMaxStorageMB
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to save plan.');
            }

            setShowPlanModal(false);
            fetchData();
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setSavingPlan(false);
        }
    };

    const handleDeletePlan = (plan) => {
        setPlanToDelete(plan);
    };

    const confirmDeletePlan = async () => {
        if (!planToDelete) return;
        setDeletingPlan(true);
        try {
            const res = await fetch(`/api/admin/plans/${planToDelete.id}`, { method: 'DELETE' });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Failed to delete plan.');
            }

            addToast(`Paket plan "${planToDelete.name}" berhasil dihapus.`, 'success');
            setPlanToDelete(null);
            fetchData();
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setDeletingPlan(false);
        }
    };

    // ── ADMIN PROFILE & SETTINGS SAVE ──

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setSavingProfile(true);
        setProfileSuccessMsg('');
        setProfileErrorMsg('');

        try {
            // 1. Update Profile & SaaS Settings
            const res = await fetch('/api/admin/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password: newPassword,
                    bank_name: bankName,
                    bank_account_number: bankAccountNumber,
                    bank_account_name: bankAccountName,
                    contact_email: contactEmail,
                    contact_whatsapp: contactWhatsapp
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to update settings profile.');
            }

            // 2. Update System Settings & Disk Protection Settings
            const resSysSettings = await fetch('/api/admin/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    enable_registration: sysEnableReg,
                    enable_free_trial: sysEnableTrial,
                    max_vendor_quota: sysMaxQuota,
                    disk_warning_threshold_percent: sysWarnThreshold,
                    disk_critical_threshold_percent: sysCritThreshold
                })
            });

            if (!resSysSettings.ok) {
                const sysData = await resSysSettings.json();
                throw new Error(sysData.message || 'Failed to update system settings.');
            }

            setProfileSuccessMsg('Superadmin profile and SaaS settings updated successfully.');
            setNewPassword(''); // reset input
            fetchData();
            fetchSystemSettings();
            fetchDiskStats();
        } catch (err) {
            setProfileErrorMsg(err.message);
        } finally {
            setSavingProfile(false);
        }
    };

    // Helper: Check if expired
    const isExpired = (expiryString) => {
        if (!expiryString) return false;
        return new Date() > new Date(expiryString);
    };

    return (
        <div>
            {/* Critical Disk Alert Banner */}
            {diskStats.status === 'critical' && (
                <div style={{ 
                    background: '#ef4444', 
                    color: '#ffffff', 
                    padding: '10px 20px', 
                    textAlign: 'center', 
                    fontWeight: 'bold', 
                    fontSize: '13px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '10px',
                    animation: 'pulse 2s infinite'
                }}>
                    <style>{`
                        @keyframes pulse {
                            0% { background-color: #ef4444; }
                            50% { background-color: #b91c1c; }
                            100% { background-color: #ef4444; }
                        }
                    `}</style>
                    <span>⚠️</span>
                    <span><strong>PERINGATAN KRITIS:</strong> Ruang disk server tinggal {diskStats.free_percent}% ({diskStats.free_gb} GB kosong). Registrasi vendor baru telah dinonaktifkan secara otomatis untuk melindungi kestabilan database.</span>
                </div>
            )}

            {/* Header */}
            <header className="dashboard-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src="/ams-logo.png" alt="AMS Logo" style={{ height: '36px', objectFit: 'contain' }} />
                    <span className="title-gradient" style={{ fontSize: '20px', fontWeight: 'bold' }}>
                        Owner SaaS Console
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '14px', color: '#a1a1aa' }}>
                        Admin: <strong>{adminUser.name}</strong>
                    </span>
                    <a href="/api/auth/logout" className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px', textDecoration: 'none' }}>
                        Log Out
                    </a>
                </div>
            </header>

            <div className="app-container">
                <div style={{ marginTop: '16px', marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 'bold' }}>Admin Control Panel</h1>
                        <p style={{ color: '#a1a1aa', margin: '4px 0 0 0' }}>SaaS progress analysis and vendor subscription management</p>
                    </div>
                    {/* Tab Navigation */}
                    <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <button 
                            onClick={() => setActiveTab('vendors')}
                            className={activeTab === 'vendors' ? 'btn-primary' : 'btn-secondary'}
                            style={{ border: 'none', background: activeTab === 'vendors' ? '' : 'transparent', padding: '8px 16px', fontSize: '13px', boxShadow: activeTab === 'vendors' ? '' : 'none' }}
                        >
                            Manage Vendors
                        </button>
                        <button 
                            onClick={() => setActiveTab('plans')}
                            className={activeTab === 'plans' ? 'btn-primary' : 'btn-secondary'}
                            style={{ border: 'none', background: activeTab === 'plans' ? '' : 'transparent', padding: '8px 16px', fontSize: '13px', boxShadow: activeTab === 'plans' ? '' : 'none' }}
                        >
                            Manage Plans
                        </button>
                        <button 
                            onClick={() => setActiveTab('upgrades')}
                            className={activeTab === 'upgrades' ? 'btn-primary' : 'btn-secondary'}
                            style={{ border: 'none', background: activeTab === 'upgrades' ? '' : 'transparent', padding: '8px 16px', fontSize: '13px', boxShadow: activeTab === 'upgrades' ? '' : 'none' }}
                        >
                            Upgrade Requests ({upgradeRequests.filter(r => r.status === 'pending').length})
                        </button>
                        <button 
                            onClick={() => setActiveTab('settings')}
                            className={activeTab === 'settings' ? 'btn-primary' : 'btn-secondary'}
                            style={{ border: 'none', background: activeTab === 'settings' ? '' : 'transparent', padding: '8px 16px', fontSize: '13px', boxShadow: activeTab === 'settings' ? '' : 'none' }}
                        >
                            Settings & Profil
                        </button>
                    </div>
                </div>

                {/* ── PROGRESS & REVENUE ANALYSIS DASHBOARD ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                    
                    {/* Potential Revenue Card */}
                    <div className="glass-card" style={{ padding: '20px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(0,0,0,0))' }}>
                        <span style={{ fontSize: '13px', color: '#a1a1aa' }}>Monthly Potential Revenue</span>
                        <h2 style={{ fontSize: '32px', margin: '6px 0 2px 0', fontWeight: 'bold', color: '#34d399' }}>
                            Rp {loading ? '...' : monthlyRevenue.toLocaleString()}
                        </h2>
                        <span style={{ fontSize: '11px', color: '#71717a' }}>From {activeVendors} active subscription plans</span>
                    </div>

                    {/* Completion rate progress card */}
                    <div className="glass-card" style={{ padding: '20px', borderRadius: '12px' }}>
                        <span style={{ fontSize: '13px', color: '#a1a1aa' }}>Client Selection Progress</span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '6px' }}>
                            <h2 style={{ fontSize: '32px', margin: 0, fontWeight: 'bold', color: '#818cf8' }}>
                                {loading ? '...' : `${completionRate}%`}
                            </h2>
                            <span style={{ fontSize: '11px', color: '#71717a' }}>
                                {completedProjects} of {totalProjects} projects
                            </span>
                        </div>
                        {/* Custom visual progress bar */}
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', marginTop: '12px', overflow: 'hidden' }}>
                            <div style={{ width: `${completionRate}%`, height: '100%', background: 'linear-gradient(90deg, #818cf8, #6366f1)', borderRadius: '3px', transition: 'width 0.5s ease-in-out' }} />
                        </div>
                    </div>

                    {/* Funnel projects count card */}
                    <div className="glass-card" style={{ padding: '20px', borderRadius: '12px' }}>
                        <span style={{ fontSize: '13px', color: '#a1a1aa' }}>Project Funnel Breakdown</span>
                        <div style={{ display: 'flex', gap: '20px', marginTop: '14px' }}>
                            <div>
                                <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#34d399', display: 'block' }}>
                                    {loading ? '...' : completedProjects}
                                </span>
                                <span style={{ fontSize: '10px', color: '#71717a' }}>Selesai Dipilih</span>
                            </div>
                            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '20px' }}>
                                <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#fbbf24', display: 'block' }}>
                                    {loading ? '...' : pendingProjects}
                                </span>
                                <span style={{ fontSize: '10px', color: '#71717a' }}>Menunggu Seleksi</span>
                            </div>
                        </div>
                    </div>

                    {/* Vendors Status Breakdown Card */}
                    <div className="glass-card" style={{ padding: '20px', borderRadius: '12px' }}>
                        <span style={{ fontSize: '13px', color: '#a1a1aa' }}>Vendors Account Status</span>
                        <div style={{ display: 'flex', gap: '16px', marginTop: '14px' }}>
                            <div>
                                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#f4f4f5', display: 'block' }}>
                                    {loading ? '...' : totalVendors}
                                </span>
                                <span style={{ fontSize: '10px', color: '#71717a' }}>Registered</span>
                            </div>
                            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '16px' }}>
                                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#fbbf24', display: 'block' }}>
                                    {loading ? '...' : pendingApprovals}
                                </span>
                                <span style={{ fontSize: '10px', color: '#71717a' }}>Pending</span>
                            </div>
                            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '16px' }}>
                                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#ef4444', display: 'block' }}>
                                    {loading ? '...' : suspendedVendors}
                                </span>
                                <span style={{ fontSize: '10px', color: '#71717a' }}>Suspended</span>
                            </div>
                        </div>
                    </div>

                    {/* Real-time Server Disk space status Card */}
                    <div className="glass-card" style={{ 
                        padding: '20px', 
                        borderRadius: '12px',
                        border: diskStats.status === 'critical' 
                            ? '1px solid rgba(239, 68, 68, 0.4)' 
                            : diskStats.status === 'warning' 
                                ? '1px solid rgba(251, 191, 36, 0.4)' 
                                : '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#a1a1aa' }}>Kapasitas Disk Server</span>
                            <span style={{ 
                                fontSize: '10px', 
                                padding: '2px 8px', 
                                borderRadius: '12px', 
                                fontWeight: 'bold',
                                color: '#ffffff',
                                background: diskStats.status === 'critical' 
                                    ? '#ef4444' 
                                    : diskStats.status === 'warning' 
                                        ? '#fbbf24' 
                                        : '#10b981'
                            }}>
                                {diskStats.status === 'critical' ? 'KRITIS' : diskStats.status === 'warning' ? 'PERINGATAN' : 'AMAN'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '6px' }}>
                            <h2 style={{ fontSize: '22px', margin: 0, fontWeight: 'bold', color: '#ffffff' }}>
                                {diskStats.used_gb} GB <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#71717a' }}>terpakai dari</span> {diskStats.total_gb} GB
                            </h2>
                        </div>
                        {/* progress bar */}
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', marginTop: '12px', overflow: 'hidden' }}>
                            <div style={{ 
                                width: `${100 - parseFloat(diskStats.free_percent)}%`, 
                                height: '100%', 
                                background: diskStats.status === 'critical' 
                                    ? 'linear-gradient(90deg, #ef4444, #f87171)' 
                                    : diskStats.status === 'warning' 
                                        ? 'linear-gradient(90deg, #fbbf24, #fbbf24)' 
                                        : 'linear-gradient(90deg, #10b981, #34d399)', 
                                borderRadius: '3px', 
                                transition: 'width 0.5s ease-in-out' 
                            }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#71717a', marginTop: '6px' }}>
                            <span>Kosong: {diskStats.free_gb} GB ({diskStats.free_percent}%)</span>
                            <span>Batas: Min {diskStats.critical_threshold}%</span>
                        </div>
                    </div>

                </div>

                {/* ── TAB 1: MANAGE VENDORS ── */}
                {activeTab === 'vendors' && (
                    <div className="glass-card" style={{ padding: '24px', borderRadius: '16px' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600' }}>Vendor Accounts</h3>

                        {loading ? (
                            <p style={{ textAlign: 'center', color: '#a1a1aa', padding: '24px 0' }}>Loading vendors list...</p>
                        ) : vendors.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#a1a1aa', padding: '24px 0' }}>No vendor accounts registered in the database.</p>
                        ) : (
                            <div>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                                    <button
                                        onClick={() => setVendorSubTab('pending')}
                                        style={{
                                            padding: '6px 16px',
                                            borderRadius: '20px',
                                            border: 'none',
                                            background: vendorSubTab === 'pending' ? '#fbbf24' : 'rgba(255,255,255,0.04)',
                                            color: vendorSubTab === 'pending' ? '#000' : '#a1a1aa',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Menunggu Konfirmasi ({vendors.filter(v => v.status === 'pending').length})
                                    </button>
                                    <button
                                        onClick={() => setVendorSubTab('active')}
                                        style={{
                                            padding: '6px 16px',
                                            borderRadius: '20px',
                                            border: 'none',
                                            background: vendorSubTab === 'active' ? '#6366f1' : 'rgba(255,255,255,0.04)',
                                            color: vendorSubTab === 'active' ? '#fff' : '#a1a1aa',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        User Aktif ({vendors.filter(v => v.status === 'active' && !isExpired(v.expiresAt)).length})
                                    </button>
                                    <button
                                        onClick={() => setVendorSubTab('inactive')}
                                        style={{
                                            padding: '6px 16px',
                                            borderRadius: '20px',
                                            border: 'none',
                                            background: vendorSubTab === 'inactive' ? '#4b5563' : 'rgba(255,255,255,0.04)',
                                            color: vendorSubTab === 'inactive' ? '#fff' : '#a1a1aa',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Tidak Aktif / Arsip ({vendors.filter(v => v.status === 'suspended' || (v.status === 'active' && isExpired(v.expiresAt))).length})
                                    </button>
                                </div>

                                {vendors.filter(v => {
                                    const expired = isExpired(v.expiresAt);
                                    if (vendorSubTab === 'pending') {
                                        return v.status === 'pending';
                                    } else if (vendorSubTab === 'active') {
                                        return v.status === 'active' && !expired;
                                    } else {
                                        return v.status === 'suspended' || (v.status === 'active' && expired);
                                    }
                                }).length === 0 ? (
                                    <p style={{ textAlign: 'center', color: '#71717a', padding: '24px 0', fontSize: '14px' }}>
                                        {vendorSubTab === 'pending' ? 'Tidak ada akun pendaftaran baru.' :
                                         vendorSubTab === 'active' ? 'Tidak ada akun vendor aktif.' : 
                                         'Tidak ada akun vendor non-aktif / diarsipkan.'}
                                    </p>
                                ) : (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                                    <th style={{ padding: '12px 8px', color: '#a1a1aa', fontWeight: '600', fontSize: '14px' }}>Vendor Details</th>
                                                    <th style={{ padding: '12px 8px', color: '#a1a1aa', fontWeight: '600', fontSize: '14px' }}>Package / Cost</th>
                                                    <th style={{ padding: '12px 8px', color: '#a1a1aa', fontWeight: '600', fontSize: '14px', textAlign: 'center' }}>Projects Allowed</th>
                                                    <th style={{ padding: '12px 8px', color: '#a1a1aa', fontWeight: '600', fontSize: '14px', textAlign: 'center' }}>Status</th>
                                                    <th style={{ padding: '12px 8px', color: '#a1a1aa', fontWeight: '600', fontSize: '14px' }}>Expiration Date</th>
                                                    <th style={{ padding: '12px 8px', color: '#a1a1aa', fontWeight: '600', fontSize: '14px', textAlign: 'right' }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {vendors.filter(v => {
                                                    const expired = isExpired(v.expiresAt);
                                                    if (vendorSubTab === 'pending') {
                                                        return v.status === 'pending';
                                                    } else if (vendorSubTab === 'active') {
                                                        return v.status === 'active' && !expired;
                                                    } else {
                                                        return v.status === 'suspended' || (v.status === 'active' && expired);
                                                    }
                                                }).map((vendor) => {
                                            const expired = isExpired(vendor.expiresAt);
                                            return (
                                                <tr key={vendor.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s', background: expired && vendor.status === 'active' ? 'rgba(239,68,68,0.03)' : '' }}>
                                                    <td style={{ padding: '16px 8px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                            <span style={{ fontWeight: 'bold' }}>{vendor.name}</span>
                                                            {vendor.resetRequested === 1 && (
                                                                <span style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(251,191,36,0.25)', fontWeight: 'bold' }}>
                                                                    Minta Reset
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: '#71717a', marginTop: '2px' }}>{vendor.email}</div>
                                                        {vendor.whatsapp && (
                                                            <div style={{ fontSize: '11px', color: '#a1a1aa', marginTop: '4px' }}>
                                                                🟢 WA: <a href={`https://wa.me/${vendor.whatsapp}`} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'none' }}>{vendor.whatsapp}</a>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '16px 8px', fontSize: '14px' }}>
                                                        <div style={{ fontWeight: '600' }}>{vendor.planName || 'No Plan'}</div>
                                                        <div style={{ fontSize: '11px', color: '#a1a1aa' }}>Rp {(vendor.planPrice || 0).toLocaleString()}/bln</div>
                                                    </td>
                                                    <td style={{ padding: '16px 8px', textAlign: 'center', fontSize: '14px' }}>
                                                         <strong>{vendor.projectCount}</strong> / {(() => {
                                                             const isSubsidyValid = vendor.additionalProjectsExpiresAt ? (new Date() < new Date(vendor.additionalProjectsExpiresAt)) : false;
                                                             const totalAllowed = vendor.maxProjects + (isSubsidyValid ? (vendor.additionalProjects || 0) : 0);
                                                             return (
                                                                 <span>
                                                                     {totalAllowed}
                                                                     {isSubsidyValid && vendor.additionalProjects > 0 && (
                                                                         <span style={{ fontSize: '11px', color: '#818cf8', display: 'block', fontWeight: 'bold' }} title={`Kedaluwarsa subsidi: ${new Date(vendor.additionalProjectsExpiresAt).toLocaleDateString('id-ID')}`}>
                                                                             (+{vendor.additionalProjects} Subsidi)
                                                                         </span>
                                                                     )}
                                                                 </span>
                                                             );
                                                         })()}
                                                     </td>
                                                    <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                                                        <span className={`status-badge ${
                                                            vendor.status === 'active' ? 'status-completed' : 
                                                            vendor.status === 'pending' ? 'status-pending' : 'btn-danger'
                                                        }`} style={{ 
                                                            background: vendor.status === 'suspended' ? 'rgba(239,68,68,0.15)' : '',
                                                            color: vendor.status === 'suspended' ? '#f87171' : '',
                                                            border: vendor.status === 'suspended' ? '1px solid rgba(239,68,68,0.25)' : ''
                                                        }}>
                                                            {vendor.status === 'active' ? 'Active' : 
                                                             vendor.status === 'pending' ? 'Pending' : 'Suspended'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '16px 8px', fontSize: '14px' }}>
                                                        {vendor.expiresAt ? (
                                                            <div>
                                                                <span style={{ color: expired && vendor.status === 'active' ? '#ef4444' : '#e4e4e7', fontWeight: expired ? 'bold' : 'normal' }}>
                                                                    {new Date(vendor.expiresAt).toLocaleDateString()}
                                                                </span>
                                                                {expired && vendor.status === 'active' && (
                                                                    <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: 'bold', marginTop: '2px' }}>
                                                                        ⚠️ EXPIRED
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: '#71717a' }}>—</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                                                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                                                            {vendor.status === 'pending' && (
                                                                <button 
                                                                    className="btn-primary" 
                                                                    style={{ padding: '6px 12px', fontSize: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 10px rgba(16,185,129,0.3)' }}
                                                                    onClick={() => handleApproveVendorQuick(vendor)}
                                                                >
                                                                    Setujui
                                                                </button>
                                                            )}
                                                            <button 
                                                                className="btn-secondary" 
                                                                style={{ padding: '6px 12px', fontSize: '12px' }}
                                                                onClick={() => handleOpenEditVendor(vendor)}
                                                            >
                                                                Detail / Edit
                                                            </button>
                                                            <button 
                                                                className="btn-danger" 
                                                                style={{ padding: '6px 12px', fontSize: '12px', boxShadow: 'none' }}
                                                                onClick={() => handleDeleteVendor(vendor)}
                                                            >
                                                                Hapus
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}

                {/* ── TAB 2: MANAGE PLANS ── */}
                {activeTab === 'plans' && (
                    <div className="glass-card" style={{ padding: '24px', borderRadius: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Subscription Packages</h3>
                                <p style={{ color: '#a1a1aa', margin: '4px 0 0 0', fontSize: '13px' }}>Kelola paket langganan dan kuota penyimpanan untuk vendor</p>
                            </div>
                            <button className="btn-primary" onClick={handleOpenCreatePlan}>
                                Add Package
                            </button>
                        </div>

                        {loading ? (
                            <p style={{ textAlign: 'center', color: '#a1a1aa', padding: '24px 0' }}>Loading plans...</p>
                        ) : plans.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#a1a1aa', padding: '24px 0' }}>No packages defined. Click Add Package to create one.</p>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px' }}>
                                {/* LIMIT-BASED PLANS */}
                                <div className="glass-card" style={{ padding: '16px', border: '1px solid rgba(251, 191, 36, 0.15)', background: 'rgba(255,255,255,0.01)', borderRadius: '12px' }}>
                                    <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        📁 Limit-Based Packages
                                    </h4>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '450px' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                                    <th style={{ padding: '8px 4px', color: '#a1a1aa', fontWeight: '600', fontSize: '13px' }}>Package Name</th>
                                                    <th style={{ padding: '8px 4px', color: '#a1a1aa', fontWeight: '600', fontSize: '13px', textAlign: 'center' }}>Max Projects</th>
                                                    <th style={{ padding: '8px 4px', color: '#a1a1aa', fontWeight: '600', fontSize: '13px', textAlign: 'center' }}>Max Photos/Proj</th>
                                                    <th style={{ padding: '8px 4px', color: '#a1a1aa', fontWeight: '600', fontSize: '13px', textAlign: 'center' }}>Cost</th>
                                                    <th style={{ padding: '8px 4px', color: '#a1a1aa', fontWeight: '600', fontSize: '13px', textAlign: 'center' }}>Subscribers</th>
                                                    <th style={{ padding: '8px 4px', color: '#a1a1aa', fontWeight: '600', fontSize: '13px', textAlign: 'right' }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {plans.filter(p => p.planType !== 'storage').map((p) => {
                                                    const subscriberCount = vendors.filter(v => v.planId === p.id && v.status === 'active').length;
                                                    return (
                                                        <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                            <td style={{ padding: '12px 4px', fontWeight: 'bold', fontSize: '14px' }}>
                                                                {p.name}
                                                                {p.price === 0 && <span style={{ marginLeft: '6px', fontSize: '10px', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>TRIAL</span>}
                                                            </td>
                                                            <td style={{ padding: '12px 4px', textAlign: 'center', fontSize: '13px' }}>{p.maxProjects} project</td>
                                                            <td style={{ padding: '12px 4px', textAlign: 'center', fontSize: '13px' }}>{p.maxPhotosPerProject > 0 ? `${p.maxPhotosPerProject} foto` : 'Unlimited'}</td>
                                                            <td style={{ padding: '12px 4px', textAlign: 'center', fontSize: '13px', color: '#34d399', fontWeight: '600' }}>
                                                                {p.price === 0 ? 'Free' : `Rp ${p.price.toLocaleString()}`}
                                                            </td>
                                                            <td style={{ padding: '12px 4px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold', color: '#fbbf24' }}>
                                                                {subscriberCount}
                                                            </td>
                                                            <td style={{ padding: '12px 4px', textAlign: 'right' }}>
                                                                <div style={{ display: 'inline-flex', gap: '6px' }}>
                                                                    <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleOpenEditPlan(p)}>Edit</button>
                                                                    <button className="btn-danger" style={{ padding: '4px 8px', fontSize: '11px', boxShadow: 'none' }} onClick={() => handleDeletePlan(p)}>Delete</button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* STORAGE-BASED PLANS */}
                                <div className="glass-card" style={{ padding: '16px', border: '1px solid rgba(129, 140, 248, 0.15)', background: 'rgba(255,255,255,0.01)', borderRadius: '12px' }}>
                                    <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        📦 Storage-Based Packages
                                    </h4>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '450px' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                                    <th style={{ padding: '8px 4px', color: '#a1a1aa', fontWeight: '600', fontSize: '13px' }}>Package Name</th>
                                                    <th style={{ padding: '8px 4px', color: '#a1a1aa', fontWeight: '600', fontSize: '13px', textAlign: 'center' }}>Storage Size</th>
                                                    <th style={{ padding: '8px 4px', color: '#a1a1aa', fontWeight: '600', fontSize: '13px', textAlign: 'center' }}>Active Period</th>
                                                    <th style={{ padding: '8px 4px', color: '#a1a1aa', fontWeight: '600', fontSize: '13px', textAlign: 'center' }}>Cost</th>
                                                    <th style={{ padding: '8px 4px', color: '#a1a1aa', fontWeight: '600', fontSize: '13px', textAlign: 'center' }}>Subscribers</th>
                                                    <th style={{ padding: '8px 4px', color: '#a1a1aa', fontWeight: '600', fontSize: '13px', textAlign: 'right' }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {plans.filter(p => p.planType === 'storage').map((p) => {
                                                    const subscriberCount = vendors.filter(v => v.planId === p.id && v.status === 'active').length;
                                                    return (
                                                        <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                            <td style={{ padding: '12px 4px', fontWeight: 'bold', fontSize: '14px' }}>
                                                                {p.name}
                                                                {p.price === 0 && <span style={{ marginLeft: '6px', fontSize: '10px', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>TRIAL</span>}
                                                            </td>
                                                            <td style={{ padding: '12px 4px', textAlign: 'center', fontSize: '13px', color: '#818cf8', fontWeight: '500' }}>
                                                                {p.maxStorageMB >= 1024 ? `${(p.maxStorageMB / 1024).toFixed(0)} GB` : `${p.maxStorageMB} MB`}
                                                            </td>
                                                            <td style={{ padding: '12px 4px', textAlign: 'center', fontSize: '13px' }}>
                                                                {p.activePeriodDays > 0 ? `${p.activePeriodDays} Hari` : 'Selamanya'}
                                                            </td>
                                                            <td style={{ padding: '12px 4px', textAlign: 'center', fontSize: '13px', color: '#34d399', fontWeight: '600' }}>
                                                                {p.price === 0 ? 'Free' : `Rp ${p.price.toLocaleString()}`}
                                                            </td>
                                                            <td style={{ padding: '12px 4px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold', color: '#818cf8' }}>
                                                                {subscriberCount}
                                                            </td>
                                                            <td style={{ padding: '12px 4px', textAlign: 'right' }}>
                                                                <div style={{ display: 'inline-flex', gap: '6px' }}>
                                                                    <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleOpenEditPlan(p)}>Edit</button>
                                                                    <button className="btn-danger" style={{ padding: '4px 8px', fontSize: '11px', boxShadow: 'none' }} onClick={() => handleDeletePlan(p)}>Delete</button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB: UPGRADE REQUESTS ── */}
                {activeTab === 'upgrades' && (
                    <div className="glass-card" style={{ padding: '24px', borderRadius: '16px' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600' }}>Upgrade Plan Requests</h3>

                        {loading ? (
                            <p style={{ textAlign: 'center', color: '#a1a1aa', padding: '24px 0' }}>Loading requests...</p>
                        ) : upgradeRequests.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#a1a1aa', padding: '24px 0' }}>Belum ada permintaan upgrade plan dari vendor.</p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                            <th style={{ padding: '12px 8px', color: '#a1a1aa', fontWeight: '600', fontSize: '14px' }}>Vendor</th>
                                            <th style={{ padding: '12px 8px', color: '#a1a1aa', fontWeight: '600', fontSize: '14px' }}>Plan Asal ➔ Baru</th>
                                            <th style={{ padding: '12px 8px', color: '#a1a1aa', fontWeight: '600', fontSize: '14px' }}>Harga Prorata</th>
                                            <th style={{ padding: '12px 8px', color: '#a1a1aa', fontWeight: '600', fontSize: '14px' }}>Bukti Bayar</th>
                                            <th style={{ padding: '12px 8px', color: '#a1a1aa', fontWeight: '600', fontSize: '14px', textAlign: 'center' }}>Status</th>
                                            <th style={{ padding: '12px 8px', color: '#a1a1aa', fontWeight: '600', fontSize: '14px' }}>Tanggal Request</th>
                                            <th style={{ padding: '12px 8px', color: '#a1a1aa', fontWeight: '600', fontSize: '14px', textAlign: 'right' }}>Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {upgradeRequests.map((req) => (
                                            <tr key={req.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'middle' }}>
                                                <td style={{ padding: '16px 8px' }}>
                                                    <div style={{ fontWeight: 'bold', color: '#e4e4e7' }}>{req.vendorName}</div>
                                                    <div style={{ fontSize: '12px', color: '#71717a' }}>{req.vendorEmail}</div>
                                                </td>
                                                <td style={{ padding: '16px 8px' }}>
                                                    <div style={{ fontSize: '13px', color: '#e4e4e7' }}>
                                                        <span style={{ color: '#a1a1aa' }}>{req.currentPlanName || 'Basic'}</span> ➔ <strong>{req.planName}</strong>
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: '#71717a' }}>
                                                        Exp: {req.currentExpiresAt ? new Date(req.currentExpiresAt).toLocaleDateString() : 'Lifetime'}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px 8px', fontWeight: '700', color: '#fbbf24' }}>
                                                    Rp {Number(req.proratedPrice).toLocaleString('id-ID')}
                                                </td>
                                                <td style={{ padding: '16px 8px' }}>
                                                    {req.transferProof ? (
                                                        <button 
                                                            onClick={() => setActiveProofUrl(req.transferProof)}
                                                            className="btn-secondary" 
                                                            style={{ padding: '4px 10px', fontSize: '11px', color: '#818cf8', borderColor: 'rgba(129,140,248,0.2)' }}
                                                        >
                                                            👁 Lihat Bukti
                                                        </button>
                                                    ) : (
                                                        <span style={{ fontSize: '12px', color: '#71717a' }}>Tidak ada</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                                                    <span className={`status-badge ${
                                                        req.status === 'approved' ? 'status-completed' : 
                                                        req.status === 'rejected' ? 'status-failed' : 'status-pending'
                                                    }`} style={{
                                                        background: req.status === 'pending' ? 'rgba(251,191,36,0.15)' : '',
                                                        color: req.status === 'pending' ? '#fbbf24' : '',
                                                        borderColor: req.status === 'pending' ? 'rgba(251,191,36,0.25)' : ''
                                                    }}>
                                                        {req.status === 'approved' ? '✓ Disetujui' : 
                                                         req.status === 'rejected' ? '❌ Ditolak' : '⏳ Pending'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '16px 8px', fontSize: '13px', color: '#a1a1aa' }}>
                                                    {new Date(req.createdAt).toLocaleString('id-ID')}
                                                </td>
                                                <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                                                    {req.status === 'pending' && (
                                                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                                                            <button 
                                                                className="btn-primary" 
                                                                style={{ padding: '6px 12px', fontSize: '12px', background: '#10b981', color: 'white', boxShadow: 'none' }}
                                                                onClick={() => handleProcessUpgrade(req, 'approve')}
                                                            >
                                                                Approve
                                                            </button>
                                                            <button 
                                                                className="btn-danger" 
                                                                style={{ padding: '6px 12px', fontSize: '12px', boxShadow: 'none' }}
                                                                onClick={() => handleProcessUpgrade(req, 'reject')}
                                                            >
                                                                Reject
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB 3: PROFILE & SETTINGS ── */}
                {activeTab === 'settings' && (
                    <div className="glass-card" style={{ padding: '28px', borderRadius: '16px', maxWidth: '700px', margin: '0 auto' }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>SaaS & Superadmin Settings</h3>
                        <p style={{ color: '#a1a1aa', margin: '0 0 24px 0', fontSize: '14px' }}>
                            Update superadmin passwords, payment bank routing, and customer support channels.
                        </p>

                        {profileSuccessMsg && (
                            <div style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
                                ✓ {profileSuccessMsg}
                            </div>
                        )}

                        {profileErrorMsg && (
                            <div style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
                                ⚠️ {profileErrorMsg}
                            </div>
                        )}

                        <form onSubmit={handleSaveProfile}>
                            {/* Profile & Password Section */}
                            <h4 style={{ margin: '0 0 12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', fontSize: '15px', color: '#818cf8', fontWeight: 'bold' }}>Superadmin Password</h4>
                            <div className="form-group" style={{ marginBottom: '24px' }}>
                                <label className="form-label">Ganti Password Baru</label>
                                <input 
                                    type="password" 
                                    className="input-text" 
                                    placeholder="Masukkan password baru (Kosongkan jika tidak ingin mengganti)"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    disabled={savingProfile}
                                />
                            </div>

                            {/* Payment Bank Routing Section */}
                            <h4 style={{ margin: '0 0 12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', fontSize: '15px', color: '#818cf8', fontWeight: 'bold' }}>Tujuan Rekening Transfer</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Nama Bank</label>
                                    <input 
                                        type="text" 
                                        className="input-text" 
                                        required
                                        placeholder="Contoh: BCA (Bank Central Asia)"
                                        value={bankName}
                                        onChange={e => setBankName(e.target.value)}
                                        disabled={savingProfile}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Nomor Rekening</label>
                                    <input 
                                        type="text" 
                                        className="input-text" 
                                        required
                                        placeholder="Contoh: 1234-5678-90"
                                        value={bankAccountNumber}
                                        onChange={e => setBankAccountNumber(e.target.value)}
                                        disabled={savingProfile}
                                    />
                                </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: '24px' }}>
                                <label className="form-label">Atas Nama Rekening</label>
                                <input 
                                    type="text" 
                                    className="input-text" 
                                    required
                                    placeholder="Contoh: PT Pick Your Photo"
                                    value={bankAccountName}
                                    onChange={e => setBankAccountName(e.target.value)}
                                    disabled={savingProfile}
                                />
                            </div>

                            {/* SaaS Support Contacts Section */}
                            <h4 style={{ margin: '0 0 12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', fontSize: '15px', color: '#818cf8', fontWeight: 'bold' }}>Hubungi / Kontak</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
                                <div className="form-group">
                                    <label className="form-label">Email Support</label>
                                    <input 
                                        type="email" 
                                        className="input-text" 
                                        required
                                        placeholder="Contoh: support@pickyourphoto.com"
                                        value={contactEmail}
                                        onChange={e => setContactEmail(e.target.value)}
                                        disabled={savingProfile}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">WhatsApp Number (WA)</label>
                                    <input 
                                        type="text" 
                                        className="input-text" 
                                        required
                                        placeholder="Contoh: 6281234567890 (Gunakan kode negara, tanpa '+')"
                                        value={contactWhatsapp}
                                        onChange={e => setContactWhatsapp(e.target.value)}
                                        disabled={savingProfile}
                                    />
                                </div>
                            </div>

                            {/* Registration & Disk Protection Section */}
                            <h4 style={{ margin: '28px 0 12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', fontSize: '15px', color: '#fbbf24', fontWeight: 'bold' }}>Registrasi & Pengamanan Disk</h4>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input 
                                        type="checkbox" 
                                        id="enable_registration"
                                        checked={sysEnableReg}
                                        onChange={e => setSysEnableReg(e.target.checked)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="enable_registration" style={{ cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>Buka Pendaftaran Vendor Baru</label>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input 
                                        type="checkbox" 
                                        id="enable_free_trial"
                                        checked={sysEnableTrial}
                                        onChange={e => setSysEnableTrial(e.target.checked)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="enable_free_trial" style={{ cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>Aktifkan Free Trial</label>
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label className="form-label">Batas Maksimal Vendor Aktif (Kosongkan/isi 0 untuk tanpa batas manual)</label>
                                <input 
                                    type="number" 
                                    className="input-text" 
                                    placeholder="Contoh: 50"
                                    value={sysMaxQuota === null ? '' : sysMaxQuota}
                                    onChange={e => setSysMaxQuota(e.target.value === '' ? null : parseInt(e.target.value))}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '10px' }}>
                                <div className="form-group">
                                    <label className="form-label">Batas Peringatan Ruang Disk / Warning (%)</label>
                                    <input 
                                        type="number" 
                                        className="input-text" 
                                        required
                                        placeholder="Contoh: 20"
                                        value={sysWarnThreshold}
                                        onChange={e => setSysWarnThreshold(parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Batas Kritis Ruang Disk / Critical (%)</label>
                                    <input 
                                        type="number" 
                                        className="input-text" 
                                        required
                                        placeholder="Contoh: 10"
                                        value={sysCritThreshold}
                                        onChange={e => setSysCritThreshold(parseInt(e.target.value))}
                                    />
                                </div>
                            </div>
                            <p style={{ color: '#a1a1aa', fontSize: '12px', marginTop: '0', marginBottom: '28px', lineHeight: '1.4' }}>
                                💡 *Sistem otomatis menolak pendaftaran baru jika kapasitas ruang disk kosong di bawah persentase batas Kritis (Critical).*
                            </p>

                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button type="submit" className="btn-primary" disabled={savingProfile} style={{ padding: '12px 32px' }}>
                                    {savingProfile ? 'Menyimpan...' : 'Simpan Pengaturan'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

            {/* ── MODAL: VIEW PAYMENT PROOF Lightbox ── */}
            {activeProofUrl && (
                <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setActiveProofUrl(null)}>
                    <div className="modal-content" style={{ maxWidth: '600px', textAlign: 'center', background: 'rgba(10, 10, 12, 0.95)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Bukti Pembayaran / Transfer</h3>
                            <button onClick={() => setActiveProofUrl(null)} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }}>Tutup</button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', background: '#09090b', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '16px' }}>
                            <img 
                                src={activeProofUrl} 
                                alt="Bukti Transfer" 
                                style={{ maxWidth: '100%', maxHeight: '50vh', objectFit: 'contain' }} 
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button 
                                onClick={() => {
                                    addToast('Invoice tagihan berlangganan dikirim secara virtual ke email vendor!', 'success');
                                    setActiveProofUrl(null);
                                }} 
                                className="btn-primary" 
                                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
                            >
                                Kirim Invoice
                            </button>
                            <button onClick={() => setActiveProofUrl(null)} className="btn-secondary">Tutup</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: EDIT VENDOR (DETAILS & SETTINGS) ── */}
            {editingVendor && (
                <div className="modal-overlay" onClick={() => { if (!savingVendor) setEditingVendor(null); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 'bold' }}>Vendor Details & Settings</h3>
                        <p style={{ color: '#a1a1aa', margin: '0 0 20px 0', fontSize: '13px' }}>
                            Detail informasi & pengaturan untuk akun <strong>{editingVendor.name}</strong>
                        </p>

                        <form onSubmit={handleSaveVendor}>
                            {/* SECTION 1: DETAIL VENDOR (READ-ONLY) */}
                            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#71717a', fontWeight: 'bold', letterSpacing: '0.05em', marginBottom: '10px' }}>
                                    Detail Vendor (Informasi)
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#a1a1aa' }}>Email:</span>
                                        <span style={{ color: '#fff', fontWeight: '500' }}>{editingVendor.email}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: '#a1a1aa' }}>Status Akun:</span>
                                        {(() => {
                                            const isExpired = editingVendor.expiresAt ? (new Date() > new Date(editingVendor.expiresAt)) : false;
                                            if (editingVendor.status === 'pending') {
                                                return <span style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.15)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', border: '1px solid rgba(251,191,36,0.25)' }}>⏳ Menunggu Konfirmasi</span>;
                                            } else if (editingVendor.status === 'suspended') {
                                                return <span style={{ color: '#f87171', background: 'rgba(239,68,68,0.15)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', border: '1px solid rgba(239,68,68,0.25)' }}>🚫 Ditangguhkan</span>;
                                            } else if (isExpired) {
                                                return <span style={{ color: '#f87171', background: 'rgba(239,68,68,0.15)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', border: '1px solid rgba(239,68,68,0.25)' }}>❌ Kedaluwarsa</span>;
                                            } else {
                                                return <span style={{ color: '#34d399', background: 'rgba(16,185,129,0.15)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', border: '1px solid rgba(16,185,129,0.25)' }}>🟢 Aktif</span>;
                                            }
                                        })()}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#a1a1aa' }}>Paket Plan & Masa Aktif:</span>
                                        <strong style={{ color: '#fbbf24' }}>
                                            {editingVendor.planName || 'FreeTrial'} ({editingVendor.expiresAt ? new Date(editingVendor.expiresAt).toLocaleDateString('id-ID') : 'Lifetime'})
                                        </strong>
                                    </div>
                                </div>

                                {editingVendor.paymentProof && (
                                    <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                        <button
                                            type="button"
                                            className="btn-secondary"
                                            style={{ width: '100%', padding: '6px 12px', fontSize: '12px', color: '#818cf8', borderColor: 'rgba(129,140,248,0.2)', background: 'none' }}
                                            onClick={() => {
                                                setActiveProofUrl(editingVendor.paymentProof);
                                            }}
                                        >
                                            👁 Lihat Bukti Transfer Pendaftaran
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* SECTION 2: PENGATURAN ADMIN (EDITABLE) */}
                            <div style={{ background: 'rgba(99,102,241,0.03)', border: '1px solid rgba(99,102,241,0.08)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#818cf8', fontWeight: 'bold', letterSpacing: '0.05em', marginBottom: '14px' }}>
                                    Pengaturan Admin (Dapat Diedit)
                                </div>

                                <div className="form-group" style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label className="form-label" style={{ fontSize: '12px', color: '#a1a1aa' }}>Subsidi Project</label>
                                        <input 
                                            type="number"
                                            className="input-text"
                                            min="0"
                                            placeholder="Contoh: 2"
                                            value={vendorAdditionalProjects}
                                            onChange={(e) => {
                                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                                setVendorAdditionalProjects(val);
                                                if (val > 0 && !vendorAdditionalProjectsExpiresAt && vendorExpiresAt) {
                                                    setVendorAdditionalProjectsExpiresAt(vendorExpiresAt);
                                                }
                                            }}
                                            disabled={savingVendor}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label className="form-label" style={{ fontSize: '12px', color: '#a1a1aa' }}>Subsidi Foto</label>
                                        <input 
                                            type="number"
                                            className="input-text"
                                            min="0"
                                            placeholder="Contoh: 50"
                                            value={vendorAdditionalPhotos}
                                            onChange={(e) => {
                                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                                setVendorAdditionalPhotos(val);
                                                if (val > 0 && !vendorAdditionalProjectsExpiresAt && vendorExpiresAt) {
                                                    setVendorAdditionalProjectsExpiresAt(vendorExpiresAt);
                                                }
                                            }}
                                            disabled={savingVendor}
                                        />
                                    </div>
                                    <div style={{ flex: 1.2 }}>
                                        <label className="form-label" style={{ fontSize: '12px', color: '#a1a1aa' }}>Kedaluwarsa Subsidi</label>
                                        <input 
                                            type="date"
                                            className="input-text"
                                            value={vendorAdditionalProjectsExpiresAt}
                                            onChange={(e) => setVendorAdditionalProjectsExpiresAt(e.target.value)}
                                            disabled={savingVendor || (vendorAdditionalProjects === 0 && vendorAdditionalPhotos === 0)}
                                            style={{ cursor: (vendorAdditionalProjects === 0 && vendorAdditionalPhotos === 0) ? 'not-allowed' : 'pointer' }}
                                            required={vendorAdditionalProjects > 0 || vendorAdditionalPhotos > 0}
                                        />
                                    </div>
                                </div>

                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label" style={{ fontSize: '12px', color: '#a1a1aa' }}>Reset Password Vendor</label>
                                    <input 
                                        type="password"
                                        className="input-text"
                                        placeholder={editingVendor.resetRequested > 0 ? "Masukkan password baru" : "Vendor tidak meminta reset (Terkunci)"}
                                        value={vendorResetPassword}
                                        onChange={(e) => setVendorResetPassword(e.target.value)}
                                        disabled={savingVendor || editingVendor.resetRequested === 0}
                                        style={{ background: editingVendor.resetRequested === 0 ? 'rgba(0,0,0,0.1)' : '' }}
                                    />
                                    {editingVendor.resetRequested > 0 && (
                                        <span style={{ fontSize: '11px', color: '#fbbf24', display: 'block', marginTop: '6px' }}>
                                            ⚠️ Vendor telah mengklik lupa password. Harap berikan password baru di atas.
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button 
                                    type="button" 
                                    className="btn-secondary" 
                                    onClick={() => setEditingVendor(null)} 
                                    disabled={savingVendor}
                                >
                                    Batal
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn-primary" 
                                    disabled={savingVendor}
                                    style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', boxShadow: '0 4px 14px rgba(99,102,241,0.25)' }}
                                >
                                    {savingVendor ? 'Menyimpan...' : 'Simpan Perubahan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL: PLAN CREATE / EDIT ── */}
            {showPlanModal && (
                <div className="modal-overlay" onClick={() => { if (!savingPlan) setShowPlanModal(false); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 'bold' }}>
                            {editingPlan ? 'Edit Package Plan' : 'Add New Package Plan'}
                        </h3>
                        <p style={{ color: '#a1a1aa', margin: '0 0 24px 0', fontSize: '14px' }}>
                            Define project counts and pricing tiers
                        </p>

                        <form onSubmit={handleSavePlan}>
                            <div className="form-group">
                                <label className="form-label">Plan Name</label>
                                <input 
                                    type="text" 
                                    className="input-text" 
                                    required 
                                    placeholder="e.g. Premium Tier"
                                    value={planName}
                                    onChange={(e) => setPlanName(e.target.value)}
                                    disabled={savingPlan}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Plan Type</label>
                                <select
                                    className="input-text"
                                    value={planType}
                                    onChange={(e) => {
                                        const type = e.target.value;
                                        setPlanType(type);
                                        if (type === 'storage') {
                                            setPlanMaxProjects(99999);
                                            setPlanMaxPhotos(99999);
                                            setPlanExpireDays(99999);
                                        } else {
                                            setPlanMaxProjects(5);
                                            setPlanMaxPhotos(100);
                                            setPlanExpireDays(30);
                                        }
                                    }}
                                    disabled={savingPlan}
                                    style={{ background: '#18181b', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' }}
                                >
                                    <option value="limit">Limit-Based (Batas Project & Foto)</option>
                                    <option value="storage">Storage-Based (Batas GB Penyimpanan)</option>
                                </select>
                            </div>

                            {planType === 'storage' && (
                                <div className="form-group">
                                    <label className="form-label">Max Storage Limit (MB)</label>
                                    <input 
                                        type="number" 
                                        className="input-text" 
                                        required 
                                        min="1"
                                        max="1048576"
                                        placeholder="e.g. 5000 (5 GB)"
                                        value={planMaxStorageMB}
                                        onChange={(e) => setPlanMaxStorageMB(parseInt(e.target.value) || 0)}
                                        disabled={savingPlan}
                                    />
                                    <span style={{ fontSize: '11px', color: '#71717a' }}>Kapasitas penyimpanan maksimum untuk akun vendor dalam Megabytes. (1000 MB = 1 GB).</span>
                                </div>
                            )}

                            {planType === 'limit' && (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">Batas Maksimal Project</label>
                                        <input 
                                            type="number" 
                                            className="input-text" 
                                            required 
                                            min="1"
                                            max="9999"
                                            placeholder="e.g. 50"
                                            value={planMaxProjects}
                                            onChange={(e) => setPlanMaxProjects(parseInt(e.target.value) || 0)}
                                            disabled={savingPlan}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Maksimal Foto per Project</label>
                                        <input 
                                            type="number" 
                                            className="input-text" 
                                            required 
                                            min="0"
                                            max="99999"
                                            placeholder="e.g. 200 (0 = Unlimited)"
                                            value={planMaxPhotos}
                                            onChange={(e) => setPlanMaxPhotos(parseInt(e.target.value) || 0)}
                                            disabled={savingPlan}
                                        />
                                        <span style={{ fontSize: '11px', color: '#71717a' }}>Maksimal foto yang bisa diimpor dari Google Drive untuk setiap proyek (0 = Tanpa batas).</span>
                                    </div>
                                </>
                            )}

                            <div className="form-group">
                                <label className="form-label">Monthly Cost (Price in Rp)</label>
                                <input 
                                    type="number" 
                                    className="input-text" 
                                    required 
                                    min="0"
                                    max="99999999"
                                    placeholder="e.g. 250000"
                                    value={planPrice}
                                    onChange={(e) => setPlanPrice(parseInt(e.target.value) || 0)}
                                    disabled={savingPlan}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Vendor Subscription Active Period (Days)</label>
                                <input 
                                    type="number" 
                                    className="input-text" 
                                    required 
                                    min="1"
                                    max="3650"
                                    placeholder="e.g. 30 (Masa aktif akun vendor setelah membeli/aktif)"
                                    value={planActivePeriodDays}
                                    onChange={(e) => setPlanActivePeriodDays(parseInt(e.target.value) || 0)}
                                    disabled={savingPlan}
                                />
                                <span style={{ fontSize: '11px', color: '#71717a' }}>Durasi masa aktif akun vendor saat superadmin menyetujui transaksi (misal: 30 hari untuk bulanan, atau 1/2 hari untuk trial).</span>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Plan Status</label>
                                <select 
                                    className="input-text"
                                    value={planStatus}
                                    onChange={(e) => setPlanStatus(e.target.value)}
                                    disabled={savingPlan}
                                    style={{ cursor: 'pointer' }}
                                    required
                                >
                                    <option value="active">Active (Tampil di opsi upgrade vendor)</option>
                                    <option value="inactive">Inactive (Disembunyikan dari vendor)</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '28px', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowPlanModal(false)} disabled={savingPlan}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" disabled={savingPlan}>
                                    {savingPlan ? 'Saving...' : 'Save Plan'}
                                </button>
                             </div>
                         </form>
                     </div>
                 </div>
             )}

            {/* ── MODAL: CUSTOM DELETE VENDOR CONFIRMATION ── */}
            {vendorToDelete && (
                <div className="modal-overlay" onClick={() => { if (!deleting) setVendorToDelete(null); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '90%' }}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239,68,68,0.15)', color: '#f87171', fontSize: '28px', marginBottom: '16px' }}>
                                ⚠️
                            </div>
                            <h3 className="title-gradient" style={{ fontSize: '22px', margin: '0 0 8px 0', fontWeight: 'bold' }}>Hapus Akun Vendor</h3>
                            <p style={{ color: '#a1a1aa', margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                                Apakah Anda yakin ingin menghapus akun vendor <strong>"{vendorToDelete.name}"</strong>?
                            </p>
                        </div>

                        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', fontSize: '13px', color: '#f87171', lineHeight: '1.6' }}>
                            <strong>TINDAKAN INI BERSIFAT PERMANEN & AKAN MENGHAPUS:</strong>
                            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                                <li>Semua file foto fisik di server penyimpanan</li>
                                <li>Semua proyek/galeri milik vendor ini</li>
                                <li>Semua data klien beserta hasil seleksi fotonya</li>
                                <li>Riwayat bukti pembayaran & permintaan upgrade paket</li>
                            </ul>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setVendorToDelete(null)}
                                className="btn-secondary"
                                style={{ flex: 1, padding: '12px 16px', fontSize: '14px' }}
                                disabled={deleting}
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmDeleteVendor}
                                className="btn-primary"
                                style={{
                                    flex: 1.5,
                                    padding: '12px 16px',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                    boxShadow: '0 4px 20px rgba(239,68,68,0.3)',
                                    border: 'none',
                                    cursor: deleting ? 'not-allowed' : 'pointer'
                                }}
                                disabled={deleting}
                            >
                                {deleting ? 'Menghapus...' : 'Ya, Hapus Permanen'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ── MODAL: CUSTOM VENDOR APPROVAL CONFIRMATION ── */}
            {vendorToApprove && (
                <div className="modal-overlay" onClick={() => { if (!approving) setVendorToApprove(null); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '90%' }}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', color: '#34d399', fontSize: '28px', marginBottom: '16px' }}>
                                ✓
                            </div>
                            <h3 className="title-gradient" style={{ fontSize: '22px', margin: '0 0 8px 0', fontWeight: 'bold' }}>Setujui Pendaftaran</h3>
                            <p style={{ color: '#a1a1aa', margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                                Apakah Anda yakin ingin menyetujui pendaftaran vendor <strong>"{vendorToApprove.name}"</strong>?
                            </p>
                        </div>

                        <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '12px', padding: '14px 18px', marginBottom: '24px', fontSize: '13px', color: '#a5b4fc', textAlign: 'left', lineHeight: '1.5' }}>
                            ℹ️ <strong>Rincian Masa Aktif:</strong> Akun vendor ini akan diaktifkan dengan durasi <strong>{vendorToApprove.planActivePeriodDays !== undefined ? vendorToApprove.planActivePeriodDays : 30} hari</strong> sesuai ketentuan paket pilihan ({vendorToApprove.planName || 'FreeTrial'}).
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setVendorToApprove(null)}
                                className="btn-secondary"
                                style={{ flex: 1, padding: '12px 16px', fontSize: '14px' }}
                                disabled={approving}
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmApproveVendor}
                                className="btn-primary"
                                style={{
                                    flex: 1.5,
                                    padding: '12px 16px',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
                                    border: 'none',
                                    cursor: approving ? 'not-allowed' : 'pointer'
                                }}
                                disabled={approving}
                            >
                                {approving ? 'Menyetujui...' : 'Ya, Setujui Pendaftaran'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: CUSTOM PROCESS UPGRADE CONFIRMATION ── */}
            {upgradeToProcess && (
                <div className="modal-overlay" onClick={() => { if (!processingUpgrade) setUpgradeToProcess(null); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '90%' }}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: upgradeToProcess.action === 'approve' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: upgradeToProcess.action === 'approve' ? '#34d399' : '#f87171', fontSize: '28px', marginBottom: '16px' }}>
                                {upgradeToProcess.action === 'approve' ? '✓' : '❌'}
                            </div>
                            <h3 className="title-gradient" style={{ fontSize: '22px', margin: '0 0 8px 0', fontWeight: 'bold' }}>
                                {upgradeToProcess.action === 'approve' ? 'Setujui Permintaan' : 'Tolak Permintaan'}
                            </h3>
                            <p style={{ color: '#a1a1aa', margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                                Apakah Anda yakin ingin {upgradeToProcess.action === 'approve' ? 'menyetujui' : 'menolak'} permintaan upgrade paket dari vendor <strong>"{upgradeToProcess.vendorName}"</strong>?
                            </p>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px 18px', marginBottom: '24px', fontSize: '13px', color: '#e4e4e7', textAlign: 'left', lineHeight: '1.6' }}>
                            <div><strong>Rincian Permintaan:</strong></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#a1a1aa', marginTop: '6px' }}>
                                <span>Vendor:</span>
                                <span style={{ color: '#fff' }}>{upgradeToProcess.vendorName}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#a1a1aa' }}>
                                <span>Paket Baru:</span>
                                <span style={{ color: '#fbbf24' }}>{upgradeToProcess.planName}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#a1a1aa' }}>
                                <span>Aksi:</span>
                                <span style={{ color: upgradeToProcess.action === 'approve' ? '#34d399' : '#f87171', fontWeight: 'bold' }}>{upgradeToProcess.action === 'approve' ? 'Setujui (Upgrade Aktif)' : 'Tolak Transaksi'}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setUpgradeToProcess(null)}
                                className="btn-secondary"
                                style={{ flex: 1, padding: '12px 16px', fontSize: '14px' }}
                                disabled={processingUpgrade}
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmProcessUpgrade}
                                className="btn-primary"
                                style={{
                                    flex: 1.5,
                                    padding: '12px 16px',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    background: upgradeToProcess.action === 'approve' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                                    boxShadow: upgradeToProcess.action === 'approve' ? '0 4px 20px rgba(16,185,129,0.3)' : '0 4px 20px rgba(239,68,68,0.3)',
                                    border: 'none',
                                    cursor: processingUpgrade ? 'not-allowed' : 'pointer'
                                }}
                                disabled={processingUpgrade}
                            >
                                {processingUpgrade ? 'Memproses...' : upgradeToProcess.action === 'approve' ? 'Ya, Setujui' : 'Ya, Tolak'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: CUSTOM PLAN DELETION CONFIRMATION ── */}
            {planToDelete && (
                <div className="modal-overlay" onClick={() => { if (!deletingPlan) setPlanToDelete(null); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '90%' }}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239,68,68,0.15)', color: '#f87171', fontSize: '28px', marginBottom: '16px' }}>
                                ⚠️
                            </div>
                            <h3 className="title-gradient" style={{ fontSize: '22px', margin: '0 0 8px 0', fontWeight: 'bold' }}>Hapus Paket Plan</h3>
                            <p style={{ color: '#a1a1aa', margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                                Apakah Anda yakin ingin menghapus paket berlangganan <strong>"{planToDelete.name}"</strong>?
                            </p>
                        </div>

                        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', fontSize: '13px', color: '#f87171', lineHeight: '1.5' }}>
                            ⚠️ <strong>Peringatan:</strong> Menghapus paket ini akan mencegah vendor baru memilih paket ini saat registrasi atau upgrade. Paket ini tidak akan muncul lagi di opsi sistem.
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setPlanToDelete(null)}
                                className="btn-secondary"
                                style={{ flex: 1, padding: '12px 16px', fontSize: '14px' }}
                                disabled={deletingPlan}
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmDeletePlan}
                                className="btn-primary"
                                style={{
                                    flex: 1.5,
                                    padding: '12px 16px',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                    boxShadow: '0 4px 20px rgba(239,68,68,0.3)',
                                    border: 'none',
                                    cursor: deletingPlan ? 'not-allowed' : 'pointer'
                                }}
                                disabled={deletingPlan}
                            >
                                {deletingPlan ? 'Menghapus...' : 'Ya, Hapus Paket'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TOAST NOTIFICATIONS ── */}
            <div style={{
                position: 'fixed',
                top: '24px',
                right: '24px',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                maxWidth: '380px',
                width: '100%',
                pointerEvents: 'none'
            }}>
                {toasts.map(toast => {
                    const bgColor = toast.type === 'success' ? 'rgba(16,185,129,0.15)' :
                                    toast.type === 'error' ? 'rgba(239,68,68,0.15)' :
                                    toast.type === 'warning' ? 'rgba(251,191,36,0.15)' :
                                    'rgba(99,102,241,0.15)';
                    const borderColor = toast.type === 'success' ? 'rgba(16,185,129,0.3)' :
                                       toast.type === 'error' ? 'rgba(239,68,68,0.3)' :
                                       toast.type === 'warning' ? 'rgba(251,191,36,0.3)' :
                                       'rgba(99,102,241,0.3)';
                    const textColor = toast.type === 'success' ? '#34d399' :
                                     toast.type === 'error' ? '#f87171' :
                                     toast.type === 'warning' ? '#fbbf24' :
                                     '#a5b4fc';
                    return (
                        <div
                            key={toast.id}
                            style={{
                                background: bgColor,
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                border: `1px solid ${borderColor}`,
                                borderRadius: '12px',
                                padding: '14px 18px 10px 18px',
                                color: textColor,
                                fontSize: '14px',
                                fontWeight: '500',
                                lineHeight: '1.5',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                pointerEvents: 'auto',
                                animation: 'toastSlideIn 0.35s ease-out',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <div style={{ flex: 1 }}>{toast.message}</div>
                                <button
                                    onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: textColor,
                                        fontSize: '18px',
                                        cursor: 'pointer',
                                        padding: '0 2px',
                                        lineHeight: '1',
                                        opacity: 0.7,
                                        flexShrink: 0
                                    }}
                                    aria-label="Tutup notifikasi"
                                >
                                    &times;
                                </button>
                            </div>
                            {/* Progress bar countdown */}
                            <div style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: '3px',
                                background: 'rgba(255,255,255,0.08)',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%',
                                    background: textColor,
                                    opacity: 0.5,
                                    animation: `toastCountdown ${toast.duration || 5000}ms linear forwards`
                                }} />
                            </div>
                        </div>
                    );
                })}
            </div>

            <style jsx>{`
                @keyframes toastSlideIn {
                    from {
                        opacity: 0;
                        transform: translateX(80px) scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0) scale(1);
                    }
                }
                @keyframes toastCountdown {
                    from {
                        width: 100%;
                    }
                    to {
                        width: 0%;
                    }
                }
            `}</style>
        </div>
    </div>
);
}
