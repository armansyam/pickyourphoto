"use client";

import { useState, useEffect, useCallback } from 'react';

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
    const [galleryTheme, setGalleryTheme] = useState('default');
 
    // Edit project settings states
    const [editingProject, setEditingProject] = useState(null);
    const [editProjectName, setEditProjectName] = useState('');
    const [editProjectGalleryTheme, setEditProjectGalleryTheme] = useState('contactSheet');
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

    // Archived and Tab states
    const [archivedProjects, setArchivedProjects] = useState([]);
    const [activeTab, setActiveTab] = useState('active'); // 'active' | 'archived'

    // Branding modal states
    const [showBrandingModal, setShowBrandingModal] = useState(false);
    const [vendorName, setVendorName] = useState('');
    const [brandName, setBrandName] = useState('');
    const [brandLogoFile, setBrandLogoFile] = useState(null);
    const [brandLogoPreview, setBrandLogoPreview] = useState('');
    const [savingBranding, setSavingBranding] = useState(false);

    // Upgrade plan & WA admin states
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [availablePlans, setAvailablePlans] = useState([]);
    const [adminWhatsapp, setAdminWhatsapp] = useState('');
    const [selectedUpgradePlan, setSelectedUpgradePlan] = useState(null);
    const [transferProofFile, setTransferProofFile] = useState(null);
    const [isSubmittingUpgrade, setIsSubmittingUpgrade] = useState(false);
    const [upgradeError, setUpgradeError] = useState('');
    const [bankSettings, setBankSettings] = useState(null);

    // Project deletion states
    const [projectToDelete, setProjectToDelete] = useState(null);
    const [deletingProject, setDeletingProject] = useState(false);

    // Project archive confirmation states
    const [projectToArchive, setProjectToArchive] = useState(null);
    const [archivingProject, setArchivingProject] = useState(false);

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
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) {
            return { discount: 0, total: targetPlan.price, daysRemaining: 0, isDowngrade: false };
        }

        const discount = Math.round((currentPrice / currentDays) * diffDays);
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
        console.log("--> [Client] fetchProjects() called");
        try {
            const res = await fetch('/api/projects');
            console.log("--> [Client] fetchProjects() response status:", res.status);
            if (res.ok) {
                const data = await res.json();
                console.log("--> [Client] fetchProjects() data:", data);
                setProjects(data.projects || []);
                setArchivedProjects(data.archivedProjects || []);
                if (data.vendor) {
                    setVendorDetails(data.vendor);
                    setVendorName(data.vendor.name || '');
                    setBrandName(data.vendor.brandName || '');
                    setBrandLogoPreview(data.vendor.brandLogo || '');
                }
            } else {
                console.warn("--> [Client] fetchProjects() res not OK:", res.status);
            }
        } catch (err) {
            console.error('Error fetching projects:', err);
        } finally {
            console.log("--> [Client] fetchProjects() finally block, setting loading to false");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
        // Fetch admin WA and available plans
        fetch('/api/settings').then(r => r.json()).then(s => {
            setAdminWhatsapp(s.contact_whatsapp || '');
            setBankSettings({
                bankName: s.bank_name || '',
                bankAccountNumber: s.bank_account_number || '',
                bankAccountName: s.bank_account_name || ''
            });
        }).catch(() => {});
        fetch('/api/plans').then(r => r.json()).then(p => setAvailablePlans(Array.isArray(p) ? p : [])).catch(() => {});
    }, []);

    // Polling effect if any project has "importing" status
    useEffect(() => {
        const hasImporting = projects.some(p => p.status === 'importing') || archivedProjects.some(p => p.status === 'importing');
        if (!hasImporting) return;

        const interval = setInterval(() => {
            fetchProjects();
        }, 4000); // Poll every 4 seconds

        return () => clearInterval(interval);
    }, [projects, archivedProjects]);

    // Create Project
    const handleCreateProject = async (e) => {
        e.preventDefault();
        setImporting(true);
        setImportError('');
 
        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newProjectName, folderUrl: newFolderUrl, maxSelection: parseInt(maxSelection) || 0, galleryTheme })
            });
 
            const data = await res.json();
 
            if (!res.ok) {
                if (data.limitExceeded) {
                    setPendingProjectParams({ name: newProjectName, folderUrl: newFolderUrl, maxSelection: parseInt(maxSelection) || 0, galleryTheme });
                    setLimitExceededInfo({ limit: data.limit, totalFiles: data.totalFiles });
                    setShowLimitConfirmModal(true);
                    return;
                }
                throw new Error(data.message || 'Failed to create project.');
            }
 
            // Reset
            setNewProjectName('');
            setNewFolderUrl('');
            setMaxSelection(0);
            setGalleryTheme('contactSheet');
            setShowCreateModal(false);
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

    const handleUpdateProjectStatus = async (projectId, status, actionLabel) => {
        if (status === 'archived') {
            const proj = projects.find(p => p.id === projectId) || archivedProjects.find(p => p.id === projectId);
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
                setDetailPhotos(data.photos || []);
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

    // Copy Selected Filenames to Clipboard (auto-fetches from API)
    const handleCopyFilenames = async (projectId) => {
        try {
            const res = await fetch(`/api/projects/${projectId}`);
            if (!res.ok) throw new Error('Gagal mengambil data project.');
            const data = await res.json();
            const photos = data.photos || [];

            const selected = photos.filter(p => p.isSelected > 0);
            if (selected.length === 0) {
                addToast('Klien belum memilih foto.', 'warning');
                return;
            }

            // Extract base filename without path and extension
            const filenames = selected.map(p => {
                const basename = p.originalPath.split('/').pop();
                const dotIdx = basename.lastIndexOf('.');
                return dotIdx !== -1 ? basename.substring(0, dotIdx) : basename;
            });

            const listString = filenames.join(', ');

            // Copy using clipboard API with fallback
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(listString)
                    .then(() => addToast(`✅ Berhasil menyalin ${selected.length} nama file ke clipboard!`, 'success'))
                    .catch(() => {
                        const textarea = document.createElement('textarea');
                        textarea.value = listString;
                        textarea.style.position = 'fixed';
                        textarea.style.left = '-9999px';
                        document.body.appendChild(textarea);
                        textarea.focus();
                        textarea.select();
                        try { document.execCommand('copy'); addToast(`✅ Berhasil menyalin ${selected.length} nama file!`, 'success'); } catch { prompt('Salin secara manual:', listString); }
                        document.body.removeChild(textarea);
                    });
            } else {
                prompt('Salin nama file berikut secara manual:', listString);
            }
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
                            onClick={() => setShowUpgradeModal(true)} 
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
                            href={`https://wa.me/${adminWhatsapp}?text=${encodeURIComponent(`Halo Admin, saya vendor ${vendorDetails.name}. Saya sudah mengupload bukti transfer pembayaran upgrade ke paket ${vendorDetails.upgradeRequest.planName} sebesar Rp ${Number(vendorDetails.upgradeRequest.proratedPrice).toLocaleString('id-ID')}. Mohon bantuannya untuk melakukan konfirmasi. Terima kasih!`)}`}
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '16px', marginBottom: '16px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 'bold' }}>Dashboard</h1>
                    <p style={{ color: '#a1a1aa', margin: '4px 0 0 0', fontSize: '14px' }}>
                        Kelola project seleksi foto klien
                        {vendorDetails && (
                            <span> — Paket: <strong>{vendorDetails.planName || 'Basic'} Plan</strong> (Masa aktif s/d: {vendorDetails.expiresAt ? new Date(vendorDetails.expiresAt).toLocaleDateString() : 'Lifetime'})</span>
                        )}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                    {adminWhatsapp && (
                        <a
                            href={`https://wa.me/${adminWhatsapp}?text=${encodeURIComponent('Halo Admin, saya vendor ' + (vendorDetails?.name || '') + '. Saya ingin bertanya mengenai layanan Pick Your Photo.')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Hubungi Admin via WhatsApp"
                            style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)', background: 'rgba(52,211,153,0.06)', borderRadius: '8px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                            💬 <span>WA Admin</span>
                        </a>
                    )}
                    <button
                        onClick={() => setShowUpgradeModal(true)}
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                    {vendorDetails.planType === 'storage' ? (
                        <>
                            <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '12px', padding: '14px 18px' }}>
                                <p style={{ margin: 0, fontSize: '11px', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Penyimpanan (Storage)</p>
                                <p style={{ margin: '6px 0 4px 0', fontSize: '22px', fontWeight: '700', color: '#e4e4e7' }}>
                                    {vendorDetails.usedStorageBytes >= 1024 * 1024 * 1024
                                        ? `${((vendorDetails.usedStorageBytes || 0) / (1024 * 1024 * 1024)).toFixed(2)} GB`
                                        : `${((vendorDetails.usedStorageBytes || 0) / (1024 * 1024)).toFixed(1)} MB`
                                    }
                                    <span style={{ fontSize: '14px', color: '#71717a', fontWeight: '400' }}>
                                        {' '} / {vendorDetails.maxStorageMB >= 1024
                                            ? `${(vendorDetails.maxStorageMB / 1024).toFixed(1)} GB`
                                            : `${vendorDetails.maxStorageMB} MB`
                                        }
                                    </span>
                                </p>
                                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginTop: '8px' }}>
                                    <div style={{ 
                                        width: `${Math.min(100, ((vendorDetails.usedStorageBytes || 0) / ((vendorDetails.maxStorageMB || 1) * 1024 * 1024) * 100))}%`, 
                                        height: '100%', 
                                        background: ((vendorDetails.usedStorageBytes || 0) / ((vendorDetails.maxStorageMB || 1) * 1024 * 1024) * 100) > 90 ? '#ef4444' : '#6366f1', 
                                        borderRadius: '3px',
                                        transition: 'width 0.3s ease'
                                    }} />
                                </div>
                            </div>
                            <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: '12px', padding: '14px 18px' }}>
                                <p style={{ margin: 0, fontSize: '11px', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Maks Project</p>
                                <p style={{ margin: '6px 0 0 0', fontSize: '22px', fontWeight: '700', color: '#e4e4e7' }}>
                                    {projects.length} <span style={{ fontSize: '14px', color: '#71717a', fontWeight: '400' }}>/ Tak Terbatas</span>
                                </p>
                            </div>
                            <div style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: '12px', padding: '14px 18px' }}>
                                <p style={{ margin: 0, fontSize: '11px', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Masa Aktif Akun</p>
                                <p style={{ margin: '6px 0 0 0', fontSize: '18px', fontWeight: '700', color: '#e4e4e7' }}>
                                    {vendorDetails.expiresAt 
                                        ? new Date(vendorDetails.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                        : 'Selamanya'
                                    }
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '12px', padding: '14px 18px' }}>
                                <p style={{ margin: 0, fontSize: '11px', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Maks Project</p>
                                <p style={{ margin: '6px 0 0 0', fontSize: '22px', fontWeight: '700', color: '#e4e4e7' }}>
                                    {projects.length} <span style={{ fontSize: '14px', color: '#71717a', fontWeight: '400' }}>/ {vendorDetails.maxProjects || '∞'}</span>
                                </p>
                            </div>
                            <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: '12px', padding: '14px 18px' }}>
                                <p style={{ margin: 0, fontSize: '11px', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Maks Foto / Project</p>
                                <p style={{ margin: '6px 0 0 0', fontSize: '22px', fontWeight: '700', color: '#e4e4e7' }}>
                                    {vendorDetails.maxPhotosPerProject || '∞'} <span style={{ fontSize: '14px', color: '#71717a', fontWeight: '400' }}>foto</span>
                                </p>
                            </div>
                            <div style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: '12px', padding: '14px 18px' }}>
                                <p style={{ margin: 0, fontSize: '11px', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Masa Aktif Akun</p>
                                <p style={{ margin: '6px 0 0 0', fontSize: '18px', fontWeight: '700', color: '#e4e4e7' }}>
                                    {vendorDetails.expiresAt 
                                        ? new Date(vendorDetails.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                        : 'Selamanya'
                                    }
                                </p>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Tabs + Create Project */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '24px', paddingBottom: '0px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => setActiveTab('active')}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: activeTab === 'active' ? '#6366f1' : '#a1a1aa',
                            borderBottom: activeTab === 'active' ? '2px solid #6366f1' : 'none',
                            padding: '10px 16px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            transition: 'all 0.2s'
                        }}
                    >
                        Project Aktif ({projects.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('archived')}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: activeTab === 'archived' ? '#6366f1' : '#a1a1aa',
                            borderBottom: activeTab === 'archived' ? '2px solid #6366f1' : 'none',
                            padding: '10px 16px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            transition: 'all 0.2s'
                        }}
                    >
                        Arsip / Kedaluwarsa ({archivedProjects.length})
                    </button>
                </div>
                
                {/* Create Project Button on the right of tabs */}
                <button
                    onClick={() => {
                        if (vendorDetails?.isExpired) {
                            addToast('Masa aktif paket berlangganan Anda telah habis. Silakan hubungi admin untuk melakukan perpanjangan.', 'warning', 10000);
                            return;
                        }
                        setShowCreateModal(true);
                    }}
                    className="btn-primary"
                    style={{
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: vendorDetails?.isExpired ? '#4b5563' : '',
                        color: vendorDetails?.isExpired ? '#9ca3af' : '',
                        cursor: vendorDetails?.isExpired ? 'not-allowed' : 'pointer',
                        boxShadow: vendorDetails?.isExpired ? 'none' : '',
                        borderRadius: '8px',
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <span>➕</span> Buat Project
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', marginTop: '64px', color: '#a1a1aa' }}>
                    <p>Memuat project...</p>
                </div>
            ) : (activeTab === 'active' ? projects.length : archivedProjects.length) === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', marginTop: '48px', padding: '64px 32px' }}>
                    <h3 style={{ fontSize: '20px', margin: '0 0 8px 0' }}>Project Tidak Ditemukan</h3>
                    <p style={{ color: '#a1a1aa', margin: '0 0 24px 0', fontSize: '14px' }}>
                        {activeTab === 'active' ? 'Mulai dengan membuat project seleksi baru dari Google Drive' : 'Belum ada project yang diarsipkan atau diselesaikan'}
                    </p>
                    {activeTab === 'active' && (
                        <button 
                            onClick={() => {
                                if (vendorDetails?.isExpired) {
                                    addToast('Masa aktif paket berlangganan Anda telah habis. Silakan hubungi admin untuk melakukan perpanjangan.', 'warning', 10000);
                                    return;
                                }
                                setShowCreateModal(true);
                            }} 
                            className="btn-primary"
                        >
                            Buat Project
                        </button>
                    )}
                </div>
            ) : (
                <div className="project-grid">
                    {(activeTab === 'active' ? projects : archivedProjects).map((project) => (
                        <div key={project.id} className="project-card">
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <span className={`status-badge ${project.status === 'completed' ? 'status-completed' :
                                            project.status === 'importing' ? 'status-pending' :
                                                project.status === 'failed' ? 'status-failed' : 'status-pending'
                                        }`} style={{
                                            background: project.status === 'importing' ? 'rgba(251,191,36,0.15)' :
                                                project.status === 'failed' ? 'rgba(239,68,68,0.15)' : '',
                                            color: project.status === 'importing' ? '#fbbf24' :
                                                project.status === 'failed' ? '#f87171' : '',
                                            borderColor: project.status === 'importing' ? 'rgba(251,191,36,0.25)' :
                                                project.status === 'failed' ? 'rgba(239,68,68,0.25)' : ''
                                        }}>
                                        {project.status === 'completed' ? '✓ Selesai Dipilih' :
                                            project.status === 'importing' ? '⏳ Sedang Mengimpor...' :
                                                project.status === 'failed' ? '❌ Impor Gagal' : '● Menunggu Seleksi'}
                                    </span>
                                    <span style={{ fontSize: '11.5px', color: '#71717a', background: 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        Dibuat: {new Date(project.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                    </span>
                                </div>
                                <h3 style={{ fontSize: '20px', margin: '0 0 8px 0', fontWeight: '600' }}>{project.name}</h3>
                                <p style={{ fontSize: '14px', color: '#a1a1aa', margin: '0 0 16px 0' }}>
                                    Pilihan: <strong>{project.selectedPhotosCount}</strong> dari <strong>{project.maxSelection > 0 ? project.maxSelection : 'Bebas'}</strong> foto terpilih (Total: {project.totalPhotos} foto)
                                </p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {project.status === 'failed' && (
                                    <button
                                        onClick={() => handleRetryImport(project.id)}
                                        className="btn-primary"
                                        style={{ 
                                            width: '100%', 
                                            padding: '10px', 
                                            background: 'linear-gradient(135deg, #fbbf24, #d97706)', 
                                            color: '#000', 
                                            fontWeight: '700', 
                                            fontSize: '13px', 
                                            borderRadius: '10px', 
                                            cursor: 'pointer', 
                                            border: 'none',
                                            boxShadow: '0 4px 12px rgba(251,191,36,0.15)',
                                            transition: 'transform 0.1s'
                                        }}
                                        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                                        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        🔄 Coba Impor Lagi
                                    </button>
                                )}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        className="btn-secondary"
                                        style={{ flex: 1, padding: '8px 12px', fontSize: '13px', opacity: (project.status === 'importing' || project.status === 'failed') ? 0.5 : 1, cursor: (project.status === 'importing' || project.status === 'failed') ? 'not-allowed' : 'pointer' }}
                                        onClick={() => handleCopyLink(project.id, project.clientAccessKey)}
                                        disabled={project.status === 'importing' || project.status === 'failed'}
                                    >
                                        Salin Link Klien
                                    </button>
                                    <button
                                        className="btn-secondary"
                                        style={{ flex: 1, padding: '8px 12px', fontSize: '13px', opacity: (project.status === 'importing' || project.status === 'failed') ? 0.5 : 1, cursor: (project.status === 'importing' || project.status === 'failed') ? 'not-allowed' : 'pointer' }}
                                        onClick={() => handleViewDetails(project)}
                                        disabled={project.status === 'importing' || project.status === 'failed'}
                                    >
                                        Detail Seleksi
                                    </button>
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        className="btn-primary"
                                        style={{ flex: 2.2, padding: '8px 12px', fontSize: '13px', background: project.status === 'completed' ? '' : 'rgba(99,102,241,0.2)', border: project.status === 'completed' ? '' : '1px solid rgba(255,255,255,0.05)', boxShadow: project.status === 'completed' ? '' : 'none', color: project.status === 'completed' ? '' : '#a1a1aa', opacity: (project.status === 'importing' || project.status === 'failed') ? 0.5 : 1, cursor: (project.status === 'importing' || project.status === 'failed') ? 'not-allowed' : 'pointer' }}
                                        onClick={() => handleCopyFilenames(project.id)}
                                        disabled={project.selectedPhotosCount === 0 || project.status === 'importing' || project.status === 'failed'}
                                    >
                                        Salin Nama File
                                    </button>
                                    <button
                                        className="btn-secondary"
                                        style={{ width: '42px', padding: '8px 0', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (project.status === 'importing' || project.status === 'failed') ? 0.5 : 1, cursor: (project.status === 'importing' || project.status === 'failed') ? 'not-allowed' : 'pointer' }}
                                        onClick={() => handleOpenEditProject(project)}
                                        disabled={project.status === 'importing' || project.status === 'failed'}
                                        title="Pengaturan Project"
                                    >
                                        ⚙️
                                    </button>
                                    <button
                                        className="btn-danger"
                                        style={{ flex: 1, padding: '8px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none' }}
                                        onClick={() => handleDeleteProject(project.id, project.name)}
                                    >
                                        Hapus
                                    </button>
                                </div>
                                {project.selectedPhotosCount > 0 && (
                                    <div style={{ marginTop: '8px', textAlign: 'center' }}>
                                        <a 
                                            href="/guide.html" 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            style={{ fontSize: '11.5px', color: '#a1a1aa', textDecoration: 'underline' }}
                                        >
                                            📖 Panduan mencari file hasil seleksi
                                        </a>
                                    </div>
                                )}
                                {(project.status === 'completed' || (project.status === 'pending_selection' && project.maxSelection > 0 && project.selectedPhotosCount >= project.maxSelection)) && (
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                        <button
                                            className="btn-secondary"
                                            style={{ flex: 1.2, padding: '8px 12px', fontSize: '12px', border: '1px dashed rgba(129,140,248,0.3)', color: '#818cf8' }}
                                            onClick={() => handleOpenAddLimit(project)}
                                        >
                                            ➕ Tambah Limit
                                        </button>
                                        {project.status === 'completed' ? (
                                            <>
                                                <button
                                                    className="btn-secondary"
                                                    style={{ flex: 1, padding: '8px 12px', fontSize: '12px', border: '1px dashed rgba(251,191,36,0.3)', color: '#fbbf24' }}
                                                    onClick={() => handleUpdateProjectStatus(project.id, 'pending_selection', 'dibuka kuncinya')}
                                                >
                                                    🔓 Buka Kunci
                                                </button>
                                                <button
                                                    className="btn-secondary"
                                                    style={{ flex: 1, padding: '8px 12px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.05)', color: '#a1a1aa' }}
                                                    onClick={() => handleUpdateProjectStatus(project.id, 'archived', 'diarsipkan')}
                                                >
                                                    🗄️ Arsipkan
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                className="btn-secondary"
                                                style={{ flex: 1, padding: '8px 12px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.05)', color: '#a1a1aa' }}
                                                onClick={() => handleUpdateProjectStatus(project.id, 'archived', 'diarsipkan')}
                                            >
                                                🗄️ Arsipkan
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

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
                                <label className="form-label">Tema Galeri Klien</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '6px' }}>
                                    {[
                                        { key: 'default', name: 'Tema Default Gallery', desc: 'Gelap bawaan asli, aksen indigo & rapi' },
                                        { key: 'contactSheet', name: 'Kontak Studio', desc: 'Gelap retro, ala lembar kontak film' },
                                        { key: 'galleryWall', name: 'Galeri Putih', desc: 'Terang bersih, tenang' },
                                        { key: 'editorsMark', name: 'Tanda Editor', desc: 'Spidol merah, tegas' },
                                        { key: 'polaroid', name: 'Polaroid Kenangan', desc: 'Seni polaroid, miring hangat' },
                                    ].map(t => (
                                        <div 
                                            key={t.key}
                                            onClick={() => !importing && setGalleryTheme(t.key)}
                                            style={{
                                                background: galleryTheme === t.key ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.02)',
                                                border: galleryTheme === t.key ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
                                                borderRadius: '8px',
                                                padding: '12px',
                                                cursor: importing ? 'not-allowed' : 'pointer',
                                                transition: 'all 0.2s',
                                                boxShadow: galleryTheme === t.key ? '0 0 12px rgba(99,102,241,0.2)' : 'none'
                                            }}
                                        >
                                            <div style={{ fontWeight: 'bold', fontSize: '13px', color: galleryTheme === t.key ? '#818cf8' : '#e4e4e7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {galleryTheme === t.key && <span style={{ color: '#818cf8' }}>●</span>} {t.name}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#71717a', marginTop: '4px', lineHeight: '1.3' }}>
                                                {t.desc}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
 
                            <div style={{ display: 'flex', gap: '12px', marginTop: '28px', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)} disabled={importing}>
                                    Batal
                                </button>
                                <button type="submit" className="btn-primary" disabled={importing}>
                                    {importing ? 'Mengimpor Folder...' : 'Impor & Buat'}
                                </button>
                            </div>
                        </form>
 
                        {importing && (
                            <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                                <div className="dev-watermark-dot" style={{ margin: '0 auto 12px auto', width: '8px', height: '8px' }} />
                                <p style={{ fontSize: '13px', color: '#818cf8', margin: 0, fontWeight: 'bold' }}>Sedang mengimpor isi folder...</p>
                                <p style={{ fontSize: '12px', color: '#71717a', margin: '4px 0 0 0' }}>Kami sedang mengunduh, mengompres, dan mengoptimalkan file JPG Anda untuk web. Ini mungkin memakan waktu 10-30 detik tergantung pada ukuran folder.</p>
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
                                <p style={{ color: '#a1a1aa', margin: '4px 0 0 0', fontSize: '13px' }}>
                                    Showing selection results ({detailPhotos.filter(p => p.isSelected > 0).length} of {detailPhotos.length} selected)
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
                                <p style={{ textAlign: 'center', color: '#a1a1aa', margin: '40px 0' }}>No photos found in this project.</p>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
                                    {detailPhotos.map((photo) => (
                                        <div key={photo.id} style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: photo.isSelected > 0 ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.05)', aspectRatio: '3/2' }}>
                                            <img src={photo.thumbnailPath} alt="Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            {photo.isSelected > 0 && (
                                                <div style={{ position: 'absolute', top: '8px', right: '8px', background: '#6366f1', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                                                    ✓
                                                </div>
                                            )}
                                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', padding: '4px 8px', fontSize: '10px', color: '#e4e4e7', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={photo.originalPath.split('/').pop()}>
                                                {photo.originalPath.split('/').pop()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', flexWrap: 'wrap', gap: '12px', width: '100%' }}>
                            <a 
                                class="guide-link"
                                href="/guide.html" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                style={{ fontSize: '13px', color: '#818cf8', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                📖 Cara pakai daftar nama file di Finder/Lightroom
                            </a>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button className="btn-secondary" onClick={() => setSelectedProjectDetails(null)}>
                                    Close
                                </button>
                                <button
                                    className="btn-primary"
                                    disabled={detailPhotos.filter(p => p.isSelected > 0).length === 0}
                                    onClick={() => handleCopyFilenames(selectedProjectDetails.id)}
                                >
                                    Copy Filenames to Clipboard
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

                            <div className="form-group">
                                <label className="form-label">Tema Galeri Klien</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '6px' }}>
                                    {[
                                        { key: 'default', name: 'Tema Default Gallery', desc: 'Gelap bawaan asli, aksen indigo & rapi' },
                                        { key: 'contactSheet', name: 'Kontak Studio', desc: 'Gelap retro, ala lembar kontak film' },
                                        { key: 'galleryWall', name: 'Galeri Putih', desc: 'Terang bersih, tenang' },
                                        { key: 'editorsMark', name: 'Tanda Editor', desc: 'Spidol merah, tegas' },
                                        { key: 'polaroid', name: 'Polaroid Kenangan', desc: 'Seni polaroid, miring hangat' },
                                    ].map(t => (
                                        <div 
                                            key={t.key}
                                            onClick={() => !savingProjectSettings && setEditProjectGalleryTheme(t.key)}
                                            style={{
                                                background: editProjectGalleryTheme === t.key ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.02)',
                                                border: editProjectGalleryTheme === t.key ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
                                                borderRadius: '8px',
                                                padding: '12px',
                                                cursor: savingProjectSettings ? 'not-allowed' : 'pointer',
                                                transition: 'all 0.2s',
                                                boxShadow: editProjectGalleryTheme === t.key ? '0 0 12px rgba(99,102,241,0.2)' : 'none'
                                            }}
                                        >
                                            <div style={{ fontWeight: 'bold', fontSize: '13px', color: editProjectGalleryTheme === t.key ? '#818cf8' : '#e4e4e7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {editProjectGalleryTheme === t.key && <span style={{ color: '#818cf8' }}>●</span>} {t.name}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#71717a', marginTop: '4px', lineHeight: '1.3' }}>
                                                {t.desc}
                                            </div>
                                        </div>
                                    ))}
                                </div>
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
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '22px', fontWeight: 'bold' }}>Brand Settings</h3>
                        <p style={{ color: '#a1a1aa', margin: '0 0 24px 0', fontSize: '14px' }}>Customize branding on your client gallery pages</p>

                        <form onSubmit={handleSaveBranding}>
                            <div className="form-group">
                                <label className="form-label">Photographer Name</label>
                                <input
                                    type="text"
                                    className="input-text"
                                    required
                                    value={vendorName}
                                    onChange={(e) => setVendorName(e.target.value)}
                                    disabled={savingBranding}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Brand / Studio Name</label>
                                <input
                                    type="text"
                                    className="input-text"
                                    placeholder="e.g. AmsDev Photography"
                                    value={brandName}
                                    onChange={(e) => setBrandName(e.target.value)}
                                    disabled={savingBranding}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Brand Logo (Image file)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setBrandLogoFile(e.target.files[0])}
                                    disabled={savingBranding}
                                    style={{ color: '#a1a1aa', padding: '6px 0' }}
                                />
                                {brandLogoPreview && (
                                    <div style={{ marginTop: '12px' }}>
                                        <p style={{ fontSize: '12px', color: '#71717a', margin: '0 0 6px 0' }}>Current Logo Preview:</p>
                                        <img
                                            src={brandLogoPreview}
                                            alt="Brand Logo"
                                            style={{ maxHeight: '60px', objectFit: 'contain', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', padding: '4px' }}
                                        />
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '28px', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowBrandingModal(false)} disabled={savingBranding}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" disabled={savingBranding}>
                                    {savingBranding ? 'Saving...' : 'Save Settings'}
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
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: selectedUpgradePlan ? '560px' : '760px' }}>
                        <h2 style={{ margin: '0 0 8px 0', fontSize: '22px' }}>🚀 Upgrade Plan</h2>
                        
                        {!selectedUpgradePlan ? (
                            <>
                                <p style={{ margin: '0 0 24px 0', color: '#a1a1aa', fontSize: '14px' }}>
                                    Pilih paket yang sesuai kebutuhan Anda. Nilai sisa paket lama Anda akan otomatis memotong harga paket baru secara prorata.
                                </p>

                                <div style={{ display: 'grid', gridTemplateColumns: availablePlans.length > 2 ? 'repeat(auto-fit, minmax(200px, 1fr))' : 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                                    {availablePlans.filter(plan => {
                                        const isCurrentPlan = vendorDetails?.planId === plan.id;
                                        if (plan.price === 0 && !isCurrentPlan) {
                                            return false;
                                        }
                                        return true;
                                    }).map(plan => {
                                        const isCurrentPlan = vendorDetails?.planId === plan.id;
                                        const accentColor = isCurrentPlan ? '#6366f1' : '#71717a';
                                        
                                        // Calculate proration
                                        const { discount, total } = getProrationDetails(plan);

                                        return (
                                            <div key={plan.id} style={{
                                                background: isCurrentPlan ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
                                                border: `1.5px solid ${isCurrentPlan ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.06)'}`,
                                                borderRadius: '14px',
                                                padding: '22px 20px',
                                                position: 'relative',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between'
                                            }}>
                                                <div>
                                                    {isCurrentPlan && (
                                                        <div style={{ position: 'absolute', top: '-10px', right: '14px', background: '#6366f1', color: 'white', fontSize: '10px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                            Paket Anda
                                                        </div>
                                                    )}
                                                    <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '700', color: '#e4e4e7' }}>{plan.name}</h3>
                                                    <p style={{ margin: '0 0 16px 0', fontSize: '22px', fontWeight: '800', color: accentColor }}>
                                                        {plan.price === 0 ? 'Gratis' : `Rp ${Number(plan.price).toLocaleString('id-ID')}`}
                                                    </p>
                                                    
                                                    {!isCurrentPlan && discount > 0 && (
                                                        <div style={{ background: 'rgba(52,211,153,0.08)', borderRadius: '8px', padding: '6px 10px', marginBottom: '14px', fontSize: '11px', color: '#34d399', border: '1px solid rgba(52,211,153,0.15)' }}>
                                                            Potongan Prorata:<br/>
                                                            <strong>- Rp {discount.toLocaleString('id-ID')}</strong> (Sisa {getProrationDetails(plan).daysRemaining} hari)
                                                        </div>
                                                    )}

                                                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', fontSize: '13px', color: '#a1a1aa', lineHeight: '2' }}>
                                                        <li>📁 Maks <strong style={{ color: '#e4e4e7' }}>{plan.maxProjects}</strong> project</li>
                                                        <li>⏳ Masa Aktif Akun: <strong style={{ color: '#e4e4e7' }}>{plan.activePeriodDays || '—'}</strong> hari</li>
                                                        <li>⏳ Masa Aktif Galeri Klien: <strong style={{ color: '#e4e4e7' }}>{plan.projectExpireDays || '—'}</strong> hari</li>
                                                        <li>📷 Maks <strong style={{ color: '#e4e4e7' }}>{plan.maxPhotosPerProject || '∞'}</strong> foto/project</li>
                                                    </ul>
                                                </div>

                                                {isCurrentPlan ? (
                                                    plan.price > 0 ? (
                                                        <button
                                                            onClick={() => {
                                                                if (vendorDetails?.upgradeRequest) {
                                                                    addToast('Anda sudah memiliki permintaan perpanjangan plan yang sedang diproses.', 'warning');
                                                                    return;
                                                                }
                                                                setSelectedUpgradePlan(plan);
                                                            }}
                                                            className="btn-primary"
                                                            style={{
                                                                width: '100%',
                                                                padding: '10px',
                                                                textAlign: 'center',
                                                                background: '#fbbf24',
                                                                color: '#000',
                                                                borderRadius: '10px',
                                                                fontWeight: '700',
                                                                fontSize: '13px',
                                                                cursor: 'pointer',
                                                                boxShadow: 'none',
                                                                border: 'none'
                                                            }}
                                                        >
                                                            🔄 Perpanjang Paket
                                                        </button>
                                                    ) : (
                                                        <div style={{ height: '38px', textAlign: 'center', color: '#a1a1aa', fontSize: '12px', padding: '10px 0', fontWeight: 'bold' }}>
                                                            Trial tidak dapat diperpanjang
                                                        </div>
                                                    )
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            if (vendorDetails?.upgradeRequest) {
                                                                addToast('Anda sudah memiliki permintaan upgrade plan yang sedang diproses.', 'warning');
                                                                return;
                                                            }
                                                            setSelectedUpgradePlan(plan);
                                                        }}
                                                        className="btn-primary"
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px',
                                                            textAlign: 'center',
                                                            background: '#6366f1',
                                                            borderRadius: '10px',
                                                            fontWeight: '600',
                                                            fontSize: '13px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Pilih {plan.name} {discount > 0 && `(Rp ${total.toLocaleString('id-ID')})`}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                                    <button className="btn-secondary" onClick={() => setShowUpgradeModal(false)}>Batal</button>
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
                                            ℹ️ <strong>Informasi:</strong> Perpanjangan paket akan menambahkan masa aktif plan Anda selama <strong>{selectedUpgradePlan.projectExpireDays || 30} hari</strong> secara akumulatif.
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
                                        <span style={{ color: '#e4e4e7' }}>{selectedUpgradePlan.id === vendorDetails?.planId ? 'Biaya Perpanjangan' : 'Total Transfer'}</span>
                                        <span style={{ color: '#fbbf24' }}>Rp {selectedUpgradePlan.price.toLocaleString('id-ID')}</span>
                                    </div>
                                </div>

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

                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                                    <button type="button" className="btn-secondary" onClick={() => {
                                        setSelectedUpgradePlan(null);
                                        setTransferProofFile(null);
                                        setUpgradeError('');
                                    }} disabled={isSubmittingUpgrade}>Kembali</button>
                                    
                                    <button type="submit" className="btn-primary" disabled={isSubmittingUpgrade || !transferProofFile}>
                                        {isSubmittingUpgrade ? 'Mengirim...' : 'Kirim Bukti Pembayaran'}
                                    </button>
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
        </div>
    );
}
