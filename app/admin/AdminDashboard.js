'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './AdminDashboard.module.css';

import AdminOverview from '@/components/admin/AdminOverview';
import AdminVendors from '@/components/admin/AdminVendors';
import AdminPlans from '@/components/admin/AdminPlans';
import AdminSettings from '@/components/admin/AdminSettings';
import AdminTrialControl from '@/components/admin/AdminTrialControl';
import AdminStoragePool from '@/components/admin/AdminStoragePool';
import AdminUpgradeRequests from '@/components/admin/AdminUpgradeRequests';
import { 
    AnalyticsIcon, 
    InquiryIcon, 
    UpgradeIcon, 
    UsersIcon, 
    PlansIcon, 
    StoragePoolIcon, 
    TrialIcon, 
    SettingsIcon, 
    LogOutIcon 
} from '@/components/AdminIcons';

export default function AdminDashboard({ adminUser }) {
    const [activeTab, setActiveTab] = useState('analytics'); // 'analytics', 'inquiry', 'vendors', 'plans', 'trial', 'settings'
    const [inquirySubTab, setInquirySubTab] = useState('prospect'); // 'prospect' | 'pending' | 'archive'
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toasts, setToasts] = useState([]);

    // Analytics state
    const [analytics, setAnalytics] = useState({
        activeVendorCount: 0,
        pendingVendorCount: 0,
        totalProjectCount: 0,
        completedProjectCount: 0,
        mrr: 0,
        topStorageUsers: [],
        planDistribution: [],
        systemStats: { dbSizeMB: '0.00', totalPhotos: 0, totalProjects: 0, lastBackupTime: '-' }
    });
    const [diskStats, setDiskStats] = useState({
        system: { used_gb: '0.00' }
    });
    const [loadingAnalytics, setLoadingAnalytics] = useState(true);

    // Plans state
    const [plans, setPlans] = useState([]);
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [planName, setPlanName] = useState('');
    const [planMaxProjects, setPlanMaxProjects] = useState(10);
    const [planMaxPhotos, setPlanMaxPhotos] = useState(300);
    const [planPrice, setPlanPrice] = useState(99000);
    const [planActivePeriodDays, setPlanActivePeriodDays] = useState(30);
    const [planAllowCustomLogo, setPlanAllowCustomLogo] = useState(false);
    const [planAllowRawSelector, setPlanAllowRawSelector] = useState(true);
    const [planStatus, setPlanStatus] = useState('active');
    const [planType, setPlanType] = useState('limit');
    const [planMaxStorageMB, setPlanMaxStorageMB] = useState(51200);
    const [savingPlan, setSavingPlan] = useState(false);
    const [planToDelete, setPlanToDelete] = useState(null);
    const [deletingPlan, setDeletingPlan] = useState(false);

    // Upgrades state
    const [upgrades, setUpgrades] = useState([]);
    const [pendingUpgradeSummary, setPendingUpgradeSummary] = useState({ pendingCount: 0, pendingTotalValue: 0 });
    const [upgradeToProcess, setUpgradeToProcess] = useState(null);
    const [processingUpgrade, setProcessingUpgrade] = useState(false);

    // Profile & SaaS settings state
    const [newPassword, setNewPassword] = useState('');
    const [bankName, setBankName] = useState('');
    const [bankAccountNumber, setBankAccountNumber] = useState('');
    const [bankAccountName, setBankAccountName] = useState('');
    const [saasName, setSaasName] = useState('Pick Your Photo');
    const [saasDomain, setSaasDomain] = useState('');
    const [saasLogoUrl, setSaasLogoUrl] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [contactWhatsapp, setContactWhatsapp] = useState('');
    const [companyAddress, setCompanyAddress] = useState('');
    const [operationalHours, setOperationalHours] = useState('Senin – Sabtu: 08:00 – 17:00 WIB');

    // Google Master Studio OAuth States
    const [googleClientId, setGoogleClientId] = useState('');
    const [googleClientSecret, setGoogleClientSecret] = useState('');
    const [googleMasterFolderId, setGoogleMasterFolderId] = useState('');
    const [googleRefreshToken, setGoogleRefreshToken] = useState('');
    const [googleMasterAccountEmail, setGoogleMasterAccountEmail] = useState('');
    const [maxUploadConcurrencyThreads, setMaxUploadConcurrencyThreads] = useState(4);

    // Custom Storage & Worker Capacity Warning Threshold States & Grace Period
    const [customStoragePricePerGb, setCustomStoragePricePerGb] = useState(1250);
    const [workerStorageWarningThresholdGb, setWorkerStorageWarningThresholdGb] = useState(10);
    const [gracePeriodDays, setGracePeriodDays] = useState(7);


    // Payment Gateway Toggle States
    const [enablePaymentGateway, setEnablePaymentGateway] = useState(false);
    const [paymentGatewayProvider, setPaymentGatewayProvider] = useState('midtrans');
    const [paymentGatewayClientKey, setPaymentGatewayClientKey] = useState('');
    const [paymentGatewayServerKey, setPaymentGatewayServerKey] = useState('');
    const [qrisExpirationMinutes, setQrisExpirationMinutes] = useState(15);

    // SMTP Email Settings States
    const [smtpEnable, setSmtpEnable] = useState(true);
    const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
    const [smtpPort, setSmtpPort] = useState(465);
    const [smtpEmail, setSmtpEmail] = useState('');
    const [smtpPassword, setSmtpPassword] = useState('');
    const [smtpFromName, setSmtpFromName] = useState('Pick Your Photo');

    const [savingProfile, setSavingProfile] = useState(false);
    const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
    const [profileErrorMsg, setProfileErrorMsg] = useState('');

    // System Control Settings State
    const [sysEnableReg, setSysEnableReg] = useState(true);
    const [sysEnableTrial, setSysEnableTrial] = useState(true);
    const [sysMaxQuota, setSysMaxQuota] = useState(null);
    const [sysTrialExpirationMinutes, setSysTrialExpirationMinutes] = useState(15);
    const [trialMaxPhotos, setTrialMaxPhotos] = useState(50);
    const [trialMaxSelection, setTrialMaxSelection] = useState(10);
    const [trialPreviewPhotos, setTrialPreviewPhotos] = useState(12);
    const [saasTagline, setSaasTagline] = useState('');
    const [saasDescription, setSaasDescription] = useState('');
    const [sysEnableBackup, setSysEnableBackup] = useState(true);
    const [sysBackupInterval, setSysBackupInterval] = useState(6);
    const [lastBackupTime, setLastBackupTime] = useState('Belum pernah');
    const [lastBackupFileName, setLastBackupFileName] = useState(null);
    const [lastBackupSizeFormatted, setLastBackupSizeFormatted] = useState(null);
    const [sysEnableAutoPurge, setSysEnableAutoPurge] = useState(true);
    const [lastHardPurgeFormatted, setLastHardPurgeFormatted] = useState('Belum pernah');

    // Modal Vendor States
    const [editingVendor, setEditingVendor] = useState(null);
    const [vendorAdditionalProjects, setVendorAdditionalProjects] = useState(0);
    const [vendorAdditionalPhotos, setVendorAdditionalPhotos] = useState(0);
    const [vendorAdditionalProjectsExpiresAt, setVendorAdditionalProjectsExpiresAt] = useState('');
    const [vendorExpiresAt, setVendorExpiresAt] = useState('');
    const [vendorResetPassword, setVendorResetPassword] = useState('');
    const [savingVendor, setSavingVendor] = useState(false);
    const [vendorToDelete, setVendorToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [vendorToApprove, setVendorToApprove] = useState(null);
    const [approving, setApproving] = useState(false);
    const [activeProofUrl, setActiveProofUrl] = useState(null);

    const addToast = useCallback((message, type = 'info', duration = 5000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => {
            if (prev.some(t => t.message === message)) return prev;
            return [...prev, { id, message, type, duration }].slice(-4);
        });
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    const fetchData = async (isBackground = false) => {
        try {
            if (!isBackground) setLoading(true);
            const res = await fetch('/api/admin/vendors', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setVendors(data);
            }
        } catch (err) {
            console.error('Failed to fetch vendors:', err);
        } finally {
            if (!isBackground) setLoading(false);
        }
    };


    const fetchAnalytics = async () => {
        try {
            setLoadingAnalytics(true);
            const res = await fetch('/api/admin/analytics', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                console.log('--> [Client Dashboard] Received Analytics Data:', data);
                setAnalytics(data);
            } else {
                const errText = await res.text();
                console.error('--> [Client Dashboard] Failed Analytics Fetch:', res.status, errText);
            }
        } catch (err) {
            console.error('Failed to fetch analytics:', err);
        } finally {
            setLoadingAnalytics(false);
        }
    };

    const fetchPlans = async () => {
        try {
            setLoadingPlans(true);
            const res = await fetch('/api/admin/plans');
            if (res.ok) {
                const data = await res.json();
                setPlans(data);
            }
        } catch (err) {
            console.error('Failed to fetch plans:', err);
        } finally {
            setLoadingPlans(false);
        }
    };

    const fetchUpgrades = async () => {
        try {
            const res = await fetch('/api/admin/upgrades');
            if (res.ok) {
                const data = await res.json();
                // API returns { requests: [], summary: {} } — extract correctly
                const requestList = Array.isArray(data) ? data : (data.requests || []);
                setUpgrades(requestList);
                const summary = data.summary || {};
                setPendingUpgradeSummary({
                    pendingCount: summary.pendingCount ?? requestList.filter(u => u.status === 'pending').length,
                    pendingTotalValue: summary.pendingTotalValue ?? 0,
                });
            }
        } catch (err) {
            console.error('Failed to fetch upgrades:', err);
        }
    };

    const fetchSystemSettings = async () => {
        try {
            const res = await fetch('/api/admin/settings');
            if (res.ok) {
                const data = await res.json();
                setSysEnableReg(data.enable_registration === 1);
                setSysEnableTrial(data.enable_free_trial === 1);
                setSysEnableBackup(data.enable_auto_backup === 1);
                setSysBackupInterval(data.backup_interval_hours);
                if (data.trial_expiration_minutes !== undefined) setSysTrialExpirationMinutes(data.trial_expiration_minutes);
                if (data.enable_auto_purge !== undefined) setSysEnableAutoPurge(data.enable_auto_purge === 1);
                if (data.lastBackupTime) setLastBackupTime(data.lastBackupTime);
                if (data.lastBackupFileName) setLastBackupFileName(data.lastBackupFileName);
                if (data.lastBackupSizeFormatted) setLastBackupSizeFormatted(data.lastBackupSizeFormatted);
                if (data.lastHardPurgeFormatted) setLastHardPurgeFormatted(data.lastHardPurgeFormatted);

                if (data.saasSettings) {
                    if (data.saasSettings.saas_name) setSaasName(data.saasSettings.saas_name);
                    if (data.saasSettings.saas_domain) setSaasDomain(data.saasSettings.saas_domain);
                    if (data.saasSettings.saas_tagline) setSaasTagline(data.saasSettings.saas_tagline);
                    if (data.saasSettings.saas_description) setSaasDescription(data.saasSettings.saas_description);
                    if (data.saasSettings.trial_max_photos) setTrialMaxPhotos(parseInt(data.saasSettings.trial_max_photos) || 50);
                    if (data.saasSettings.trial_max_selection) setTrialMaxSelection(parseInt(data.saasSettings.trial_max_selection) || 10);
                    if (data.saasSettings.trial_preview_photos) setTrialPreviewPhotos(parseInt(data.saasSettings.trial_preview_photos) || 12);
                    if (data.saasSettings.saas_logo_url) setSaasLogoUrl(data.saasSettings.saas_logo_url);
                    if (data.saasSettings.bank_name) setBankName(data.saasSettings.bank_name);
                    if (data.saasSettings.bank_account_number) setBankAccountNumber(data.saasSettings.bank_account_number);
                    if (data.saasSettings.bank_account_name) setBankAccountName(data.saasSettings.bank_account_name);
                    if (data.saasSettings.contact_email) setContactEmail(data.saasSettings.contact_email);
                    if (data.saasSettings.contact_whatsapp) setContactWhatsapp(data.saasSettings.contact_whatsapp);
                    if (data.saasSettings.company_address) setCompanyAddress(data.saasSettings.company_address);
                    if (data.saasSettings.operational_hours) setOperationalHours(data.saasSettings.operational_hours);
                    if (data.saasSettings.google_client_id) setGoogleClientId(data.saasSettings.google_client_id);
                    if (data.saasSettings.google_client_secret) setGoogleClientSecret(data.saasSettings.google_client_secret);
                    if (data.saasSettings.google_master_folder_id) setGoogleMasterFolderId(data.saasSettings.google_master_folder_id);
                    if (data.saasSettings.google_refresh_token) setGoogleRefreshToken(data.saasSettings.google_refresh_token);
                    if (data.saasSettings.google_master_account_email) setGoogleMasterAccountEmail(data.saasSettings.google_master_account_email);
                    if (data.saasSettings.max_upload_concurrency_threads) setMaxUploadConcurrencyThreads(parseInt(data.saasSettings.max_upload_concurrency_threads) || 4);


                    if (data.saasSettings.enable_payment_gateway) setEnablePaymentGateway(data.saasSettings.enable_payment_gateway === '1' || data.saasSettings.enable_payment_gateway === 'true');
                    if (data.saasSettings.payment_gateway_provider) setPaymentGatewayProvider(data.saasSettings.payment_gateway_provider);
                    if (data.saasSettings.payment_gateway_client_key) setPaymentGatewayClientKey(data.saasSettings.payment_gateway_client_key);
                    if (data.saasSettings.payment_gateway_server_key) setPaymentGatewayServerKey(data.saasSettings.payment_gateway_server_key);
                    if (data.saasSettings.qris_expiration_minutes) setQrisExpirationMinutes(parseInt(data.saasSettings.qris_expiration_minutes) || 15);

                    if (data.saasSettings.smtp_enable !== undefined) setSmtpEnable(data.saasSettings.smtp_enable === '1' || data.saasSettings.smtp_enable === 'true');
                    if (data.saasSettings.smtp_host) setSmtpHost(data.saasSettings.smtp_host);
                    if (data.saasSettings.smtp_port) setSmtpPort(data.saasSettings.smtp_port);
                    if (data.saasSettings.smtp_email) setSmtpEmail(data.saasSettings.smtp_email);
                    if (data.saasSettings.smtp_password) setSmtpPassword(data.saasSettings.smtp_password);
                    if (data.saasSettings.custom_storage_price_per_gb) setCustomStoragePricePerGb(parseInt(data.saasSettings.custom_storage_price_per_gb) || 1250);
                    if (data.saasSettings.worker_storage_warning_threshold_gb) setWorkerStorageWarningThresholdGb(parseInt(data.saasSettings.worker_storage_warning_threshold_gb) || 10);
                    if (data.saasSettings.grace_period_days) setGracePeriodDays(parseInt(data.saasSettings.grace_period_days) || 7);
                }
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

    const handleTabChange = (tabKey) => {
        setActiveTab(tabKey);
        // Refresh relevant data when switching tabs
        if (tabKey === 'analytics') {
            fetchAnalytics();
        }
        if (tabKey === 'vendors' || tabKey === 'inquiry') {
            fetchData();
        }
        if (tabKey === 'upgrades') {
            fetchUpgrades();
        }
        if (typeof window !== 'undefined') {
            window.location.hash = tabKey;
            localStorage.setItem('admin_active_tab', tabKey);
        }
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const hash = window.location.hash.replace('#', '');
            const validTabs = ['analytics', 'vendors', 'plans', 'trial', 'settings', 'inquiry', 'storage-pool', 'upgrades'];
            if (validTabs.includes(hash)) {
                setActiveTab(hash);
            } else {
                const savedTab = localStorage.getItem('admin_active_tab');
                if (savedTab && ['analytics', 'vendors', 'plans', 'trial', 'settings', 'inquiry', 'storage-pool', 'upgrades'].includes(savedTab)) {
                    setActiveTab(savedTab);
                }
            }
        }
    }, []);

    useEffect(() => {
        fetchData();
        fetchAnalytics();
        fetchPlans();
        fetchUpgrades();
        fetchSystemSettings();
        fetchDiskStats();

        // Smart real-time auto polling every 8 seconds (Pauses when tab is hidden)
        const interval = setInterval(() => {
            if (typeof document !== 'undefined' && !document.hidden) {
                fetchData(true);
                fetchAnalytics();
            }
        }, 8000);

        return () => clearInterval(interval);
    }, []);


    const handleToggleVendorStatus = async (vendorId, newStatus) => {
        try {
            const res = await fetch(`/api/admin/vendors/${vendorId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                addToast(`Status vendor berhasil diubah menjadi ${newStatus === 'active' ? 'Aktif' : 'Ditangguhkan'}.`, 'success');
                fetchData();
                fetchAnalytics();
            } else {
                addToast('Gagal mengubah status vendor.', 'error');
            }
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setSavingProfile(true);
        setProfileSuccessMsg('');
        setProfileErrorMsg('');

        try {
            if (newPassword) {
                const resProf = await fetch('/api/admin/profile', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ newPassword })
                });
                if (!resProf.ok) {
                    const profData = await resProf.json();
                    throw new Error(profData.message || 'Failed to update superadmin password.');
                }
            }

            const resSysSettings = await fetch('/api/admin/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    enable_registration: sysEnableReg,
                    enable_free_trial: sysEnableTrial,
                    max_vendor_quota: sysMaxQuota,
                    trial_expiration_minutes: sysTrialExpirationMinutes,
                    enable_auto_backup: sysEnableBackup,
                    backup_interval_hours: sysBackupInterval,
                    enable_auto_purge: sysEnableAutoPurge,
                    saasSettings: {
                        bank_name: bankName,
                        bank_account_number: bankAccountNumber,
                        bank_account_name: bankAccountName,
                        contact_email: contactEmail,
                        contact_whatsapp: contactWhatsapp,
                        google_client_id: googleClientId,
                        google_client_secret: googleClientSecret,
                        google_master_folder_id: googleMasterFolderId,
                        max_upload_concurrency_threads: String(maxUploadConcurrencyThreads || 4),
                        enable_payment_gateway: enablePaymentGateway ? '1' : '0',
                        payment_gateway_provider: paymentGatewayProvider,
                        payment_gateway_client_key: paymentGatewayClientKey,
                        payment_gateway_server_key: paymentGatewayServerKey,
                        qris_expiration_minutes: String(qrisExpirationMinutes || 15),
                        smtp_enable: smtpEnable ? '1' : '0',
                        smtp_host: smtpHost,
                        smtp_port: smtpPort ? String(smtpPort) : '465',
                        smtp_email: smtpEmail,
                        smtp_password: smtpPassword,
                        smtp_from_name: smtpFromName,
                        custom_storage_price_per_gb: String(customStoragePricePerGb || 1250),
                        worker_storage_warning_threshold_gb: String(workerStorageWarningThresholdGb || 10),
                        grace_period_days: String(gracePeriodDays || 7)
                    }
                })
            });

            if (!resSysSettings.ok) {
                const sysData = await resSysSettings.json();
                throw new Error(sysData.message || 'Gagal memperbarui pengaturan sistem.');
            }

            setProfileSuccessMsg('Pengaturan SaaS & profil admin berhasil diperbarui.');
            if (addToast) addToast('Pengaturan SaaS berhasil disimpan.', 'success');
            setNewPassword('');
            fetchData();
            fetchSystemSettings();
            fetchAnalytics();

            // Auto-hide success message after 4.5 seconds
            setTimeout(() => {
                setProfileSuccessMsg('');
            }, 4500);
        } catch (err) {
            setProfileErrorMsg(err.message || 'Gagal menyimpan pengaturan.');
            if (addToast) addToast(err.message || 'Gagal menyimpan pengaturan.', 'error');
        } finally {
            setSavingProfile(false);
        }
    };

    const openPlanModal = (plan = null) => {
        if (plan) {
            setEditingPlan(plan);
            setPlanName(plan.name);
            setPlanMaxProjects(plan.maxProjects);
            setPlanMaxPhotos(plan.maxPhotosPerProject);
            setPlanPrice(plan.price);
            setPlanActivePeriodDays(plan.activePeriodDays || 30);
            setPlanAllowCustomLogo(plan.allowCustomLogo === 1 || plan.allowCustomLogo === true);
            setPlanAllowRawSelector(plan.allowRawSelector === undefined ? true : (plan.allowRawSelector === 1 || plan.allowRawSelector === true));
            setPlanStatus(plan.status || 'active');
            setPlanType(plan.planType || 'limit');
            setPlanMaxStorageMB(plan.maxStorageMB || 51200);
        } else {
            setEditingPlan(null);
            setPlanName('');
            setPlanMaxProjects(10);
            setPlanMaxPhotos(300);
            setPlanPrice(49000);
            setPlanActivePeriodDays(30);
            setPlanAllowCustomLogo(false);
            setPlanAllowRawSelector(true);
            setPlanStatus('active');
            setPlanType('limit');
            setPlanMaxStorageMB(51200);
        }
        setShowPlanModal(true);
    };

    const handleSavePlan = async (e) => {
        e.preventDefault();
        setSavingPlan(true);
        try {
            const url = editingPlan ? `/api/admin/plans/${editingPlan.id}` : '/api/admin/plans';
            const method = editingPlan ? 'PATCH' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: planName,
                    maxProjects: planMaxProjects,
                    maxPhotosPerProject: planMaxPhotos,
                    price: planPrice,
                    activePeriodDays: planActivePeriodDays,
                    allowCustomLogo: planAllowCustomLogo ? 1 : 0,
                    allowRawSelector: planAllowRawSelector ? 1 : 0,
                    status: planStatus,
                    planType,
                    maxStorageMB: planMaxStorageMB
                })
            });

            if (res.ok) {
                addToast(editingPlan ? 'Paket langganan berhasil diperbarui.' : 'Paket baru berhasil ditambahkan.', 'success');
                setShowPlanModal(false);
                fetchPlans();
            } else {
                const errData = await res.json();
                addToast(errData.message || 'Gagal menyimpan paket.', 'error');
            }
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setSavingPlan(false);
        }
    };

    const confirmDeletePlan = async () => {
        if (!planToDelete) return;
        setDeletingPlan(true);
        try {
            const res = await fetch(`/api/admin/plans/${planToDelete.id}`, { method: 'DELETE' });
            if (res.ok) {
                addToast('Paket berlangganan berhasil dihapus.', 'success');
                setPlanToDelete(null);
                fetchPlans();
            } else {
                const data = await res.json();
                addToast(data.message || 'Gagal menghapus paket.', 'error');
            }
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setDeletingPlan(false);
        }
    };

    const confirmApproveVendor = async () => {
        if (!vendorToApprove) return;
        setApproving(true);
        try {
            const res = await fetch(`/api/admin/vendors/${vendorToApprove.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'active', action: 'approve' })
            });

            const text = await res.text();
            let data = {};
            try { data = text ? JSON.parse(text) : {}; } catch (e) {}

            if (res.ok) {
                addToast(`Pendaftaran vendor ${vendorToApprove.name} berhasil disetujui!`, 'success');
                setVendorToApprove(null);
                fetchData();
                fetchAnalytics();
            } else {
                addToast(data.message || 'Gagal menyetujui vendor.', 'error');
            }
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setApproving(false);
        }
    };

    const confirmDeleteVendor = async () => {
        if (!vendorToDelete) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/admin/vendors/${vendorToDelete.id}`, { method: 'DELETE' });
            if (res.ok) {
                addToast(`Vendor ${vendorToDelete.name} berhasil dihapus permanen.`, 'success');
                setVendorToDelete(null);
                fetchData();
                fetchAnalytics();
            } else {
                const data = await res.json();
                addToast(data.message || 'Gagal menghapus vendor.', 'error');
            }
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setDeleting(false);
        }
    };

    // Handler: Cancel QRIS payment session from Inquiry tab
    const handleCancelQris = async (vendor) => {
        try {
            // Get the latest pending session for this vendor
            const res = await fetch(`/api/payment/check-pending?email=${encodeURIComponent(vendor.email)}`);
            const data = await res.json();
            const orderId = data.orderId;
            if (!orderId) {
                addToast('Tidak ada sesi QRIS aktif untuk dibatalkan.', 'error');
                return;
            }
            const cancelRes = await fetch('/api/payment/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, vendorId: vendor.id }),
            });
            if (cancelRes.ok) {
                addToast(`Sesi QRIS vendor ${vendor.name} berhasil dibatalkan.`, 'success');
                fetchData();
            } else {
                const errData = await cancelRes.json();
                addToast(errData.message || 'Gagal membatalkan sesi QRIS.', 'error');
            }
        } catch (err) {
            addToast(err.message || 'Terjadi kesalahan.', 'error');
        }
    };

    // Handler: Regenerate QRIS for archived vendor
    const handleRegenerateQris = async (vendor) => {
        try {
            const res = await fetch('/api/payment/regenerate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vendorId: vendor.id, planId: vendor.planId }),
            });
            if (res.ok) {
                addToast(`QRIS baru berhasil dibuat untuk vendor ${vendor.name}.`, 'success');
                fetchData();
            } else {
                const errData = await res.json();
                addToast(errData.message || 'Gagal membuat QRIS baru.', 'error');
            }
        } catch (err) {
            addToast(err.message || 'Terjadi kesalahan.', 'error');
        }
    };

    return (
        <div className={styles.wrapper}>
            {/* Header */}
            <header className={`dashboard-header ${styles.header}`}>
                <div className={styles.brandGroup}>
                    {saasLogoUrl && (
                        <img 
                            src={saasLogoUrl} 
                            alt="Logo" 
                            className={styles.logo} 
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    )}
                    <h1 className={`title-gradient ${styles.title}`}>
                        {saasName ? `${saasName} Console` : 'Owner Console'}
                    </h1>
                </div>
                <div className={styles.headerActions}>
                    <span className={styles.adminPill}>
                        Admin: <strong className={styles.adminName}>{adminUser?.name || 'Superadmin'}</strong>
                    </span>
                    <button
                        onClick={() => handleTabChange('settings')}
                        className={`btn-secondary ${styles.settingsBtn}`}
                        style={{ 
                            background: activeTab === 'settings' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                            color: activeTab === 'settings' ? '#818cf8' : '#e4e4e7',
                            borderColor: activeTab === 'settings' ? '#6366f1' : 'rgba(255,255,255,0.1)'
                        }}
                    >
                        <SettingsIcon size={14} />
                        <span>Pengaturan</span>
                    </button>
                    <a
                        href="/api/auth/logout"
                        className={`btn-secondary ${styles.logoutBtn}`}
                    >
                        <LogOutIcon size={13} color="#f87171" />
                        <span>Log Out</span>
                    </a>
                </div>
            </header>

            <main className={`app-container ${styles.mainContainer}`}>
                {activeTab === 'settings' ? (
                    <div className="fade-in-up">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={() => handleTabChange('analytics')}
                                style={{
                                    background: 'rgba(99, 102, 241, 0.15)',
                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                    color: '#818cf8',
                                    padding: '8px 14px',
                                    borderRadius: '8px',
                                    fontSize: '12.5px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)'
                                }}
                            >
                                ← Dashboard Operasional
                            </button>
                            <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                                Mode: <strong>Pengaturan Terpusat</strong>
                            </span>
                        </div>

                        <AdminSettings
                            googleClientId={googleClientId} setGoogleClientId={setGoogleClientId}
                            googleClientSecret={googleClientSecret} setGoogleClientSecret={setGoogleClientSecret}
                            googleMasterFolderId={googleMasterFolderId} setGoogleMasterFolderId={setGoogleMasterFolderId}
                            googleRefreshToken={googleRefreshToken}
                            googleMasterAccountEmail={googleMasterAccountEmail}
                            maxUploadConcurrencyThreads={maxUploadConcurrencyThreads} setMaxUploadConcurrencyThreads={setMaxUploadConcurrencyThreads}

                            newPassword={newPassword} setNewPassword={setNewPassword}
                            saasName={saasName} setSaasName={setSaasName}
                            saasDomain={saasDomain} setSaasDomain={setSaasDomain}
                            saasTagline={saasTagline} setSaasTagline={setSaasTagline}
                            saasDescription={saasDescription} setSaasDescription={setSaasDescription}
                            saasLogoUrl={saasLogoUrl} setSaasLogoUrl={setSaasLogoUrl}
                            bankName={bankName} setBankName={setBankName}
                            bankAccountNumber={bankAccountNumber} setBankAccountNumber={setBankAccountNumber}
                            bankAccountName={bankAccountName} setBankAccountName={setBankAccountName}
                            contactEmail={contactEmail} setContactEmail={setContactEmail}
                            contactWhatsapp={contactWhatsapp} setContactWhatsapp={setContactWhatsapp}
                            companyAddress={companyAddress} setCompanyAddress={setCompanyAddress}
                            operationalHours={operationalHours} setOperationalHours={setOperationalHours}
                            enablePaymentGateway={enablePaymentGateway} setEnablePaymentGateway={setEnablePaymentGateway}
                            paymentGatewayProvider={paymentGatewayProvider} setPaymentGatewayProvider={setPaymentGatewayProvider}
                            paymentGatewayClientKey={paymentGatewayClientKey} setPaymentGatewayClientKey={setPaymentGatewayClientKey}
                            paymentGatewayServerKey={paymentGatewayServerKey} setPaymentGatewayServerKey={setPaymentGatewayServerKey}
                            qrisExpirationMinutes={qrisExpirationMinutes} setQrisExpirationMinutes={setQrisExpirationMinutes}
                            smtpEnable={smtpEnable} setSmtpEnable={setSmtpEnable}
                            smtpHost={smtpHost} setSmtpHost={setSmtpHost}
                            smtpPort={smtpPort} setSmtpPort={setSmtpPort}
                            smtpEmail={smtpEmail} setSmtpEmail={setSmtpEmail}
                            smtpPassword={smtpPassword} setSmtpPassword={setSmtpPassword}
                            smtpFromName={smtpFromName} setSmtpFromName={setSmtpFromName}
                            addToast={addToast}
                            sysEnableReg={sysEnableReg} setSysEnableReg={setSysEnableReg}
                            sysEnableTrial={sysEnableTrial} setSysEnableTrial={setSysEnableTrial}
                            sysMaxQuota={sysMaxQuota} setSysMaxQuota={setSysMaxQuota}
                            sysTrialExpirationMinutes={sysTrialExpirationMinutes} setSysTrialExpirationMinutes={setSysTrialExpirationMinutes}
                            trialMaxPhotos={trialMaxPhotos} setTrialMaxPhotos={setTrialMaxPhotos}
                            trialMaxSelection={trialMaxSelection} setTrialMaxSelection={setTrialMaxSelection}
                            trialPreviewPhotos={trialPreviewPhotos} setTrialPreviewPhotos={setTrialPreviewPhotos}
                            sysEnableBackup={sysEnableBackup} setSysEnableBackup={setSysEnableBackup}
                            sysBackupInterval={sysBackupInterval} setSysBackupInterval={setSysBackupInterval}
                            lastBackupTime={lastBackupTime}
                            lastBackupFileName={lastBackupFileName}
                            lastBackupSizeFormatted={lastBackupSizeFormatted}
                            customStoragePricePerGb={customStoragePricePerGb} setCustomStoragePricePerGb={setCustomStoragePricePerGb}
                            workerStorageWarningThresholdGb={workerStorageWarningThresholdGb} setWorkerStorageWarningThresholdGb={setWorkerStorageWarningThresholdGb}
                            gracePeriodDays={gracePeriodDays} setGracePeriodDays={setGracePeriodDays}
                            sysEnableAutoPurge={sysEnableAutoPurge} setSysEnableAutoPurge={setSysEnableAutoPurge}
                            lastHardPurgeFormatted={lastHardPurgeFormatted} setLastHardPurgeFormatted={setLastHardPurgeFormatted}
                            fetchSystemSettings={fetchSystemSettings}
                            savingProfile={savingProfile}
                            profileSuccessMsg={profileSuccessMsg}
                            setProfileSuccessMsg={setProfileSuccessMsg}
                            profileErrorMsg={profileErrorMsg}
                            handleSaveProfile={handleSaveProfile}
                        />
                    </div>
                ) : (
                    <>
                        <div style={{ marginBottom: '20px' }}>
                            <h2 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: '800', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>Admin Control Panel</h2>
                            <p style={{ color: '#a1a1aa', margin: 0, fontSize: 'clamp(12px, 2.5vw, 14px)' }}>Kelola vendor, paket berlangganan & monitoring bisnis SaaS</p>
                        </div>

                        {/* Tab Navigation (Full-Width Segmented Touch Scroll Bar) */}
                        <div className="tab-scroll-bar" style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginBottom: '20px',
                            background: 'rgba(255, 255, 255, 0.025)',
                            border: '1px solid rgba(255, 255, 255, 0.07)',
                            borderRadius: '10px',
                            padding: '4px',
                            width: '100%',
                            maxWidth: '100%',
                            boxSizing: 'border-box',
                        }}>
                            {/* MONITOR BISNIS & ANALISIS */}
                            <button
                                onClick={() => handleTabChange('analytics')}
                                style={{
                                    flex: '0 0 auto',
                                    justifyContent: 'center',
                                    padding: '7px 11px',
                                    borderRadius: '7px',
                                    border: 'none',
                                    background: activeTab === 'analytics' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                                    color: activeTab === 'analytics' ? '#fff' : '#a1a1aa',
                                    fontWeight: '600',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: activeTab === 'analytics' ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                                    transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                            >
                                <AnalyticsIcon size={14} color={activeTab === 'analytics' ? '#fff' : '#818cf8'} />
                                <span>Overview</span>
                            </button>

                            {/* INQUIRY — calon vendor */}
                            <button
                                onClick={() => handleTabChange('inquiry')}
                                style={{
                                    flex: '0 0 auto',
                                    justifyContent: 'center',
                                    padding: '7px 11px',
                                    borderRadius: '7px',
                                    border: 'none',
                                    background: activeTab === 'inquiry' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent',
                                    color: activeTab === 'inquiry' ? '#fff' : '#a1a1aa',
                                    fontWeight: '600',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: activeTab === 'inquiry' ? '0 2px 8px rgba(245,158,11,0.3)' : 'none',
                                    transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                            >
                                <InquiryIcon size={14} color={activeTab === 'inquiry' ? '#fff' : '#fbbf24'} />
                                <span>Inquiry</span>
                                {vendors.filter(v => ['draft_plan', 'pending_payment', 'pending_manual', 'pending'].includes(v.status)).length > 0 && (
                                    <span style={{ background: '#ef4444', color: '#fff', borderRadius: '8px', padding: '1px 6px', fontSize: '10px', fontWeight: 'bold' }}>
                                        {vendors.filter(v => ['draft_plan', 'pending_payment', 'pending_manual', 'pending'].includes(v.status)).length}
                                    </span>
                                )}
                            </button>

                            {/* UPGRADE REQUESTS */}
                            <button
                                onClick={() => handleTabChange('upgrades')}
                                style={{
                                    flex: '0 0 auto',
                                    justifyContent: 'center',
                                    padding: '7px 11px',
                                    borderRadius: '7px',
                                    border: 'none',
                                    background: activeTab === 'upgrades' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                                    color: activeTab === 'upgrades' ? '#fff' : '#a1a1aa',
                                    fontWeight: '600',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: activeTab === 'upgrades' ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                                    transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                            >
                                <UpgradeIcon size={14} color={activeTab === 'upgrades' ? '#fff' : '#818cf8'} />
                                <span>Upgrade</span>
                                {pendingUpgradeSummary.pendingCount > 0 && (
                                    <span style={{ background: '#f59e0b', color: '#000', borderRadius: '8px', padding: '1px 6px', fontSize: '10px', fontWeight: 'bold' }}>
                                        {pendingUpgradeSummary.pendingCount}
                                    </span>
                                )}
                            </button>

                            {/* KELOLA VENDOR */}
                            <button
                                onClick={() => handleTabChange('vendors')}
                                style={{
                                    flex: '0 0 auto',
                                    justifyContent: 'center',
                                    padding: '7px 11px',
                                    borderRadius: '7px',
                                    border: 'none',
                                    background: activeTab === 'vendors' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                                    color: activeTab === 'vendors' ? '#fff' : '#a1a1aa',
                                    fontWeight: '600',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: activeTab === 'vendors' ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                                    transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                            >
                                <UsersIcon size={14} color={activeTab === 'vendors' ? '#fff' : '#818cf8'} />
                                <span>Vendor ({vendors.filter(v => v.status === 'active').length})</span>
                            </button>

                            {/* KELOLA PAKET */}
                            <button
                                onClick={() => handleTabChange('plans')}
                                style={{
                                    flex: '0 0 auto',
                                    justifyContent: 'center',
                                    padding: '7px 11px',
                                    borderRadius: '7px',
                                    border: 'none',
                                    background: activeTab === 'plans' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                                    color: activeTab === 'plans' ? '#fff' : '#a1a1aa',
                                    fontWeight: '600',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: activeTab === 'plans' ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                                    transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                            >
                                <PlansIcon size={14} color={activeTab === 'plans' ? '#fff' : '#818cf8'} />
                                <span>Paket ({plans.length})</span>
                            </button>

                            {/* TRIAL CONTROL */}
                            <button
                                onClick={() => handleTabChange('trial')}
                                style={{
                                    flex: '0 0 auto',
                                    justifyContent: 'center',
                                    padding: '7px 11px',
                                    borderRadius: '7px',
                                    border: 'none',
                                    background: activeTab === 'trial' ? 'linear-gradient(135deg, #a855f7, #7c3aed)' : 'transparent',
                                    color: activeTab === 'trial' ? '#fff' : '#a1a1aa',
                                    fontWeight: '600',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: activeTab === 'trial' ? '0 2px 8px rgba(168,85,247,0.3)' : 'none',
                                    transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                            >
                                <TrialIcon size={14} color={activeTab === 'trial' ? '#fff' : '#c084fc'} />
                                <span>Trial</span>
                            </button>

                            {/* STORAGE POOL */}
                            <button
                                onClick={() => handleTabChange('storage-pool')}
                                style={{
                                    flex: '0 0 auto',
                                    justifyContent: 'center',
                                    padding: '7px 11px',
                                    borderRadius: '7px',
                                    border: 'none',
                                    background: activeTab === 'storage-pool' ? 'linear-gradient(135deg, #059669, #047857)' : 'transparent',
                                    color: activeTab === 'storage-pool' ? '#fff' : '#a1a1aa',
                                    fontWeight: '600',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: activeTab === 'storage-pool' ? '0 2px 8px rgba(16,185,129,0.3)' : 'none',
                                    transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                            >
                                <StoragePoolIcon size={14} color={activeTab === 'storage-pool' ? '#fff' : '#34d399'} />
                                <span>Storage</span>
                            </button>
                        </div>

                        {/* Render Modular View Components */}
                        {activeTab === 'storage-pool' && (
                            <AdminStoragePool
                                googleClientId={googleClientId}
                                googleClientSecret={googleClientSecret}
                                googleMasterAccountEmail={googleMasterAccountEmail}
                                googleRefreshToken={googleRefreshToken}
                            />
                        )}

                        {activeTab === 'analytics' && (
                            <AdminOverview 
                                analyticsData={analytics} 
                                diskStats={diskStats} 
                                onNavigateTab={handleTabChange}
                            />
                        )}

                        {/* INQUIRY TAB — Calon vendor (pending, arsip) */}
                        {activeTab === 'inquiry' && (
                            <AdminVendors
                                vendors={vendors}
                                loading={loading}
                                vendorSubTab="inquiry"
                                setVendorSubTab={() => {}}
                                inquirySubTabOverride={inquirySubTab}
                                setInquirySubTabOverride={setInquirySubTab}
                                setEditingVendor={setEditingVendor}
                                setVendorToApprove={setVendorToApprove}
                                setVendorToDelete={setVendorToDelete}
                                setActiveProofUrl={setActiveProofUrl}
                                handleToggleVendorStatus={handleToggleVendorStatus}
                                onCancelQris={handleCancelQris}
                                onRegenerateQris={handleRegenerateQris}
                                refetchVendors={fetchData}
                            />
                        )}

                        {/* UPGRADE REQUESTS TAB */}
                        {activeTab === 'upgrades' && (
                            <AdminUpgradeRequests
                                upgrades={upgrades}
                                pendingUpgradeSummary={pendingUpgradeSummary}
                                addToast={addToast}
                                setActiveProofUrl={setActiveProofUrl}
                                onRefresh={() => { fetchUpgrades(); fetchData(); fetchAnalytics(); }}
                            />
                        )}

                        {/* KELOLA VENDOR TAB — Vendor aktif berlangganan saja */}
                        {activeTab === 'vendors' && (
                            <AdminVendors
                                vendors={vendors}
                                loading={loading}
                                vendorSubTab="active"
                                setVendorSubTab={() => {}}
                                setEditingVendor={setEditingVendor}
                                setVendorToApprove={setVendorToApprove}
                                setVendorToDelete={setVendorToDelete}
                                setActiveProofUrl={setActiveProofUrl}
                                handleToggleVendorStatus={handleToggleVendorStatus}
                                refetchVendors={fetchData}
                            />
                        )}

                        {activeTab === 'plans' && (
                            <AdminPlans
                                plans={plans}
                                loadingPlans={loadingPlans}
                                openPlanModal={openPlanModal}
                                setPlanToDelete={setPlanToDelete}
                            />
                        )}

                        {activeTab === 'trial' && (
                            <AdminTrialControl addToast={addToast} />
                        )}
                    </>
                )}

                {/* ── GLOBAL FOOTER SYSTEM STATUS BAR (VISIBLE ACROSS ALL TABS) ── */}
                <div style={{
                    marginTop: '40px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    padding: '12px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11px', color: '#71717a' }}>
                        <span>⚙️ Status Layanan:</span>
                        <span style={{ color: (googleClientId && googleClientSecret) ? '#34d399' : '#fbbf24', fontWeight: '600' }}>
                            📁 Google CDN: {(googleClientId && googleClientSecret) ? '🟢 Active' : '⚠️ Off'}
                        </span>
                        <span style={{ color: (smtpEnable && smtpEmail && smtpPassword) ? '#34d399' : '#fbbf24', fontWeight: '600' }}>
                            ✉️ SMTP Email: {(smtpEnable && smtpEmail && smtpPassword) ? '🟢 Active' : '⚠️ Off'}
                        </span>
                        <span style={{ color: '#818cf8', fontWeight: '600' }}>
                            🗄️ Database SQLite: {diskStats?.dbSizeMB || '0.00'} MB ({analytics?.heapUsedMB || '0.0'} MB RAM)
                        </span>
                    </div>

                    <span style={{ fontSize: '11px', color: '#52525b' }}>
                        Pick-Your-Photo SaaS Control Console
                    </span>
                </div>
            </main>

            {/* ── MODALS (Approve Vendor, Delete Vendor, Delete Plan, Plan Form, Lightbox) ── */}
            {vendorToApprove && (
                <div className="modal-overlay" onClick={() => { if (!approving) setVendorToApprove(null); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', width: '90%' }}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', color: '#34d399', fontSize: '28px', marginBottom: '16px' }}>✓</div>
                            <h3 className="title-gradient" style={{ fontSize: '22px', margin: '0 0 8px 0', fontWeight: 'bold' }}>Setujui Pembayaran & Akses</h3>
                            <p style={{ color: '#a1a1aa', margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                                Konfirmasi persetujuan pendaftaran / upgrade vendor <strong>"{vendorToApprove.name}"</strong> ({vendorToApprove.email}).
                            </p>

                            {/* Order Breakdown Box */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', marginTop: '16px', textAlign: 'left', fontSize: '13px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ color: '#a1a1aa' }}>Paket Utama:</span>
                                    <strong style={{ color: '#fbbf24' }}>{vendorToApprove.planName || 'Pro Studio Plan'}</strong>
                                </div>
                                {(vendorToApprove.pendingAddonQuotaBytes > 0 || vendorToApprove.addonStorageQuotaBytes > 0) && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ color: '#a1a1aa' }}>Add-On Storage:</span>
                                        <strong style={{ color: '#38bdf8' }}>
                                            💾 {Math.round((vendorToApprove.pendingAddonQuotaBytes || vendorToApprove.addonStorageQuotaBytes) / (1024 * 1024 * 1024))} GB Drive
                                        </strong>
                                    </div>
                                )}
                            </div>

                            {/* Payment Proof Image Preview if available */}
                            {vendorToApprove.paymentProof && (vendorToApprove.paymentProof.startsWith('/api/admin/proofs/') || vendorToApprove.paymentProof.startsWith('/uploads/') || vendorToApprove.paymentProof.startsWith('/staging_uploads/')) && (
                                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '6px', fontWeight: 'bold' }}>🖼️ Pratinjau Struk Bukti Transfer (Private & Aman):</div>
                                    {(() => {
                                        const rawUrl = vendorToApprove.paymentProof;
                                        const filename = rawUrl.split('/').pop();
                                        const secureUrl = `/api/admin/proofs/${filename}`;
                                        return (
                                            <a href={secureUrl} target="_blank" rel="noopener noreferrer">
                                                <img src={secureUrl} alt="Bukti Bayar" style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', objectFit: 'contain' }} />
                                            </a>
                                        );
                                    })()}
                                </div>
                            )}

                            {(vendorToApprove.status === 'pending_payment' || (vendorToApprove.paymentProof && vendorToApprove.paymentProof.includes('Midtrans'))) && (
                                <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '8px', padding: '10px 12px', marginTop: '14px', fontSize: '12px', color: '#fbbf24', textAlign: 'left' }}>
                                    ⚠️ <strong>Catatan:</strong> Transaksi QRIS Midtrans ini belum dikonfirmasi lunas otomatis. Menyetujui secara manual akan mengaktifkan akun vendor & storage secara langsung.
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setVendorToApprove(null)} className="btn-secondary" style={{ flex: 1 }} disabled={approving}>Batal</button>
                            <button onClick={confirmApproveVendor} className="btn-primary" style={{ flex: 1.5, background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }} disabled={approving}>
                                {approving ? 'Menyetujui...' : 'Ya, Setujui'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {vendorToDelete && (
                <div className="modal-overlay" onClick={() => { if (!deleting) setVendorToDelete(null); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '90%' }}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239,68,68,0.15)', color: '#f87171', fontSize: '28px', marginBottom: '16px' }}>⚠️</div>
                            <h3 className="title-gradient" style={{ fontSize: '22px', margin: '0 0 8px 0', fontWeight: 'bold' }}>Hapus Akun Vendor</h3>
                            <p style={{ color: '#a1a1aa', margin: 0, fontSize: '14px' }}>Apakah Anda yakin ingin menghapus vendor <strong>"{vendorToDelete.name}"</strong>?</p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setVendorToDelete(null)} className="btn-secondary" style={{ flex: 1 }} disabled={deleting}>Batal</button>
                            <button onClick={confirmDeleteVendor} className="btn-primary" style={{ flex: 1.5, background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none' }} disabled={deleting}>
                                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {planToDelete && (
                <div className="modal-overlay" onClick={() => { if (!deletingPlan) setPlanToDelete(null); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '90%' }}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239,68,68,0.15)', color: '#f87171', fontSize: '28px', marginBottom: '16px' }}>⚠️</div>
                            <h3 className="title-gradient" style={{ fontSize: '22px', margin: '0 0 8px 0', fontWeight: 'bold' }}>Hapus Paket Plan</h3>
                            <p style={{ color: '#a1a1aa', margin: 0, fontSize: '14px' }}>Hapus paket <strong>"{planToDelete.name}"</strong>?</p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setPlanToDelete(null)} className="btn-secondary" style={{ flex: 1 }} disabled={deletingPlan}>Batal</button>
                            <button onClick={confirmDeletePlan} className="btn-primary" style={{ flex: 1.5, background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none' }} disabled={deletingPlan}>
                                {deletingPlan ? 'Menghapus...' : 'Ya, Hapus Paket'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showPlanModal && (
                <div className="modal-overlay" onClick={() => { if (!savingPlan) setShowPlanModal(false); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 'bold' }}>
                            {editingPlan ? 'Edit Package Plan' : 'Add New Package Plan'}
                        </h3>
                        <form onSubmit={handleSavePlan}>
                            <div className="form-group">
                                <label className="form-label">Nama Paket</label>
                                <input type="text" className="input-text" required placeholder="Contoh: Pro Studio Plan" value={planName} onChange={e => setPlanName(e.target.value)} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div className="form-group">
                                    <label className="form-label">Harga Langganan (Rp)</label>
                                    <input type="number" className="input-text" required min="0" value={planPrice} onChange={e => setPlanPrice(parseInt(e.target.value) || 0)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Masa Aktif Akun (Hari)</label>
                                    <input type="number" className="input-text" required min="1" value={planActivePeriodDays} onChange={e => {
                                        const days = parseInt(e.target.value) || 30;
                                        setPlanActivePeriodDays(days);
                                    }} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div className="form-group">
                                    <label className="form-label">Batas Project Aktif</label>
                                    <input type="number" className="input-text" required min="1" value={planMaxProjects} onChange={e => setPlanMaxProjects(parseInt(e.target.value) || 0)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Foto per Project</label>
                                    <input type="text" className="input-text" disabled value="Unlimited" style={{ background: 'rgba(0,0,0,0.3)', color: '#34d399', fontWeight: 'bold' }} />
                                </div>
                            </div>

                            <div className="form-group" style={{ background: 'rgba(99,102,241,0.06)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.15)', marginTop: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input 
                                        type="checkbox" 
                                        id="planAllowCustomLogo"
                                        checked={planAllowCustomLogo}
                                        onChange={e => setPlanAllowCustomLogo(e.target.checked)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="planAllowCustomLogo" style={{ cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#a5b4fc' }}>
                                        Fitur Logo Studio Sendiri (White-Label Branding)
                                    </label>
                                </div>
                                <span style={{ fontSize: '11px', color: '#71717a', display: 'block', marginTop: '4px', paddingLeft: '28px' }}>
                                    Izinkan vendor di paket ini mengunggah logo brand studio mereka sendiri di galeri seleksi klien.
                                </span>
                            </div>

                            <div className="form-group" style={{ background: 'rgba(52,211,153,0.06)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(52,211,153,0.15)', marginTop: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input 
                                        type="checkbox" 
                                        id="planAllowRawSelector"
                                        checked={planAllowRawSelector}
                                        onChange={e => setPlanAllowRawSelector(e.target.checked)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="planAllowRawSelector" style={{ cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#6ee7b7' }}>
                                        Fitur Auto-Sorter / Selector File RAW
                                    </label>
                                </div>
                                <span style={{ fontSize: '11px', color: '#71717a', display: 'block', marginTop: '4px', paddingLeft: '28px' }}>
                                    Izinkan vendor di paket ini menggunakan fitur sortir otomatis file RAW di browser.
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowPlanModal(false)} style={{ flex: 1 }}>Batal</button>
                                <button type="submit" className="btn-primary" style={{ flex: 1.5 }} disabled={savingPlan}>
                                    {savingPlan ? 'Menyimpan...' : 'Simpan Paket'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Lightbox for payment proof */}
            {activeProofUrl && (
                <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setActiveProofUrl(null)}>
                    <div className="modal-content" style={{ maxWidth: '540px', textAlign: 'left', background: 'rgba(18, 18, 24, 0.98)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '24px' }} onClick={e => e.stopPropagation()}>
                        {(() => {
                            const proofStr = typeof activeProofUrl === 'object' ? (activeProofUrl.url || '') : (activeProofUrl || '');
                            const vendorStatus = typeof activeProofUrl === 'object' ? activeProofUrl.status : null;
                            const isGateway = proofStr === 'via_payment_gateway' || proofStr.toLowerCase().includes('automatic payment');
                            const isPaid = vendorStatus === 'active';

                            return (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px', marginBottom: '20px' }}>
                                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#ffffff' }}>
                                            {isGateway ? '⚡ Rincian Pembayaran QRIS' : '🖼️ Bukti Pembayaran / Transfer'}
                                        </h3>
                                        <button onClick={() => setActiveProofUrl(null)} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}>&times; Tutup</button>
                                    </div>

                                    {isGateway ? (
                                        <div style={{
                                            background: 'rgba(255,255,255,0.02)',
                                            border: `1px solid ${isPaid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
                                            borderRadius: '12px',
                                            padding: '20px',
                                            marginBottom: '20px'
                                        }}>
                                            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                                                <div style={{ fontSize: '32px', marginBottom: '8px' }}>{isPaid ? '✅' : '⏳'}</div>
                                                <h4 style={{ margin: '0 0 4px 0', color: isPaid ? '#34d399' : '#fbbf24', fontSize: '16px', fontWeight: '700' }}>
                                                    {isPaid ? 'Rincian Pembayaran QRIS Lunas' : 'Menunggu Pembayaran QRIS'}
                                                </h4>
                                                <p style={{ margin: 0, fontSize: '12px', color: '#a1a1aa' }}>
                                                    {isPaid 
                                                        ? 'Transaksi ini telah diverifikasi & dilunasi secara otomatis via QRIS. Akun vendor aktif instan.'
                                                        : 'Vendor memilih pembayaran via QRIS. Menunggu transaksi diselesaikan oleh vendor.'}
                                                </p>
                                            </div>

                                            <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '16px', fontSize: '13px', color: '#e4e4e7' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px dashed rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                                                    <span style={{ color: '#a1a1aa' }}>• Vendor:</span>
                                                    <strong style={{ color: '#ffffff' }}>{activeProofUrl.name || 'Vendor'} ({activeProofUrl.email || '–'})</strong>
                                                </div>
                                                {activeProofUrl.orderId && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                        <span style={{ color: '#a1a1aa' }}>• No. Order / Invoice:</span>
                                                        <strong style={{ color: '#818cf8', fontFamily: 'monospace' }}>{activeProofUrl.orderId}</strong>
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                    <span style={{ color: '#a1a1aa' }}>• Metode Pembayaran:</span>
                                                    <strong style={{ color: '#38bdf8' }}>QRIS Otomatis</strong>
                                                </div>
                                                {activeProofUrl.planName && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                        <span style={{ color: '#a1a1aa' }}>• Paket Utama:</span>
                                                        <strong style={{ color: '#fbbf24' }}>{activeProofUrl.planName}</strong>
                                                    </div>
                                                )}
                                                {activeProofUrl.addonPlanId && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                        <span style={{ color: '#a1a1aa' }}>• Storage Add-On:</span>
                                                        <strong style={{ color: '#38bdf8' }}>
                                                            {activeProofUrl.addonPlanId === 'addon-10gb' ? 'Drive 10 GB Extra (+10 GB)' : activeProofUrl.addonPlanId === 'addon-25gb' ? 'Drive 25 GB Extra (+25 GB)' : 'Drive 50 GB Extra (+50 GB)'}
                                                        </strong>
                                                    </div>
                                                )}
                                                {activeProofUrl.amount > 0 && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                                                        <span style={{ color: '#a1a1aa' }}>• Total Dibayar:</span>
                                                        <strong style={{ color: '#fbbf24', fontSize: '14px' }}>Rp {Number(activeProofUrl.amount).toLocaleString('id-ID')}</strong>
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                                                    <span style={{ color: '#a1a1aa' }}>• Status Verifikasi:</span>
                                                    <span style={{ color: isPaid ? '#34d399' : '#fbbf24', fontWeight: 'bold' }}>
                                                        {isPaid ? '🟢 LUNAS / SETTLEMENT (AUTOMATIC)' : '⏳ MENUNGGU PEMBAYARAN'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (!proofStr.match(/\.(jpg|jpeg|png|webp)($|\?)/i) && !proofStr.startsWith('/')) ? (
                                        <div style={{ background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.25)', borderRadius: '12px', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '32px', marginBottom: '10px' }}>ℹ️</div>
                                            <h4 style={{ margin: '0 0 6px 0', color: '#fbbf24', fontSize: '16px', fontWeight: '700' }}>Info Pembayaran</h4>
                                            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#a1a1aa' }}>{proofStr}</p>
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                            <img src={`/api/admin/proofs/${proofStr.split('/').pop()}`} alt="Bukti Transfer" style={{ maxWidth: '100%', maxHeight: '55vh', objectFit: 'contain', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }} />
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <button onClick={() => setActiveProofUrl(null)} className="btn-secondary">Tutup</button>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}


            {/* Toasts */}
            <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '380px', width: '100%', pointerEvents: 'none' }}>
                {toasts.map(t => (
                    <div key={t.id} style={{ background: t.type === 'success' ? 'rgba(16,185,129,0.9)' : 'rgba(239,68,68,0.9)', backdropFilter: 'blur(12px)', padding: '12px 18px', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: '500', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', pointerEvents: 'auto' }}>
                        {t.message}
                    </div>
                ))}
            </div>
        </div>
    );
}
