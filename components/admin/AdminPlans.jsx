'use client';

import React, { useState, useEffect } from 'react';
import styles from './AdminPlans.module.css';
import { PlansIcon, StoragePoolIcon } from '@/components/AdminIcons';
import { SpeedBoltIcon, SettingsManageIcon, TrashIcon, CheckIcon, CloseIcon } from '@/components/StorageIcons';

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

  const handleToggleAddonStatus = async (addon) => {
    const newStatus = addon.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch('/api/admin/addon-plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: addon.id, status: newStatus })
      });
      if (res.ok) {
        fetchAddonPlans();
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal mengubah status Storage Plan');
      }
    } catch (err) {
      console.error('Error toggling addon status:', err);
    }
  };

  const handleDeleteAddon = async (id, name) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus paket Add-On "${name}" secara permanen dari katalog penawaran?`)) return;
    try {
      const res = await fetch(`/api/admin/addon-plans?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        fetchAddonPlans();
      } else {
        alert(data.error || 'Gagal menghapus Storage Plan');
      }
    } catch (err) {
      console.error('Error deleting addon plan:', err);
    }
  };

  return (
    <div className={styles.wrapper}>

      {/* ── SECTION 1: PAKET BERLANGGANAN UTAMA ── */}
      <div className="glass-card">
        <div className={styles.sectionHeader}>
          <div>
            <h3 className={styles.sectionTitle}>
              <PlansIcon size={16} color="#818cf8" />
              <span>Paket Langganan</span>
            </h3>
            <p className={styles.sectionSub}>Atur tier dan batas fitur studio</p>
          </div>
          <button
            onClick={() => openPlanModal()}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '12px', fontWeight: '600' }}
          >
            + Tambah Paket
          </button>
        </div>

        {loadingPlans ? (
          <p className={styles.loadingState}>Memuat paket...</p>
        ) : plans.length === 0 ? (
          <p className={styles.emptyState}>
            Belum ada paket berlangganan. Klik tombol di atas untuk membuat paket baru.
          </p>
        ) : (
          <div className={styles.plansGrid}>
            {plans.map(p => (
              <div
                key={p.id}
                className={`${styles.planCard} ${p.name.includes('Pro') ? styles.planCardPro : ''}`}
              >
                {p.name.includes('Pro') && (
                  <div className={styles.bestSellerBadge}>BEST SELLER</div>
                )}

                <div>
                  <div className={styles.planHeaderRow}>
                    <h4 className={styles.planName}>{p.name}</h4>
                    <span className={`${styles.planStatus} ${p.status === 'active' ? styles.planStatusActive : styles.planStatusInactive}`}>
                      {p.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>

                  <div className={styles.planPrice}>
                    Rp {p.price ? p.price.toLocaleString('id-ID') : '0'}
                    <span className={styles.planPricePeriod}> / {p.activePeriodDays} hari</span>
                  </div>

                  <ul className={styles.featureList}>
                    <li className={styles.featureItem}>✓ Maks. <strong>{p.maxProjects >= 99999 ? 'Unlimited' : p.maxProjects} Project</strong></li>
                    <li className={styles.featureItem}>✓ Foto <strong>Unlimited</strong></li>
                    <li className={styles.featureItem}>✓ Galeri Online &amp; Seleksi Foto Klien</li>
                    <li className={styles.featureItem} style={{ color: '#c5a059', fontWeight: 'bold' }}>✓ Subdomain Studio Eksklusif</li>
                    {p.allowCustomLogo === 1 || p.allowCustomLogo === true || p.name.includes('Pro') || p.name.includes('Business') ? (
                      <li className={styles.featureItem} style={{ color: '#818cf8', fontWeight: 'bold' }}>✓ Bisa Logo Studio Sendiri</li>
                    ) : (
                      <li className={styles.featureItem} style={{ color: '#71717a' }}>• Logo Platform Standard</li>
                    )}
                    {p.allowRawSelector === undefined || p.allowRawSelector === 1 || p.allowRawSelector === true ? (
                      <li className={styles.featureItem} style={{ color: '#34d399', fontWeight: 'bold' }}>✓ Auto-Sorter File RAW</li>
                    ) : (
                      <li className={styles.featureItem} style={{ color: '#71717a' }}>• RAW Selector Nonaktif</li>
                    )}
                  </ul>
                </div>

                <div className={styles.actionRow}>
                  <button
                    onClick={() => openPlanModal(p)}
                    className="btn-secondary"
                    style={{ flex: 1, padding: '8px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <SettingsManageIcon size={12} color="#ffffff" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => setPlanToDelete(p)}
                    className="btn-secondary"
                    style={{ padding: '8px 12px', fontSize: '12px', color: '#f87171', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <TrashIcon size={12} color="#f87171" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION 2: SETTING STORAGE PLAN ── */}
      <div className="glass-card" style={{ border: '1px solid rgba(52,211,153,0.2)' }}>
        <div className={styles.sectionHeader}>
          <div>
            <h3 className={styles.sectionTitle} style={{ color: '#34d399' }}>
              <SpeedBoltIcon size={16} color="#34d399" />
              <span>Storage Plan</span>
              <span className="badge badge-active" style={{ fontSize: '10px' }}>Add-On Cloud</span>
            </h3>
            <p className={styles.sectionSub}>Kelola kapasitas penyimpanan tambahan untuk vendor</p>
          </div>
          <button
            onClick={() => handleOpenAddonModal()}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}
          >
            + Tambah Storage Plan
          </button>
        </div>

        {loadingAddon ? (
          <p className={styles.loadingState}>Memuat data Storage Plan...</p>
        ) : addonPlans.length === 0 ? (
          <p className={styles.emptyState}>
            Belum ada Storage Plan. Klik tombol di atas untuk membuat Add-On Storage.
          </p>
        ) : (
          <div className={styles.addonGrid}>
            {addonPlans.map(addon => {
              const quotaGb = addon.quotaBytes ? (addon.quotaBytes / (1024 * 1024 * 1024)).toFixed(0) : '0';
              const isActive = addon.status === 'active';
              return (
                <div
                  key={addon.id}
                  className={styles.addonCard}
                  style={{
                    opacity: isActive ? 1 : 0.75,
                    borderColor: isActive ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.07)',
                    background: isActive ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.01)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                      <h4 className={styles.addonName} style={{ color: isActive ? '#f4f4f5' : '#a1a1aa' }}>{addon.name}</h4>
                      <button
                        type="button"
                        onClick={() => handleToggleAddonStatus(addon)}
                        title={isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        className={`badge ${isActive ? 'badge-active' : ''}`}
                        style={{
                          cursor: 'pointer',
                          border: `1px solid ${isActive ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.1)'}`,
                          background: isActive ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.08)',
                          color: isActive ? '#34d399' : '#a1a1aa',
                          display: 'inline-flex', alignItems: 'center', gap: '4px'
                        }}
                      >
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: isActive ? '#34d399' : '#71717a' }} />
                        {isActive ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </div>

                    <p className={styles.addonPrice} style={{ color: isActive ? '#34d399' : '#71717a' }}>
                      {quotaGb} GB <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 'normal' }}>Storage</span>
                    </p>
                    <p className={styles.addonDesc} style={{ color: isActive ? '#fbbf24' : '#a1a1aa', fontWeight: '700', fontSize: '13px', margin: '0' }}>
                      Rp {Number(addon.price).toLocaleString('id-ID')}
                      <span style={{ fontSize: '10px', color: '#71717a', fontWeight: 'normal' }}> / bln</span>
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <button
                      onClick={() => handleOpenAddonModal(addon)}
                      className="btn-ghost btn-ghost-neutral"
                      style={{ flex: 1, fontSize: '11px', padding: '5px 8px', justifyContent: 'center' }}
                    >
                      <SettingsManageIcon size={11} color="#ffffff" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleToggleAddonStatus(addon)}
                      style={{ padding: '5px 8px', fontSize: '11px', borderRadius: '6px', cursor: 'pointer', border: `1px solid ${isActive ? 'rgba(251,191,36,0.2)' : 'rgba(52,211,153,0.2)'}`, background: isActive ? 'rgba(251,191,36,0.1)' : 'rgba(52,211,153,0.1)', color: isActive ? '#fbbf24' : '#34d399' }}
                    >
                      {isActive ? 'Off' : 'On'}
                    </button>
                    <button
                      onClick={() => handleDeleteAddon(addon.id, addon.name)}
                      className="btn-ghost btn-ghost-red"
                      style={{ padding: '5px 8px', fontSize: '11px', justifyContent: 'center' }}
                    >
                      <TrashIcon size={11} color="#f87171" />
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
              {editingAddon ? 'Edit Storage Plan' : 'Tambah Storage Plan'}
            </h3>

            <form onSubmit={handleSaveAddon} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Nama Paket Storage</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Add-On Storage 100 GB"
                  value={addonForm.name}
                  onChange={e => setAddonForm({ ...addonForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Kapasitas (GB)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={addonForm.quotaGb}
                    onChange={e => setAddonForm({ ...addonForm, quotaGb: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Harga / Bulan (Rp)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1000"
                    value={addonForm.price}
                    onChange={e => setAddonForm({ ...addonForm, price: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Urutan Tampil</label>
                  <input
                    type="number"
                    value={addonForm.sortOrder}
                    onChange={e => setAddonForm({ ...addonForm, sortOrder: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    value={addonForm.status}
                    onChange={e => setAddonForm({ ...addonForm, status: e.target.value })}
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
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '12px' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingAddon}
                  className="btn-primary"
                  style={{ padding: '8px 18px', fontSize: '12px', background: 'linear-gradient(135deg, #10b981, #059669)' }}
                >
                  {savingAddon ? 'Menyimpan...' : 'Simpan Storage Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
