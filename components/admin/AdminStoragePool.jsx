'use client';
import React, { useState, useEffect } from 'react';
import styles from './AdminStoragePool.module.css';
import { StoragePoolIcon } from '@/components/AdminIcons';
import { 
  SpeedBoltIcon, 
  FolderIcon, 
  UploadCloudIcon, 
  GoogleDriveIcon, 
  RefreshCwIcon, 
  TrashIcon, 
  SettingsManageIcon,
  CheckIcon,
  CloseIcon
} from '@/components/StorageIcons';

export default function AdminStoragePool({ googleClientId, googleClientSecret, googleMasterAccountEmail, googleRefreshToken }) {
    const [loading, setLoading] = useState(true);
    const [masterIndex, setMasterIndex] = useState(null);
    const [workers, setWorkers] = useState([]);
    const [stats, setStats] = useState({ 
        totalWorkers: 0, 
        totalCapacityBytes: 0, 
        totalUsedBytes: 0,
        totalRentedQuotaBytes: 0,
        activeRentersCount: 0
    });
    const [maxConcurrency, setMaxConcurrency] = useState(4);
    const [savingConcurrency, setSavingConcurrency] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const [masterClusterInfo, setMasterClusterInfo] = useState({
        clusterId: '',
        clusterName: '[PICK-YOUR-PHOTO] Platform Master Storage Cluster A',
        parentFolderId: 'root',
        vendorTemplate: '📁 [STORAGE DEDICATED] {vendor_name} ({vendor_email})',
        driveWebUrl: '',
        parentDriveWebUrl: ''
    });
    const [editingClusterName, setEditingClusterName] = useState('');
    const [editingVendorTemplate, setEditingVendorTemplate] = useState('');
    const [editingParentFolderId, setEditingParentFolderId] = useState('root');
    const [savingMasterConfig, setSavingMasterConfig] = useState(false);
    const [isEditingMasterConfig, setIsEditingMasterConfig] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const fetchDrivePool = async (shouldSync = false) => {
        if (shouldSync) setSyncing(true);
        else setLoading(true);

        try {
            const res = await fetch(`/api/admin/drive-pool${shouldSync ? '?sync=true' : ''}`);
            const data = await res.json();
            if (data.success) {
                setMasterIndex(data.masterIndex);
                setWorkers(data.workers || []);
                if (data.maxConcurrency) setMaxConcurrency(data.maxConcurrency);
                if (data.masterClusterInfo) {
                    setMasterClusterInfo(data.masterClusterInfo);
                    setEditingClusterName(data.masterClusterInfo.clusterName || '');
                    setEditingVendorTemplate(data.masterClusterInfo.vendorTemplate || '');
                    setEditingParentFolderId(data.masterClusterInfo.parentFolderId || 'root');
                }
                setStats({
                    totalWorkers: data.totalWorkers || 0,
                    totalCapacityBytes: data.totalPoolCapacityBytes || 0,
                    totalUsedBytes: data.totalPoolUsedBytes || 0,
                    totalRentedQuotaBytes: data.totalRentedQuotaBytes || 0,
                    activeRentersCount: data.activeRentersCount || 0
                });

                if (shouldSync) {
                    const syncedCount = data.syncSummary?.syncedCount ?? (data.workers?.length || 0);
                    setMessage({
                        type: 'success',
                        text: `⚡ Berhasil menyinkronkan kuota live ${syncedCount} Akun Worker langsung dari Google Cloud API!`
                    });
                }
            } else {
                if (shouldSync) setMessage({ type: 'error', text: data.error || 'Gagal sinkronisasi kuota Google' });
            }
        } catch (err) {
            console.error('Error loading drive pool:', err);
            if (shouldSync) setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
            setSyncing(false);
        }
    };

    useEffect(() => {
        fetchDrivePool(false);
    }, []);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                setMessage(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const handleSaveMaxConcurrency = async () => {
        setSavingConcurrency(true);
        try {
            const res = await fetch('/api/admin/drive-pool', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ maxConcurrency })
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: data.message });
                fetchDrivePool();
            } else {
                setMessage({ type: 'error', text: data.error });
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setSavingConcurrency(false);
        }
    };

    const handleSaveMasterClusterConfig = async (e) => {
        e.preventDefault();
        setSavingMasterConfig(true);
        try {
            const res = await fetch('/api/admin/drive-pool', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    updateClusterName: editingClusterName,
                    updateVendorTemplate: editingVendorTemplate,
                    updateParentFolderId: editingParentFolderId
                })
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: data.message });
                setIsEditingMasterConfig(false);
                fetchDrivePool();
            } else {
                setMessage({ type: 'error', text: data.error });
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setSavingMasterConfig(false);
        }
    };

    const handleToggleWorkerStatus = async (workerId, email, currentStatus) => {
        // Instant Optimistic UI Update untuk animasi sakelar yang sangat mulus tanpa jeda popup
        const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
        setWorkers(prevWorkers => 
            prevWorkers.map(w => w.id === workerId ? { ...w, status: newStatus } : w)
        );

        try {
            const res = await fetch('/api/admin/drive-pool', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workerId, toggleStatus: true })
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: data.message });
            } else {
                // Revert state jika gagal
                setWorkers(prevWorkers => 
                    prevWorkers.map(w => w.id === workerId ? { ...w, status: currentStatus } : w)
                );
                setMessage({ type: 'error', text: data.error || 'Gagal mengubah status akun worker.' });
            }
        } catch (err) {
            // Revert state jika gagal
            setWorkers(prevWorkers => 
                prevWorkers.map(w => w.id === workerId ? { ...w, status: currentStatus } : w)
            );
            setMessage({ type: 'error', text: err.message });
        }
    };

    const handleDeleteWorker = async (id, email) => {
        if (!confirm(`Apakah Anda yakin ingin menghapus Worker ${email} dari Pool Storage?`)) return;

        setActionLoading(true);
        try {
            const res = await fetch(`/api/admin/drive-pool/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: data.message });
                fetchDrivePool();
            } else {
                setMessage({ type: 'error', text: data.error });
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setActionLoading(false);
        }
    };

    const formatGB = (bytes) => (bytes / (1024 ** 3)).toFixed(2);

    return (
        <div className={styles.wrapper}>
            {/* HEADER TAB */}
            <div className={styles.headerRow}>
                <div>
                    <h2 className={styles.headerTitle}>
                        💾 Operasional Storage Pool Cluster
                    </h2>
                    <p className={styles.headerSub}>
                        Pusat kontrol operasional Akun Master Index Hub & Kolam Penyimpanan Multi-Account Cloud Storage.
                    </p>
                </div>
                <button
                    type="button"
                    disabled={syncing || loading}
                    onClick={() => fetchDrivePool(true)}
                    className={`btn-secondary ${styles.syncBtn} ${syncing ? styles.syncBtnSyncing : ''}`}
                >
                    {syncing ? '🔄 Menyinkronkan Kuota Google API...' : '⚡ Sinkronkan Kuota Google Live'}
                </button>
            </div>
            {/* Early Warning Capacity Alert */}
            {(() => {
              const remainingGb = Math.floor((stats.totalCapacityBytes - stats.totalUsedBytes) / (1024 * 1024 * 1024));
              if (remainingGb <= 10) {
                return (
                  <div className={styles.capacityAlert}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '24px' }}>⚠️</span>
                      <div>
                        <strong style={{ fontSize: '14px', display: 'block', color: '#ffffff' }}>
                          Peringatan Ambang Batas Kapasitas Worker Storage!
                        </strong>
                        <span style={{ fontSize: '12px', color: '#fca5a5' }}>
                          Sisa penyimpanan global server tersisa <strong>{remainingGb} GB</strong> (Di bawah ambang batas aman 10 GB). Harap segera tambahkan Akun Worker Master Drive baru di bawah ini.
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {message && (
                <div className={`${styles.messageBox} ${message.type === 'success' ? styles.msgSuccess : styles.msgError}`}>
                    <span>{message.text}</span>
                    <button
                        type="button"
                        onClick={() => setMessage(null)}
                        title="Tutup Notifikasi"
                        className={styles.closeMsgBtn}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* SEKSI 1: AKUN MASTER INDEX HUB */}
            <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                    <div>
                        <div className={styles.sectionTitle} style={{ color: '#38bdf8' }}>
                            <StoragePoolIcon size={15} color="#38bdf8" />
                            <span>Master Hub (Folder Index)</span>
                        </div>
                        <p className={styles.sectionSub}>
                            Akun pembuat &amp; pemeta struktur folder cloud
                        </p>
                    </div>
                    <span style={{ fontSize: '10.5px', background: googleRefreshToken ? 'rgba(16,185,129,0.15)' : 'rgba(251,191,36,0.15)', color: googleRefreshToken ? '#34d399' : '#fbbf24', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {googleRefreshToken ? <><CheckIcon size={11} color="#34d399" /><span>Master Aktif</span></> : '⚠️ Belum Terhubung'}
                    </span>
                </div>

                <div className={styles.hubInnerBox}>
                    <div className={styles.credsGrid}>
                        <div>
                            <span style={{ color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Google Client ID:</span>
                            <strong style={{ color: '#ffffff', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                                {googleClientId ? `${googleClientId.substring(0, 24)}...` : 'Belum Diisi'}
                            </strong>
                        </div>
                        <div>
                            <span style={{ color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Client Secret:</span>
                            <strong style={{ color: '#34d399', letterSpacing: '2px' }}>••••••••••••••••</strong>
                        </div>
                    </div>

                    <div className={styles.hubFooterRow}>
                        <div className={styles.hubAccountPill}>
                            <div>
                                <span style={{ color: '#94a3b8', fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', fontWeight: '700' }}>
                                    Master Index
                                </span>
                                <strong style={{ color: googleMasterAccountEmail ? '#38bdf8' : '#fbbf24', fontSize: '12px' }}>
                                    {googleMasterAccountEmail || (masterIndex ? masterIndex.email : 'Belum Terhubung')}
                                </strong>
                            </div>
                            <a
                                href="/api/admin/auth/google"
                                style={{
                                    fontSize: '10.5px',
                                    color: '#ffffff',
                                    background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    textDecoration: 'none',
                                    fontWeight: '700',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <RefreshCwIcon size={11} color="#ffffff" />
                                <span>Ganti Hub</span>
                            </a>
                        </div>

                        {/* Direct Google Drive Web Link Buttons */}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {masterClusterInfo.parentDriveWebUrl && (
                                <a
                                    href={masterClusterInfo.parentDriveWebUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        fontSize: '11px',
                                        color: '#ffffff',
                                        background: 'rgba(255,255,255,0.08)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        padding: '5px 10px',
                                        borderRadius: '6px',
                                        textDecoration: 'none',
                                        fontWeight: '700',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px'
                                    }}
                                >
                                    <FolderIcon size={11} color="#ffffff" />
                                    <span>Folder Induk ↗</span>
                                </a>
                            )}

                            {masterClusterInfo.driveWebUrl && (
                                <a
                                    href={masterClusterInfo.driveWebUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        fontSize: '11px',
                                        color: '#ffffff',
                                        background: 'linear-gradient(135deg, #10b981, #059669)',
                                        padding: '5px 12px',
                                        borderRadius: '6px',
                                        textDecoration: 'none',
                                        fontWeight: '800',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        boxShadow: '0 3px 10px rgba(16, 185, 129, 0.35)',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <GoogleDriveIcon size={12} color="#ffffff" />
                                    <span>Cluster Web ↗</span>
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* DYNAMIC MASTER FOLDER CONFIGURATION & DISPLAY */}
                <div className={styles.folderConfigBox}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isEditingMasterConfig ? '10px' : '0', flexWrap: 'wrap', gap: '6px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <FolderIcon size={13} color="#38bdf8" />
                            <span>Pengaturan Folder Master</span>
                        </div>

                        {!isEditingMasterConfig && (
                            <button
                                type="button"
                                onClick={() => setIsEditingMasterConfig(true)}
                                style={{
                                    padding: '5px 12px',
                                    background: 'rgba(56, 189, 248, 0.1)',
                                    color: '#38bdf8',
                                    border: '1px solid rgba(56, 189, 248, 0.3)',
                                    borderRadius: '8px',
                                    fontSize: '11.5px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <SettingsManageIcon size={12} color="#38bdf8" />
                                <span>Ubah Pengaturan Lokasi</span>
                            </button>
                        )}
                    </div>

                    {!isEditingMasterConfig ? (
                        /* VIEW MODE: TAMPILKAN DETAIL RINGKAS & RAPI */
                        <div className={styles.configViewGrid}>
                            <div>
                                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', textTransform: 'uppercase', fontWeight: '700', marginBottom: '2px' }}>
                                    1. Lokasi Induk:
                                </span>
                                <strong style={{ fontSize: '11.5px', color: '#34d399', fontFamily: 'monospace' }}>
                                    {masterClusterInfo.parentFolderId === 'root' ? 'root (Root Utama)' : masterClusterInfo.parentFolderId}
                                </strong>
                            </div>

                            <div>
                                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', textTransform: 'uppercase', fontWeight: '700', marginBottom: '2px' }}>
                                    2. Nama Master Cluster:
                                </span>
                                <strong style={{ fontSize: '12px', color: '#38bdf8' }}>
                                    {masterClusterInfo.clusterName}
                                </strong>
                            </div>

                            <div>
                                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', textTransform: 'uppercase', fontWeight: '700', marginBottom: '2px' }}>
                                    3. Format Folder Vendor:
                                </span>
                                <strong style={{ fontSize: '12px', color: '#fbbf24' }}>
                                    {masterClusterInfo.vendorTemplate}
                                </strong>
                            </div>
                        </div>
                    ) : (
                        /* EDIT MODE: TAMPILKAN FORM EDIT KUSTOM */
                        <form onSubmit={handleSaveMasterClusterConfig} className={styles.configEditForm}>
                            <div>
                                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                                    1. Lokasi Folder Induk Master (Parent ID):
                                </label>
                                <input
                                    type="text"
                                    value={editingParentFolderId}
                                    onChange={(e) => setEditingParentFolderId(e.target.value)}
                                    placeholder="root (Root My Drive)"
                                    className={styles.formInput}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                                    2. Nama Folder Master Cluster (GDrive API):
                                </label>
                                <input
                                    type="text"
                                    value={editingClusterName}
                                    onChange={(e) => setEditingClusterName(e.target.value)}
                                    placeholder="[PICK-YOUR-PHOTO] Platform Master Storage Cluster A"
                                    className={styles.formInput}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                                    3. Format Nama Folder Dedicated Vendor:
                                </label>
                                <input
                                    type="text"
                                    value={editingVendorTemplate}
                                    onChange={(e) => setEditingVendorTemplate(e.target.value)}
                                    placeholder="📁 [STORAGE DEDICATED] {vendor_name} ({vendor_email})"
                                    className={styles.formInput}
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsEditingMasterConfig(false)}
                                style={{
                                    padding: '8px 14px',
                                    background: 'rgba(255,255,255,0.06)',
                                    color: '#a1a1aa',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    height: '35px',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                ✕ Batal
                            </button>

                            <button
                                type="submit"
                                disabled={savingMasterConfig}
                                style={{
                                    padding: '8px 16px',
                                    background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    height: '35px',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {savingMasterConfig ? 'Menyimpan...' : 'Simpan & Perbarui'}
                            </button>
                        </form>
                    )}
                </div>
            </div>

            {/* SEKSI 2: POOL AKUN WORKER STORAGE */}
            <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                    <div>
                        <div className={styles.sectionTitle} style={{ color: '#10b981' }}>
                            <SpeedBoltIcon size={15} color="#10b981" />
                            <span>Worker Storage Cluster</span>
                        </div>
                        <p className={styles.sectionSub}>
                            {formatGB(stats.totalCapacityBytes)} GB / {stats.totalWorkers} Akun Worker
                        </p>
                    </div>

                    <a
                        href="/api/admin/auth/google/worker"
                        style={{
                            fontSize: '11.5px',
                            color: '#ffffff',
                            background: 'linear-gradient(135deg, #059669, #047857)',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontWeight: '700',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                        }}
                    >
                        <UploadCloudIcon size={12} color="#ffffff" />
                        <span>Tambah Worker</span>
                    </a>
                </div>

                {/* BATAS THREAD WORKER UPLOAD SERENTAK CONTROL CARD */}
                <div className={styles.concurrencyBox}>
                    <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <SettingsManageIcon size={13} color="#818cf8" />
                            <span>Batas Thread Upload (Parallel)</span>
                        </div>
                        <p style={{ margin: '2px 0 0 0', fontSize: '10.5px', color: '#94a3b8' }}>
                            Jumlah file paralel di browser vendor (Default: <strong>4</strong>).
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                            type="number"
                            min="1"
                            max="10"
                            value={maxConcurrency}
                            onChange={(e) => setMaxConcurrency(parseInt(e.target.value) || 1)}
                            className={styles.concurrencyInput}
                        />
                        <button
                            type="button"
                            onClick={handleSaveMaxConcurrency}
                            disabled={savingConcurrency}
                            style={{
                                padding: '8px 16px',
                                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
                            }}
                        >
                            {savingConcurrency ? 'Menyimpan...' : '💾 Simpan Thread'}
                        </button>
                    </div>
                </div>

                {/* RINGKASAN REKAPITULASI POOL */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>Total Akun Worker</span>
                        <strong className={styles.statValue}>{stats.totalWorkers} Akun</strong>
                    </div>
                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>Total Kapasitas Storage Pool</span>
                        <strong className={styles.statValue} style={{ color: '#10b981' }}>{formatGB(stats.totalCapacityBytes)} GB</strong>
                    </div>
                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>Kapasitas Disewa Berjalan</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <strong className={styles.statValue} style={{ color: '#fbbf24' }}>{formatGB(stats.totalRentedQuotaBytes)} GB</strong>
                            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>({stats.activeRentersCount} Vendor)</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>Penyimpanan Terpakai Fisik</span>
                        <strong className={styles.statValue} style={{ color: '#38bdf8' }}>{formatGB(stats.totalUsedBytes)} GB</strong>
                    </div>
                </div>

                {/* TABEL DAFTAR WORKER */}
                {loading ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <RefreshCwIcon size={16} color="#94a3b8" />
                        <span>Memuat daftar pool Worker Storage...</span>
                    </div>
                ) : workers.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 'bold', color: '#fbbf24' }}>
                            Belum ada Akun Worker Storage Tambahan
                        </p>
                        <p style={{ margin: 0, fontSize: '11.5px', color: '#94a3b8' }}>
                            Klik tombol <strong>"Tambah Akun Worker Storage Baru"</strong> di atas untuk menambahkan akun Gmail gratisan (15GB) baru ke dalam kolam penyimpan platform Anda.
                        </p>
                    </div>
                ) : (
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.th}>NO</th>
                                    <th className={styles.th}>EMAIL AKUN WORKER</th>
                                    <th className={styles.th}>KAPASITAS TERPAKAI</th>
                                    <th className={styles.th}>STATUS</th>
                                    <th className={styles.th} style={{ textAlign: 'right' }}>AKSI</th>
                                </tr>
                            </thead>
                            <tbody>
                                {workers.map((w, index) => {
                                    const percent = w.totalLimitBytes ? Math.min(100, Math.round((w.usedStorageBytes / w.totalLimitBytes) * 100)) : 0;
                                    const isOverQuota = w.totalLimitBytes > 0 && w.usedStorageBytes >= w.totalLimitBytes;
                                    return (
                                        <tr key={w.id} className={styles.tr}>
                                            <td className={styles.td} style={{ color: '#64748b', fontWeight: 'bold' }}>{index + 1}</td>
                                            <td className={styles.td} style={{ fontWeight: 'bold', color: '#ffffff' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span>{w.email}</span>
                                                    {isOverQuota && (
                                                        <span style={{
                                                            background: 'rgba(239, 68, 68, 0.2)',
                                                            color: '#f87171',
                                                            border: '1px solid rgba(239, 68, 68, 0.4)',
                                                            borderRadius: '6px',
                                                            padding: '2px 8px',
                                                            fontSize: '10px',
                                                            fontWeight: '800'
                                                        }}>
                                                            ⚠️ OVER-QUOTA
                                                        </span>
                                                    )}
                                                    {w.status === 'full' && !isOverQuota && (
                                                        <span style={{
                                                            background: 'rgba(245, 158, 11, 0.2)',
                                                            color: '#fbbf24',
                                                            border: '1px solid rgba(245, 158, 11, 0.4)',
                                                            borderRadius: '6px',
                                                            padding: '2px 8px',
                                                            fontSize: '10px',
                                                            fontWeight: '800'
                                                        }}>
                                                            KAPASITAS PENUH
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className={styles.td}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ fontSize: '11px', color: isOverQuota ? '#f87171' : '#cbd5e1', width: '115px', fontWeight: isOverQuota ? 'bold' : 'normal' }}>
                                                        {formatGB(w.usedStorageBytes)} / {formatGB(w.totalLimitBytes)} GB
                                                    </span>
                                                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px', overflow: 'hidden', minWidth: '80px' }}>
                                                        <div style={{
                                                            width: `${percent}%`,
                                                            height: '100%',
                                                            background: isOverQuota || percent > 90 ? '#ef4444' : (percent > 70 ? '#f59e0b' : '#10b981')
                                                        }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={styles.td}>
                                                <div 
                                                    onClick={() => !actionLoading && handleToggleWorkerStatus(w.id, w.email, w.status)}
                                                    style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                                                    title={w.status === 'active' ? 'Klik untuk Nonaktifkan Akun (OFF)' : 'Klik untuk Aktifkan Akun (ON)'}
                                                >
                                                    {/* Compact Minimalist Toggle Switch */}
                                                    <div 
                                                        className={styles.toggleTrack}
                                                        style={{ background: w.status === 'active' ? '#10b981' : '#3f3f46' }}
                                                    >
                                                        {/* Embedded ON / OFF Text inside Track */}
                                                        <span 
                                                            className={styles.toggleText}
                                                            style={{
                                                                left: w.status === 'active' ? '6px' : 'auto',
                                                                right: w.status === 'active' ? 'auto' : '6px'
                                                            }}
                                                        >
                                                            {w.status === 'active' ? 'ON' : 'OFF'}
                                                        </span>

                                                        {/* Clean White Circular Knob */}
                                                        <div 
                                                            className={styles.toggleKnob}
                                                            style={{ transform: w.status === 'active' ? 'translateX(20px)' : 'translateX(0px)' }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={styles.td} style={{ textAlign: 'right' }}>
                                                <button
                                                    type="button"
                                                    disabled={actionLoading}
                                                    onClick={() => handleDeleteWorker(w.id, w.email)}
                                                    className={styles.deleteBtn}
                                                >
                                                    🗑️ Hapus Akun
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

