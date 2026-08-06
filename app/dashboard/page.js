"use client";

import { useState, useEffect, useCallback } from 'react';
import RawSorterDrawer from '@/components/RawSorterDrawer';

// Live countdown component — ticks every second
function CountdownTimer({ expiresAt }) {
    const calcRemaining = useCallback(() => {
        if (!expiresAt) return null;
        const diff = new Date(expiresAt).getTime() - Date.now();
        if (diff <= 0) return { expired: true };
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        return { days, hours, minutes, seconds, expired: false };
    }, [expiresAt]);

    const [remaining, setRemaining] = useState(calcRemaining);

    useEffect(() => {
        if (!expiresAt) return;
        const timer = setInterval(() => setRemaining(calcRemaining()), 1000);
        return () => clearInterval(timer);
    }, [expiresAt, calcRemaining]);

    if (!remaining || !expiresAt) return <span style={{ fontSize: '11px', color: '#71717a' }}>No Expiry</span>;
    if (remaining.expired) return <span style={{ fontSize: '11px', color: '#f87171', fontWeight: '600' }}>⏰ Expired</span>;

    // Color shifts: green > yellow > red based on urgency
    const totalHours = remaining.days * 24 + remaining.hours;
    const color = totalHours < 6 ? '#f87171' : totalHours < 24 ? '#fbbf24' : '#34d399';
    const bgColor = totalHours < 6 ? 'rgba(239,68,68,0.1)' : totalHours < 24 ? 'rgba(251,191,36,0.1)' : 'rgba(52,211,153,0.08)';
    const borderColor = totalHours < 6 ? 'rgba(239,68,68,0.2)' : totalHours < 24 ? 'rgba(251,191,36,0.2)' : 'rgba(52,211,153,0.15)';

    const pad = (n) => String(n).padStart(2, '0');
    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: bgColor, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '4px 10px', fontSize: '12px', color, fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ fontSize: '13px' }}>⏱</span>
            {remaining.days > 0 && <span>{remaining.days}d</span>}
            <span>{pad(remaining.hours)}:{pad(remaining.minutes)}:{pad(remaining.seconds)}</span>
        </div>
    );
}

const normalizeWhatsappNumber = (rawNumber) => {
    if (!rawNumber) return '';
    let cleaned = rawNumber.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.slice(1);
    }
    if (!cleaned.startsWith('62')) {
        cleaned = '62' + cleaned;
    }
    return cleaned;
};



export default function DashboardPage() {
    const [projects, setProjects] = useState([]);
    const [vendorDetails, setVendorDetails] = useState(null);
    const [loading, setLoading] = useState(true);

    // Toast notification state
    const [toasts, setToasts] = useState([]);
    const addToast = useCallback((message, type = 'info', duration = 5000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type, duration }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newFolderUrl, setNewFolderUrl] = useState('');
    const [maxSelection, setMaxSelection] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [galleryTheme, setGalleryTheme] = useState('default');
    const [showCreateThemePicker, setShowCreateThemePicker] = useState(false);

    // Edit project settings states
    const [editingProject, setEditingProject] = useState(null);
    const [editProjectName, setEditProjectName] = useState('');
    const [editProjectGalleryTheme, setEditProjectGalleryTheme] = useState('default');
    const [showEditThemePicker, setShowEditThemePicker] = useState(false);
    const [savingProjectSettings, setSavingProjectSettings] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importError, setImportError] = useState('');
    const [pendingProjectParams, setPendingProjectParams] = useState(null);
    const [limitExceededInfo, setLimitExceededInfo] = useState(null);
    const [showLimitConfirmModal, setShowLimitConfirmModal] = useState(false);





    // Detail modal states
    const [selectedProjectDetails, setSelectedProjectDetails] = useState(null);
    const [detailPhotos, setDetailPhotos] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Tab & View Control states
    const [activeTab, setActiveTab] = useState('ongoing'); // 'ongoing' | 'completed' | 'failed'
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'name_asc' | 'name_desc' | 'progress_desc' | 'progress_asc'

    // Branding & Copy Preference modal states
    const [showBrandingModal, setShowBrandingModal] = useState(false);
    const [vendorName, setVendorName] = useState('');
    const [brandName, setBrandName] = useState('');
    const [brandLogoFile, setBrandLogoFile] = useState(null);
    const [brandLogoPreview, setBrandLogoPreview] = useState('');
    const [copyDelimiter, setCopyDelimiter] = useState(', ');
    const [copyIncludeExt, setCopyIncludeExt] = useState(0);
    const [copySortOrder, setCopySortOrder] = useState('name_asc');
    const [savingBranding, setSavingBranding] = useState(false);

    // Upgrade plan & WA admin states
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [upgradeTab, setUpgradeTab] = useState('limit');
    const [availablePlans, setAvailablePlans] = useState([]);
    const [availableAddonPlans, setAvailableAddonPlans] = useState([]);
    const [adminWhatsapp, setAdminWhatsapp] = useState('');
    const [selectedUpgradePlan, setSelectedUpgradePlan] = useState(null);
    const [transferProofFile, setTransferProofFile] = useState(null);
    const [isSubmittingUpgrade, setIsSubmittingUpgrade] = useState(false);
    const [upgradeError, setUpgradeError] = useState('');
    const [bankSettings, setBankSettings] = useState(null);
    const [enablePaymentGateway, setEnablePaymentGateway] = useState(false);
    const [paymentGatewayClientKey, setPaymentGatewayClientKey] = useState('');
    const [paymentGatewayIsProduction, setPaymentGatewayIsProduction] = useState(false);
    const [upgradePaymentMethod, setUpgradePaymentMethod] = useState('gateway');


    // Project deletion states
    const [projectToDelete, setProjectToDelete] = useState(null);
    const [deletingProject, setDeletingProject] = useState(false);

    // Project archive confirmation states
    const [projectToArchive, setProjectToArchive] = useState(null);
    const [archivingProject, setArchivingProject] = useState(false);

    // RAW Sorter drawer states
    const [showSorter, setShowSorter] = useState(false);
    const [sorterProject, setSorterProject] = useState(null);

    // Add limit states
    const [addLimitProject, setAddLimitProject] = useState(null);
    const [additionalCount, setAdditionalCount] = useState(5);
    const [savingAddLimit, setSavingAddLimit] = useState(false);

    const getProrationDetails = (targetPlan) => {
        if (!vendorDetails || !targetPlan) return { discount: 0, total: targetPlan?.price || 0, daysRemaining: 0, isDowngrade: false };
        const currentPrice = vendorDetails.planPrice || 0;
        const currentDays = 30; // 30-day standard billing cycle duration
        const expiresAt = vendorDetails.expiresAt;

        // If the target plan is cheaper or same price as current plan, it is a downgrade/sidegrade: no proration discount
        if (targetPlan.price <= currentPrice) {
            return { discount: 0, total: targetPlan.price, daysRemaining: 0, isDowngrade: true };
        }

        if (currentPrice === 0 || !expiresAt) {
            return { discount: 0, total: targetPlan.price, daysRemaining: 0, isDowngrade: false };
        }

        const expires = new Date(expiresAt);
        const now = new Date();
        const diffTime = expires.getTime() - now.getTime();
        const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        if (diffDays <= 0) {
            return { discount: 0, total: targetPlan.price, daysRemaining: 0, isDowngrade: false };
        }

        // Tiered Proration Factor:
        // 1.0 (100%) for upgrading to highest tier plan (upsell promo)
        // 0.85 (85%) if used <= 7 days (early upgrade bonus)
        // 0.70 (70%) if used > 7 days (standard retention)
        const maxPrice = availablePlans.length > 0 ? Math.max(...availablePlans.map(p => p.price)) : 0;
        const isTopTier = targetPlan.price >= maxPrice && maxPrice > 0;
        const daysUsed = Math.max(0, currentDays - diffDays);

        let factor = 0.70;
        if (isTopTier) {
            factor = 1.0;
        } else if (daysUsed <= 7) {
            factor = 0.85;
        }

        const rawDiscount = (currentPrice / currentDays) * diffDays;
        const discount = Math.round(rawDiscount * factor);
        const total = Math.max(0, targetPlan.price - discount);

        return {
            discount,
            total,
            daysRemaining: diffDays,
            isDowngrade: false
        };
    };

    // Fetch projects
    const fetchProjects = async () => {
        const safetyTimer = setTimeout(() => {
            setLoading(false);
        }, 600);

        try {
            const res = await fetch('/api/projects', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setProjects(data.projects || []);
                if (data.vendor) {
                    setVendorDetails(data.vendor);
                    setVendorName(data.vendor.name || '');
                    setBrandName(data.vendor.brandName || '');
                    setBrandLogoPreview(data.vendor.brandLogo || '');
                    if (data.vendor.copyDelimiter !== undefined) setCopyDelimiter(data.vendor.copyDelimiter);
                    if (data.vendor.copyIncludeExt !== undefined) setCopyIncludeExt(data.vendor.copyIncludeExt);
                    if (data.vendor.copySortOrder !== undefined) setCopySortOrder(data.vendor.copySortOrder);



                }
            } else {
                console.warn('fetchProjects: response not ok', res.status);
            }
        } catch (err) {
            console.error('Error fetching projects:', err);
        } finally {
            clearTimeout(safetyTimer);
            setLoading(false);
        }
    };


    useEffect(() => {
        // Parallelkan semua fetch awal agar tidak sequential
        fetchProjects();
        Promise.all([
            fetch('/api/settings').then(r => r.json()).catch(() => ({})),
            fetch('/api/plans').then(r => r.json()).catch(() => ({})),
            fetch('/api/addon-plans').then(r => r.json()).catch(() => ({}))
        ]).then(([s, p, addonRes]) => {
            setAdminWhatsapp(s.contact_whatsapp || '');
            setBankSettings({
                bankName: s.bank_name || '',
                bankAccountNumber: s.bank_account_number || '',
                bankAccountName: s.bank_account_name || ''
            });
            const isGw = s.enable_payment_gateway === '1' || s.enable_payment_gateway === 'true';
            setEnablePaymentGateway(isGw);
            setPaymentGatewayClientKey(s.payment_gateway_client_key || '');
            setPaymentGatewayIsProduction(s.payment_gateway_is_production === '1');
            if (isGw) {
                setUpgradePaymentMethod('gateway');
            } else {
                setUpgradePaymentMethod('manual');
            }
            const plansList = Array.isArray(p) ? p : (p?.plans || []);
            setAvailablePlans(plansList);
            if (addonRes?.success && Array.isArray(addonRes.plans)) {
                setAvailableAddonPlans(addonRes.plans);
            }
        });
    }, []);

    // Dynamically inject Midtrans Snap script if Payment Gateway is enabled
    useEffect(() => {
        if (enablePaymentGateway && paymentGatewayClientKey && typeof window !== 'undefined') {
            const snapUrl = paymentGatewayIsProduction
                ? 'https://app.midtrans.com/snap/snap.js'
                : 'https://app.sandbox.midtrans.com/snap/snap.js';

            if (!document.querySelector(`script[src="${snapUrl}"]`)) {
                const script = document.createElement('script');
                script.src = snapUrl;
                script.setAttribute('data-client-key', paymentGatewayClientKey);
                script.async = true;
                document.body.appendChild(script);
            }
        }
    }, [enablePaymentGateway, paymentGatewayClientKey, paymentGatewayIsProduction]);


    // Polling effect if any project has "importing" status
    useEffect(() => {
        const hasImporting = projects.some(p => p.status === 'importing');
        if (!hasImporting) return;

        const interval = setInterval(() => {
            fetchProjects();
        }, 4000); // Poll every 4 seconds

        return () => clearInterval(interval);
    }, [projects]);

    // Listen for openUpgradeModal event from RAW Sorter drawer
    useEffect(() => {
        const handler = () => setShowUpgradeModal(true);
        window.addEventListener('openUpgradeModal', handler);
        return () => window.removeEventListener('openUpgradeModal', handler);
    }, []);

    // Auto-polling background status check for importing projects
    useEffect(() => {
        const hasImporting = projects.some(p => p.status === 'importing');
        if (!hasImporting) return;

        const interval = setInterval(() => {
            fetchProjects();
        }, 3000);

        return () => clearInterval(interval);
    }, [projects]);

    // Create Project
    const handleCreateProject = async (e) => {
        e.preventDefault();
        setImporting(true);
        setImportError('');
 
        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newProjectName, folderUrl: newFolderUrl, maxSelection: parseInt(maxSelection) || 0, galleryTheme, clientPhone: clientPhone.trim() })
            });
 
            const data = await res.json();
 
            if (!res.ok) {
                if (data.limitExceeded) {
                    setPendingProjectParams({ name: newProjectName, folderUrl: newFolderUrl, maxSelection: parseInt(maxSelection) || 0, galleryTheme, clientPhone: clientPhone.trim() });
                    setLimitExceededInfo({ limit: data.limit, totalFiles: data.totalFiles });
                    setShowLimitConfirmModal(true);
                    return;
                }
                throw new Error(data.message || 'Failed to create project.');
            }
 
            // Reset & Close Modal Immediately!
            setNewProjectName('');
            setNewFolderUrl('');
            setMaxSelection(0);
            setClientPhone('');
            setGalleryTheme('contactSheet');
            setShowCreateModal(false);
            addToast('⚡ Project berhasil dibuat! Foto sedang diimpor di background.', 'success');
            fetchProjects();
        } catch (err) {
            setImportError(err.message);
        } finally {
            setImporting(false);
        }
    };
 
    const confirmAndCreateProject = async () => {
        if (!pendingProjectParams) return;
        setImporting(true);
        setImportError('');
        setShowLimitConfirmModal(false);

        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    ...pendingProjectParams, 
                    confirmLimitExceeded: true 
                })
            });
 
            const data = await res.json();
 
            if (!res.ok) {
                throw new Error(data.message || 'Failed to create project.');
            }
 
            // Reset
            setNewProjectName('');
            setNewFolderUrl('');
            setMaxSelection(0);
            setClientPhone('');
            setGalleryTheme('contactSheet');
            setShowCreateModal(false);
            setPendingProjectParams(null);
            setLimitExceededInfo(null);
            fetchProjects();
        } catch (err) {
            setImportError(err.message);
        } finally {
            setImporting(false);
        }
    };

    const handleOpenUpgradeModal = () => {
        setUpgradeTab(vendorDetails?.planType || 'limit');
        setShowUpgradeModal(true);
    };

    // Submit upgrade plan request with transfer proof file
    const handleUpgradeSubmit = async (e) => {
        e.preventDefault();
        if (!selectedUpgradePlan || !transferProofFile) return;

        setIsSubmittingUpgrade(true);
        setUpgradeError('');

        try {
            const formData = new FormData();
            formData.append('planId', selectedUpgradePlan.id);
            formData.append('transferProof', transferProofFile);

            const res = await fetch('/api/vendor/upgrade', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to submit upgrade request.');
            }

            addToast('Permintaan upgrade berhasil dikirim. Menunggu verifikasi admin.', 'success');
            setShowUpgradeModal(false);
            setSelectedUpgradePlan(null);
            setTransferProofFile(null);
            fetchProjects(); // Reload to capture the pending state
        } catch (err) {
            setUpgradeError(err.message);
        } finally {
            setIsSubmittingUpgrade(false);
        }
    };

    // Submit upgrade plan request via Payment Gateway (QRIS)
    const handleGatewayUpgrade = async () => {
        if (!selectedUpgradePlan || !vendorDetails?.id) return;
        setIsSubmittingUpgrade(true);
        setUpgradeError('');

        try {
            const proration = getProrationDetails(selectedUpgradePlan);
            const res = await fetch('/api/payment/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vendorId: vendorDetails.id,
                    planId: selectedUpgradePlan.id,
                    customAmount: proration.total
                })
            });

            const data = await res.json();
            if (!res.ok || !data.token) {
                throw new Error(data.message || 'Gagal memproses pembayaran gateway.');
            }

            let pollTimer = null;
            if (data.orderId) {
                pollTimer = setInterval(async () => {
                    try {
                        const stRes = await fetch(`/api/payment/status?orderId=${data.orderId}`);
                        const stData = await stRes.json();
                        if (stRes.ok && stData.paid) {
                            clearInterval(pollTimer);
                            setShowUpgradeModal(false);
                            setSelectedUpgradePlan(null);
                            addToast('🎉 Upgrade Plan Berhasil! Paket Anda telah diperbarui.', 'success');
                            fetchProjects();
                        }
                    } catch (e) {}
                }, 2500);
            }

            if (typeof window !== 'undefined' && window.snap) {
                window.snap.pay(data.token, {
                    onSuccess: function () {
                        if (pollTimer) clearInterval(pollTimer);
                        setShowUpgradeModal(false);
                        setSelectedUpgradePlan(null);
                        addToast('🎉 Upgrade Plan Berhasil! Paket Anda telah diperbarui.', 'success');
                        fetchProjects();
                    },
                    onPending: function () {
                        addToast('Menunggu konfirmasi pembayaran QRIS...', 'info');
                    },
                    onError: function () {
                        if (pollTimer) clearInterval(pollTimer);
                        setUpgradeError('Pembayaran gagal atau dibatalkan oleh pengguna.');
                    },
                    onClose: function () {
                        fetch(`/api/payment/status?orderId=${data.orderId}`)
                            .then(r => r.json())
                            .then(d => {
                                if (d.paid) {
                                    if (pollTimer) clearInterval(pollTimer);
                                    setShowUpgradeModal(false);
                                    setSelectedUpgradePlan(null);
                                    addToast('🎉 Upgrade Plan Berhasil! Paket Anda telah diperbarui.', 'success');
                                    fetchProjects();
                                }
                            }).catch(() => {});
                    }
                });
            } else if (data.redirectUrl) {
                window.location.href = data.redirectUrl;
            }
        } catch (err) {
            setUpgradeError(err.message);
        } finally {
            setIsSubmittingUpgrade(false);
        }
    };


    // Delete Project
    const handleDeleteProject = (id, name) => {
        setProjectToDelete({ id, name });
    };

    const confirmDeleteProject = async () => {
        if (!projectToDelete) return;
        setDeletingProject(true);
        try {
            const res = await fetch(`/api/projects/${projectToDelete.id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to delete project.');
            }
            addToast(`Project "${projectToDelete.name}" berhasil dihapus.`, 'success');
            setProjectToDelete(null);
            fetchProjects();
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setDeletingProject(false);
        }
    };

    // Add limit handlers
    const handleOpenAddLimit = (project) => {
        setAddLimitProject(project);
        setAdditionalCount(5);
    };

    const handleOpenEditProject = (project) => {
        setEditingProject(project);
        setEditProjectName(project.name);
        setEditProjectGalleryTheme(project.galleryTheme || 'contactSheet');
    };

    const handleSaveProjectSettings = async (e) => {
        e.preventDefault();
        if (!editingProject) return;
        setSavingProjectSettings(true);
        try {
            const res = await fetch(`/api/projects/${editingProject.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editProjectName,
                    galleryTheme: editProjectGalleryTheme
                })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to save project settings.');
            }
            addToast('Pengaturan project berhasil disimpan!', 'success');
            setEditingProject(null);
            fetchProjects();
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setSavingProjectSettings(false);
        }
    };

    const handleSaveAddLimit = async (e) => {
        e.preventDefault();
        if (!addLimitProject) return;
        setSavingAddLimit(true);
        try {
            const currentMax = addLimitProject.maxSelection || 0;
            const newMax = currentMax + (parseInt(additionalCount) || 0);

            const res = await fetch(`/api/projects/${addLimitProject.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    maxSelection: newMax,
                    status: 'pending_selection' // automatically unlock the project as well
                })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to add limit.');
            }
            addToast(`Limit berhasil ditambah! Batas baru: ${newMax} foto. Galeri klien otomatis dibuka.`, 'success');
            setAddLimitProject(null);
            fetchProjects();
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setSavingAddLimit(false);
        }
    };

    const handleReactivateProject = async (projectId) => {
        try {
            const res = await fetch(`/api/projects/${projectId}/reactivate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Gagal mengaktifkan kembali galeri.');
            }
            addToast(data.message || 'Galeri berhasil diaktifkan kembali!', 'success');
            fetchProjects();
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    const handleReactivateAllProjects = async () => {
        try {
            const res = await fetch('/api/projects/reactivate-all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Gagal mengaktifkan kembali semua galeri.');
            }
            addToast(data.message || 'Semua galeri terarsip berhasil diaktifkan kembali!', 'success');
            fetchProjects();
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    const handleCopyGalleryLink = (project) => {
        const origin = window.location.origin;
        const link = `${origin}/gallery/${project.id}`;
        navigator.clipboard.writeText(link).then(() => {
            addToast('Link galeri klien berhasil disalin ke clipboard!', 'success');
        }).catch(() => {
            addToast('Gagal menyalin link.', 'error');
        });
    };


    const handleUpdateProjectStatus = async (projectId, status, actionLabel) => {

        if (status === 'archived') {
            const proj = projects.find(p => p.id === projectId);
            setProjectToArchive({ ...proj, actionLabel });
            return;
        }
        await executeStatusUpdate(projectId, status, actionLabel);
    };

    const executeStatusUpdate = async (projectId, status, actionLabel) => {
        try {
            const res = await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to update status.');
            }
            addToast(`Project berhasil ${actionLabel}!`, 'success');
            fetchProjects();
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    const confirmArchiveProject = async () => {
        if (!projectToArchive) return;
        setArchivingProject(true);
        try {
            await executeStatusUpdate(projectToArchive.id, 'archived', projectToArchive.actionLabel);
            setProjectToArchive(null);
        } catch (err) {
            // error logged inside helper
        } finally {
            setArchivingProject(false);
        }
    };

    // Retry GDrive Import
    const handleRetryImport = async (projectId) => {
        try {
            const res = await fetch(`/api/projects/${projectId}/retry`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to retry import.');
            }
            addToast('Proses impor ulang berhasil dijalankan kembali!', 'success');
            fetchProjects();
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    // Copy Client Gallery Link
    const handleCopyLink = (projectId, accessKey) => {
        const link = `${window.location.origin}/gallery/${projectId}?key=${accessKey}`;
        
        // Try modern clipboard API first, fallback to textarea method
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(link)
                .then(() => addToast('✅ Link klien berhasil disalin!', 'success'))
                .catch(() => fallbackCopyToClipboard(link));
        } else {
            fallbackCopyToClipboard(link);
        }
    };

    // Open Gallery Page in New Tab
    const handleOpenGallery = (project) => {
        if (!project || !project.clientAccessKey) {
            addToast('Link galeri tidak ditemukan.', 'warning');
            return;
        }
        window.open(`/gallery/${project.id}?key=${project.clientAccessKey}`, '_blank');
    };

    // Send Gallery Link via WhatsApp
    const handleSendWhatsApp = (project) => {
        const link = `${window.location.origin}/gallery/${project.id}?key=${project.clientAccessKey}`;
        const phone = (project.clientPhone || '').replace(/\D/g, '');
        const message = `Halo! Berikut link galeri foto *${project.name}* untuk Anda:\n\n${link}\n\nSilakan pilih foto favorit Anda melalui link di atas. Terima kasih! 📸`;
        const waUrl = phone 
            ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
            : `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
    };

    // Fallback clipboard copy using textarea
    const fallbackCopyToClipboard = (text) => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
            document.execCommand('copy');
            addToast('✅ Link klien berhasil disalin!', 'success');
        } catch {
            prompt('Salin link ini secara manual:', text);
        }
        document.body.removeChild(textarea);
    };

    // View Project Details
    const handleViewDetails = async (project) => {
        setSelectedProjectDetails(project);
        setLoadingDetails(true);
        setDetailPhotos([]);

        try {
            const res = await fetch(`/api/projects/${project.id}`);
            if (res.ok) {
                const data = await res.json();
                const allPhotos = data.photos || [];
                // Only show photos that the client has actually selected
                const selectedOnly = allPhotos.filter(p => p.isSelected > 0);
                setDetailPhotos(selectedOnly);
                // Update project with latest filesDeleted flag from API
                if (data.project) {
                    setSelectedProjectDetails(prev => ({ ...prev, filesDeleted: data.project.filesDeleted }));
                }
            }
        } catch (err) {
            console.error('Error fetching details:', err);
        } finally {
            setLoadingDetails(false);
        }
    };

    // Save branding settings
    const handleSaveBranding = async (e) => {
        e.preventDefault();
        setSavingBranding(true);
        try {
            const fd = new FormData();
            fd.append('name', vendorName);
            fd.append('brandName', brandName);
            fd.append('copyDelimiter', copyDelimiter);
            fd.append('copyIncludeExt', copyIncludeExt.toString());
            fd.append('copySortOrder', copySortOrder);
            if (brandLogoFile) {
                fd.append('logo', brandLogoFile);
            }
            const res = await fetch('/api/vendor/profile', {
                method: 'PUT',
                body: fd
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to update branding settings.');
            addToast('Branding settings updated successfully!', 'success');
            setShowBrandingModal(false);
            fetchProjects();
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setSavingBranding(false);
        }
    };




    // Helper to copy text to clipboard
    const copyToClipboard = (text, successMsg) => {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text)
                .then(() => addToast(successMsg, 'success'))
                .catch(() => {
                    const textarea = document.createElement('textarea');
                    textarea.value = text;
                    textarea.style.position = 'fixed';
                    textarea.style.left = '-9999px';
                    document.body.appendChild(textarea);
                    textarea.focus();
                    textarea.select();
                    try { document.execCommand('copy'); addToast(successMsg, 'success'); } catch { prompt('Salin secara manual:', text); }
                    document.body.removeChild(textarea);
                });
        } else {
            prompt('Salin nama file berikut secara manual:', text);
        }
    };

    // Copy filenames with custom or default vendor preferences
    const handleCopyFilenames = async (projectId, customConfig = null) => {
        try {
            const res = await fetch(`/api/projects/${projectId}`);
            if (!res.ok) throw new Error('Gagal mengambil data project.');
            const data = await res.json();
            const photos = data.photos || [];

            let selected = photos.filter(p => p.isSelected > 0);
            if (selected.length === 0) {
                addToast('Klien belum memilih foto.', 'warning');
                return;
            }

            // Determine settings to use (customConfig > vendor preferences)
            let delimiter = copyDelimiter;
            let includeExt = copyIncludeExt;
            let sortOrder = copySortOrder;

            if (typeof customConfig === 'string') {
                if (customConfig === 'finder') {
                    delimiter = '\n';
                    includeExt = 1;
                    sortOrder = 'name_asc';
                } else {
                    delimiter = ', ';
                    includeExt = 0;
                    sortOrder = 'name_asc';
                }
            } else if (customConfig && typeof customConfig === 'object') {
                if (customConfig.delimiter !== undefined) delimiter = customConfig.delimiter;
                if (customConfig.includeExt !== undefined) includeExt = customConfig.includeExt;
                if (customConfig.sortOrder !== undefined) sortOrder = customConfig.sortOrder;
            }

            // Sort items
            if (sortOrder === 'name_asc') {
                selected.sort((a, b) => {
                    const nameA = decodeURIComponent(a.originalPath.split('/').pop().split('?')[0]);
                    const nameB = decodeURIComponent(b.originalPath.split('/').pop().split('?')[0]);
                    return nameA.localeCompare(nameB);
                });
            }

            // Extract filenames based on extension setting
            const filenames = selected.map(p => {
                const fullname = decodeURIComponent(p.originalPath.split('/').pop().split('?')[0]);
                if (includeExt === 1) return fullname;
                const dotIdx = fullname.lastIndexOf('.');
                return dotIdx !== -1 ? fullname.substring(0, dotIdx) : fullname;
            });

            const listString = filenames.join(delimiter);
            copyToClipboard(listString, `✅ ${selected.length} nama file berhasil disalin ke clipboard!`);
        } catch (err) {
            addToast('❌ ' + err.message, 'error');
        }
    };

    return (
        <div className="app-container">
            {vendorDetails && vendorDetails.isExpired && (
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '16px 20px', borderRadius: '12px', marginBottom: '24px', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', lineHeight: '1.5' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '20px' }}>⚠️</span>
                        <div>
                            <strong>Masa Aktif Paket Berlangganan Habis!</strong> Paket <strong>{vendorDetails.planName} Plan</strong> Anda telah berakhir pada {new Date(vendorDetails.expiresAt).toLocaleDateString()}. Fungsionalitas pembuatan project baru dan akses galeri klien dinonaktifkan sementara.
                        </div>
                    </div>
                    {vendorDetails.planPrice > 0 && (
                        <button 
                            onClick={handleOpenUpgradeModal} 
                            className="btn-primary" 
                            style={{ background: '#f87171', border: 'none', color: '#000', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap', cursor: 'pointer' }}
                        >
                            🔄 Perpanjang Sekarang
                        </button>
                    )}
                </div>
            )}

            {vendorDetails && vendorDetails.upgradeRequest && (
                <div style={{ background: 'rgba(251, 191, 36, 0.15)', border: '1px solid rgba(251, 191, 36, 0.3)', color: '#fbbf24', padding: '16px 20px', borderRadius: '12px', marginBottom: '24px', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', lineHeight: '1.5' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '20px' }}>⏳</span>
                        <div>
                            <strong>Upgrade/Renewal Plan need confirmation!</strong> Permintaan Anda untuk paket <strong>{vendorDetails.upgradeRequest.planName}</strong> dengan biaya <strong>Rp {Number(vendorDetails.upgradeRequest.proratedPrice).toLocaleString('id-ID')}</strong> telah diajukan dan sedang menunggu verifikasi superadmin.
                        </div>
                    </div>
                    {adminWhatsapp && (
                        <a
                            href={`https://wa.me/${normalizeWhatsappNumber(adminWhatsapp)}?text=${encodeURIComponent(`Halo Admin, saya vendor ${vendorDetails.name}. Saya sudah mengupload bukti transfer pembayaran upgrade ke paket ${vendorDetails.upgradeRequest.planName} sebesar Rp ${Number(vendorDetails.upgradeRequest.proratedPrice).toLocaleString('id-ID')}. Mohon bantuannya untuk melakukan konfirmasi. Terima kasih!`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary"
                            style={{ background: '#fbbf24', border: 'none', color: '#000', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap', textDecoration: 'none', cursor: 'pointer' }}
                        >
                            💬 Hubungi Admin via WA
                        </a>
                    )}
                </div>
            )}

            <div className="dashboard-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '16px', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>Dashboard</h1>
                    <p style={{ color: '#a1a1aa', margin: '4px 0 0 0', fontSize: '13px' }}>
                        Kelola project seleksi foto klien
                        {vendorDetails && (
                            <span> — Paket: <strong>{vendorDetails.planName || 'Basic'} Plan</strong> (Masa aktif s/d: {vendorDetails.expiresAt ? new Date(vendorDetails.expiresAt).toLocaleDateString() : 'Lifetime'})</span>
                        )}
                    </p>
                </div>
                <div className="dashboard-header-actions" style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                    {adminWhatsapp && (
                        <a
                            href={`https://wa.me/${normalizeWhatsappNumber(adminWhatsapp)}?text=${encodeURIComponent('Halo Admin, saya vendor ' + (vendorDetails?.name || '') + '. Saya ingin bertanya mengenai layanan Pick Your Photo.')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Hubungi Admin via WhatsApp"
                            style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)', background: 'rgba(52,211,153,0.06)', borderRadius: '8px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                            💬 <span>WA Admin</span>
                        </a>
                    )}
                    <button
                        onClick={handleOpenUpgradeModal}
                        title="Lihat & Upgrade Plan"
                        style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '5px', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.06)', borderRadius: '8px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                        🚀 <span>Upgrade</span>
                    </button>
                    <button
                        onClick={() => setShowBrandingModal(true)}
                        title="Pengaturan Brand"
                        style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '5px', color: '#a1a1aa', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                        ⚙️ <span>Brand</span>
                    </button>
                </div>
            </div>

            {/* ── PLAN INFO CARDS ── */}
            {vendorDetails && (
                <div className="dashboard-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>

                    <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '12px', padding: '14px 18px' }}>
                        <p style={{ margin: 0, fontSize: '11px', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Kuota Project Aktif</p>
                        <p style={{ margin: '6px 0 0 0', fontSize: '22px', fontWeight: '700', color: '#e4e4e7' }}>
                            {projects.length} <span style={{ fontSize: '14px', color: '#71717a', fontWeight: '400' }}>/ {vendorDetails.maxProjects || '∞'} Project</span>
                        </p>
                    </div>
                    <div style={{ background: vendorDetails.storageQuotaGb ? 'rgba(52,211,153,0.06)' : 'rgba(251,191,36,0.06)', border: `1px solid ${vendorDetails.storageQuotaGb ? 'rgba(52,211,153,0.15)' : 'rgba(251,191,36,0.15)'}`, borderRadius: '12px', padding: '14px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ margin: 0, fontSize: '11px', color: vendorDetails.storageQuotaGb ? '#34d399' : '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
                                {vendorDetails.storageQuotaGb ? 'Sisa Cloud Storage' : 'Status Server Storage'}
                            </p>
                            <p style={{ margin: '6px 0 0 0', fontSize: '18px', fontWeight: '700', color: vendorDetails.storageQuotaGb ? '#e4e4e7' : '#34d399' }}>
                                {vendorDetails.storageQuotaGb 
                                    ? `${Math.max(0, (vendorDetails.storageQuotaGb - ((vendorDetails.storageUsedMb || 0) / 1024))).toFixed(1)} GB`
                                    : 'Zero-Storage ⚡'
                                }
                                <span style={{ fontSize: '12px', color: '#71717a', fontWeight: '400', marginLeft: '6px' }}>
                                    {vendorDetails.storageQuotaGb 
                                        ? `/ ${vendorDetails.storageQuotaGb} GB`
                                        : '(0 Byte Server)'
                                    }
                                </span>
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                setUpgradeTab('storage');
                                setShowUpgradeModal(true);
                            }}
                            style={{
                                marginTop: '10px',
                                background: 'transparent',
                                border: 'none',
                                color: vendorDetails.storageQuotaGb ? '#34d399' : '#fbbf24',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                padding: 0,
                                textAlign: 'left',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            ➕ Beli / Kelola Add-On Storage &rarr;
                        </button>
                    </div>
                    <div style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: '12px', padding: '14px 18px' }}>
                        <p style={{ margin: 0, fontSize: '11px', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Masa Aktif Akun</p>
                        <p style={{ margin: '6px 0 0 0', fontSize: '18px', fontWeight: '700', color: '#e4e4e7' }}>
                            {vendorDetails.expiresAt 
                                ? new Date(vendorDetails.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                : 'Aktif'
                            }
                        </p>
                    </div>
                </div>
            )}

            {/* ── PROJECT CATEGORY TABS & ACTION BAR ── */}
            {(() => {
                const ongoingProjects = projects.filter(p => p.status !== 'completed' && p.status !== 'failed');
                const completedProjects = projects.filter(p => p.status === 'completed');
                const failedProjects = projects.filter(p => p.status === 'failed');

                const currentTabProjects = activeTab === 'completed' ? completedProjects :
                                          activeTab === 'failed' ? failedProjects :
                                          ongoingProjects;

                // Apply Search Filter
                const searchFilteredProjects = currentTabProjects.filter(p =>
                    p.name.toLowerCase().includes(searchQuery.toLowerCase())
                );

                // Apply Sorting
                const sortedProjects = [...searchFilteredProjects].sort((a, b) => {
                    if (sortBy === 'oldest') {
                        return new Date(a.createdAt) - new Date(b.createdAt);
                    } else if (sortBy === 'name_asc') {
                        return a.name.localeCompare(b.name);
                    } else if (sortBy === 'name_desc') {
                        return b.name.localeCompare(a.name);
                    } else if (sortBy === 'progress_desc') {
                        return (b.selectedPhotosCount || 0) - (a.selectedPhotosCount || 0);
                    } else if (sortBy === 'progress_asc') {
                        return (a.selectedPhotosCount || 0) - (b.selectedPhotosCount || 0);
                    }
                    // Default 'newest'
                    return new Date(b.createdAt) - new Date(a.createdAt);
                });

                const isProjectLimitReached = vendorDetails?.maxProjects > 0 && projects.length >= vendorDetails.maxProjects;

                return (
                    <>
                        {/* Bulk Reactivate Banner if there are archived projects & vendor subscription is active */}
                        {projects.some(p => p.status === 'archived') && !vendorDetails?.isExpired && (
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.06))',
                                border: '1px solid rgba(16,185,129,0.3)',
                                borderRadius: '12px',
                                padding: '16px 20px',
                                marginBottom: '20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '12px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '24px' }}>⚡</span>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#34d399' }}>
                                            Terdapat {projects.filter(p => p.status === 'archived').length} Galeri Terarsip
                                        </h4>
                                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#a1a1aa' }}>
                                            Akun langganan Anda aktif. Aktifkan kembali seluruh galeri terarsip secara instan selama 30 hari.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleReactivateAllProjects}
                                    className="btn-primary"
                                    style={{
                                        padding: '9px 18px',
                                        fontSize: '13px',
                                        fontWeight: '700',
                                        background: 'linear-gradient(135deg, #10b981, #059669)',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ⚡ Aktifkan Semua Galeri Terarsip
                                </button>
                            </div>
                        )}

                        {/* ── UNIFIED ULTRA-MINIMALIST CONTROL BAR ── */}
                        <div className="dashboard-control-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>

                            {/* Left: Sleek Segmented Pill Tabs */}
                            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', gap: '4px' }}>
                                <button
                                    onClick={() => setActiveTab('ongoing')}
                                    style={{
                                        padding: '7px 14px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        background: activeTab === 'ongoing' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                                        color: activeTab === 'ongoing' ? '#ffffff' : '#a1a1aa',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: activeTab === 'ongoing' ? '0 2px 8px rgba(99,102,241,0.3)' : 'none'
                                    }}
                                >
                                    <span>📂 Berlangsung</span>
                                    <span style={{ background: activeTab === 'ongoing' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '10px' }}>
                                        {ongoingProjects.length}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setActiveTab('completed')}
                                    style={{
                                        padding: '7px 14px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        background: activeTab === 'completed' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
                                        color: activeTab === 'completed' ? '#ffffff' : '#a1a1aa',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: activeTab === 'completed' ? '0 2px 8px rgba(16,185,129,0.3)' : 'none'
                                    }}
                                >
                                    <span>✅ Selesai</span>
                                    <span style={{ background: activeTab === 'completed' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '10px' }}>
                                        {completedProjects.length}
                                    </span>
                                </button>

                                {failedProjects.length > 0 && (
                                    <button
                                        onClick={() => setActiveTab('failed')}
                                        style={{
                                            padding: '7px 14px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            background: activeTab === 'failed' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'transparent',
                                            color: activeTab === 'failed' ? '#ffffff' : '#a1a1aa',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <span>❌ Gagal</span>
                                        <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '10px' }}>
                                            {failedProjects.length}
                                        </span>
                                    </button>
                                )}
                            </div>

                            {/* Right Controls: Search, Sort, View Mode & Create Button */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                {/* Search Box */}
                                <div style={{ position: 'relative', width: '180px' }}>
                                    <input
                                        type="text"
                                        placeholder="🔍 Cari..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '7px 24px 7px 10px',
                                            fontSize: '12px',
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '8px',
                                            color: '#f4f4f5',
                                            outline: 'none'
                                        }}
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: '11px' }}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                {/* Sort Dropdown */}
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    style={{
                                        padding: '7px 10px',
                                        fontSize: '12px',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '8px',
                                        color: '#e4e4e7',
                                        cursor: 'pointer',
                                        outline: 'none'
                                    }}
                                >
                                    <option value="newest">🗓️ Terbaru</option>
                                    <option value="oldest">🗓️ Terlama</option>
                                    <option value="name_asc">🔤 Nama A-Z</option>
                                    <option value="name_desc">🔤 Nama Z-A</option>
                                    <option value="progress_desc">📊 Seleksi Terbanyak</option>
                                    <option value="progress_asc">⏳ Menunggu Seleksi</option>
                                </select>

                                {/* View Mode Toggle */}
                                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '2px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        title="Grid View"
                                        style={{
                                            padding: '4px 8px',
                                            fontSize: '11px',
                                            background: viewMode === 'grid' ? 'rgba(255,255,255,0.1)' : 'transparent',
                                            color: viewMode === 'grid' ? '#ffffff' : '#a1a1aa',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        🔲
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        title="List View"
                                        style={{
                                            padding: '4px 8px',
                                            fontSize: '11px',
                                            background: viewMode === 'list' ? 'rgba(255,255,255,0.1)' : 'transparent',
                                            color: viewMode === 'list' ? '#ffffff' : '#a1a1aa',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ☰
                                    </button>
                                </div>

                                {/* Create Project Button */}
                                <button
                                    onClick={() => {
                                        if (vendorDetails?.isExpired) {
                                            addToast('Masa aktif paket berlangganan Anda telah habis.', 'warning', 6000);
                                            return;
                                        }
                                        if (isProjectLimitReached) {
                                            addToast(`⚠️ Batas kuota (${projects.length}/${vendorDetails.maxProjects}) project tercapai. Hapus project selesai untuk membuat baru.`, 'warning', 6000);
                                            return;
                                        }
                                        setShowCreateModal(true);
                                    }}
                                    className="btn-primary"
                                    style={{
                                        padding: '7px 14px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        background: vendorDetails?.isExpired ? '#4b5563' : isProjectLimitReached ? 'rgba(239,68,68,0.15)' : '',
                                        color: vendorDetails?.isExpired ? '#9ca3af' : isProjectLimitReached ? '#f87171' : '',
                                        border: isProjectLimitReached ? '1px solid rgba(239,68,68,0.4)' : '',
                                        cursor: vendorDetails?.isExpired ? 'not-allowed' : 'pointer',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <span>{isProjectLimitReached ? '🔒 Kuota Penuh' : '➕ Buat Project'}</span>
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div style={{ textAlign: 'center', marginTop: '64px', color: '#a1a1aa' }}>
                                <p>Memuat project...</p>
                            </div>
                        ) : sortedProjects.length === 0 ? (
                            <div className="glass-card" style={{ textAlign: 'center', marginTop: '32px', padding: '56px 32px' }}>
                                <h3 style={{ fontSize: '18px', margin: '0 0 8px 0', color: '#e4e4e7' }}>
                                    {searchQuery ? 'Project Tidak Ditemukan' :
                                     activeTab === 'completed' ? 'Belum Ada Project Selesai' :
                                     activeTab === 'failed' ? 'Tidak Ada Project Gagal' :
                                     'Belum Ada Project Berlangsung'}
                                </h3>
                                <p style={{ color: '#a1a1aa', margin: '0 0 20px 0', fontSize: '13px' }}>
                                    {searchQuery ? `Tidak ada project dengan kata kunci "${searchQuery}".` :
                                     activeTab === 'completed' ? 'Project akan muncul di sini setelah klien mengirimkan pilihan foto mereka.' :
                                     activeTab === 'failed' ? 'Semua proses impor project berjalan dengan lancar.' :
                                     'Buat project baru untuk membagikan galeri foto ke klien Anda.'}
                                </p>
                                {activeTab === 'ongoing' && !searchQuery && (
                                    <button 
                                        onClick={() => {
                                            if (vendorDetails?.isExpired) {
                                                addToast('Masa aktif paket berlangganan Anda telah habis.', 'warning');
                                                return;
                                            }
                                            if (isProjectLimitReached) {
                                                addToast(`Batas kuota (${projects.length}/${vendorDetails.maxProjects}) project tercapai. Silakan hapus sebagian project selesai.`, 'warning');
                                                return;
                                            }
                                            setShowCreateModal(true);
                                        }} 
                                        className="btn-primary"
                                        style={{ fontSize: '12px', padding: '8px 16px' }}
                                    >
                                        ➕ Buat Project Baru
                                    </button>
                                )}
                            </div>
                        ) : viewMode === 'list' ? (
                            /* ── COMPACT LIST VIEW ── */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {sortedProjects.map((project) => (
                                    <div key={project.id} className="glass-card" style={{ padding: '14px 18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(18,18,20,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                                        {/* Left: Info */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '2', minWidth: '220px' }}>
                                            <span className={`status-badge ${project.status === 'completed' ? 'status-completed' : project.status === 'importing' ? 'status-pending' : project.status === 'failed' ? 'status-failed' : 'status-pending'}`} style={{ fontSize: '11px', padding: '3px 8px', background: project.status === 'importing' ? 'rgba(99,102,241,0.15)' : '', color: project.status === 'importing' ? '#818cf8' : '', borderColor: project.status === 'importing' ? 'rgba(99,102,241,0.3)' : '' }}>
                                                {project.status === 'completed' ? '✓ Selesai' : project.status === 'importing' ? '⏳ Sedang Mengindeks...' : project.status === 'failed' ? '✕ Gagal' : 'Menunggu'}
                                            </span>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#f4f4f5' }}>{project.name}</h4>
                                                <span style={{ fontSize: '11px', color: '#71717a' }}>Dibuat: {new Date(project.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                            </div>
                                        </div>

                                        {/* Middle: Selection Progress or Importing Info */}
                                        <div style={{ flex: '1.5', minWidth: '160px' }}>
                                            {project.status === 'importing' ? (
                                                <span style={{ fontSize: '12px', color: '#a5b4fc', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span className="dev-watermark-dot" style={{ width: '6px', height: '6px' }} />
                                                    ⚡ Sedang mengindeks foto & subfolder...
                                                </span>
                                            ) : (
                                                <>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                                                        <span style={{ color: '#a1a1aa' }}>Pilihan Klien:</span>
                                                        <strong style={{ color: '#818cf8' }}>{project.selectedPhotosCount} {project.maxSelection > 0 ? `/ ${project.maxSelection}` : 'foto'}</strong>
                                                    </div>
                                                    {project.maxSelection > 0 && (
                                                        <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                                                            <div style={{ width: `${Math.min(100, Math.round((project.selectedPhotosCount / project.maxSelection) * 100))}%`, height: '100%', background: project.selectedPhotosCount >= project.maxSelection ? '#10b981' : '#6366f1', borderRadius: '4px' }} />
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {/* Right: Quick Action Buttons (Hidden when importing for minimalist look) */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                            {project.status === 'importing' ? (
                                                <span style={{ fontSize: '11px', color: '#71717a', fontStyle: 'italic' }}>Proses background...</span>
                                            ) : (
                                                <>
                                                    <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: '11px', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => handleOpenGallery(project)} title="Buka Galeri Klien">
                                                        🖼️ Galeri
                                                    </button>
                                                    <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => handleSendWhatsApp(project)} title="Kirim WA">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#25d366' }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                                        WA
                                                    </button>
                                                    <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: '11px' }} onClick={() => handleViewDetails(project)} title="Detail Seleksi">
                                                        👁️ Detail
                                                    </button>
                                                    {project.selectedPhotosCount > 0 && (
                                                        <button className="btn-primary" style={{ padding: '6px 10px', fontSize: '11px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }} onClick={() => handleCopyFilenames(project.id, 'lightroom')} title="Salin Nama File">
                                                            📋 Salin ({project.selectedPhotosCount})
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleOpenEditSettings(project)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#a1a1aa', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer' }} title="Pengaturan">
                                                        ⚙️
                                                    </button>
                                                    <button onClick={() => setProjectToDelete(project)} style={{ background: 'none', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer' }} title="Hapus">
                                                        🗑️
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* ── GRID CARD VIEW ── */
                            <div className="project-grid">
                                {sortedProjects.map((project) => (
                        <div key={project.id} className="project-card glass-card" style={{ padding: '22px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(18,18,20,0.7)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'transform 0.2s, border-color 0.2s' }}>
                            <div>
                                {/* Header: Status Badge + Actions (Settings & Delete) */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <span className={`status-badge ${project.status === 'completed' ? 'status-completed' :
                                            project.status === 'importing' ? 'status-pending' :
                                                project.status === 'failed' ? 'status-failed' : 'status-pending'
                                        }`} style={{
                                            background: project.status === 'importing' ? 'rgba(99,102,241,0.15)' :
                                                project.status === 'failed' ? 'rgba(239,68,68,0.15)' : '',
                                            color: project.status === 'importing' ? '#818cf8' :
                                                project.status === 'failed' ? '#f87171' : '',
                                            borderColor: project.status === 'importing' ? 'rgba(99,102,241,0.3)' :
                                                project.status === 'failed' ? 'rgba(239,68,68,0.25)' : ''
                                        }}>
                                        {project.status === 'completed' ? '✓ Selesai Dipilih' :
                                            project.status === 'importing' ? '⏳ Sedang Mengindeks...' :
                                                project.status === 'failed' ? '❌ Impor Gagal' : '● Menunggu Seleksi'}
                                    </span>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '11px', color: '#71717a', background: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            {new Date(project.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                        </span>
                                        {project.status !== 'importing' && (
                                            <>
                                                <button
                                                    className="btn-secondary"
                                                    style={{ padding: '4px 8px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px' }}
                                                    onClick={() => handleOpenEditProject(project)}
                                                    disabled={project.status === 'failed'}
                                                    title="Pengaturan Project"
                                                >
                                                    ⚙️
                                                </button>
                                                <button
                                                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}
                                                    onClick={() => handleDeleteProject(project.id, project.name)}
                                                    title="Hapus Project"
                                                >
                                                    🗑️
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Project Name */}
                                <h3 style={{ fontSize: '20px', margin: '0 0 12px 0', fontWeight: '700', color: '#ffffff', wordBreak: 'break-word' }}>{project.name}</h3>

                                {/* Progress Box / Importing Status Box */}
                                {project.status === 'importing' ? (
                                    <div style={{ background: 'rgba(99,102,241,0.06)', borderRadius: '12px', padding: '16px', marginBottom: '18px', border: '1px solid rgba(99,102,241,0.2)', textAlign: 'center' }}>
                                        <div className="dev-watermark-dot" style={{ margin: '0 auto 10px auto', width: '8px', height: '8px' }} />
                                        <p style={{ margin: 0, fontSize: '13px', color: '#a5b4fc', fontWeight: '600' }}>⚡ Sedang mengindeks foto & subfolder...</p>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#71717a' }}>Proses background berjalan. Kartu akan aktif otomatis.</p>
                                    </div>
                                ) : (
                                    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '12px 14px', marginBottom: '18px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#a1a1aa', marginBottom: '6px' }}>
                                            <span>Pilihan Klien:</span>
                                            <span style={{ fontWeight: '600', color: '#e4e4e7' }}>
                                                <strong style={{ color: '#818cf8', fontSize: '14px' }}>{project.selectedPhotosCount}</strong> {project.maxSelection > 0 ? `/ ${project.maxSelection}` : 'foto'} <span style={{ fontSize: '11px', color: '#71717a' }}>(Total: {project.totalPhotos} foto)</span>
                                            </span>
                                        </div>
                                        {project.maxSelection > 0 && (
                                            <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{ width: `${Math.min(100, Math.round((project.selectedPhotosCount / project.maxSelection) * 100))}%`, height: '100%', background: project.selectedPhotosCount >= project.maxSelection ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #6366f1, #818cf8)', borderRadius: '4px', transition: 'width 0.3s ease' }} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Clean Action Buttons (Only shown when not importing) */}
                            {project.status !== 'importing' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {project.status === 'failed' && (
                                        <button
                                            onClick={() => handleRetryImport(project.id)}
                                            className="btn-primary"
                                            style={{ width: '100%', padding: '9px', background: 'linear-gradient(135deg, #fbbf24, #d97706)', color: '#000', fontWeight: '700', fontSize: '12px', borderRadius: '8px' }}
                                        >
                                            🔄 Coba Impor Lagi
                                        </button>
                                    )}

                                    {project.status === 'archived' && (
                                        <button
                                            onClick={() => handleReactivateProject(project.id)}
                                            className="btn-primary"
                                            style={{ width: '100%', padding: '9px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: '700', fontSize: '12px', borderRadius: '8px' }}
                                        >
                                            ⚡ Aktifkan Kembali Galeri (30 Hari)
                                        </button>
                                    )}

                                    {/* Main Row: Open Gallery, WA Send & Detail */}
                                    <button
                                        className="btn-secondary"
                                        style={{
                                            width: '100%',
                                            padding: '9px 12px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: '#a5b4fc',
                                            background: 'rgba(99,102,241,0.08)',
                                            border: '1px solid rgba(99,102,241,0.25)',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                        onClick={() => handleOpenGallery(project)}
                                        title="Buka / Cek Tampilan Halaman Galeri Klien"
                                    >
                                        <span>🖼️ Lihat Galeri Klien</span>
                                    </button>

                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            className="btn-secondary"
                                            style={{ flex: 1, padding: '9px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                            onClick={() => handleCopyGalleryLink(project)}
                                            title="Salin Link Halaman Galeri Klien"
                                        >
                                            📋 Salin Link
                                        </button>
                                        <button
                                            className="btn-secondary"
                                            style={{ flex: 1, padding: '9px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                            onClick={() => handleSendWhatsApp(project)}
                                            title={project.clientPhone ? `Kirim ke ${project.clientPhone}` : 'Kirim via WhatsApp'}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#25d366', flexShrink: 0 }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                            Kirim WA
                                        </button>
                                        <button
                                            className="btn-secondary"
                                            style={{ flex: 1, padding: '9px 10px', fontSize: '12px' }}
                                            onClick={() => handleViewDetails(project)}
                                        >
                                            👁️ Detail
                                        </button>
                                    </div>


                                    {/* Featured Action: Copy Lightroom Filenames (default) */}
                                    {project.selectedPhotosCount > 0 && (
                                        <button
                                            className="btn-primary"
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '12px', fontWeight: '700', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 4px 12px rgba(99,102,241,0.25)', borderRadius: '8px' }}
                                            onClick={() => handleCopyFilenames(project.id, 'lightroom')}
                                        >
                                            📋 Salin Nama File ({project.selectedPhotosCount} Foto)
                                        </button>
                                    )}

                                    {/* RAW Sorter Button — only for completed projects with selections */}
                                    {project.status === 'completed' && project.selectedPhotosCount > 0 && (
                                        <button
                                            className="btn-secondary"
                                            style={{
                                                width: '100%',
                                                padding: '9px 12px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.1))',
                                                border: '1px solid rgba(139, 92, 246, 0.25)',
                                                color: '#c4b5fd',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                transition: 'all 0.2s',
                                            }}
                                            onClick={() => {
                                                if (vendorDetails?.allowRawSelector === 0 || vendorDetails?.allowRawSelector === false) {
                                                    addToast('Fitur RAW Selector hanya tersedia di paket Pro Studio ke atas. Silakan upgrade paket Anda.', 'warning');
                                                    setShowUpgradeModal(true);
                                                    return;
                                                }
                                                setSorterProject(project);
                                                setShowSorter(true);
                                            }}
                                            onMouseEnter={e => {
                                                e.target.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.18), rgba(99, 102, 241, 0.18))';
                                                e.target.style.borderColor = 'rgba(139, 92, 246, 0.4)';
                                            }}
                                            onMouseLeave={e => {
                                                e.target.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.1))';
                                                e.target.style.borderColor = 'rgba(139, 92, 246, 0.25)';
                                            }}
                                        >
                                            {vendorDetails?.allowRawSelector === 0 || vendorDetails?.allowRawSelector === false ? '🔒 Sortir RAW (Upgrade Pro)' : '📁 Sortir RAW'}
                                        </button>
                                    )}

                                    {/* Secondary Action (Lock Unlock / Limit) */}
                                    {project.status === 'completed' ? (
                                        <button
                                            className="btn-secondary"
                                            style={{ width: '100%', padding: '7px 10px', fontSize: '11px', border: '1px dashed rgba(251,191,36,0.4)', color: '#fbbf24', borderRadius: '8px' }}
                                            onClick={() => handleUpdateProjectStatus(project.id, 'pending_selection', 'dibuka kuncinya')}
                                        >
                                            🔓 Buka Kunci Seleksi
                                        </button>
                                    ) : (project.maxSelection > 0 && project.selectedPhotosCount >= project.maxSelection) ? (
                                        <button
                                            className="btn-secondary"
                                            style={{ width: '100%', padding: '7px 10px', fontSize: '11px', border: '1px dashed rgba(129,140,248,0.4)', color: '#818cf8', borderRadius: '8px' }}
                                            onClick={() => handleOpenAddLimit(project)}
                                        >
                                            ➕ Tambah Limit Pilihan
                                        </button>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </>
    );
})()}

            {/* ── CREATE PROJECT MODAL ── */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => {
                    if (!importing) setShowCreateModal(false);
                }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '22px', fontWeight: 'bold' }}>Buat Project Baru</h3>
                        <p style={{ color: '#a1a1aa', margin: '0 0 24px 0', fontSize: '14px' }}>Impor folder foto publik Google Drive</p>
 
                        {importError && (
                            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
                                {importError}
                            </div>
                        )}
 
                        <form onSubmit={handleCreateProject}>
                            <div className="form-group">
                                <label className="form-label">Nama Project</label>
                                <input
                                    type="text"
                                    className="input-text"
                                    required
                                    placeholder="Contoh: Wisuda Anna 2026"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    disabled={importing}
                                />
                            </div>
 
                            <div className="form-group">
                                <label className="form-label">Link Folder Google Drive</label>
                                <input
                                    type="url"
                                    className="input-text"
                                    required
                                    placeholder="https://drive.google.com/drive/folders/..."
                                    value={newFolderUrl}
                                    onChange={(e) => setNewFolderUrl(e.target.value)}
                                    disabled={importing}
                                />
                                <span style={{ fontSize: '11px', color: '#71717a' }}>Pastikan setelan berbagi folder telah diatur ke "Siapa saja yang memiliki link dapat melihat".</span>
                            </div>
 
                            <div className="form-group">
                                <label className="form-label">Limit Jumlah Pilihan Foto Klien</label>
                                <input
                                    type="number"
                                    className="input-text"
                                    min="0"
                                    placeholder="Contoh: 50 (Isi 0 jika Bebas / Tanpa Batas)"
                                    value={maxSelection || ''}
                                    onChange={(e) => setMaxSelection(Math.max(0, parseInt(e.target.value) || 0))}
                                    disabled={importing}
                                />
                                <span style={{ fontSize: '11px', color: '#71717a' }}>Jumlah maksimal foto yang boleh dipilih oleh klien. Isi 0 untuk membebaskan klien memilih berapa saja.</span>
                            </div>

                            <div className="form-group">
                                <label className="form-label">No. WhatsApp Klien <span style={{ fontSize: '11px', color: '#71717a', fontWeight: 'normal' }}>(Opsional)</span></label>
                                <input
                                    type="tel"
                                    className="input-text"
                                    placeholder="Contoh: 6281234567890"
                                    value={clientPhone}
                                    onChange={(e) => setClientPhone(e.target.value)}
                                    disabled={importing}
                                />
                                <span style={{ fontSize: '11px', color: '#71717a' }}>Format internasional tanpa + (contoh: 6281234567890). Digunakan untuk mengirim link galeri via WhatsApp langsung.</span>
                            </div>

                             {/* COLLAPSIBLE THEME SELECTOR WITH LIVE VISUAL PREVIEWS */}
                             <div className="form-group" style={{ marginTop: '16px' }}>
                                 <button
                                     type="button"
                                     onClick={() => setShowCreateThemePicker(!showCreateThemePicker)}
                                     style={{
                                         width: '100%',
                                         display: 'flex',
                                         alignItems: 'center',
                                         justifyContent: 'space-between',
                                         background: 'rgba(255, 255, 255, 0.03)',
                                         border: '1px solid rgba(255, 255, 255, 0.08)',
                                         borderRadius: '10px',
                                         padding: '12px 16px',
                                         color: '#e4e4e7',
                                         fontSize: '13px',
                                         fontWeight: '600',
                                         cursor: 'pointer',
                                         transition: 'all 0.2s ease'
                                     }}
                                 >
                                     <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                         <span>🎨</span>
                                         <span>Pilih Tema Galeri Klien <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 'normal' }}>(Opsional)</span></span>
                                     </span>
                                     <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: 'bold' }}>
                                         {showCreateThemePicker ? '▲ Sembunyikan' : '▼ Ubah Tema (Default Dark)'}
                                     </span>
                                 </button>

                                 {showCreateThemePicker && (
                                     <div className="fade-in-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '12px' }}>
                                         {[
                                             { key: 'default', name: 'Tema Default (Dark)', desc: 'Gelap modern bawaan asli, aksen indigo & rapi', bg: '#09090b', accent: '#818cf8', tag: '🌙 Dark' },
                                             { key: 'midnightSlate', name: 'Midnight Slate (Trial Dark)', desc: 'Gelap modern, aksen slate & neon indigo ala Galeri Trial', bg: '#0f172a', accent: '#6366f1', tag: '⚡ Trial Dark' },
                                             { key: 'contactSheet', name: 'Kontak Studio (Retro)', desc: 'Gelap retro, ala lembar kontak cetak film', bg: '#121212', accent: '#eab308', tag: '🎞️ Retro Film' },
                                             { key: 'galleryWall', name: 'Galeri Putih (Clean)', desc: 'Terang bersih, tenang, minimalis mewah', bg: '#ffffff', accent: '#2563eb', tag: '☀️ Clean Light' },
                                             { key: 'editorsMark', name: 'Tanda Editor (Spidol)', desc: 'Spidol merah tegas ala ruang redaksi', bg: '#1c1917', accent: '#ef4444', tag: '✏️ Red Mark' },
                                             { key: 'polaroid', name: 'Polaroid Kenangan', desc: 'Seni bingkai foto polaroid miring hangat', bg: '#262626', accent: '#f59e0b', tag: '📷 Vintage' }
                                         ].map(t => {
                                             const isSel = galleryTheme === t.key;
                                             return (
                                                 <div 
                                                     key={t.key}
                                                     onClick={() => !importing && setGalleryTheme(t.key)}
                                                     style={{
                                                         background: isSel ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.02)',
                                                         border: isSel ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
                                                         borderRadius: '10px',
                                                         padding: '12px',
                                                         cursor: importing ? 'not-allowed' : 'pointer',
                                                         transition: 'all 0.2s',
                                                         position: 'relative',
                                                         overflow: 'hidden'
                                                     }}
                                                 >
                                                     {/* Mini Live Preview Swatch */}
                                                     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                         <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                             <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: t.bg, border: '1px solid rgba(255,255,255,0.3)', boxShadow: `0 0 6px ${t.accent}` }} />
                                                             <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.accent }} />
                                                         </div>
                                                         <span style={{ fontSize: '9px', fontWeight: 'bold', background: 'rgba(255,255,255,0.06)', color: isSel ? '#818cf8' : '#a1a1aa', padding: '2px 6px', borderRadius: '6px' }}>
                                                             {t.tag}
                                                         </span>
                                                     </div>

                                                     <div style={{ fontWeight: 'bold', fontSize: '12px', color: isSel ? '#818cf8' : '#e4e4e7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                         {isSel && <span style={{ color: '#818cf8' }}>✓</span>} {t.name}
                                                     </div>
                                                     <div style={{ fontSize: '10px', color: '#71717a', marginTop: '4px', lineHeight: '1.3' }}>
                                                         {t.desc}
                                                     </div>
                                                 </div>
                                             );
                                         })}
                                     </div>
                                 )}
                             </div>
 
                            <div style={{ display: 'flex', gap: '12px', marginTop: '28px', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)} disabled={importing} style={{ transition: 'all 0.2s', opacity: importing ? 0.4 : 1 }}>
                                    Batal
                                </button>
                                <button type="submit" className="btn-primary" disabled={importing} style={{ minWidth: '160px', gap: '10px' }}>
                                    {importing ? (
                                        <>
                                            <span className="btn-spinner" />
                                            Mengimpor...
                                        </>
                                    ) : (
                                        <>⚡ Impor &amp; Buat</>
                                    )}
                                </button>
                            </div>
                        </form>
 
                        {importing && (
                            <div className="import-progress-bar-wrap">
                                <div className="import-progress-track">
                                    <div className="import-progress-fill" />
                                </div>
                                <p style={{ fontSize: '13px', color: '#818cf8', margin: 0, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="btn-spinner" style={{ borderTopColor: '#818cf8', borderColor: 'rgba(129,140,248,0.25)' }} />
                                    Mengindeks folder Google Drive...
                                </p>
                                <p style={{ fontSize: '12px', color: '#52525b', margin: '6px 0 0 0', lineHeight: '1.5' }}>Foto distream langsung dari Drive — tidak disimpan ke disk server.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
 
            {/* ── PHOTO LIMIT CONFIRMATION MODAL ── */}
            {showLimitConfirmModal && limitExceededInfo && (
                <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => {
                    if (!importing) {
                        setShowLimitConfirmModal(false);
                        setPendingProjectParams(null);
                        setLimitExceededInfo(null);
                    }
                }}>
                    <div className="modal-content" style={{ maxWidth: '480px', border: '1px solid rgba(239, 68, 68, 0.2)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                                    <line x1="12" y1="9" x2="12" y2="13"/>
                                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                                </svg>
                            </div>
                            <div>
                                <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 'bold', color: '#f3f4f6' }}>Batas Paket Terlampaui!</h3>
                                <p style={{ color: '#a1a1aa', margin: 0, fontSize: '13px', lineHeight: '1.5' }}>
                                    Folder Google Drive Anda memiliki <strong style={{ color: '#ef4444' }}>{limitExceededInfo.totalFiles} foto</strong>, sedangkan tipe paket berlangganan Anda membatasi maksimal <strong style={{ color: '#e4e4e7' }}>{limitExceededInfo.limit} foto</strong> per project.
                                </p>
                            </div>
                        </div>
 
                        <p style={{ fontSize: '13px', color: '#71717a', margin: '0 0 24px 0', lineHeight: '1.5', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '8px' }}>
                            Jika Anda memilih <strong>Lanjutkan</strong>, sistem hanya akan mengimpor <strong>{limitExceededInfo.limit} foto teratas</strong> dari folder Google Drive Anda dan melewati sisanya.
                        </p>
 
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button 
                                type="button" 
                                className="btn-secondary" 
                                onClick={() => {
                                    setShowLimitConfirmModal(false);
                                    setPendingProjectParams(null);
                                    setLimitExceededInfo(null);
                                    setImporting(false);
                                }}
                            >
                                Batal
                            </button>
                            <button 
                                type="button" 
                                className="btn-primary" 
                                style={{ background: '#ef4444', borderColor: '#ef4444', color: '#ffffff' }} 
                                onClick={confirmAndCreateProject}
                            >
                                Lanjutkan Impor ({limitExceededInfo.limit} Foto)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── PROJECT SELECTION DETAILS MODAL ── */}
            {selectedProjectDetails && (
                <div className="modal-overlay" onClick={() => setSelectedProjectDetails(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px', marginBottom: '16px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold' }}>{selectedProjectDetails.name}</h3>
                                <p style={{ color: '#818cf8', margin: '4px 0 0 0', fontSize: '13px', fontWeight: '500' }}>
                                    ✨ Menampilkan {detailPhotos.length} foto pilihan klien
                                </p>
                            </div>
                            <button onClick={() => setSelectedProjectDetails(null)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }}>
                                Close
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', marginBottom: '20px' }}>
                            {loadingDetails ? (
                                <p style={{ textAlign: 'center', color: '#a1a1aa', margin: '40px 0' }}>Loading details...</p>
                            ) : selectedProjectDetails?.filesDeleted === 1 ? (
                                // Files deleted — show text-only selected filenames
                                <div>
                                    <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>📁</span>
                                        File foto fisik telah otomatis dihapus dari server. Hanya nama file hasil seleksi yang tersimpan.
                                    </div>
                                    {detailPhotos.filter(p => p.isSelected > 0).length === 0 ? (
                                        <p style={{ textAlign: 'center', color: '#71717a', margin: '20px 0', fontSize: '14px' }}>Klien belum memilih foto sebelum file dihapus.</p>
                                    ) : (
                                        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '16px 20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#a1a1aa', fontWeight: '600' }}>
                                                {detailPhotos.filter(p => p.isSelected > 0).length} Foto Terpilih:
                                            </p>
                                            <ol style={{ margin: 0, paddingLeft: '20px', color: '#e4e4e7', fontSize: '13px', lineHeight: '1.9' }}>
                                                {detailPhotos.filter(p => p.isSelected > 0).map(p => (
                                                    <li key={p.id} style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                                        {p.originalPath.split('/').pop()}
                                                    </li>
                                                ))}
                                            </ol>
                                        </div>
                                    )}
                                </div>
                            ) : detailPhotos.length === 0 ? (
                                <div style={{ textAlign: 'center', color: '#a1a1aa', padding: '48px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.08)' }}>
                                    <p style={{ fontSize: '15px', fontWeight: '600', color: '#e4e4e7', margin: '0 0 6px 0' }}>Belum ada foto yang dipilih oleh klien</p>
                                    <p style={{ fontSize: '13px', margin: 0 }}>Klien belum menandai foto pilihan mereka di galeri ini.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                                    {detailPhotos.map((photo, pIdx) => {
                                        const filename = photo.originalPath.split('/').pop();
                                        return (
                                            <div
                                                key={photo.id}
                                                title={`#${pIdx + 1} - ${filename}`}
                                                style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '2px solid #6366f1', aspectRatio: '3/2', boxShadow: '0 4px 12px rgba(99,102,241,0.2)', cursor: 'pointer' }}
                                            >
                                                <img src={photo.thumbnailPath} alt={filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <div style={{ position: 'absolute', top: '6px', right: '6px', background: '#6366f1', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                                                    ✓
                                                </div>
                                                <div style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(0,0,0,0.65)', color: '#34d399', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                                                    #{pIdx + 1}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', width: '100%' }}>
                            {/* Quick Format Selector & Action Buttons */}
                            {detailPhotos.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                        <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: 'bold' }}>⚙️ Format Pemisah Instan:</span>
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            <select
                                                value={copyDelimiter}
                                                onChange={(e) => setCopyDelimiter(e.target.value)}
                                                style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#e4e4e7', cursor: 'pointer' }}
                                            >
                                                <option value=", ">, (Koma)</option>
                                                <option value="; ">; (Titik Koma)</option>
                                                <option value=" OR ">OR (Search Keyword)</option>
                                                <option value=" ">[spasi] (Finder)</option>
                                                <option value={'\n'}>\n (Baris Baru)</option>
                                            </select>

                                            <select
                                                value={copyIncludeExt}
                                                onChange={(e) => setCopyIncludeExt(parseInt(e.target.value))}
                                                style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#e4e4e7', cursor: 'pointer' }}
                                            >
                                                <option value={0}>Tanpa Ext (.JPG)</option>
                                                <option value={1}>Dengan Ext (.JPG)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            className="btn-primary"
                                            style={{ flex: 1, padding: '10px 14px', fontSize: '12px', fontWeight: '700', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                            onClick={() => handleCopyFilenames(selectedProjectDetails.id)}
                                        >
                                            📋 Salin {detailPhotos.length} Nama File ke Clipboard
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                                <a 
                                    className="guide-link"
                                    href="/guide.html" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    style={{ fontSize: '12px', color: '#818cf8', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '5px' }}
                                >
                                    📖 Panduan penggunaan
                                </a>
                                <button className="btn-secondary" onClick={() => setSelectedProjectDetails(null)}>
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── EDIT PROJECT SETTINGS MODAL ── */}
            {editingProject && (
                <div className="modal-overlay" onClick={() => {
                    if (!savingProjectSettings) setEditingProject(null);
                }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 'bold' }}>Pengaturan Project</h3>
                        <p style={{ color: '#a1a1aa', margin: '0 0 24px 0', fontSize: '13px' }}>Ubah informasi dan tampilan galeri klien</p>

                        <form onSubmit={handleSaveProjectSettings}>
                            <div className="form-group">
                                <label className="form-label">Nama Project</label>
                                <input
                                    type="text"
                                    className="input-text"
                                    required
                                    value={editProjectName}
                                    onChange={(e) => setEditProjectName(e.target.value)}
                                    disabled={savingProjectSettings}
                                />
                            </div>

                             {/* COLLAPSIBLE THEME SELECTOR IN EDIT MODAL */}
                             <div className="form-group" style={{ marginTop: '16px' }}>
                                 <button
                                     type="button"
                                     onClick={() => setShowEditThemePicker(!showEditThemePicker)}
                                     style={{
                                         width: '100%',
                                         display: 'flex',
                                         alignItems: 'center',
                                         justifyContent: 'space-between',
                                         background: 'rgba(255, 255, 255, 0.03)',
                                         border: '1px solid rgba(255, 255, 255, 0.08)',
                                         borderRadius: '10px',
                                         padding: '12px 16px',
                                         color: '#e4e4e7',
                                         fontSize: '13px',
                                         fontWeight: '600',
                                         cursor: 'pointer',
                                         transition: 'all 0.2s ease'
                                     }}
                                 >
                                     <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                         <span>🎨</span>
                                         <span>Ubah Tema Galeri Klien <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 'normal' }}>(Opsional)</span></span>
                                     </span>
                                     <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: 'bold' }}>
                                         {showEditThemePicker ? '▲ Sembunyikan' : '▼ Tampilkan Tema'}
                                     </span>
                                 </button>

                                 {showEditThemePicker && (
                                     <div className="fade-in-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '12px' }}>
                                         {[
                                             { key: 'default', name: 'Tema Default (Dark)', desc: 'Gelap modern bawaan asli, aksen indigo & rapi', bg: '#09090b', accent: '#818cf8', tag: '🌙 Dark' },
                                             { key: 'midnightSlate', name: 'Midnight Slate (Trial Dark)', desc: 'Gelap modern, aksen slate & neon indigo ala Galeri Trial', bg: '#0f172a', accent: '#6366f1', tag: '⚡ Trial Dark' },
                                             { key: 'contactSheet', name: 'Kontak Studio (Retro)', desc: 'Gelap retro, ala lembar kontak cetak film', bg: '#121212', accent: '#eab308', tag: '🎞️ Retro Film' },
                                             { key: 'galleryWall', name: 'Galeri Putih (Clean)', desc: 'Terang bersih, tenang, minimalis mewah', bg: '#ffffff', accent: '#2563eb', tag: '☀️ Clean Light' },
                                             { key: 'editorsMark', name: 'Tanda Editor (Spidol)', desc: 'Spidol merah tegas ala ruang redaksi', bg: '#1c1917', accent: '#ef4444', tag: '✏️ Red Mark' },
                                             { key: 'polaroid', name: 'Polaroid Kenangan', desc: 'Seni bingkai foto polaroid miring hangat', bg: '#262626', accent: '#f59e0b', tag: '📷 Vintage' }
                                         ].map(t => {
                                             const isSel = editProjectGalleryTheme === t.key;
                                             return (
                                                 <div 
                                                     key={t.key}
                                                     onClick={() => !savingProjectSettings && setEditProjectGalleryTheme(t.key)}
                                                     style={{
                                                         background: isSel ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.02)',
                                                         border: isSel ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
                                                         borderRadius: '10px',
                                                         padding: '12px',
                                                         cursor: savingProjectSettings ? 'not-allowed' : 'pointer',
                                                         transition: 'all 0.2s',
                                                         position: 'relative',
                                                         overflow: 'hidden'
                                                     }}
                                                 >
                                                     {/* Mini Live Preview Swatch */}
                                                     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                         <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                             <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: t.bg, border: '1px solid rgba(255,255,255,0.3)', boxShadow: `0 0 6px ${t.accent}` }} />
                                                             <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.accent }} />
                                                         </div>
                                                         <span style={{ fontSize: '9px', fontWeight: 'bold', background: 'rgba(255,255,255,0.06)', color: isSel ? '#818cf8' : '#a1a1aa', padding: '2px 6px', borderRadius: '6px' }}>
                                                             {t.tag}
                                                         </span>
                                                     </div>

                                                     <div style={{ fontWeight: 'bold', fontSize: '12px', color: isSel ? '#818cf8' : '#e4e4e7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                         {isSel && <span style={{ color: '#818cf8' }}>✓</span>} {t.name}
                                                     </div>
                                                     <div style={{ fontSize: '10px', color: '#71717a', marginTop: '4px', lineHeight: '1.3' }}>
                                                         {t.desc}
                                                     </div>
                                                 </div>
                                             );
                                         })}
                                     </div>
                                 )}
                             </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '28px', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn-secondary" onClick={() => setEditingProject(null)} disabled={savingProjectSettings}>
                                    Batal
                                </button>
                                <button type="submit" className="btn-primary" disabled={savingProjectSettings}>
                                    {savingProjectSettings ? 'Menyimpan...' : 'Simpan Perubahan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── BRANDING SETTINGS MODAL ── */}
            {showBrandingModal && (
                <div className="modal-overlay" onClick={() => {
                    if (!savingBranding) setShowBrandingModal(false);
                }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', padding: '24px', borderRadius: '16px' }}>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 'bold' }}>⚙️ Pengaturan Brand & Profil</h3>
                        <p style={{ color: '#a1a1aa', margin: '0 0 16px 0', fontSize: '12px' }}>Atur informasi studio dan preferensi salin nama file</p>

                        <form onSubmit={handleSaveBranding}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <label className="form-label" style={{ fontSize: '12px' }}>Nama Pemilik</label>
                                    <input
                                        type="text"
                                        className="input-text"
                                        required
                                        placeholder="Contoh: Arman Syam"
                                        value={vendorName}
                                        onChange={(e) => setVendorName(e.target.value)}
                                        disabled={savingBranding}
                                        style={{ padding: '8px 12px', fontSize: '13px' }}
                                    />
                                </div>

                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <label className="form-label" style={{ fontSize: '12px' }}>Nama Brand Studio</label>
                                    <input
                                        type="text"
                                        className="input-text"
                                        placeholder="Contoh: AmsDev Studio"
                                        value={brandName}
                                        onChange={(e) => setBrandName(e.target.value)}
                                        disabled={savingBranding}
                                        style={{ padding: '8px 12px', fontSize: '13px' }}
                                    />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '14px' }}>
                                <label className="form-label" style={{ fontSize: '12px', marginBottom: '6px' }}>
                                    Logo Studio <span style={{ fontSize: '11px', color: '#71717a', fontWeight: 'normal' }}>(PNG, JPG, WebP)</span>
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                setBrandLogoFile(file);
                                                setBrandLogoPreview(URL.createObjectURL(file));
                                            }
                                        }}
                                        disabled={savingBranding}
                                        style={{ color: '#a1a1aa', fontSize: '12px', padding: '4px 0', flex: 1 }}
                                    />
                                    {brandLogoPreview && (
                                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center' }}>
                                            <img
                                                src={brandLogoPreview}
                                                alt="Preview Logo"
                                                style={{ height: '32px', maxWidth: '90px', objectFit: 'contain' }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ── PREFERENSI SALIN NAMA FILE SECTION (MINIMALIST) ── */}
                            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                <label className="form-label" style={{ fontSize: '12px', color: '#818cf8', fontWeight: 'bold', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    📋 Preferensi Salin Nama File
                                </label>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>Pemisah (Delimiter)</label>
                                        <select
                                            className="input-text"
                                            value={copyDelimiter}
                                            onChange={(e) => setCopyDelimiter(e.target.value)}
                                            disabled={savingBranding}
                                            style={{ color: '#e4e4e7', cursor: 'pointer', padding: '7px 10px', fontSize: '12px' }}
                                        >
                                            <option value=", ">, (Koma & Spasi)</option>
                                            <option value="; ">; (Titik Koma)</option>
                                            <option value=" OR ">OR (Windows Search)</option>
                                            <option value=" ">[spasi] (macOS Finder)</option>
                                            <option value={'\n'}>\n (Baris Baru)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '11px', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>Ekstensi Berkas</label>
                                        <select
                                            className="input-text"
                                            value={copyIncludeExt}
                                            onChange={(e) => setCopyIncludeExt(parseInt(e.target.value))}
                                            disabled={savingBranding}
                                            style={{ color: '#e4e4e7', cursor: 'pointer', padding: '7px 10px', fontSize: '12px' }}
                                        >
                                            <option value={0}>Tanpa Ekstensi (DSC_0012)</option>
                                            <option value={1}>Dengan Ekstensi (DSC_0012.JPG)</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '10px' }}>
                                    <label style={{ fontSize: '11px', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>Urutan Salin File</label>
                                    <select
                                        className="input-text"
                                        value={copySortOrder}
                                        onChange={(e) => setCopySortOrder(e.target.value)}
                                        disabled={savingBranding}
                                        style={{ color: '#e4e4e7', cursor: 'pointer', padding: '7px 10px', fontSize: '12px' }}
                                    >
                                        <option value="name_asc">🔤 Abjad Nama File (A - Z)</option>
                                        <option value="selection_order">⏱️ Urutan Pilihan Klien (Kronologis)</option>
                                    </select>
                                </div>

                                {/* Minimalist Live Preview Strip */}
                                <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '10px', color: '#818cf8', fontWeight: 'bold', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>PREVIEW:</span>
                                    <span style={{ fontSize: '11px', color: '#34d399', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {(() => {
                                            const sampleExt = copyIncludeExt === 1 ? '.JPG' : '';
                                            const samples = [`DSC_0012${sampleExt}`, `DSC_0015${sampleExt}`, `DSC_0018${sampleExt}`];
                                            if (copySortOrder === 'name_asc') samples.sort();
                                            return samples.join(copyDelimiter);
                                        })()}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowBrandingModal(false)} disabled={savingBranding} style={{ padding: '8px 16px', fontSize: '13px' }}>
                                    Batal
                                </button>
                                <button type="submit" className="btn-primary" disabled={savingBranding} style={{ padding: '8px 20px', fontSize: '13px' }}>
                                    {savingBranding ? 'Menyimpan...' : '💾 Simpan Pengaturan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── UPGRADE PLAN MODAL ── */}
            {showUpgradeModal && (
                <div className="modal-overlay" onClick={() => {
                    setShowUpgradeModal(false);
                    setSelectedUpgradePlan(null);
                    setTransferProofFile(null);
                    setUpgradeError('');
                }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: selectedUpgradePlan ? '560px' : '780px' }}>
                        <h2 style={{ margin: '0 0 8px 0', fontSize: '22px' }}>🚀 Upgrade & Add-On Plan</h2>
                        
                        <div style={{ display: 'flex', gap: '8px', margin: '14px 0 16px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
                            <button
                                type="button"
                                onClick={() => { setUpgradeTab('limit'); setSelectedUpgradePlan(null); }}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    background: upgradeTab === 'limit' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                                    color: upgradeTab === 'limit' ? '#818cf8' : '#a1a1aa',
                                    fontWeight: '600',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    border: `1px solid ${upgradeTab === 'limit' ? 'rgba(99,102,241,0.4)' : 'transparent'}`
                                }}
                            >
                                📦 Paket Utama Studio
                            </button>
                            <button
                                type="button"
                                onClick={() => { setUpgradeTab('storage'); setSelectedUpgradePlan(null); }}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    background: upgradeTab === 'storage' ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.04)',
                                    color: upgradeTab === 'storage' ? '#34d399' : '#a1a1aa',
                                    fontWeight: '600',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    border: `1px solid ${upgradeTab === 'storage' ? 'rgba(52,211,153,0.4)' : 'transparent'}`
                                }}
                            >
                                ⚡ Add-On Storage Cloud
                            </button>
                        </div>

                        {!selectedUpgradePlan ? (
                            <>
                                    })}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                                    <button className="btn-secondary" onClick={() => setShowUpgradeModal(false)}>Tutup</button>
                                </div>
                            </>
                        ) : (
                            <form onSubmit={handleUpgradeSubmit}>
                                {upgradeError && (
                                    <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                                        {upgradeError}
                                    </div>
                                )}

                                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px' }}>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#e4e4e7' }}>
                                        {selectedUpgradePlan.id === vendorDetails?.planId 
                                            ? 'Rincian Perpanjangan Paket' 
                                            : getProrationDetails(selectedUpgradePlan).isDowngrade 
                                                ? 'Rincian Pembayaran Downgrade' 
                                                : 'Rincian Pembayaran Prorata'}
                                    </h4>
                                    
                                    {selectedUpgradePlan.id === vendorDetails?.planId ? (
                                        <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '12px', color: '#a5b4fc', lineHeight: '1.4' }}>
                                            ℹ️ <strong>Informasi:</strong> Perpanjangan paket akan menambahkan masa aktif akun Anda selama <strong>{selectedUpgradePlan.activePeriodDays || 30} hari</strong> secara akumulatif.
                                        </div>
                                    ) : getProrationDetails(selectedUpgradePlan).isDowngrade && (
                                        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '12px', color: '#f87171', lineHeight: '1.4' }}>
                                            ⚠️ <strong>Perhatian:</strong> Downgrade paket akan menghanguskan sisa hari aktif paket Anda saat ini dan langsung menerapkan limit baru secara penuh. Tidak ada potongan prorata.
                                        </div>
                                    )}
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#a1a1aa', marginBottom: '8px' }}>
                                        <span>Plan Asal</span>
                                        <span style={{ color: '#e4e4e7', fontWeight: '500' }}>{vendorDetails?.planName} Plan</span>
                                    </div>
                                    
                                    {selectedUpgradePlan.id !== vendorDetails?.planId && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#a1a1aa', marginBottom: '8px' }}>
                                            <span>Plan Baru</span>
                                            <span style={{ color: '#e4e4e7', fontWeight: '500' }}>{selectedUpgradePlan.name} Plan (Rp {selectedUpgradePlan.price.toLocaleString('id-ID')})</span>
                                        </div>
                                    )}
                                    
                                    {selectedUpgradePlan.id !== vendorDetails?.planId && !getProrationDetails(selectedUpgradePlan).isDowngrade && getProrationDetails(selectedUpgradePlan).discount > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#34d399', marginBottom: '8px' }}>
                                            <span>Sisa Langganan ({getProrationDetails(selectedUpgradePlan).daysRemaining} Hari)</span>
                                            <span>- Rp {getProrationDetails(selectedUpgradePlan).discount.toLocaleString('id-ID')}</span>
                                        </div>
                                    )}

                                    <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', margin: '12px 0', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '700' }}>
                                        <span style={{ color: '#e4e4e7' }}>{selectedUpgradePlan.id === vendorDetails?.planId ? 'Biaya Perpanjangan' : 'Total Pembayaran'}</span>
                                        <span style={{ color: '#fbbf24' }}>Rp {getProrationDetails(selectedUpgradePlan).total.toLocaleString('id-ID')}</span>
                                    </div>
                                </div>

                                {enablePaymentGateway && (
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', marginBottom: '10px', fontSize: '13px', color: '#a1a1aa', fontWeight: '600' }}>Pilih Metode Pembayaran</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <div 
                                                onClick={() => setUpgradePaymentMethod('gateway')}
                                                style={{
                                                    background: upgradePaymentMethod === 'gateway' ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                                                    border: `1.5px solid ${upgradePaymentMethod === 'gateway' ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
                                                    borderRadius: '10px',
                                                    padding: '12px 14px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>⚡ Pembayaran Otomatis</span>
                                                    <span style={{ fontSize: '10px', background: '#10b981', color: '#ffffff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>INSTAN QRIS</span>
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#a1a1aa', lineHeight: '1.4' }}>Bayar via QRIS instan tanpa upload foto bukti transfer.</div>
                                            </div>

                                            <div 
                                                onClick={() => setUpgradePaymentMethod('manual')}
                                                style={{
                                                    background: upgradePaymentMethod === 'manual' ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                                                    border: `1.5px solid ${upgradePaymentMethod === 'manual' ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
                                                    borderRadius: '10px',
                                                    padding: '12px 14px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>🏦 Bank Transfer</span>
                                                    <span style={{ fontSize: '10px', background: '#6366f1', color: '#ffffff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>MANUAL</span>
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#a1a1aa', lineHeight: '1.4' }}>Transfer bank manual & upload foto bukti transaksi.</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {upgradePaymentMethod === 'gateway' ? (
                                    <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px' }}>
                                        <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#34d399', fontWeight: '600' }}>⚡ Pembayaran Otomatis & Instan</h4>
                                        <p style={{ margin: 0, fontSize: '12px', color: '#a1a1aa', lineHeight: '1.5' }}>
                                            Klik tombol di bawah untuk membuka QRIS. Anda dapat membayar menggunakan <strong>BCA Mobile, Livin, BRImo, GoPay, OVO, ShopeePay, atau DANA</strong>. Paket Anda otomatis ter-upgrade seketika tanpa upload foto bukti!
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {bankSettings && (
                                            <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px dashed rgba(99,102,241,0.2)', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px' }}>
                                                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#a5b4fc', fontWeight: '600' }}>🏦 Rekening Pembayaran</h4>
                                                <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#a1a1aa' }}>Bank: <strong style={{ color: '#e4e4e7' }}>{bankSettings.bankName}</strong></p>
                                                <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#a1a1aa' }}>Nomor Rekening: <strong style={{ color: '#fbbf24', fontFamily: 'monospace', fontSize: '15px' }}>{bankSettings.bankAccountNumber}</strong></p>
                                                <p style={{ margin: 0, fontSize: '13px', color: '#a1a1aa' }}>Atas Nama: <strong style={{ color: '#e4e4e7' }}>{bankSettings.bankAccountName}</strong></p>
                                            </div>
                                        )}

                                        <div className="form-group" style={{ marginBottom: '20px' }}>
                                            <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>Upload Bukti Transfer</label>
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                onChange={(e) => setTransferProofFile(e.target.files[0])}
                                                required 
                                                style={{ display: 'block', width: '100%', fontSize: '13px', color: '#a1a1aa' }} 
                                            />
                                            <span style={{ fontSize: '11px', color: '#71717a', display: 'block', marginTop: '4px' }}>Dukungan file gambar (JPEG, PNG, WebP) maks 5MB.</span>
                                        </div>
                                    </>
                                )}

                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                                    <button type="button" className="btn-secondary" onClick={() => {
                                        setSelectedUpgradePlan(null);
                                        setTransferProofFile(null);
                                        setUpgradeError('');
                                    }} disabled={isSubmittingUpgrade}>Kembali</button>
                                    
                                    {upgradePaymentMethod === 'gateway' ? (
                                        <button 
                                            type="button" 
                                            className="btn-primary" 
                                            onClick={handleGatewayUpgrade} 
                                            disabled={isSubmittingUpgrade}
                                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}
                                        >
                                            {isSubmittingUpgrade ? 'Memproses Gateway...' : '🚀 Bayar Upgrade via QRIS'}
                                        </button>
                                    ) : (
                                        <button type="submit" className="btn-primary" disabled={isSubmittingUpgrade || !transferProofFile}>
                                            {isSubmittingUpgrade ? 'Mengirim...' : 'Kirim Bukti Pembayaran'}
                                        </button>
                                    )}
                                </div>
                            </form>
                        )}
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
                @media (max-width: 640px) {
                    .dashboard-header-row {
                        flex-direction: column !important;
                        align-items: stretch !important;
                        gap: 12px !important;
                    }
                    .dashboard-header-actions {
                        display: flex !important;
                        width: 100% !important;
                        justify-content: space-between !important;
                    }
                    .dashboard-header-actions > * {
                        flex: 1 !important;
                        justify-content: center !important;
                    }
                    .dashboard-stats-grid {
                        grid-template-columns: 1fr 1fr !important;
                        gap: 8px !important;
                    }
                    .dashboard-stats-grid > div:last-child {
                        grid-column: span 2 !important;
                    }
                    .dashboard-stats-grid > div {
                        padding: 10px 12px !important;
                    }
                    .dashboard-control-bar {
                        flex-direction: column !important;
                        align-items: stretch !important;
                        gap: 10px !important;
                    }
                    .dashboard-control-bar > div {
                        width: 100% !important;
                    }
                }
            `}</style>
            {/* ── MODAL: CUSTOM DELETE PROJECT CONFIRMATION ── */}
            {projectToDelete && (
                <div className="modal-overlay" onClick={() => { if (!deletingProject) setProjectToDelete(null); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '90%' }}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239,68,68,0.15)', color: '#f87171', fontSize: '28px', marginBottom: '16px' }}>
                                ⚠️
                            </div>
                            <h3 className="title-gradient" style={{ fontSize: '22px', margin: '0 0 8px 0', fontWeight: 'bold' }}>Hapus Project</h3>
                            <p style={{ color: '#a1a1aa', margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                                Apakah Anda yakin ingin menghapus project <strong>"{projectToDelete.name}"</strong>?
                            </p>
                        </div>

                        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', fontSize: '13px', color: '#f87171', lineHeight: '1.5' }}>
                            ⚠️ <strong>Peringatan:</strong> Tindakan ini bersifat permanen dan akan menghapus seluruh file foto dari server. Data pilihan klien juga akan dihapus selamanya.
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setProjectToDelete(null)}
                                className="btn-secondary"
                                style={{ flex: 1, padding: '12px 16px', fontSize: '14px' }}
                                disabled={deletingProject}
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmDeleteProject}
                                className="btn-primary"
                                style={{
                                    flex: 1.5,
                                    padding: '12px 16px',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                    boxShadow: '0 4px 20px rgba(239,68,68,0.3)',
                                    border: 'none',
                                    cursor: deletingProject ? 'not-allowed' : 'pointer'
                                }}
                                disabled={deletingProject}
                            >
                                {deletingProject ? 'Menghapus...' : 'Ya, Hapus Project'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ── MODAL: CUSTOM ARCHIVE PROJECT CONFIRMATION ── */}
            {projectToArchive && (
                <div className="modal-overlay" onClick={() => { if (!archivingProject) setProjectToArchive(null); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '90%' }}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(251,191,36,0.15)', color: '#fbbf24', fontSize: '28px', marginBottom: '16px' }}>
                                ⚠️
                            </div>
                            <h3 className="title-gradient" style={{ fontSize: '22px', margin: '0 0 8px 0', fontWeight: 'bold' }}>Arsipkan Project</h3>
                            <p style={{ color: '#a1a1aa', margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                                Apakah Anda yakin ingin mengarsipkan project <strong>"{projectToArchive.name}"</strong>?
                            </p>
                        </div>

                        <div style={{ background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', fontSize: '13px', color: '#fbbf24', lineHeight: '1.5' }}>
                            ⚠️ <strong>Peringatan pembersihan data:</strong> Mengarsipkan project akan secara otomatis menghapus seluruh data berkas fisik foto (file asli & thumbnail) dari server secara permanen demi menghemat ruang penyimpanan. Tindakan ini tidak dapat dibatalkan!
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setProjectToArchive(null)}
                                className="btn-secondary"
                                style={{ flex: 1, padding: '12px 16px', fontSize: '14px' }}
                                disabled={archivingProject}
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmArchiveProject}
                                className="btn-primary"
                                style={{
                                    flex: 1.5,
                                    padding: '12px 16px',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                    boxShadow: '0 4px 20px rgba(251,191,36,0.3)',
                                    border: 'none',
                                    cursor: archivingProject ? 'not-allowed' : 'pointer'
                                }}
                                disabled={archivingProject}
                            >
                                {archivingProject ? 'Mengarsipkan...' : 'Ya, Arsipkan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ── MODAL: CUSTOM ADD LIMIT ── */}
            {addLimitProject && (
                <div className="modal-overlay" onClick={() => { if (!savingAddLimit) setAddLimitProject(null); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', width: '90%' }}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(129,140,248,0.15)', color: '#818cf8', fontSize: '24px', marginBottom: '12px' }}>
                                ➕
                            </div>
                            <h3 className="title-gradient" style={{ fontSize: '20px', margin: '0 0 4px 0', fontWeight: 'bold' }}>Tambah Limit Pilihan</h3>
                            <p style={{ color: '#a1a1aa', margin: 0, fontSize: '13px' }}>Project: <strong>{addLimitProject.name}</strong></p>
                        </div>

                        <form onSubmit={handleSaveAddLimit}>
                            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#e4e4e7' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span style={{ color: '#a1a1aa' }}>Limit Saat Ini:</span>
                                    <strong>{addLimitProject.maxSelection || 'Bebas'} foto</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#a1a1aa' }}>Foto Terpilih Klien:</span>
                                    <strong>{addLimitProject.selectedPhotosCount} foto</strong>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: '13px', color: '#e4e4e7', fontWeight: '600' }}>Jumlah Foto Tambahan</label>
                                <input
                                    type="number"
                                    className="input-text"
                                    min="1"
                                    required
                                    value={additionalCount}
                                    onChange={(e) => setAdditionalCount(Math.max(1, parseInt(e.target.value) || 1))}
                                    disabled={savingAddLimit}
                                    style={{ marginTop: '6px' }}
                                />
                                <span style={{ fontSize: '11px', color: '#71717a', display: 'block', marginTop: '6px', lineHeight: '1.4' }}>
                                    Kuota seleksi klien akan ditambah sebanyak {additionalCount} foto. Limit baru akan menjadi {(addLimitProject.maxSelection || 0) + (parseInt(additionalCount) || 1)} foto. Galeri klien juga otomatis akan dibuka kuncinya.
                                </span>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setAddLimitProject(null)} disabled={savingAddLimit}>
                                    Batal
                                </button>
                                <button type="submit" className="btn-primary" style={{ flex: 1.5, background: 'linear-gradient(135deg, #818cf8, #6366f1)', border: 'none', boxShadow: '0 4px 14px rgba(99,102,241,0.25)' }} disabled={savingAddLimit}>
                                    {savingAddLimit ? 'Menyimpan...' : 'Tambah & Buka Kunci'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}


            {/* ── RAW SORTER DRAWER ── */}
            <RawSorterDrawer
                isOpen={showSorter}
                onClose={() => setShowSorter(false)}
                project={sorterProject}
                vendorPlan={vendorDetails?.planType || ''}
            />

        </div>
    );
}
