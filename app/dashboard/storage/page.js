'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function VendorStorageManagerPage() {
  const [loading, setLoading] = useState(true);
  const [vendorData, setVendorData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [addonPlans, setAddonPlans] = useState([]);
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    fetchStorageData();
    fetchAddonPlans();
  }, []);

  const fetchStorageData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/storage/folders');
      const data = await res.json();
      if (data.success) {
        setVendorData(data.vendor);
        setProjects(data.projects || []);
      } else {
        showToast(data.error || 'Gagal memuat data storage.', 'error');
      }
    } catch {
      showToast('Gagal terhubung ke server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAddonPlans = async () => {
    try {
      const res = await fetch('/api/addon-plans');
      const data = await res.json();
      if (data.success) {
        setAddonPlans(data.plans || []);
        if (data.plans.length > 0) {
          setSelectedPlanId(data.plans[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to fetch addon plans:', e);
    }
  };

  const showToast = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000);
  };

  const handleDeleteFolder = async (projectId, projectName) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus folder proyek "${projectName}"?\n\nSemua foto di dalam folder ini akan dihapus secara permanen dan kuota storage akan dikembalikan.`)) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`/api/storage/folders?projectId=${projectId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        fetchStorageData();
      } else {
        showToast(data.error || 'Gagal menghapus folder.', 'error');
      }
    } catch {
      showToast('Gagal memproses penghapusan folder.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubscribeAddon = async (planId) => {
    try {
      setActionLoading(true);
      const res = await fetch('/api/payment/addon/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addonPlanId: planId })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        setShowAddonModal(false);
        fetchStorageData();
      } else {
        showToast(data.error || 'Gagal mengaktifkan paket Add-On Storage.', 'error');
      }
    } catch {
      showToast('Gagal menghubungi server transaksi.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatIDR = (amount) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const usedBytes = vendorData?.usedStorageBytes || 0;
  const quotaBytes = vendorData?.addonStorageQuotaBytes || 0;
  const usagePercent = quotaBytes > 0 ? Math.min(100, Math.round((usedBytes / quotaBytes) * 100)) : (usedBytes > 0 ? 100 : 0);
  const daysRemaining = vendorData?.expiresAt 
    ? Math.max(1, Math.min(30, Math.ceil((new Date(vendorData.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))))
    : 30;

  const getProratedPrice = (price) => {
    if (!price) return 0;
    return Math.max(10000, Math.round((price / 30) * daysRemaining));
  };

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#f4f4f5', padding: '24px', fontFamily: "'Inter', sans-serif" }}>
      {/* Toast Notification */}
      {notification.show && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: '12px',
          backdropFilter: 'blur(16px)',
          border: notification.type === 'error' ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(52,211,153,0.4)',
          background: notification.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(52,211,153,0.15)',
          color: notification.type === 'error' ? '#f87171' : '#34d399',
          fontSize: '13px',
          fontWeight: '600',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          {notification.message}
        </div>
      )}

      {/* Main Container */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <Link href="/dashboard" style={{ fontSize: '12px', color: '#818cf8', textDecoration: 'none', fontWeight: '500' }}>
              &larr; Kembali ke Dashboard Utama
            </Link>
            <h1 style={{ margin: '6px 0 4px 0', fontSize: '26px', fontWeight: '800', background: 'linear-gradient(135deg, #818cf8, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              📁 Cloud Storage Manager
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#a1a1aa' }}>
              Kelola kapasitas penyimpanan cloud dedicated studio & kuota galeri klien.
            </p>
          </div>

          {hasAddon && (
            <button
              onClick={() => setShowAddonModal(true)}
              style={{
                padding: '10px 18px',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>📦</span> Tambah Kuota Storage
            </button>
          )}
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#a1a1aa', fontSize: '14px' }}>
            Memuat data Cloud Storage...
          </div>
        )}

        {/* KONDISI 1: VENDOR BELUM MEMILIKI ADD-ON (UPSELL PREVIEW) */}
        {!loading && !hasAddon && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            
            {/* Hero Upsell Banner */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(16,185,129,0.05))',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: '20px',
              padding: '32px',
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '24px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
            }}>
              <div style={{ flex: 1, minWidth: '280px' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', background: 'rgba(99,102,241,0.15)', color: '#818cf8', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.3)' }}>
                  ✨ Fitur Premium Studio Cloud
                </span>
                <h2 style={{ margin: '14px 0 10px 0', fontSize: '24px', fontWeight: '800', color: '#ffffff', lineHeight: '1.3' }}>
                  Simpan Ribuan Foto Langsung di Cloud SaaS Pick Your Photo 🚀
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#a1a1aa', lineHeight: '1.6' }}>
                  Tingkatkan kenyamanan kerja studio Anda tanpa khawatir ruang penyimpanan lokal penuh. Dedicated Cloud Storage berkecepatan tinggi dengan proteksi aman & manajemen folder instan.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '16px', fontSize: '12px', color: '#e4e4e7' }}>
                  <span style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '4px 10px', borderRadius: '8px' }}>
                    <strong style={{ color: '#34d399' }}>✓</strong> High-Speed Pipe Stream
                  </span>
                  <span style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '4px 10px', borderRadius: '8px' }}>
                    <strong style={{ color: '#34d399' }}>✓</strong> Single Expiry Integration
                  </span>
                  <span style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '4px 10px', borderRadius: '8px' }}>
                    <strong style={{ color: '#34d399' }}>✓</strong> Glassmorphism Lock
                  </span>
                </div>
              </div>

              <div style={{ background: 'rgba(24,24,27,0.8)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '16px', padding: '24px', textAlign: 'center', minWidth: '220px' }}>
                <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Mulai Dari Hanya</span>
                <div style={{ fontSize: '26px', fontWeight: '800', color: '#fbbf24', marginBottom: '14px' }}>
                  Rp 49.000 <span style={{ fontSize: '12px', color: '#71717a', fontWeight: '400' }}>/ bln</span>
                </div>
                <button
                  onClick={() => setShowAddonModal(true)}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16,185,129,0.3)'
                  }}
                >
                  Pilih Paket Storage &rarr;
                </button>
              </div>
            </div>

            {/* Showcase Dynamic Cards */}
            <div>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📦</span> Pilihan Paket Add-On Cloud Storage
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                {addonPlans.map((plan) => {
                  const quotaGb = plan.quotaBytes ? (plan.quotaBytes / (1024 * 1024 * 1024)).toFixed(0) : '0';
                  return (
                    <div
                      key={plan.id}
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '16px',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justify: 'space-between',
                        gap: '16px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {plan.name}
                        </span>
                        <div style={{ fontSize: '26px', fontWeight: '800', color: '#ffffff', margin: '8px 0 4px 0' }}>
                          {quotaGb} GB
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#34d399', marginBottom: '8px' }}>
                          Rp {Number(plan.price).toLocaleString('id-ID')}
                          <span style={{ fontSize: '11px', color: '#71717a', fontWeight: '400' }}> / bulan</span>
                        </div>

                        {daysRemaining < 30 && (
                          <div style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '8px', padding: '6px 10px', marginBottom: '12px', fontSize: '11px', color: '#34d399' }}>
                            🏷️ <strong>Bayar Prorata Sisa {daysRemaining} Hari:</strong><br/>
                            <strong style={{ fontSize: '13px' }}>Rp {getProratedPrice(plan.price).toLocaleString('id-ID')}</strong>
                          </div>
                        )}

                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '12px', color: '#a1a1aa', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <li><strong style={{ color: '#34d399' }}>✓</strong> Kuota Storage Dedicated Studio</li>
                          <li><strong style={{ color: '#34d399' }}>✓</strong> Unlimited High-Res Photos</li>
                          <li><strong style={{ color: '#34d399' }}>✓</strong> Dynamic Daily Prorated Billing</li>
                        </ul>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedPlanId(plan.id);
                          setShowAddonModal(true);
                        }}
                        style={{
                          width: '100%',
                          padding: '10px',
                          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        Aktifkan Sekarang
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* KONDISI 2: VENDOR MEMILIKI ADD-ON ACTIVE */}
        {!loading && hasAddon && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Quota Meter Card */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#a1a1aa', fontWeight: '600' }}>Penggunaan Storage Cloud</span>
                    <span style={{ fontSize: '10px', background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)', padding: '2px 8px', borderRadius: '10px', fontWeight: '700' }}>
                      {vendorData?.activeAddon?.name || 'Add-On Storage Aktif'}
                    </span>
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#ffffff', marginTop: '6px' }}>
                    {formatBytes(usedBytes)} <span style={{ fontSize: '14px', color: '#71717a', fontWeight: '400' }}>/ {formatBytes(quotaBytes)}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: usagePercent >= 90 ? '#f87171' : usagePercent >= 70 ? '#fbbf24' : '#34d399' }}>
                    {usagePercent}%
                  </div>
                  <span style={{ fontSize: '11px', color: '#71717a' }}>Kapasitas Terpakai</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', height: '10px', marginTop: '16px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  borderRadius: '10px',
                  width: `${Math.max(2, usagePercent)}%`,
                  background: usagePercent >= 90 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #6366f1, #34d399)',
                  transition: 'all 0.4s ease'
                }} />
              </div>

              {isOverQuota && (
                <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', color: '#f87171', fontSize: '12px' }}>
                  <strong>⚠️ Penggunaan Storage Melampaui Batas!</strong> Harap hapus beberapa folder proyek di bawah untuk mengosongkan storage atau tingkatkan paket Add-On Storage Anda.
                </div>
              )}
            </div>

            {/* Folders Management Section */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📂</span> Daftar Folder Cloud Proyek Klien ({projects.length})
              </h3>

              {projects.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#71717a', fontSize: '13px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.08)' }}>
                  Belum ada folder proyek di cloud storage. Buat proyek galeri baru dari Dashboard Utama.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <th style={{ padding: '12px 14px' }}>Nama Folder / Proyek</th>
                        <th style={{ padding: '12px 14px' }}>Jumlah Foto</th>
                        <th style={{ padding: '12px 14px' }}>Ukuran Storage</th>
                        <th style={{ padding: '12px 14px' }}>Status Proyek</th>
                        <th style={{ padding: '12px 14px', textAlign: 'right' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map((proj) => (
                        <tr key={proj.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '14px', fontWeight: '600', color: '#ffffff' }}>
                            📁 {proj.name}
                          </td>
                          <td style={{ padding: '14px', color: '#a1a1aa' }}>
                            {proj.photoCount || 0} Foto
                          </td>
                          <td style={{ padding: '14px', color: '#818cf8', fontWeight: '600' }}>
                            {formatBytes(proj.totalSizeBytes || 0)}
                          </td>
                          <td style={{ padding: '14px' }}>
                            <span style={{
                              fontSize: '10px',
                              padding: '3px 8px',
                              borderRadius: '10px',
                              fontWeight: '700',
                              background: proj.status === 'completed' ? 'rgba(52,211,153,0.15)' : 'rgba(99,102,241,0.15)',
                              color: proj.status === 'completed' ? '#34d399' : '#818cf8'
                            }}>
                              {proj.status === 'completed' ? 'Selesai Dipilih' : 'Aktif Seleksi'}
                            </span>
                          </td>
                          <td style={{ padding: '14px', textAlign: 'right' }}>
                            <button
                              onClick={() => handleDeleteFolder(proj.id, proj.name)}
                              disabled={actionLoading}
                              style={{
                                padding: '6px 12px',
                                background: 'rgba(239,68,68,0.1)',
                                color: '#f87171',
                                border: '1px solid rgba(239,68,68,0.2)',
                                borderRadius: '8px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                fontWeight: '600'
                              }}
                            >
                              🗑️ Hapus Folder
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Addon Modal Selection */}
      {showAddonModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowAddonModal(false)}>
          <div style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', maxWidth: '640px', width: '100%', padding: '28px', position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowAddonModal(false)}
              style={{ position: 'absolute', top: '18px', right: '18px', background: 'transparent', border: 'none', color: '#a1a1aa', fontSize: '18px', cursor: 'pointer' }}
            >
              ✕
            </button>

            <h3 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: '800', color: '#ffffff' }}>
              📦 Pilih Paket Add-On Cloud Storage
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: '#a1a1aa' }}>
              Pilih kapasitas storage dedicated studio Anda. Pembayaran disesuaikan secara prorata.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              {addonPlans.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                const quotaGb = plan.quotaBytes ? (plan.quotaBytes / (1024 * 1024 * 1024)).toFixed(0) : '0';
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    style={{
                      padding: '16px 18px',
                      borderRadius: '14px',
                      background: isSelected ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.02)',
                      border: `1.5px solid ${isSelected ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#ffffff' }}>{plan.name}</h4>
                      {isSelected && <span style={{ color: '#818cf8', fontWeight: '800', fontSize: '12px' }}>✓ Terpilih</span>}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#34d399', margin: '8px 0 2px 0' }}>
                      {quotaGb} GB
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#fbbf24' }}>
                      {formatIDR(plan.price)} <span style={{ fontSize: '10px', color: '#71717a', fontWeight: '400' }}>/ bln</span>
                    </div>

                    {daysRemaining < 30 && (
                      <div style={{ marginTop: '6px', fontSize: '11px', color: '#34d399', fontWeight: '600' }}>
                        🏷️ Prorata Sisa {daysRemaining} Hari: {formatIDR(getProratedPrice(plan.price))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
              <button
                onClick={() => setShowAddonModal(false)}
                style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.06)', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}
              >
                Batal
              </button>
              <button
                onClick={() => selectedPlanId && handleSubscribeAddon(selectedPlanId)}
                disabled={!selectedPlanId || actionLoading}
                style={{ padding: '8px 20px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
              >
                {actionLoading ? 'Memproses...' : 'Aktifkan Paket Terpilih'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
