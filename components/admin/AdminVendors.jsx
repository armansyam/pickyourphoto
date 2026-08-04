'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function AdminVendors({
  vendors = [],
  loading = false,
  vendorSubTab = 'active',
  setVendorSubTab,
  setEditingVendor,
  setVendorToApprove,
  setVendorToDelete,
  setActiveProofUrl,
  handleToggleVendorStatus
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('expiresAt');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' = closest expiry date first
  const [activeMenuVendor, setActiveMenuVendor] = useState(null);
  const [menuPos, setMenuPos] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    if (activeMenuVendor?.id === v.id) {
      setActiveMenuVendor(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const dropdownWidth = 165;
    const calculatedLeft = Math.max(10, Math.min(rect.right - dropdownWidth, window.innerWidth - dropdownWidth - 10));
    setMenuPos({
      top: rect.bottom + window.scrollY + 4,
      left: calculatedLeft
    });
    setActiveMenuVendor(v);
  };

  const filteredVendors = vendors.filter(v => {
    const expired = isExpired(v.expiresAt);
    const isPending = v.status === 'pending' || v.status === 'pending_payment' || v.status === 'pending_manual';
    const matchesTab = vendorSubTab === 'pending'
      ? isPending
      : vendorSubTab === 'active'
      ? v.status === 'active' && !expired
      : v.status === 'suspended' || (v.status === 'active' && expired);

    const q = searchTerm.toLowerCase().trim();
    const matchesSearch = !q || (
      (v.name && v.name.toLowerCase().includes(q)) ||
      (v.email && v.email.toLowerCase().includes(q)) ||
      (v.whatsapp && v.whatsapp.includes(q))
    );

    return matchesTab && matchesSearch;
  });

  // Sort filtered vendors based on active sortField and sortOrder
  const sortedVendors = [...filteredVendors].sort((a, b) => {
    let result = 0;
    if (sortField === 'name') {
      result = (a.name || '').localeCompare(b.name || '');
    } else if (sortField === 'email') {
      result = (a.email || '').localeCompare(b.email || '');
    } else if (sortField === 'planName') {
      result = (a.planName || '').localeCompare(b.planName || '');
    } else if (sortField === 'status') {
      result = (a.status || '').localeCompare(b.status || '');
    } else if (sortField === 'expiresAt') {
      const dateA = a.expiresAt ? new Date(a.expiresAt).getTime() : 9999999999999;
      const dateB = b.expiresAt ? new Date(b.expiresAt).getTime() : 9999999999999;
      result = dateA - dateB;
    }
    return sortOrder === 'asc' ? result : -result;
  });

  // Remove emoji sort icons for a clean, minimalist UI
  const getHeaderColor = (field) => (sortField === field ? '#818cf8' : '#a1a1aa');

  const getWaReminderUrl = (phone, vendorName, planName, expiryDate) => {
    if (!phone) return null;
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }
    const formattedDate = expiryDate ? new Date(expiryDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'segera';
    const msg = `Halo ${vendorName || 'Studio'}, ini dari Admin Pick-Your-Photo. Mengingatkan bahwa masa aktif paket berlangganan ${planName || 'Studio'} Anda akan berakhir pada ${formattedDate}. Silakan lakukan perpanjangan langganan agar galeri foto tetap aktif. Terima kasih! 🙏`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="glass-card" style={{ padding: '24px', borderRadius: '16px', minHeight: '480px', paddingBottom: '160px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>Kelola Vendor Studio</h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#a1a1aa' }}>
            Klik pada judul kolom tabel (seperti <strong style={{ color: '#818cf8' }}>Masa Aktif</strong>) untuk mengurutkan terdekat expired
          </p>
        </div>
        <input
          type="text"
          className="input-text"
          placeholder="Cari vendor (nama/email/WA)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: '280px', height: '36px', fontSize: '13px' }}
        />
      </div>

      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', flexWrap: 'wrap' }}>
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
          Menunggu Konfirmasi ({vendors.filter(v => v.status === 'pending' || v.status === 'pending_payment' || v.status === 'pending_manual').length})
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
          Tidak Aktif / Expired ({vendors.filter(v => v.status === 'suspended' || (v.status === 'active' && isExpired(v.expiresAt))).length})
        </button>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#a1a1aa', padding: '24px 0' }}>Loading vendors list...</p>
      ) : sortedVendors.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#71717a', padding: '24px 0', fontSize: '14px' }}>
          {vendorSubTab === 'pending' ? 'Tidak ada akun pendaftaran baru.' :
           vendorSubTab === 'active' ? 'Tidak ada akun vendor aktif.' : 
           'Tidak ada akun vendor non-aktif / diarsipkan.'}
        </p>
      ) : (
        <div style={{ overflowX: 'auto', paddingBottom: '140px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#a1a1aa', userSelect: 'none' }}>
                <th onClick={() => handleSort('name')} style={{ padding: '12px 16px', cursor: 'pointer', color: getHeaderColor('name') }}>
                  Vendor
                </th>
                <th onClick={() => handleSort('email')} style={{ padding: '12px 16px', cursor: 'pointer', color: getHeaderColor('email') }}>
                  Kontak
                </th>
                <th onClick={() => handleSort('planName')} style={{ padding: '12px 16px', cursor: 'pointer', color: getHeaderColor('planName') }}>
                  Paket Plan
                </th>
                <th onClick={() => handleSort('status')} style={{ padding: '12px 16px', cursor: 'pointer', color: getHeaderColor('status') }}>
                  Status Akun
                </th>
                <th onClick={() => handleSort('expiresAt')} style={{ padding: '12px 16px', cursor: 'pointer', color: getHeaderColor('expiresAt') }}>
                  Masa Aktif
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sortedVendors.map(v => {
                const expired = isExpired(v.expiresAt);
                const waUrl = getWaReminderUrl(v.whatsapp, v.name, v.planName, v.expiresAt);

                return (
                  <tr key={v.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <strong style={{ color: '#fff', display: 'block' }}>{v.name}</strong>
                      <span style={{ fontSize: '11px', color: '#71717a' }}>{v.email}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ color: '#e4e4e7' }}>{v.whatsapp || '-'}</span>
                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary"
                            style={{
                              padding: '2px 8px',
                              fontSize: '11px',
                              fontWeight: '700',
                              color: '#25D366',
                              borderColor: 'rgba(37,211,102,0.3)',
                              borderRadius: '6px',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Kirim pesan pengingat via WhatsApp"
                          >
                            💬 Remind WA
                          </a>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#fbbf24', fontWeight: '500' }}>
                      {v.planName || 'Free Trial'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {v.status === 'pending_payment' || (v.status === 'pending' && v.paymentProof && v.paymentProof.includes('Midtrans')) ? (
                        <span style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.15)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>⚡ Menunggu Pembayaran QRIS (Otomatis)</span>
                      ) : (v.status === 'pending' || v.status === 'pending_manual') ? (
                        <span style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.15)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>⏳ Menunggu Konfirmasi Manual</span>
                      ) : v.status === 'suspended' ? (
                        <span style={{ color: '#f87171', background: 'rgba(239,68,68,0.15)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>🚫 Ditangguhkan</span>
                      ) : expired ? (
                        <span style={{ color: '#f87171', background: 'rgba(239,68,68,0.15)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>❌ Kedaluwarsa</span>
                      ) : (
                        <span style={{ color: '#34d399', background: 'rgba(16,185,129,0.15)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>🟢 Aktif</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#a1a1aa', fontSize: '12px' }}>
                      {v.status === 'pending' || v.status === 'pending_payment' || v.status === 'pending_manual'
                        ? 'Belum Aktif'
                        : v.expiresAt
                        ? new Date(v.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'Permanen'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                        {(v.status === 'pending' || v.status === 'pending_manual') && (
                          <button
                            onClick={() => setVendorToApprove(v)}
                            className="btn-primary"
                            style={{ padding: '4px 10px', fontSize: '11px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '6px' }}
                          >
                            ✓ Setujui
                          </button>
                        )}
                        <button
                          onClick={(e) => handleOpenMenu(e, v)}
                          className="btn-secondary"
                          style={{
                            padding: '4px 10px',
                            fontSize: '12px',
                            fontWeight: '700',
                            borderRadius: '6px',
                            background: activeMenuVendor?.id === v.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                            color: activeMenuVendor?.id === v.id ? '#818cf8' : '#e4e4e7',
                            borderColor: activeMenuVendor?.id === v.id ? '#6366f1' : 'rgba(255,255,255,0.1)',
                            cursor: 'pointer'
                          }}
                        >
                          Aksi ▾
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

      {mounted && activeMenuVendor && menuPos && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99998 }} onClick={() => setActiveMenuVendor(null)} />
          <div style={{
            position: 'absolute',
            top: `${menuPos.top}px`,
            left: `${menuPos.left}px`,
            width: '165px',
            background: '#18181b',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '10px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.85)',
            padding: '6px',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            textAlign: 'left'
          }}>
            {activeMenuVendor.paymentProof && (
              <button
                onClick={() => {
                  setActiveProofUrl({
                    url: activeMenuVendor.paymentProof,
                    status: activeMenuVendor.status,
                    name: activeMenuVendor.name,
                    email: activeMenuVendor.email
                  });
                  setActiveMenuVendor(null);
                }}
                style={{ padding: '8px 10px', fontSize: '12px', background: 'none', border: 'none', color: (activeMenuVendor.paymentProof === 'via_payment_gateway' || activeMenuVendor.paymentProof.includes('Midtrans')) ? '#34d399' : '#e4e4e7', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {(activeMenuVendor.paymentProof === 'via_payment_gateway' || activeMenuVendor.paymentProof.includes('Midtrans')) ? '⚡ Info Pembayaran QRIS' : '👁 Bukti Transfer'}
              </button>
            )}

            <button
              onClick={() => { setEditingVendor(activeMenuVendor); setActiveMenuVendor(null); }}
              style={{ padding: '8px 10px', fontSize: '12px', background: 'none', border: 'none', color: '#e4e4e7', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              ✏️ Edit Vendor
            </button>
            <button
              onClick={() => { handleToggleVendorStatus(activeMenuVendor.id, activeMenuVendor.status === 'suspended' ? 'active' : 'suspended'); setActiveMenuVendor(null); }}
              style={{ padding: '8px 10px', fontSize: '12px', background: 'none', border: 'none', color: activeMenuVendor.status === 'suspended' ? '#34d399' : '#fbbf24', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {activeMenuVendor.status === 'suspended' ? '🟢 Aktifkan Akun' : '⏸️ Tangguhkan'}
            </button>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />
            <button
              onClick={() => { setVendorToDelete(activeMenuVendor); setActiveMenuVendor(null); }}
              style={{ padding: '8px 10px', fontSize: '12px', background: 'none', border: 'none', color: '#f87171', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              🗑️ Hapus Vendor
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
