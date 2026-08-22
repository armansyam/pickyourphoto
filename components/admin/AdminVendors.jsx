'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styles from './AdminVendors.module.css';
import { InquiryIcon, UsersIcon, SearchIcon } from '@/components/AdminIcons';
import { WhatsAppIcon, SpeedBoltIcon, RefreshCwIcon, TrashIcon, CheckIcon, CloseIcon, SettingsManageIcon } from '@/components/StorageIcons';

// ─── Countdown Timer component for QRIS expiry ───────────────────────────────
function QrisCountdown({ expiresAt }) {
  const calc = useCallback(() => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return null;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { h, m, s, diff };
  }, [expiresAt]);

  const [remaining, setRemaining] = useState(calc);

  useEffect(() => {
    if (!expiresAt) return;
    const timer = setInterval(() => setRemaining(calc()), 1000);
    return () => clearInterval(timer);
  }, [expiresAt, calc]);

  if (!expiresAt) return <span style={{ color: '#71717a', fontSize: '11px' }}>–</span>;
  if (!remaining) return <span style={{ color: '#f87171', fontSize: '11px', fontWeight: 'bold' }}>⏰ Expired</span>;

  const color = remaining.diff < 30 * 60 * 1000 ? '#f87171' : remaining.diff < 60 * 60 * 1000 ? '#fbbf24' : '#34d399';
  return (
    <span style={{ color, fontSize: '11px', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
      ⏱ {remaining.h > 0 ? `${remaining.h}j ` : ''}{String(remaining.m).padStart(2, '0')}:{String(remaining.s).padStart(2, '0')}
    </span>
  );
}

// ─── Days until auto-delete badge ────────────────────────────────────────────
function AutoDeleteBadge({ archivedAt }) {
  if (!archivedAt) return <span style={{ color: '#71717a', fontSize: '11px' }}>–</span>;
  const archivedDate = new Date(archivedAt);
  const deleteDate = new Date(archivedDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const daysLeft = Math.ceil((deleteDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (daysLeft <= 0) return <span style={{ color: '#f87171', fontSize: '11px', fontWeight: 'bold' }}>🗑️ Segera Dihapus</span>;
  const color = daysLeft <= 2 ? '#f87171' : daysLeft <= 4 ? '#fbbf24' : '#71717a';
  return <span style={{ color, fontSize: '11px' }}>Hapus dalam {daysLeft} hari</span>;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminVendors({
  vendors = [],
  loading = false,
  vendorSubTab = 'active',
  setVendorSubTab,
  // Optional: parent controls inquiry sub-tab (when Inquiry is top-level tab)
  inquirySubTabOverride,
  setInquirySubTabOverride,
  setEditingVendor,
  setVendorToApprove,
  setVendorToDelete,
  setActiveProofUrl,
  handleToggleVendorStatus,
  onRejectVendor,
  onRegenerateQris,
  onCancelQris,
  refetchVendors,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [_inquirySubTab, _setInquirySubTab] = useState('qris');
  // Use override from parent if provided, otherwise internal state
  const inquirySubTab = inquirySubTabOverride ?? _inquirySubTab;
  const setInquirySubTab = setInquirySubTabOverride ?? _setInquirySubTab;
  const [sortField, setSortField] = useState('expiresAt');
  const [sortOrder, setSortOrder] = useState('asc');
  const [activeMenuVendor, setActiveMenuVendor] = useState(null);
  const [menuPos, setMenuPos] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [rejectModal, setRejectModal] = useState(null); // vendor to reject
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [syncStatusResult, setSyncStatusResult] = useState(null); // custom modal state

  useEffect(() => { setMounted(true); }, []);

  const handleSyncQrisStatus = async (vendor) => {
    setSyncingId(vendor.id);
    try {
      const res = await fetch(`/api/payment/status?vendorId=${vendor.id}`);
      const data = await res.json();
      if (data.paid) {
        setSyncStatusResult({
          type: 'success',
          title: 'Pembayaran LUNAS! 🎉',
          message: `Pembayaran untuk vendor "${vendor.name}" telah terverifikasi LUNAS oleh Payment Gateway! Akun vendor otomatis aktif.`
        });
      } else {
        setSyncStatusResult({
          type: 'info',
          title: 'Status Pembayaran Pending',
          message: data.message || 'Transaksi pembayaran QRIS belum diselesaikan oleh calon vendor.'
        });
      }
      if (refetchVendors) refetchVendors();
    } catch (err) {
      setSyncStatusResult({
        type: 'error',
        title: 'Gagal Mengecek Status',
        message: err.message || 'Terjadi kesalahan koneksi saat mengecek status Payment Gateway.'
      });
    } finally {
      setSyncingId(null);
    }
  };

  const isExpired = (expiryString) => {
    if (!expiryString) return false;
    return new Date() > new Date(expiryString);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleOpenMenu = (e, v) => {
    e.stopPropagation();
    if (activeMenuVendor?.id === v.id) { setActiveMenuVendor(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const dropdownWidth = 180;
    const calculatedLeft = Math.max(10, Math.min(rect.right - dropdownWidth, window.innerWidth - dropdownWidth - 10));
    setMenuPos({ top: rect.bottom + window.scrollY + 4, left: calculatedLeft });
    setActiveMenuVendor(v);
  };

  const getWaReminderUrl = (phone, vendorName, planName, expiryDate) => {
    if (!phone) return null;
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
    const formattedDate = expiryDate ? new Date(expiryDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'segera';
    const msg = `Halo ${vendorName || 'Studio'}, ini dari Admin Pick-Your-Photo. Mengingatkan bahwa masa aktif paket berlangganan ${planName || 'Studio'} Anda akan berakhir pada ${formattedDate}. Silakan lakukan perpanjangan agar galeri foto tetap aktif. Terima kasih! 🙏`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  const [pendingFilter, setPendingFilter] = useState('all'); // 'all' | 'qris' | 'manual'

  // ── Helper to identify QRIS vs Manual Vendors ──────────────────────────────
  const isQrisVendor = (v) => {
    return v.status === 'pending_payment' || 
           v.paymentProof === 'via_payment_gateway' || 
           (v.paymentProof && v.paymentProof.toLowerCase().includes('automatic payment'));
  };

  // ── Counts ────────────────────────────────────────────────────────────────
  const countProspect = vendors.filter(v => v.status === 'draft_plan').length;
  const countPending  = vendors.filter(v => ['pending', 'pending_payment', 'pending_manual'].includes(v.status)).length;
  const countPendingQris = vendors.filter(v => ['pending', 'pending_payment', 'pending_manual'].includes(v.status) && isQrisVendor(v)).length;
  const countPendingManual = vendors.filter(v => ['pending', 'pending_payment', 'pending_manual'].includes(v.status) && !isQrisVendor(v)).length;
  const countArchive  = vendors.filter(v => ['expired_draft', 'cancelled', 'rejected'].includes(v.status)).length;
  const countActive   = vendors.filter(v => v.status === 'active' && !isExpired(v.expiresAt)).length;

  // ── Filter per tab ────────────────────────────────────────────────────────
  const filteredVendors = vendors.filter(v => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch = !q || (
      (v.name && v.name.toLowerCase().includes(q)) ||
      (v.email && v.email.toLowerCase().includes(q)) ||
      (v.whatsapp && v.whatsapp.includes(q)) ||
      (v.orderId && v.orderId.toLowerCase().includes(q))
    );

    let matchesTab = false;
    if (vendorSubTab === 'inquiry') {
      if (inquirySubTab === 'prospect') matchesTab = v.status === 'draft_plan';
      if (inquirySubTab === 'pending')  {
        const isPending = ['pending', 'pending_payment', 'pending_manual'].includes(v.status);
        if (!isPending) matchesTab = false;
        else if (pendingFilter === 'qris') matchesTab = isQrisVendor(v);
        else if (pendingFilter === 'manual') matchesTab = !isQrisVendor(v);
        else matchesTab = true;
      }
      if (inquirySubTab === 'archive')  matchesTab = ['expired_draft', 'cancelled', 'rejected'].includes(v.status);
    } else {
      // Kelola Vendor — active only
      matchesTab = v.status === 'active';
    }

    return matchesTab && matchesSearch;
  });

  const sortedVendors = [...filteredVendors].sort((a, b) => {
    let result = 0;
    if (sortField === 'name')      result = (a.name || '').localeCompare(b.name || '');
    else if (sortField === 'email') result = (a.email || '').localeCompare(b.email || '');
    else if (sortField === 'planName') result = (a.planName || '').localeCompare(b.planName || '');
    else if (sortField === 'status') result = (a.status || '').localeCompare(b.status || '');
    else if (sortField === 'expiresAt') {
      const dateA = a.expiresAt ? new Date(a.expiresAt).getTime() : 9999999999999;
      const dateB = b.expiresAt ? new Date(b.expiresAt).getTime() : 9999999999999;
      result = dateA - dateB;
    }
    return sortOrder === 'asc' ? result : -result;
  });

  const getHeaderColor = (field) => (sortField === field ? '#818cf8' : '#a1a1aa');

  // ── Reject Handler ────────────────────────────────────────────────────────
  const handleConfirmReject = async () => {
    if (!rejectModal) return;
    setRejectLoading(true);
    try {
      const res = await fetch(`/api/admin/vendors/${rejectModal.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason || 'Pendaftaran ditolak oleh administrator.' }),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Gagal menolak vendor.');
      setRejectModal(null);
      setRejectReason('');
      if (refetchVendors) refetchVendors();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setRejectLoading(false);
    }
  };

  // ── Empty state message ───────────────────────────────────────────────────
  const emptyMsg = () => {
    if (vendorSubTab === 'active') return 'Tidak ada vendor berlangganan aktif.';
    if (inquirySubTab === 'prospect') return 'Tidak ada calon vendor di tahap pemilihan paket (Lead kosong).';
    if (inquirySubTab === 'pending') return 'Tidak ada transaksi yang sedang menunggu pembayaran / approval.';
    return 'Tidak ada data di arsip.';
  };

  // ─── Styles ───────────────────────────────────────────────────────────────
  const tabBtn = (active, color = '#6366f1') => ({
    padding: '6px 16px',
    borderRadius: '20px',
    border: 'none',
    background: active ? color : 'rgba(255,255,255,0.04)',
    color: active ? '#fff' : '#a1a1aa',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  const subTabBtn = (active, color = '#6366f1') => ({
    padding: '4px 14px',
    borderRadius: '16px',
    border: `1px solid ${active ? color : 'rgba(255,255,255,0.08)'}`,
    background: active ? `${color}22` : 'transparent',
    color: active ? color : '#71717a',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  return (
    <div className={`glass-card ${styles.wrapper}`}>

      {/* ── Header row: title + search ── */}
      <div className={styles.headerRow}>
        <div className={styles.titleBlock}>
          {vendorSubTab === 'inquiry' ? (
            <>
              <h3 className={`${styles.sectionTitle} ${styles.titleAmber}`}>
                <InquiryIcon size={15} color="#fbbf24" />
                <span>Inquiry Vendor</span>
              </h3>
              <p className={styles.sectionSub}>Pendaftaran calon vendor studio</p>
            </>
          ) : (
            <>
              <h3 className={`${styles.sectionTitle} ${styles.titleIndigo}`}>
                <UsersIcon size={15} color="#818cf8" />
                <span>Daftar Vendor</span>
              </h3>
              <p className={styles.sectionSub}>Vendor aktif berlangganan</p>
            </>
          )}
        </div>
        <div className={styles.searchWrap}>
          <input
            type="text"
            className="input-text"
            placeholder="Cari vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', height: '32px', fontSize: '12px', paddingLeft: '28px' }}
          />
          <div className={styles.searchIcon}>
            <SearchIcon size={12} color="#71717a" />
          </div>
        </div>
      </div>

      {/* ── Inquiry Sub Tabs (hanya tampil di tab Inquiry) ── */}
      {vendorSubTab === 'inquiry' && (
        <div className={styles.subTabBar}>
          <div className={styles.subTabGroup}>
            <button
              onClick={() => setInquirySubTab('prospect')}
              className={styles.subTabBtn}
              style={inquirySubTab === 'prospect' ? { background: 'rgba(56,189,248,0.15)', color: '#38bdf8', borderColor: '#38bdf8' } : {}}
            >
              Lead {countProspect > 0 && `(${countProspect})`}
            </button>
            <button
              onClick={() => setInquirySubTab('pending')}
              className={styles.subTabBtn}
              style={inquirySubTab === 'pending' ? { background: 'rgba(251,191,36,0.15)', color: '#fbbf24', borderColor: '#fbbf24' } : {}}
            >
              Menunggu Bayar {countPending > 0 && `(${countPending})`}
            </button>
            <button
              onClick={() => setInquirySubTab('archive')}
              className={styles.subTabBtn}
              style={inquirySubTab === 'archive' ? { background: 'rgba(113,113,122,0.15)', color: '#a1a1aa', borderColor: '#71717a' } : {}}
            >
              Arsip {countArchive > 0 && `(${countArchive})`}
            </button>
          </div>

          {inquirySubTab === 'pending' && countPending > 0 && (
            <div className={styles.methodFilter}>
              <span className={styles.methodFilterLabel}>Metode:</span>
              <button
                onClick={() => setPendingFilter('all')}
                className={styles.methodChip}
                style={{ background: pendingFilter === 'all' ? '#fbbf24' : 'transparent', color: pendingFilter === 'all' ? '#000' : '#a1a1aa' }}
              >Semua ({countPending})</button>
              <button
                onClick={() => setPendingFilter('qris')}
                className={styles.methodChip}
                style={{ background: pendingFilter === 'qris' ? '#fbbf24' : 'transparent', color: pendingFilter === 'qris' ? '#000' : '#a1a1aa' }}
              >QRIS ({countPendingQris})</button>
              <button
                onClick={() => setPendingFilter('manual')}
                className={styles.methodChip}
                style={{ background: pendingFilter === 'manual' ? '#818cf8' : 'transparent', color: pendingFilter === 'manual' ? '#fff' : '#a1a1aa' }}
              >Manual ({countPendingManual})</button>
            </div>
          )}
        </div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <p className={styles.loadingState}>Memuat data...</p>
      ) : sortedVendors.length === 0 ? (
        <p className={styles.emptyState}>{emptyMsg()}</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th className={styles.theadTh} onClick={() => handleSort('name')} style={{ color: getHeaderColor('name') }}>Nama</th>
                <th className={styles.theadTh} onClick={() => handleSort('email')} style={{ color: getHeaderColor('email') }}>Kontak</th>
                <th className={styles.theadTh} onClick={() => handleSort('planName')} style={{ color: getHeaderColor('planName') }}>Paket</th>
                <th className={styles.theadTh}>Storage Add-On</th>
                <th className={styles.theadTh}>
                  {vendorSubTab === 'active' ? 'Status / Masa Aktif' :
                   inquirySubTab === 'prospect' ? 'Status Lead' :
                   inquirySubTab === 'pending' ? 'Status Pembayaran' : 'Status / Auto-Hapus'}
                </th>
                <th className={styles.theadTh} style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sortedVendors.map(v => {
                const expired = isExpired(v.expiresAt);
                const waUrl = getWaReminderUrl(v.whatsapp, v.name, v.planName, v.expiresAt);
                const isQris = isQrisVendor(v);
                const storageGb = v.addonStorageQuotaBytes ? Math.round(v.addonStorageQuotaBytes / (1024 * 1024 * 1024)) : 0;
                const pendingStorageGb = v.pendingAddonQuotaBytes ? Math.round(v.pendingAddonQuotaBytes / (1024 * 1024 * 1024)) : 0;

                const hasPendingPlanUpgrade = !!(v.pendingPlanName && v.pendingPlanName !== v.planName);
                const hasPendingStorageAddon = !!(pendingStorageGb > 0 || (v.pendingAddonPlanId && v.pendingAddonPlanId !== v.addonPlanId));
                const hasPendingUpgrade = hasPendingPlanUpgrade || hasPendingStorageAddon || !!(v.pendingTransferProof && v.status === 'active');
                const hasValidProof = Boolean(v.paymentProof && (v.paymentProof.startsWith('/api/admin/proofs') || v.paymentProof.startsWith('http') || v.paymentProof.includes('.')));

                return (
                  <tr key={v.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {/* Name */}
                    <td style={{ padding: '12px 14px' }}>
                      <strong style={{ color: '#fff', display: 'block' }}>{v.name}</strong>
                      <span style={{ fontSize: '11px', color: '#71717a' }}>{v.email}</span>
                    </td>

                    {/* Contact */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {v.whatsapp ? (
                          <>
                            <span style={{ color: '#22c55e', fontSize: '12px', fontWeight: '600' }}>+{v.whatsapp}</span>
                            <a 
                              href={`https://wa.me/${v.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Halo Kak ${v.name}, terima kasih telah mendaftar di ${settings?.saas_name || 'Photota'}. Ada yang bisa kami bantu terkait pemilihan paket atau pembayaran?`)}`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ padding: '2px 8px', fontSize: '10px', fontWeight: '700', color: '#25D366', border: '1px solid rgba(37,211,102,0.3)', borderRadius: '6px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                              title="Hubungi calon vendor via WhatsApp"
                            >
                              WhatsApp
                            </a>
                          </>
                        ) : (
                          <span style={{ color: '#71717a', fontSize: '12px' }}>–</span>
                        )}
                      </div>
                    </td>

                    {/* Plan */}
                    <td style={{ padding: '12px 14px' }}>
                      {v.planName ? (
                        <div>
                          <strong style={{ color: '#fbbf24', display: 'block', fontSize: '13px' }}>{v.planName}</strong>
                          <span style={{ fontSize: '11px', color: '#34d399', fontWeight: '600' }}>
                            Rp {(v.planPrice || 0).toLocaleString('id-ID')}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '12px' }}>Sedang Memilih</span>
                      )}
                      {hasPendingPlanUpgrade && (
                        <div style={{ marginTop: '4px' }}>
                          <span 
                            onClick={() => setVendorToApprove && setVendorToApprove(v)}
                            style={{ cursor: 'pointer', color: '#fbbf24', background: 'rgba(251,191,36,0.15)', border: '1px dashed #fbbf24', padding: '2px 6px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', display: 'inline-block' }}
                            title="Klik untuk meninjau & mengonfirmasi upgrade paket"
                          >
                            ➔ Upgrade: {v.pendingPlanName}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Storage Add-On */}
                    <td style={{ padding: '12px 14px' }}>
                      {storageGb > 0 ? (
                        <span style={{ color: '#38bdf8', background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.3)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                          +{storageGb} GB
                        </span>
                      ) : (
                        <span style={{ color: '#71717a', fontSize: '12px' }}>–</span>
                      )}
                      {hasPendingStorageAddon && (
                        <div style={{ marginTop: '4px' }}>
                          <span 
                            onClick={() => setVendorToApprove && setVendorToApprove(v)}
                            style={{ cursor: 'pointer', color: '#38bdf8', background: 'rgba(56,189,248,0.15)', border: '1px dashed #38bdf8', padding: '2px 6px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', display: 'inline-block' }}
                            title="Klik untuk meninjau & mengonfirmasi upgrade storage"
                          >
                            ➔ Add-On: {pendingStorageGb > 0 ? `+${pendingStorageGb} GB` : (v.pendingAddonPlanId || 'Storage Extra')}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Status column — context-aware */}
                    <td style={{ padding: '12px 14px' }}>
                      {vendorSubTab === 'active' && (
                        <div>
                          <span style={{ color: '#34d399', background: 'rgba(16,185,129,0.15)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                            {expired ? 'Expired' : 'Aktif'}
                          </span>
                          {v.expiresAt && (
                            <div style={{ fontSize: '11px', color: '#71717a', marginTop: '3px' }}>
                              {new Date(v.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          )}
                          {hasPendingUpgrade && (
                            <div style={{ marginTop: '6px' }}>
                              {isQris ? (
                                <span style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.15)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <img src="/icons/qris-logo.svg" alt="QRIS" style={{ height: '12px', background: '#ffffff', padding: '1px 3px', borderRadius: '2px' }} />
                                  QRIS Upgrade (Otomatis)
                                </span>
                              ) : (
                                <button 
                                  onClick={() => setVendorToApprove && setVendorToApprove(v)}
                                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000000', border: 'none', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 6px rgba(245,158,11,0.3)' }}
                                  title="Klik untuk meninjau bukti transfer manual & mengonfirmasi upgrade"
                                >
                                  Verifikasi Bukti Transfer
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {vendorSubTab === 'inquiry' && inquirySubTab === 'prospect' && (
                        <div>
                          {v.planName ? (
                            <span style={{ color: '#818cf8', background: 'rgba(129,140,248,0.15)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', display: 'inline-block' }}>
                              Sudah Pilih Paket (Detail)
                            </span>
                          ) : (
                            <span style={{ color: '#38bdf8', background: 'rgba(56,189,248,0.15)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', display: 'inline-block' }}>
                              Sedang Memilih Paket
                            </span>
                          )}
                        </div>
                      )}
                      {vendorSubTab === 'inquiry' && inquirySubTab === 'pending' && (
                        <div>
                          {isQris ? (
                            <>
                              <span style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.15)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                <img src="/icons/qris-logo.svg" alt="QRIS" style={{ height: '14px', background: '#ffffff', padding: '1px 4px', borderRadius: '3px' }} />
                                Menunggu Pembayaran
                              </span>
                              <div><QrisCountdown expiresAt={v.qrisExpiresAt || v.paymentExpiresAt} /></div>
                            </>
                          ) : (
                            <div>
                              {hasValidProof ? (
                                <span style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <span>📁</span> Menunggu Verifikasi Bukti
                                </span>
                              ) : (
                                <span style={{ color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <span>⏳</span> Belum Upload Bukti
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {vendorSubTab === 'inquiry' && inquirySubTab === 'archive' && (
                        <div>
                          <span style={{
                            color: v.status === 'rejected' ? '#f87171' : v.status === 'cancelled' ? '#fbbf24' : '#f87171',
                            background: v.status === 'rejected' ? 'rgba(248,113,113,0.12)' : v.status === 'cancelled' ? 'rgba(251,191,36,0.12)' : 'rgba(239,68,68,0.12)',
                            padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', display: 'inline-block', marginBottom: '4px'
                          }}>
                            {v.status === 'rejected' ? 'Ditolak' : v.status === 'cancelled' ? 'Dibatalkan' : 'Sesi Kedaluwarsa'}
                          </span>
                          <div><AutoDeleteBadge archivedAt={v.archivedAt} /></div>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>

                        {/* Prospect sub-tab actions */}
                        {vendorSubTab === 'inquiry' && inquirySubTab === 'prospect' && (
                          <button
                            onClick={() => setVendorToDelete(v)}
                            className="btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px', color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}
                          >
                            🗑️ Hapus Lead
                          </button>
                        )}

                        {/* Pending sub-tab actions */}
                        {vendorSubTab === 'inquiry' && inquirySubTab === 'pending' && (
                          <>
                            {isQris ? (
                              <>
                                <button
                                  onClick={() => handleSyncQrisStatus(v)}
                                  disabled={syncingId === v.id}
                                  className="btn-secondary"
                                  style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px', color: '#fbbf24', borderColor: 'rgba(251,191,36,0.3)', cursor: 'pointer' }}
                                  title="Cek & Sync status pembayaran langsung dari Gateway API"
                                >
                                  {syncingId === v.id ? '⌛ Cek...' : '🔍 Cek Status QRIS'}
                                </button>
                                <button
                                  onClick={() => onCancelQris && onCancelQris(v)}
                                  className="btn-secondary"
                                  style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px', color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}
                                >
                                  🚫 Batalkan
                                </button>
                              </>
                            ) : (
                              <>
                                {hasValidProof ? (
                                  <>
                                    <button
                                      onClick={() => setActiveProofUrl({ url: v.paymentProof, status: v.status, name: v.name, email: v.email })}
                                      className="btn-secondary"
                                      style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px', color: '#38bdf8', borderColor: 'rgba(56,189,248,0.3)' }}
                                    >
                                      👁 Bukti
                                    </button>
                                    <button
                                      onClick={() => setVendorToApprove(v)}
                                      className="btn-primary"
                                      style={{ padding: '4px 10px', fontSize: '11px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '6px' }}
                                    >
                                      ✓ Setujui
                                    </button>
                                  </>
                                ) : null}
                                <button
                                  onClick={() => { setRejectModal(v); setRejectReason(''); }}
                                  className="btn-secondary"
                                  style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px', color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}
                                >
                                  ✗ Tolak
                                </button>
                              </>
                            )}
                          </>
                        )}

                        {/* Archive sub-tab actions */}
                        {vendorSubTab === 'inquiry' && inquirySubTab === 'archive' && (
                          <>
                            <button
                              onClick={() => onRegenerateQris && onRegenerateQris(v)}
                              className="btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px', color: '#34d399', borderColor: 'rgba(52,211,153,0.3)' }}
                            >
                              🔄 Generate QRIS Baru
                            </button>
                            <button
                              onClick={() => setVendorToDelete(v)}
                              className="btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px', color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}
                            >
                              🗑️ Hapus
                            </button>
                          </>
                        )}

                        {/* Kelola Vendor (active) actions — dropdown menu + quick QRIS check */}
                        {vendorSubTab === 'active' && (
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-end' }}>
                            {hasPendingUpgrade && isQris && (
                              <button
                                onClick={() => handleSyncQrisStatus(v)}
                                disabled={syncingId === v.id}
                                className="btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', color: '#fbbf24', borderColor: 'rgba(251,191,36,0.3)', cursor: 'pointer' }}
                                title="Cek & Sync status QRIS langsung dari Midtrans API"
                              >
                                {syncingId === v.id ? '⌛ Cek...' : '🔍 Cek QRIS'}
                              </button>
                            )}
                            <button
                              onClick={(e) => handleOpenMenu(e, v)}
                              className="btn-secondary"
                              style={{
                                padding: '4px 10px', fontSize: '12px', fontWeight: '700', borderRadius: '6px',
                                background: activeMenuVendor?.id === v.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                                color: activeMenuVendor?.id === v.id ? '#818cf8' : '#e4e4e7',
                                borderColor: activeMenuVendor?.id === v.id ? '#6366f1' : 'rgba(255,255,255,0.1)',
                                cursor: 'pointer'
                              }}
                            >
                              Aksi ▾
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => setRejectModal(null)}>
          <div style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '28px', maxWidth: '440px', width: '100%' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', color: '#f87171' }}>✗ Tolak Pendaftaran</h3>
            <p style={{ margin: '0 0 16px', color: '#a1a1aa', fontSize: '14px' }}>
              Anda akan menolak pendaftaran <strong style={{ color: '#fff' }}>{rejectModal.name}</strong> ({rejectModal.email}).
              Data akan dipindahkan ke Arsip.
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Alasan penolakan (opsional, akan dikirim via email jika SMTP aktif)..."
              style={{ width: '100%', minHeight: '80px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e4e4e7', padding: '10px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button onClick={() => setRejectModal(null)} className="btn-secondary" style={{ padding: '8px 20px', fontSize: '13px', borderRadius: '8px' }}>Batal</button>
              <button onClick={handleConfirmReject} disabled={rejectLoading} className="btn-primary"
                style={{ padding: '8px 20px', fontSize: '13px', borderRadius: '8px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none', opacity: rejectLoading ? 0.7 : 1 }}>
                {rejectLoading ? 'Memproses...' : '✗ Konfirmasi Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dropdown Action Menu (Kelola Vendor only) ── */}
      {mounted && activeMenuVendor && menuPos && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99998 }} onClick={() => setActiveMenuVendor(null)} />
          <div style={{
            position: 'absolute', top: `${menuPos.top}px`, left: `${menuPos.left}px`,
            width: '175px', background: '#18181b', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.85)',
            padding: '6px', zIndex: 99999, display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left'
          }}>
            {activeMenuVendor.paymentProof && (
              <button
                onClick={() => { setActiveProofUrl({ url: activeMenuVendor.paymentProof, status: activeMenuVendor.status, name: activeMenuVendor.name, email: activeMenuVendor.email }); setActiveMenuVendor(null); }}
                style={{ padding: '8px 10px', fontSize: '12px', background: 'none', border: 'none', color: '#e4e4e7', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {(activeMenuVendor.paymentProof === 'via_payment_gateway' || activeMenuVendor.paymentProof?.toLowerCase().includes('automatic payment')) ? '⚡ Info Pembayaran QRIS' : '👁 Bukti Transfer'}
              </button>
            )}
            <button onClick={() => { setEditingVendor(activeMenuVendor); setActiveMenuVendor(null); }}
              style={{ padding: '8px 10px', fontSize: '12px', background: 'none', border: 'none', color: '#e4e4e7', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ✏️ Edit Vendor
            </button>
            <button
              onClick={() => { handleToggleVendorStatus(activeMenuVendor.id, activeMenuVendor.status === 'suspended' ? 'active' : 'suspended'); setActiveMenuVendor(null); }}
              style={{ padding: '8px 10px', fontSize: '12px', background: 'none', border: 'none', color: activeMenuVendor.status === 'suspended' ? '#34d399' : '#fbbf24', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {activeMenuVendor.status === 'suspended' ? '🟢 Aktifkan Akun' : '⏸️ Tangguhkan'}
            </button>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />
            <button
              onClick={() => { setVendorToDelete(activeMenuVendor); setActiveMenuVendor(null); }}
              style={{ padding: '8px 10px', fontSize: '12px', background: 'none', border: 'none', color: '#f87171', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🗑️ Hapus Vendor
            </button>
          </div>
        </>,
        document.body
      )}

      {/* ── Custom Alert Modal for Midtrans Status Check ── */}
      {syncStatusResult && (
        <div className="modal-overlay" onClick={() => setSyncStatusResult(null)} style={{ zIndex: 12000, position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', width: '90%', textAlign: 'center', background: '#121218', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '28px', boxShadow: '0 20px 50px rgba(0,0,0,0.9)' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '56px', height: '56px', borderRadius: '50%',
              background: syncStatusResult.type === 'success' ? 'rgba(16,185,129,0.15)' : syncStatusResult.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.15)',
              color: syncStatusResult.type === 'success' ? '#34d399' : syncStatusResult.type === 'error' ? '#f87171' : '#fbbf24',
              fontSize: '28px', marginBottom: '16px'
            }}>
              {syncStatusResult.type === 'success' ? '✓' : syncStatusResult.type === 'error' ? '⚠️' : 'ℹ️'}
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 'bold', color: '#ffffff' }}>
              {syncStatusResult.title}
            </h3>
            <p style={{ color: '#a1a1aa', fontSize: '14px', margin: '0 0 24px 0', lineHeight: '1.5' }}>
              {syncStatusResult.message}
            </p>
            <button
              onClick={() => setSyncStatusResult(null)}
              className="btn-primary"
              style={{ width: '100%', padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
            >
              Mengerti / Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
