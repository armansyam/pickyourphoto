'use client';
import React, { useState, useEffect } from 'react';

export default function AdminStoragePool({ googleClientId, googleClientSecret, googleMasterAccountEmail, googleRefreshToken }) {
    const [loading, setLoading] = useState(true);
    const [masterIndex, setMasterIndex] = useState(null);
    const [workers, setWorkers] = useState([]);
    const [stats, setStats] = useState({ totalWorkers: 0, totalCapacityBytes: 0, totalUsedBytes: 0 });
    const [actionLoading, setActionLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const fetchDrivePool = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/drive-pool');
            const data = await res.json();
            if (data.success) {
                setMasterIndex(data.masterIndex);
                setWorkers(data.workers || []);
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

            {message && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: message.type === 'success' ? '#34d399' : '#f87171',
                    border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                }}>
                    {message.text}
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
                    </div>
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
                                                <span style={{
                                                    fontSize: '10px',
                                                    padding: '3px 10px',
                                                    borderRadius: '10px',
                                                    fontWeight: 'bold',
                                                    background: w.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                                    color: w.status === 'active' ? '#34d399' : '#f87171'
                                                }}>
                                                    {w.status === 'active' ? '🟢 Active' : '🔴 Full / Off'}
                                                </span>
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
                                                        padding: '4px 10px',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer'
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
