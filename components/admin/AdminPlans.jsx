'use client';

import React, { useState, useEffect } from 'react';

export default function AdminPlans({
  plans = [],
  loadingPlans = false,
  openPlanModal,
  setPlanToDelete
}) {
  // Add-On Storage Plans state
  const [addonPlans, setAddonPlans] = useState([]);
  const [loadingAddon, setLoadingAddon] = useState(false);
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [editingAddon, setEditingAddon] = useState(null);
  const [addonForm, setAddonForm] = useState({
    name: '',
    quotaGb: 50,
    price: 89000,
    status: 'active',
    sortOrder: 1
  });
  const [savingAddon, setSavingAddon] = useState(false);

  // Fetch Add-On Storage Plans from API
  const fetchAddonPlans = async () => {
    setLoadingAddon(true);
    try {
      const res = await fetch('/api/admin/addon-plans');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.plans)) {
          setAddonPlans(data.plans);
        }
      }
    } catch (err) {
      console.error('Failed to fetch addon plans:', err);
    } finally {
      setLoadingAddon(false);
    }
  };

  useEffect(() => {
    fetchAddonPlans();
  }, []);

  const handleOpenAddonModal = (plan = null) => {
    if (plan) {
      setEditingAddon(plan);
      setAddonForm({
        name: plan.name || '',
        quotaGb: plan.quotaBytes ? Math.round(plan.quotaBytes / (1024 * 1024 * 1024)) : 50,
        price: plan.price || 0,
        status: plan.status || 'active',
        sortOrder: plan.sortOrder || 1
      });
    } else {
      setEditingAddon(null);
      setAddonForm({
        name: '',
        quotaGb: 50,
        price: 89000,
        status: 'active',
        sortOrder: addonPlans.length + 1
      });
    }
    setShowAddonModal(true);
  };

  const handleSaveAddon = async (e) => {
    e.preventDefault();
    setSavingAddon(true);
    try {
      const quotaBytes = Number(addonForm.quotaGb) * 1024 * 1024 * 1024;
      const planKey = editingAddon?.planKey || `addon_${addonForm.quotaGb}gb`;
      
      const payload = {
        id: editingAddon?.id,
        planKey,
        name: addonForm.name || `Add-On Storage ${addonForm.quotaGb} GB`,
        quotaBytes,
        price: Number(addonForm.price),
        status: addonForm.status,
        sortOrder: Number(addonForm.sortOrder)
      };

      const method = editingAddon ? 'PUT' : 'POST';
      const res = await fetch('/api/admin/addon-plans', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowAddonModal(false);
        fetchAddonPlans();
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal menyimpan Storage Plan');
      }
    } catch (err) {
      console.error('Error saving addon plan:', err);
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setSavingAddon(false);
    }
  };

  const handleDeleteAddon = async (id, name) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus Storage Plan "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/addon-plans?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAddonPlans();
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal menghapus Storage Plan');
      }
    } catch (err) {
      console.error('Error deleting addon plan:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* ── SECTION 1: PAKET BERLANGGANAN UTAMA ── */}
      <div className="glass-card" style={{ padding: '24px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '600' }}>Kelola Paket Berlangganan</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#a1a1aa' }}>
              Atur Paket Berbasis Fitur (Starter, Pro Studio, & Unlimited Master)
            </p>
          </div>
          <button
            onClick={() => openPlanModal()}
            className="btn-primary"
            style={{ padding: '10px 20px', fontSize: '13px', fontWeight: '600' }}
          >
            + Tambah Paket Baru
          </button>
        </div>

        {loadingPlans ? (
          <p style={{ textAlign: 'center', color: '#a1a1aa', padding: '24px 0' }}>Loading packages...</p>
        ) : plans.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#71717a', padding: '24px 0', fontSize: '14px' }}>
            Belum ada paket berlangganan. Klik tombol di atas untuk membuat paket baru.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {plans.map(p => (
              <div
                key={p.id}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: p.name.includes('Pro') ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '16px',
                  padding: '24px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between'
                }}
              >
                {p.name.includes('Pro') && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    right: '20px',
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    padding: '3px 10px',
                    borderRadius: '10px',
                    letterSpacing: '0.05em'
                  }}>
                    BEST SELLER
                  </div>
                )}

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#ffffff' }}>{p.name}</h4>
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontWeight: 'bold',
                      background: p.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.08)',
                      color: p.status === 'active' ? '#34d399' : '#a1a1aa'
                    }}>
                      {p.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>

                  <div style={{ fontSize: '26px', fontWeight: '800', color: '#fbbf24', margin: '12px 0 16px 0' }}>
                    Rp {p.price ? p.price.toLocaleString('id-ID') : '0'}
                    <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#71717a' }}> / {p.activePeriodDays} hari</span>
                  </div>

                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', fontSize: '13px', color: '#e4e4e7', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li>✓ Maksimal <strong>{p.maxProjects >= 99999 ? 'Unlimited' : p.maxProjects} Project</strong></li>
                    <li>✓ Foto <strong>Unlimited</strong></li>
                    <li>✓ Galeri Online & Seleksi Foto Klien</li>
                    {p.allowCustomLogo === 1 || p.allowCustomLogo === true || p.name.includes('Pro') || p.name.includes('Business') ? (
                      <li style={{ color: '#818cf8', fontWeight: 'bold' }}>✓ Bisa Menggunakan Logo Studio Sendiri</li>
                    ) : (
                      <li style={{ color: '#71717a' }}>• Logo Platform Standard</li>
                    )}
                    {p.allowRawSelector === undefined || p.allowRawSelector === 1 || p.allowRawSelector === true ? (
                      <li style={{ color: '#34d399', fontWeight: 'bold' }}>✓ Fitur Auto-Sorter / Selector File RAW</li>
                    ) : (
                      <li style={{ color: '#71717a' }}>• Fitur RAW Selector Nonaktif</li>
                    )}
                  </ul>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <button
                    onClick={() => openPlanModal(p)}
                    className="btn-secondary"
                    style={{ flex: 1, padding: '8px 12px', fontSize: '12px' }}
                  >
                    ✏️ Edit Paket
                  </button>
                  <button
                    onClick={() => setPlanToDelete(p)}
                    className="btn-secondary"
                    style={{ padding: '8px 12px', fontSize: '12px', color: '#f87171' }}
                  >
                    🗑️ Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION 2: SETTING STORAGE PLAN (COMPACT CARDS) ── */}
      <div className="glass-card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid rgba(52,211,153,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '700', color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚡ Setting Storage Plan <span style={{ fontSize: '11px', background: 'rgba(52,211,153,0.15)', color: '#34d399', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>Add-On Cloud</span>
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#a1a1aa' }}>
              Kelola opsi tambahan kapasitas penyimpanan server untuk vendor studio
            </p>
          </div>
          <button
            onClick={() => handleOpenAddonModal()}
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(16,185,129,0.3)'
            }}
          >
            + Tambah Storage Plan
          </button>
        </div>

        {loadingAddon ? (
          <p style={{ textAlign: 'center', color: '#a1a1aa', padding: '16px 0', fontSize: '13px' }}>Memuat data Storage Plan...</p>
        ) : addonPlans.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#71717a', padding: '16px 0', fontSize: '13px' }}>
            Belum ada Storage Plan. Klik tombol di atas untuk membuat paket Add-On Storage.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            {addonPlans.map(addon => {
              const quotaGb = addon.quotaBytes ? (addon.quotaBytes / (1024 * 1024 * 1024)).toFixed(0) : '0';
              return (
                <div
                  key={addon.id}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(52,211,153,0.15)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#f4f4f5' }}>{addon.name}</h4>
                      <span style={{
                        fontSize: '9px',
                        padding: '2px 6px',
                        borderRadius: '8px',
                        fontWeight: '700',
                        background: addon.status === 'active' ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.08)',
                        color: addon.status === 'active' ? '#34d399' : '#71717a'
                      }}>
                        {addon.status === 'active' ? 'Aktif' : 'Off'}
                      </span>
                    </div>

                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#34d399', margin: '8px 0 2px 0' }}>
                      {quotaGb} GB
                      <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 'normal', marginLeft: '4px' }}>Storage</span>
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#fbbf24' }}>
                      Rp {Number(addon.price).toLocaleString('id-ID')}
                      <span style={{ fontSize: '10px', color: '#71717a', fontWeight: 'normal' }}> / bln</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <button
                      onClick={() => handleOpenAddonModal(addon)}
                      style={{ flex: 1, padding: '5px 8px', fontSize: '11px', background: 'rgba(255,255,255,0.05)', color: '#e4e4e7', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDeleteAddon(addon.id, addon.name)}
                      style={{ padding: '5px 8px', fontSize: '11px', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL TAMBAH / EDIT STORAGE PLAN ── */}
      {showAddonModal && (
        <div className="modal-overlay" onClick={() => setShowAddonModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#34d399' }}>
              {editingAddon ? '✏️ Edit Storage Plan' : '➕ Tambah Storage Plan Baru'}
            </h3>

            <form onSubmit={handleSaveAddon} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '4px' }}>Nama Paket Storage</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Add-On Storage 100 GB"
                  value={addonForm.name}
                  onChange={e => setAddonForm({ ...addonForm, name: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '4px' }}>Kapasitas (GB)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={addonForm.quotaGb}
                    onChange={e => setAddonForm({ ...addonForm, quotaGb: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '4px' }}>Harga / Bulan (Rp)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1000"
                    value={addonForm.price}
                    onChange={e => setAddonForm({ ...addonForm, price: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '4px' }}>Urutan Tampil</label>
                  <input
                    type="number"
                    value={addonForm.sortOrder}
                    onChange={e => setAddonForm({ ...addonForm, sortOrder: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '4px' }}>Status</label>
                  <select
                    value={addonForm.status}
                    onChange={e => setAddonForm({ ...addonForm, status: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  >
                    <option value="active" style={{ background: '#18181b', color: '#fff' }}>Aktif</option>
                    <option value="inactive" style={{ background: '#18181b', color: '#fff' }}>Nonaktif</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddonModal(false)}
                  disabled={savingAddon}
                  style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingAddon}
                  style={{ padding: '8px 18px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                >
                  {savingAddon ? 'Menyimpan...' : '💾 Simpan Storage Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
