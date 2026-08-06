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

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatIDR = (amount) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
  };

  const usedBytes = vendorData?.usedStorageBytes || 0;
  const quotaBytes = vendorData?.addonStorageQuotaBytes || 0;
  const usagePercent = quotaBytes > 0 ? Math.min(100, Math.round((usedBytes / quotaBytes) * 100)) : (usedBytes > 0 ? 100 : 0);
  const isOverQuota = vendorData?.isOverQuota;
  const hasAddon = vendorData?.hasStorageAddon || quotaBytes > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      {/* Toast Notification */}
      {notification.show && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl backdrop-blur-md border text-sm font-semibold transition-all duration-300 ${
          notification.type === 'error'
            ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
            : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-xs font-medium text-slate-400 hover:text-indigo-400 transition">
              ← Kembali ke Dashboard Utama
            </Link>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1 bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">
              📁 Cloud Storage Manager
            </h1>
            <p className="text-slate-400 text-xs md:text-sm mt-1">
              Kelola kapasitas penyimpanan cloud dedicated studio & kuota penyimpanan galeri klien.
            </p>
          </div>

          {hasAddon && (
            <button
              onClick={() => setShowAddonModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs md:text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
            >
              <span>📦</span> Tambah Kuota Storage
            </button>
          )}
        </div>

        {/* Kondisi 1: UPSELL PREVIEW PAGE (Vendor Belum Memiliki Add-On) */}
        {!loading && !hasAddon && (
          <div className="space-y-8">
            {/* Hero Upsell Banner */}
            <div className="bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 border border-indigo-500/30 backdrop-blur-2xl rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-4 max-w-2xl">
                <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
                  ✨ Fitur Premium Studio Cloud
                </span>
                <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">
                  Simpan Ribuan Foto Langsung di Cloud SaaS Pick Your Photo 🚀
                </h2>
                <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                  Tingkatkan kenyamanan kerja studio Anda tanpa perlu khawatir ruang penyimpanan lokal penuh. Dapatkan dedicated Cloud Storage berkecepatan tinggi dengan proteksi aman & fitur manajemen folder instan.
                </p>
                <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-300 pt-2">
                  <span className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
                    <span className="text-emerald-400">✓</span> High-Speed Pipe Stream
                  </span>
                  <span className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
                    <span className="text-emerald-400">✓</span> Single Expiry Date Integration
                  </span>
                  <span className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
                    <span className="text-emerald-400">✓</span> Glassmorphism Lock Protection
                  </span>
                </div>
              </div>

              <div className="w-full md:w-auto text-center">
                <div className="bg-slate-900/90 border border-indigo-500/40 rounded-2xl p-6 shadow-2xl space-y-3">
                  <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider block">Mulai dari Hanya</span>
                  <div className="text-3xl font-black text-amber-400">
                    Rp 49.000 <span className="text-xs text-slate-400 font-normal">/bulan</span>
                  </div>
                  <button
                    onClick={() => setShowAddonModal(true)}
                    className="w-full py-3 px-6 bg-gradient-to-r from-indigo-600 via-sky-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold text-sm rounded-xl shadow-xl shadow-indigo-600/30 transition-all transform hover:-translate-y-0.5"
                  >
                    Pilih Paket Storage ➔
                  </button>
                </div>
              </div>
            </div>

            {/* Showcase Dynamic Cards */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span>📦</span> Pilihan Paket Add-On Cloud Storage
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {addonPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 backdrop-blur-xl rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 group"
                  >
                    <div className="space-y-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                        {plan.name}
                      </span>
                      <div className="text-3xl font-black text-white group-hover:text-indigo-300 transition">
                        {formatBytes(plan.quotaBytes)}
                      </div>
                      <div className="text-2xl font-bold text-amber-400">
                        {formatIDR(plan.price)}
                        <span className="text-xs text-slate-400 font-normal"> / bulan</span>
                      </div>
                      <ul className="text-xs text-slate-300 space-y-2 pt-2 border-t border-slate-800">
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-400">✓</span> Kuota Storage Dedicated Studio
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-400">✓</span> Unlimited High-Res Photos
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-400">✓</span> Auto Prorated Billing
                        </li>
                      </ul>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedPlanId(plan.id);
                        setShowAddonModal(true);
                      }}
                      className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white font-bold text-xs rounded-xl border border-slate-700 hover:border-indigo-500 transition-all"
                    >
                      Aktifkan Sekarang
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Kondisi 2: STORAGE MANAGER ACTIVE PAGE (Vendor Memiliki Add-On) */}
        {!loading && hasAddon && (
          <>
            {/* Quota Progress Meter Card */}
            <div className="bg-slate-900/60 border border-slate-800 backdrop-blur-xl rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Penggunaan Storage Cloud</span>
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-bold">
                      {vendorData?.activeAddon?.name || 'Add-On Aktif'}
                    </span>
                  </div>
                  <div className="text-2xl md:text-3xl font-black text-white mt-1">
                    {formatBytes(usedBytes)} <span className="text-slate-500 font-normal text-lg">/ {formatBytes(quotaBytes)}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-xl font-bold ${usagePercent >= 90 ? 'text-rose-400' : usagePercent >= 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {usagePercent}%
                  </span>
                  <span className="text-slate-400 text-xs block">Kapasitas Terpakai</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800/80 rounded-full h-3.5 mt-4 p-0.5 overflow-hidden border border-slate-700/50">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    usagePercent >= 90
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                      : 'bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400'
                  }`}
                  style={{ width: `${Math.max(2, usagePercent)}%` }}
                />
              </div>

              {/* Alert Banner Over-Quota */}
              {isOverQuota && (
                <div className="mt-4 p-4 bg-rose-950/40 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-200 text-xs">
                  <span className="text-lg">⚠️</span>
                  <div className="flex-1">
                    <span className="font-bold block text-sm text-rose-300">Penggunaan Storage Melampaui Batas!</span>
                    Fitur upload foto baru saat ini dikunci. Harap hapus beberapa folder proyek di bawah untuk mengosongkan storage atau tingkatkan paket Add-On Storage Anda.
                  </div>
                  <button
                    onClick={() => setShowAddonModal(true)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition"
                  >
                    Upgrade Storage
                  </button>
                </div>
              )}
            </div>

            {/* Folders Management Section */}
            <div className="bg-slate-900/60 border border-slate-800 backdrop-blur-xl rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📂</span> Daftar Folder Cloud Proyek Klien ({projects.length})
                </h2>
              </div>

              {projects.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                  Belum ada folder proyek di cloud storage. Buat proyek galeri baru dari Dashboard Utama.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300 border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[11px]">
                        <th className="py-3 px-4">Nama Folder / Proyek</th>
                        <th className="py-3 px-4">Jumlah Foto</th>
                        <th className="py-3 px-4">Ukuran Storage</th>
                        <th className="py-3 px-4">Status Proyek</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {projects.map((proj) => (
                        <tr key={proj.id} className="hover:bg-slate-800/30 transition">
                          <td className="py-3.5 px-4 font-semibold text-white">
                            <div className="flex items-center gap-2">
                              <span className="text-amber-400 text-base">📁</span>
                              <span>{proj.name}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 font-medium">
                            {proj.photoCount || 0} Foto
                          </td>
                          <td className="py-3.5 px-4 font-mono text-indigo-300">
                            {formatBytes(proj.totalSizeBytes || 0)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                              proj.status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : proj.status === 'archived'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                            }`}>
                              {proj.status === 'completed' ? 'Selesai Dipilih' : proj.status === 'archived' ? 'Diarsipkan' : 'Aktif Seleksi'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            <button
                              onClick={() => handleDeleteFolder(proj.id, proj.name)}
                              disabled={actionLoading}
                              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs transition font-semibold"
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
          </>
        )}
      </div>

      {/* Addon Modal Selection */}
      {showAddonModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 md:p-8 space-y-6 relative shadow-2xl">
            <button
              onClick={() => setShowAddonModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white text-xl font-bold"
            >
              ✕
            </button>

            <div>
              <h3 className="text-xl md:text-2xl font-black text-white bg-gradient-to-r from-indigo-400 to-sky-400 bg-clip-text text-transparent">
                📦 Tambah Kuota Cloud Storage
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Pilih paket Add-On Storage sesuai kebutuhan kapasitas studio Anda. Masa aktif disesuaikan otomatis dengan Paket Utama.
              </p>
            </div>

            {/* Dynamic Addon Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addonPlans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer relative ${
                    selectedPlanId === plan.id
                      ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-500/20'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-base">{plan.name}</h4>
                      <span className="text-xs text-slate-400">Kapasitas {formatBytes(plan.quotaBytes)}</span>
                    </div>
                    <span className="text-indigo-400 text-lg font-bold">
                      {formatIDR(plan.price)} <span className="text-[10px] text-slate-500 font-normal">/bln</span>
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span>⚡ Instant Activation</span>
                    {selectedPlanId === plan.id && (
                      <span className="text-indigo-400 font-bold flex items-center gap-1">
                        ✓ Terpilih
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setShowAddonModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition"
              >
                Batal
              </button>
              <button
                onClick={() => selectedPlanId && handleSubscribeAddon(selectedPlanId)}
                disabled={!selectedPlanId || actionLoading}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
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
