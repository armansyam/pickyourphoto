'use client';

import React, { useState } from 'react';
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
      style={{
        padding: '3px 10px', fontSize: '11px', borderRadius: '6px', border: '1px solid rgba(129,140,248,0.4)',
        background: 'rgba(129,140,248,0.1)', color: '#818cf8', cursor: 'pointer', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px'
      }}
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
    <div className="glass-card" style={{ padding: '24px', borderRadius: '16px', minHeight: '480px' }}>

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SparklesUpgradeIcon size={18} color="#818cf8" />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#818cf8' }}>
                Upgrade &amp; Add-On Requests
              </h3>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#71717a' }}>
              Permohonan upgrade paket / tambah storage dari vendor aktif — memerlukan konfirmasi bukti transfer
            </p>
          </div>
          {countPending > 0 && (
            <div style={{
              background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)',
              borderRadius: '12px', padding: '10px 18px', textAlign: 'center'
            }}>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#fbbf24' }}>{countPending}</div>
              <div style={{ fontSize: '11px', color: '#a1a1aa' }}>Menunggu Approval</div>
            </div>
          )}
        </div>
      </div>

      {/* Filter Chips */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
        <button onClick={() => setFilterStatus('pending')} style={chipStyle(filterStatus === 'pending', '#fbbf24')}>
          Menunggu {countPending > 0 && `(${countPending})`}
        </button>
        <button onClick={() => setFilterStatus('approved')} style={chipStyle(filterStatus === 'approved', '#10b981')}>
          Disetujui {countApproved > 0 && `(${countApproved})`}
        </button>
        <button onClick={() => setFilterStatus('rejected')} style={chipStyle(filterStatus === 'rejected', '#ef4444')}>
          Ditolak {countRejected > 0 && `(${countRejected})`}
        </button>
        <button onClick={() => setFilterStatus('all')} style={chipStyle(filterStatus === 'all', '#6366f1')}>
          Semua ({upgrades.length})
        </button>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#52525b' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
            <CheckCircleIcon size={32} color="#34d399" />
          </div>
          <p style={{ margin: 0, fontSize: '14px' }}>
            {filterStatus === 'pending'
              ? 'Tidak ada permintaan yang menunggu approval. Semua bersih!'
              : 'Tidak ada data untuk filter ini.'}
          </p>
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#a1a1aa', userSelect: 'none' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600' }}>Vendor</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600' }}>Permintaan</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600' }}>Harga</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600' }}>Bukti Transfer</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600' }}>Tgl. Masuk</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '600' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const isAddon = r.requestType === 'addon' || (r.addonPlanId && !r.planId);
                const isPending = r.status === 'pending';
                const isProcessing = processing === r.id;

                return (
                  <tr key={r.id} style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    opacity: isProcessing ? 0.6 : 1,
                    transition: 'opacity 0.2s',
                  }}>
                    {/* Vendor */}
                    <td style={{ padding: '14px 14px' }}>
                      <strong style={{ color: '#fff', display: 'block', fontSize: '13px' }}>{r.vendorName}</strong>
                      <span style={{ fontSize: '11px', color: '#71717a' }}>{r.vendorEmail}</span>
                    </td>

                    {/* Request detail */}
                    <td style={{ padding: '14px 14px' }}>
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
                    <td style={{ padding: '14px 14px' }}>
                      <span style={{ color: '#fbbf24', fontWeight: '700', fontSize: '13px' }}>
                        {formatRupiah(r.proratedPrice)}
                      </span>
                    </td>

                    {/* Proof */}
                    <td style={{ padding: '14px 14px' }}>
                      <ProofCell transferProof={r.transferProof} setActiveProofUrl={setActiveProofUrl} vendor={r} />
                    </td>

                    {/* Date */}
                    <td style={{ padding: '14px 14px' }}>
                      <span style={{ fontSize: '11px', color: '#71717a' }}>
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '–'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 14px', textAlign: 'right' }}>
                      {isPending ? (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleAction(r.id, 'approve')}
                            disabled={isProcessing}
                            style={{
                              padding: '5px 12px', fontSize: '11px', fontWeight: '700', borderRadius: '7px',
                              border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)',
                              color: '#fff', cursor: isProcessing ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {isProcessing ? '...' : '✓ Setujui'}
                          </button>
                          <button
                            onClick={() => handleAction(r.id, 'reject')}
                            disabled={isProcessing}
                            style={{
                              padding: '5px 12px', fontSize: '11px', fontWeight: '700', borderRadius: '7px',
                              border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)',
                              color: '#f87171', cursor: isProcessing ? 'not-allowed' : 'pointer',
                            }}
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
