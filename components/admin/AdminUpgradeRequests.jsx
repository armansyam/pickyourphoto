'use client';

import React, { useState } from 'react';
import styles from './AdminUpgradeRequests.module.css';
import { 
  SparklesUpgradeIcon, SpeedBoltIcon, GalleryViewIcon, CheckCircleIcon 
} from '@/components/StorageIcons.jsx';

function ProofCell({ transferProof, setActiveProofUrl, vendor }) {
  if (!transferProof || transferProof === 'Manual Bank Transfer') {
    return <span style={{ color: '#71717a', fontSize: '11px' }}>Tidak ada bukti</span>;
  }
  const isGateway = transferProof === 'via_payment_gateway' || transferProof.toLowerCase().includes('automatic payment');
  if (isGateway) {
    return (
      <span style={{ color: '#38bdf8', fontSize: '11px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <SpeedBoltIcon size={12} color="#38bdf8" />
        <span>{transferProof}</span>
      </span>
    );
  }
  return (
    <button
      onClick={() => setActiveProofUrl && setActiveProofUrl({
        url: transferProof,
        status: vendor?.status,
        name: vendor?.vendorName,
        email: vendor?.vendorEmail,
      })}
      className={styles.proofBtn}
    >
      <GalleryViewIcon size={12} color="#818cf8" />
      <span>Lihat Bukti</span>
    </button>
  );
}

export default function AdminUpgradeRequests({
  upgrades = [],
  pendingUpgradeSummary = { pendingCount: 0, pendingTotalValue: 0 },
  addToast,
  setActiveProofUrl,
  onRefresh,
}) {
  const [filterStatus, setFilterStatus] = useState('pending');
  const [processing, setProcessing] = useState(null); // id of request being processed

  const filtered = upgrades.filter(r => filterStatus === 'all' ? true : r.status === filterStatus);
  const countPending = upgrades.filter(r => r.status === 'pending').length;
  const countApproved = upgrades.filter(r => r.status === 'approved').length;
  const countRejected = upgrades.filter(r => r.status === 'rejected').length;

  const handleAction = async (id, action) => {
    setProcessing(id);
    try {
      const res = await fetch('/api/admin/upgrades', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast && addToast(data.message || `Request berhasil ${action === 'approve' ? 'disetujui' : 'ditolak'}.`, 'success');
        onRefresh && onRefresh();
      } else {
        addToast && addToast(data.message || 'Gagal memproses request.', 'error');
      }
    } catch (err) {
      addToast && addToast(err.message || 'Terjadi kesalahan.', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const chipStyle = (active, color) => ({
    padding: '5px 16px', borderRadius: '20px', border: 'none',
    background: active ? color : 'rgba(255,255,255,0.04)',
    color: active ? '#fff' : '#a1a1aa',
    fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s',
  });

  const formatRupiah = (n) => n ? `Rp ${Number(n).toLocaleString('id-ID')}` : '–';

  return (
    <div className={`glass-card ${styles.wrapper}`}>

      {/* Header */}
      <div className={styles.headerBlock}>
        <div className={styles.headerRow}>
          <div>
            <div className={styles.titleGroup}>
              <SparklesUpgradeIcon size={16} color="#818cf8" />
              <h3 className={styles.title}>
                Upgrade &amp; Add-On Requests
              </h3>
            </div>
            <p className={styles.subtitle}>
              Permohonan upgrade paket / tambah storage dari vendor aktif — konfirmasi bukti transfer
            </p>
          </div>
          {countPending > 0 && (
            <div className={styles.pendingCounterBox}>
              <div className={styles.pendingCountNum}>{countPending}</div>
              <div className={styles.pendingCountLabel}>Menunggu Approval</div>
            </div>
          )}
        </div>
      </div>

      {/* Filter Chips */}
      <div className={styles.filterBar}>
        <button onClick={() => setFilterStatus('pending')} className={styles.chipBtn} style={chipStyle(filterStatus === 'pending', '#fbbf24')}>
          Menunggu {countPending > 0 && `(${countPending})`}
        </button>
        <button onClick={() => setFilterStatus('approved')} className={styles.chipBtn} style={chipStyle(filterStatus === 'approved', '#10b981')}>
          Disetujui {countApproved > 0 && `(${countApproved})`}
        </button>
        <button onClick={() => setFilterStatus('rejected')} className={styles.chipBtn} style={chipStyle(filterStatus === 'rejected', '#ef4444')}>
          Ditolak {countRejected > 0 && `(${countRejected})`}
        </button>
        <button onClick={() => setFilterStatus('all')} className={styles.chipBtn} style={chipStyle(filterStatus === 'all', '#6366f1')}>
          Semua ({upgrades.length})
        </button>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <CheckCircleIcon size={28} color="#34d399" />
          </div>
          <p style={{ margin: 0, fontSize: '13px' }}>
            {filterStatus === 'pending'
              ? 'Tidak ada permintaan yang menunggu approval. Semua bersih!'
              : 'Tidak ada data untuk filter ini.'}
          </p>
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#a1a1aa', userSelect: 'none' }}>
                <th className={styles.th}>Vendor</th>
                <th className={styles.th}>Permintaan</th>
                <th className={styles.th}>Harga</th>
                <th className={styles.th}>Bukti Transfer</th>
                <th className={styles.th}>Tgl. Masuk</th>
                <th className={styles.th} style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const isAddon = r.requestType === 'addon' || (r.addonPlanId && !r.planId);
                const isPending = r.status === 'pending';
                const isProcessing = processing === r.id;

                return (
                  <tr key={r.id} className={styles.tr} style={{
                    opacity: isProcessing ? 0.6 : 1,
                  }}>
                    {/* Vendor */}
                    <td className={styles.td}>
                      <strong style={{ color: '#fff', display: 'block', fontSize: '13px' }}>{r.vendorName}</strong>
                      <span style={{ fontSize: '11px', color: '#71717a' }}>{r.vendorEmail}</span>
                    </td>

                    {/* Request detail */}
                    <td className={styles.td}>
                      {isAddon ? (
                        <div>
                          <span style={{
                            color: '#38bdf8', background: 'rgba(56,189,248,0.12)',
                            border: '1px solid rgba(56,189,248,0.3)',
                            padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold'
                          }}>
                            💾 Add-On Storage
                          </span>
                          <div style={{ fontSize: '11px', color: '#a1a1aa', marginTop: '4px' }}>{r.planName}</div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: '12px', color: '#fbbf24', fontWeight: '600' }}>
                            {r.currentPlanName || '–'} → {r.planName || '–'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#a1a1aa', marginTop: '2px' }}>
                            Masa aktif saat ini: {r.currentExpiresAt ? new Date(r.currentExpiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '–'}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Price */}
                    <td className={styles.td}>
                      <span style={{ color: '#fbbf24', fontWeight: '700', fontSize: '13px' }}>
                        {formatRupiah(r.proratedPrice)}
                      </span>
                    </td>

                    {/* Proof */}
                    <td className={styles.td}>
                      <ProofCell transferProof={r.transferProof} setActiveProofUrl={setActiveProofUrl} vendor={r} />
                    </td>

                    {/* Date */}
                    <td className={styles.td}>
                      <span style={{ fontSize: '11px', color: '#71717a' }}>
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '–'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className={styles.td} style={{ textAlign: 'right' }}>
                      {isPending ? (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleAction(r.id, 'approve')}
                            disabled={isProcessing}
                            className={styles.approveBtn}
                            style={{ cursor: isProcessing ? 'not-allowed' : 'pointer' }}
                          >
                            {isProcessing ? '...' : '✓ Setujui'}
                          </button>
                          <button
                            onClick={() => handleAction(r.id, 'reject')}
                            disabled={isProcessing}
                            className={styles.rejectBtn}
                            style={{ cursor: isProcessing ? 'not-allowed' : 'pointer' }}
                          >
                            ✕ Tolak
                          </button>
                        </div>
                      ) : (
                        <span style={{
                          padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
                          background: r.status === 'approved' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                          color: r.status === 'approved' ? '#34d399' : '#f87171',
                          border: `1px solid ${r.status === 'approved' ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
                        }}>
                          {r.status === 'approved' ? '✅ Disetujui' : '❌ Ditolak'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
