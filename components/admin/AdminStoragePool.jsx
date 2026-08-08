'use client';
import React, { useState, useEffect } from 'react';

export default function AdminStoragePool({ googleClientId, googleClientSecret, googleMasterAccountEmail, googleRefreshToken }) {
    const [loading, setLoading] = useState(true);
    const [masterIndex, setMasterIndex] = useState(null);
    const [workers, setWorkers] = useState([]);
    const [stats, setStats] = useState({ totalWorkers: 0, totalCapacityBytes: 0, totalUsedBytes: 0 });
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

    const fetchDrivePool = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/drive-pool');
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
                    totalUsedBytes: data.totalPoolUsedBytes || 0
                });
            }
        } catch (err) {
            console.error('Error loading drive pool:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrivePool();
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
        <div style={{ color: '#ffffff', animation: 'fadeIn 0.3s ease-in-out' }}>
            {/* HEADER TAB */}
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        💾 Operasional Storage Pool Cluster
                    </h2>
                    <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0' }}>
                        Pusat kontrol operasional Akun Master Index Hub & Kolam Penyimpanan Multi-Account Cloud Storage.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={fetchDrivePool}
                    className="btn-secondary"
                    style={{ fontSize: '12px', padding: '8px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    🔄 Refresh Status
                </button>
            </div>
            {/* Early Warning Capacity Alert */}
            {(() => {
              const remainingGb = Math.floor((stats.totalCapacityBytes - stats.totalUsedBytes) / (1024 * 1024 * 1024));
              if (remainingGb <= 10) {
                return (
                  <div style={{
                    background: 'rgba(239,68,68,0.15)',
                    border: '1.5px solid rgba(239,68,68,0.4)',
                    borderRadius: '14px',
                    padding: '16px 20px',
                    marginBottom: '20px',
                    color: '#f87171',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}>
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
                <div style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: message.type === 'success' ? '#34d399' : '#f87171',
                    border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    gap: '12px'
                }}>
                    <span>{message.text}</span>
                    <button
                        type="button"
                        onClick={() => setMessage(null)}
                        title="Tutup Notifikasi"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'currentColor',
                            fontSize: '16px',
                            cursor: 'pointer',
                            padding: '0 4px',
                            lineHeight: 1,
                            opacity: 0.8
                        }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* SEKSI 1: AKUN MASTER INDEX HUB */}
            <div className="card" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            👑 SEKSI 1: AKUN MASTER INDEX HUB (FOLDER MAPPER)
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                            Akun khusus pembuat & pemilik struktur folder utama platform (Kapasitas Terpakai: 0 Bytes Abadi).
                        </p>
                    </div>
                    <span style={{ fontSize: '11px', background: googleRefreshToken ? 'rgba(16,185,129,0.15)' : 'rgba(251,191,36,0.15)', color: googleRefreshToken ? '#34d399' : '#fbbf24', padding: '4px 12px', borderRadius: '12px', fontWeight: 'bold' }}>
                        {googleRefreshToken ? '🟢 Master Active' : '⚠️ Belum Terhubung'}
                    </span>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '18px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '12px', marginBottom: '16px' }}>
                        <div>
                            <span style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Google Client ID:</span>
                            <strong style={{ color: '#ffffff', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                                {googleClientId ? `${googleClientId.substring(0, 24)}...` : 'Belum Diisi'}
                            </strong>
                        </div>
                        <div>
                            <span style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Client Secret:</span>
                            <strong style={{ color: '#34d399', letterSpacing: '2px' }}>••••••••••••••••</strong>
                        </div>
                    </div>

                    <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                        <div style={{ background: 'rgba(56, 189, 248, 0.06)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '10px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                            <div>
                                <span style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', fontWeight: '700' }}>
                                    Akun Master Index Active
                                </span>
                                <strong style={{ color: googleMasterAccountEmail ? '#38bdf8' : '#fbbf24', fontSize: '13px' }}>
                                    {googleMasterAccountEmail || (masterIndex ? masterIndex.email : 'Belum Terhubung')}
                                </strong>
                            </div>
                            <a
                                href="/api/admin/auth/google"
                                style={{
                                    fontSize: '11px',
                                    color: '#ffffff',
                                    background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    textDecoration: 'none',
                                    fontWeight: '700',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 2px 10px rgba(2, 132, 199, 0.35)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                🔄 Ganti Akun Master Hub ➔
                            </a>
                        </div>

                        {/* Direct Google Drive Web Link Buttons */}
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {masterClusterInfo.parentDriveWebUrl && (
                                <a
                                    href={masterClusterInfo.parentDriveWebUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        fontSize: '12px',
                                        color: '#ffffff',
                                        background: 'rgba(255,255,255,0.08)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        padding: '8px 14px',
                                        borderRadius: '8px',
                                        textDecoration: 'none',
                                        fontWeight: '700',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    📁 Buka Folder Induk di GDrive ↗
                                </a>
                            )}

                            {masterClusterInfo.driveWebUrl && (
                                <a
                                    href={masterClusterInfo.driveWebUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        fontSize: '12px',
                                        color: '#ffffff',
                                        background: 'linear-gradient(135deg, #10b981, #059669)',
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        textDecoration: 'none',
                                        fontWeight: '800',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    🌐 Buka Master Cluster di Google Drive Web ↗
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* DYNAMIC MASTER FOLDER CONFIGURATION & DISPLAY */}
                <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.12)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isEditingMasterConfig ? '12px' : '0' }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>📁</span>
                            <span>Pengaturan Penamaan & Lokasi Penempatan Folder Master Cluster</span>
                        </div>

                        {!isEditingMasterConfig && (
                            <button
                                type="button"
                                onClick={() => setIsEditingMasterConfig(true)}
                                style={{
                                    padding: '6px 14px',
                                    background: 'rgba(56, 189, 248, 0.1)',
                                    color: '#38bdf8',
                                    border: '1px solid rgba(56, 189, 248, 0.3)',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                ✏️ Ubah Pengaturan Lokasi & Penamaan
                            </button>
                        )}
                    </div>

                    {!isEditingMasterConfig ? (
                        /* VIEW MODE: TAMPILKAN DETAIL RINGKAS & RAPI */
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.2fr', gap: '12px', marginTop: '12px', background: 'rgba(0,0,0,0.25)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div>
                                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', textTransform: 'uppercase', fontWeight: '700', marginBottom: '2px' }}>
                                    1. Lokasi Induk Master:
                                </span>
                                <strong style={{ fontSize: '12px', color: '#34d399', fontFamily: 'monospace' }}>
                                    {masterClusterInfo.parentFolderId === 'root' ? 'root (Root My Drive Utama)' : masterClusterInfo.parentFolderId}
                                </strong>
                            </div>

                            <div>
                                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', textTransform: 'uppercase', fontWeight: '700', marginBottom: '2px' }}>
                                    2. Nama Master Cluster GDrive:
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
                        <form onSubmit={handleSaveMasterClusterConfig} style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.2fr 1.2fr auto auto', gap: '10px', alignItems: 'end', marginTop: '8px' }}>
                            <div>
                                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                                    1. Lokasi Folder Induk Master (Parent ID):
                                </label>
                                <input
                                    type="text"
                                    value={editingParentFolderId}
                                    onChange={(e) => setEditingParentFolderId(e.target.value)}
                                    placeholder="root (Root My Drive)"
                                    style={{
                                        width: '100%',
                                        background: 'rgba(0,0,0,0.4)',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        borderRadius: '8px',
                                        padding: '8px 12px',
                                        color: '#ffffff',
                                        fontSize: '12px',
                                        fontWeight: '600'
                                    }}
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
                                    style={{
                                        width: '100%',
                                        background: 'rgba(0,0,0,0.4)',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        borderRadius: '8px',
                                        padding: '8px 12px',
                                        color: '#ffffff',
                                        fontSize: '12px',
                                        fontWeight: '600'
                                    }}
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
                                    style={{
                                        width: '100%',
                                        background: 'rgba(0,0,0,0.4)',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        borderRadius: '8px',
                                        padding: '8px 12px',
                                        color: '#ffffff',
                                        fontSize: '12px',
                                        fontWeight: '600'
                                    }}
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
                                {savingMasterConfig ? 'Menyimpan...' : '💾 Simpan & Perbarui GDrive'}
                            </button>
                        </form>
                    )}
                </div>
            </div>

            {/* SEKSI 2: POOL AKUN WORKER STORAGE */}
            <div className="card" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            📦 SEKSI 2: POOL AKUN WORKER STORAGE (PENAMPUNG FILE BUKTI FOTO)
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                            Akun-akun Google penampung kapasitas file foto (Kapasitas Tergabung: {formatGB(stats.totalCapacityBytes)} GB / {stats.totalWorkers} Akun Worker).
                        </p>
                    </div>

                    <a
                        href="/api/admin/auth/google/worker"
                        style={{
                            fontSize: '12px',
                            color: '#ffffff',
                            background: 'linear-gradient(135deg, #059669, #047857)',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontWeight: '700',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
                        }}
                    >
                        ➕ Tambah Akun Worker Storage Baru (+ Google OAuth)
                    </a>
                </div>

                {/* BATAS THREAD WORKER UPLOAD SERENTAK CONTROL CARD */}
                <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                    <div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            ⚙️ Batas Thread Worker Upload Serentak (Parallel Concurrency)
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
                            Mengatur berapa jumlah file yang diunggah secara paralel di browser vendor (Default: <strong>4 Thread</strong>).
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                            type="number"
                            min="1"
                            max="10"
                            value={maxConcurrency}
                            onChange={(e) => setMaxConcurrency(parseInt(e.target.value) || 1)}
                            style={{
                                width: '80px',
                                padding: '8px 12px',
                                background: 'rgba(0,0,0,0.4)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: '8px',
                                color: '#818cf8',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                textAlign: 'center'
                            }}
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Total Akun Worker</span>
                        <strong style={{ fontSize: '18px', color: '#ffffff' }}>{stats.totalWorkers} Akun</strong>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Total Kapasitas Storage Pool</span>
                        <strong style={{ fontSize: '18px', color: '#10b981' }}>{formatGB(stats.totalCapacityBytes)} GB</strong>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Penyimpanan Terpakai</span>
                        <strong style={{ fontSize: '18px', color: '#38bdf8' }}>{formatGB(stats.totalUsedBytes)} GB</strong>
                    </div>
                </div>

                {/* TABEL DAFTAR WORKER */}
                {loading ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                        ⏳ Memuat daftar pool Worker Storage...
                    </div>
                ) : workers.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold', color: '#fbbf24' }}>
                            ⚠️ Belum ada Akun Worker Storage Tambahan
                        </p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                            Klik tombol <strong>"➕ Tambah Akun Worker Storage Baru"</strong> di atas untuk menambahkan akun Gmail gratisan (15GB) baru ke dalam kolam penyimpan platform Anda.
                        </p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase' }}>
                                    <th style={{ padding: '10px' }}>NO</th>
                                    <th style={{ padding: '10px' }}>EMAIL AKUN WORKER</th>
                                    <th style={{ padding: '10px' }}>KAPASITAS TERPAKAI</th>
                                    <th style={{ padding: '10px' }}>STATUS</th>
                                    <th style={{ padding: '10px', textAlign: 'right' }}>AKSI</th>
                                </tr>
                            </thead>
                            <tbody>
                                {workers.map((w, index) => {
                                    const percent = w.totalLimitBytes ? Math.min(100, Math.round((w.usedStorageBytes / w.totalLimitBytes) * 100)) : 0;
                                    return (
                                        <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', height: '48px' }}>
                                            <td style={{ padding: '10px', color: '#64748b', fontWeight: 'bold' }}>{index + 1}</td>
                                            <td style={{ padding: '10px', fontWeight: 'bold', color: '#ffffff' }}>
                                                {w.email}
                                            </td>
                                            <td style={{ padding: '10px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ fontSize: '11px', color: '#cbd5e1', width: '110px' }}>
                                                        {formatGB(w.usedStorageBytes)} / {formatGB(w.totalLimitBytes)} GB
                                                    </span>
                                                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px', overflow: 'hidden', minWidth: '80px' }}>
                                                        <div style={{
                                                            width: `${percent}%`,
                                                            height: '100%',
                                                            background: percent > 90 ? '#ef4444' : (percent > 70 ? '#f59e0b' : '#10b981')
                                                        }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '10px' }}>
                                                <div 
                                                    onClick={() => !actionLoading && handleToggleWorkerStatus(w.id, w.email, w.status)}
                                                    style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                                                    title={w.status === 'active' ? 'Klik untuk Nonaktifkan Akun (OFF)' : 'Klik untuk Aktifkan Akun (ON)'}
                                                >
                                                    {/* Compact Minimalist Toggle Switch */}
                                                    <div style={{
                                                        width: '42px',
                                                        height: '22px',
                                                        borderRadius: '11px',
                                                        background: w.status === 'active' ? '#10b981' : '#3f3f46',
                                                        border: 'none',
                                                        position: 'relative',
                                                        transition: 'background-color 0.2s ease',
                                                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.25)'
                                                    }}>
                                                        {/* Embedded ON / OFF Text inside Track */}
                                                        <span style={{
                                                            position: 'absolute',
                                                            top: '50%',
                                                            transform: 'translateY(-50%)',
                                                            left: w.status === 'active' ? '6px' : 'auto',
                                                            right: w.status === 'active' ? 'auto' : '6px',
                                                            fontSize: '8px',
                                                            fontWeight: '800',
                                                            color: '#ffffff',
                                                            letterSpacing: '0.3px',
                                                            pointerEvents: 'none',
                                                            opacity: 0.9
                                                        }}>
                                                            {w.status === 'active' ? 'ON' : 'OFF'}
                                                        </span>

                                                        {/* Clean White Circular Knob */}
                                                        <div style={{
                                                            width: '18px',
                                                            height: '18px',
                                                            borderRadius: '50%',
                                                            background: '#ffffff',
                                                            position: 'absolute',
                                                            top: '2px',
                                                            left: '2px',
                                                            transform: w.status === 'active' ? 'translateX(20px)' : 'translateX(0px)',
                                                            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                                                        }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '10px', textAlign: 'right' }}>
                                                <button
                                                    type="button"
                                                    disabled={actionLoading}
                                                    onClick={() => handleDeleteWorker(w.id, w.email)}
                                                    style={{
                                                        fontSize: '11px',
                                                        color: '#f87171',
                                                        background: 'rgba(239,68,68,0.1)',
                                                        border: '1px solid rgba(239,68,68,0.3)',
                                                        padding: '5px 12px',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        fontWeight: '600'
                                                    }}
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
