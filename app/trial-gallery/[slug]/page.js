'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function TrialGalleryPage({ params }) {
  const [slug, setSlug] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [activePhoto, setActivePhoto] = useState(null); // Lightbox modal
  const [timeLeft, setTimeLeft] = useState({ minutes: 0, seconds: 0, totalSec: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'selected'
  const [activeCategoryTab, setActiveCategoryTab] = useState(null); // Active category tab (null = auto-select root or first unlocked)
  const [activeLockedCategory, setActiveLockedCategory] = useState(null); // Locked category upsell modal

  useEffect(() => {
    Promise.resolve(params).then((resolvedParams) => {
      const targetSlug = resolvedParams?.slug;
      if (targetSlug) {
        setSlug(targetSlug);
        fetchGalleryData(targetSlug);
      }
    });

    if (typeof window !== 'undefined' && window.location.search.includes('created=true')) {
      setShowSuccessModal(true);
    }
  }, [params]);

  // ── GALLERY PROTECTION: Disable right-click, drag, and dangerous shortcuts ──
  useEffect(() => {
    // Block right-click globally on this page
    const blockContextMenu = (e) => e.preventDefault();

    // Block dangerous keyboard shortcuts
    const blockShortcuts = (e) => {
      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      // Ctrl+S (save page), Ctrl+U (view source), Ctrl+Shift+I (devtools), F12
      if (
        (ctrl && key === 's') ||
        (ctrl && key === 'u') ||
        (ctrl && e.shiftKey && (key === 'i' || key === 'j' || key === 'c')) ||
        e.key === 'F12'
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('contextmenu', blockContextMenu);
    document.addEventListener('keydown', blockShortcuts);

    return () => {
      document.removeEventListener('contextmenu', blockContextMenu);
      document.removeEventListener('keydown', blockShortcuts);
    };
  }, []);

  const fetchGalleryData = async (targetSlug) => {
    const s = targetSlug || slug;
    if (!s) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/trial/${s}`);
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || errJson.error || 'Gagal memuat galeri trial');
      }
      const json = await res.json();
      const gallery = json.gallery;
      setData(gallery);
      setSelectedPhotos(gallery.selectedPhotos || []);
      if (gallery.selectionStatus === 'completed') {
        setSubmitted(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Timer Countdown 1 Jam
  useEffect(() => {
    if (!data?.expiresAt) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expiry = new Date(data.expiresAt).getTime();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));

      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;

      setTimeLeft({ minutes, seconds, totalSec: diff });

      if (diff <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [data?.expiresAt]);

  const [touchStart, setTouchStart] = useState(0);

  const handlePrevPhoto = (e) => {
    if (e) e.stopPropagation();
    if (!activePhoto || !data?.photos?.length) return;
    const currentIdx = activePhoto.index !== undefined ? activePhoto.index : data.photos.findIndex(p => (p.name || p.filename) === activePhoto.fileName);
    const prevIdx = (currentIdx - 1 + data.photos.length) % data.photos.length;
    const file = data.photos[prevIdx];
    const fileName = file.name || file.filename || `Photo_${prevIdx + 1}.jpg`;
    const origSrc = file.origUrl || file.popupUrl || `/api/proxy/thumb/${file.id}?sz=w1200`;
    setActivePhoto({ ...file, fileName, origSrc, index: prevIdx });
  };

  const handleNextPhoto = (e) => {
    if (e) e.stopPropagation();
    if (!activePhoto || !data?.photos?.length) return;
    const currentIdx = activePhoto.index !== undefined ? activePhoto.index : data.photos.findIndex(p => (p.name || p.filename) === activePhoto.fileName);
    const nextIdx = (currentIdx + 1) % data.photos.length;
    const file = data.photos[nextIdx];
    const fileName = file.name || file.filename || `Photo_${nextIdx + 1}.jpg`;
    const origSrc = file.origUrl || file.popupUrl || `/api/proxy/thumb/${file.id}?sz=w1200`;
    setActivePhoto({ ...file, fileName, origSrc, index: nextIdx });
  };

  // Keyboard navigation shortcuts (Left / Right / Esc)
  useEffect(() => {
    if (!activePhoto) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        handlePrevPhoto();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        handleNextPhoto();
      } else if (e.key === 'Escape') {
        setActivePhoto(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePhoto, data?.photos]);

  const toggleSelectPhoto = (filename) => {
    if (data?.isExpired || timeLeft.totalSec <= 0 || submitted) return;

    if (selectedPhotos.includes(filename)) {
      setSelectedPhotos(selectedPhotos.filter((f) => f !== filename));
    } else {
      if (selectedPhotos.length >= data.maxSelection) {
        alert(`Batas maksimal foto terpilih adalah ${data.maxSelection} foto.`);
        return;
      }
      setSelectedPhotos([...selectedPhotos, filename]);
    }
  };

  const handleSubmitSelection = async () => {
    if (selectedPhotos.length === 0) {
      alert('Pilih setidaknya 1 foto sebelum mengirim.');
      return;
    }

    if (!confirm(`Kirim ${selectedPhotos.length} foto pilihan Anda?`)) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/trial/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedPhotos }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || json.error || 'Gagal menyimpan pilihan');
      }

      setSubmitted(true);
      alert('🎉 Pilihan foto favorit Anda berhasil disimpan!');
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
          <p>Memuat Galeri Trial Instan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff', padding: '20px' }}>
        <div style={{ background: '#1e293b', padding: '32px', borderRadius: '16px', maxWidth: '480px', width: '100%', textAlign: 'center' }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>⚠️</span>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>Akses Galeri Gagal</h2>
          <p style={{ color: '#94a3b8', marginBottom: '24px' }}>{error}</p>
          <Link href="/" style={{ display: 'inline-block', background: '#6366f1', color: '#fff', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' }}>
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff', padding: '20px' }}>
        <div style={{ background: '#1e293b', padding: '32px', borderRadius: '16px', maxWidth: '480px', width: '100%', textAlign: 'center' }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>⚠️</span>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>Galeri Tidak Ditemukan</h2>
          <p style={{ color: '#94a3b8', marginBottom: '24px' }}>Galeri trial yang Anda cari tidak dapat dimuat atau telah expired.</p>
          <Link href="/" style={{ display: 'inline-block', background: '#6366f1', color: '#fff', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' }}>
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = data?.isExpired || timeLeft.totalSec <= 0;

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      style={{
        minHeight: '100vh',
        background: '#090d16',
        color: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      
      {/* ⏰ TOP TIMER & CTA BARNER */}
      <div style={{ background: isExpired ? '#ef4444' : 'linear-gradient(90deg, #4f46e5, #9333ea)', padding: '12px 20px', position: 'sticky', top: 0, zIndex: 40, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', fontSize: '14px' }}>
          <span>⏰</span>
          {isExpired ? (
            <span>WAKTU TRIAL HABIS — Galeri Telah Kedaluwarsa</span>
          ) : (
            <span>Sisa Waktu Trial: <strong>{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}</strong></span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {!data?.logoUrl && (
            <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '20px' }}>⚡ Powered by Pick-Your-Photo (Trial Co-Branded)</span>
          )}
          <Link href="/register" style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#1e1b4b', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', textDecoration: 'none', boxShadow: '0 2px 8px rgba(245,158,11,0.4)' }}>
            🚀 Hapus Badge SaaS (Upgrade Pro)
          </Link>
        </div>
      </div>

      {/* HEADER GALERI */}
      <header style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {data?.logoUrl && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img
                src={data.logoUrl}
                alt="Logo Studio Vendor"
                style={{
                  maxHeight: '56px',
                  maxWidth: '160px',
                  objectFit: 'contain',
                  display: 'block',
                  filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
                }}
              />
            </div>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#f8fafc' }}>{data?.title}</h1>
              {data?.logoUrl && (
                <span style={{ fontSize: '11px', background: 'rgba(129, 140, 248, 0.2)', color: '#818cf8', border: '1px solid rgba(129, 140, 248, 0.4)', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                  ✓ Custom Logo Studio
                </span>
              )}
            </div>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '6px' }}>Pilih foto favorit Anda dengan menandai centang (✓) pada foto.</p>
          </div>
        </div>
            {/* COUNTER SELEKSI & PREVIEW TOGGLE */}
        <div className="trial-action-bar">

          {/* Pill Group: Pilihan + Counter + Kirim */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '40px',
            padding: '5px',
            backdropFilter: 'blur(12px)',
          }}>
            {/* Tombol filter Pilihan */}
            <button
              type="button"
              onClick={() => setFilterMode(filterMode === 'all' ? 'selected' : 'all')}
              style={{
                background: filterMode === 'selected'
                  ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                  : 'transparent',
                border: 'none',
                color: filterMode === 'selected' ? '#ffffff' : '#94a3b8',
                padding: '7px 16px',
                borderRadius: '30px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {filterMode === 'selected' ? '← Semua' : `✦ Pilihan (${selectedPhotos.length})`}
            </button>

            {/* Divider */}
            <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />

            {/* Counter */}
            <span style={{
              padding: '0 14px',
              fontSize: '14px',
              fontWeight: 700,
              color: selectedPhotos.length === data?.maxSelection ? '#34d399' : '#818cf8',
              whiteSpace: 'nowrap',
            }}>
              {selectedPhotos.length}/{data?.maxSelection}
            </span>

            {/* Divider */}
            <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />

            {/* Tombol Submit */}
            <button
              onClick={handleSubmitSelection}
              disabled={isExpired || submitting || submitted || selectedPhotos.length === 0}
              style={{
                background: submitted
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : (isExpired || selectedPhotos.length === 0)
                  ? 'rgba(255,255,255,0.05)'
                  : 'linear-gradient(135deg, #10b981, #059669)',
                color: (isExpired || selectedPhotos.length === 0) && !submitted ? '#475569' : '#fff',
                border: 'none',
                padding: '7px 18px',
                borderRadius: '30px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: (isExpired || selectedPhotos.length === 0) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                boxShadow: selectedPhotos.length > 0 && !submitted ? '0 2px 10px rgba(16,185,129,0.35)' : 'none',
              }}
            >
              {submitted ? '✓ Tersimpan' : submitting ? '⏳...' : '→ Kirim'}
            </button>
          </div>

        </div>
      </header>

      {/* GRID FOTO MINIMALIS */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px 60px' }}>

        {/* Dynamic Category Tabs Logic (Trial Upsell Mode) */}
        {(() => {
          const allPhotos = data.photos || [];
          const hasRootPhotos = allPhotos.some(p => !p.category || p.category === '');
          const categories = Array.from(new Set(allPhotos.map(p => p.category).filter(Boolean)));
          
          if (!hasRootPhotos && categories.length === 0) return null;

          let currentTab = activeCategoryTab;
          if (!currentTab) {
            if (hasRootPhotos) currentTab = '__ROOT__';
            else if (categories.length > 0) currentTab = categories[0];
          }

          return (
            <div style={{ marginBottom: '28px', textAlign: 'center', padding: '0 4px' }}>
              <div className="trial-cat-tabs">
                {/* Render Root Tab if root photos exist */}
                {hasRootPhotos && (
                  <button
                    type="button"
                    className="trial-cat-btn"
                    onClick={() => { setActiveCategoryTab('__ROOT__'); setActiveLockedCategory(null); }}
                    style={{
                      background: (!activeLockedCategory && currentTab === '__ROOT__') ? 'linear-gradient(135deg, #6366f1, #818cf8)' : 'rgba(255,255,255,0.06)',
                      border: 'none',
                      color: '#ffffff',
                      boxShadow: (!activeLockedCategory && currentTab === '__ROOT__') ? '0 4px 12px rgba(99,102,241,0.3)' : 'none'
                    }}
                  >
                    Foto Utama ({allPhotos.filter(p => (!p.category || p.category === '') && !p._isLocked).length})
                  </button>
                )}

                {/* Render Subfolder Tabs */}
                {categories.map((cat) => {
                  const isUnlocked = allPhotos.some(p => p.category === cat && !p._isLocked);
                  const markerEntry = allPhotos.find(p => p.category === cat && p._isLocked);
                  const photoCount = markerEntry
                    ? markerEntry._count
                    : allPhotos.filter(p => p.category === cat && !p._isLocked).length;

                  if (isUnlocked) {
                    const isTabActive = !activeLockedCategory && currentTab === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        className="trial-cat-btn"
                        onClick={() => { setActiveCategoryTab(cat); setActiveLockedCategory(null); }}
                        style={{
                          background: isTabActive ? 'linear-gradient(135deg, #6366f1, #818cf8)' : 'rgba(255,255,255,0.06)',
                          border: 'none',
                          color: '#ffffff',
                          boxShadow: isTabActive ? '0 4px 12px rgba(99,102,241,0.3)' : 'none'
                        }}
                      >
                        📁 {cat} ({photoCount})
                      </button>
                    );
                  }

                  return (
                    <button
                      key={cat}
                      type="button"
                      className="trial-cat-btn trial-cat-locked"
                      onClick={() => setActiveLockedCategory(cat)}
                      style={{
                        border: '1px solid rgba(245,158,11,0.4)',
                        background: activeLockedCategory === cat ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.1)',
                        color: '#fbbf24',
                      }}
                    >
                      🔒 {cat} ({photoCount}) <span style={{ fontSize: '9px', background: 'rgba(245,158,11,0.3)', padding: '1px 4px', borderRadius: '8px', color: '#fef3c7' }}>PRO</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Locked Category SaaS Upsell Card Banner */}
        {activeLockedCategory && (
          <div style={{ maxWidth: '640px', margin: '0 auto 32px auto', padding: '28px 24px', background: 'linear-gradient(135deg, rgba(30,27,75,0.9) 0%, rgba(15,23,42,0.95) 100%)', borderRadius: '20px', border: '1.5px solid rgba(99,102,241,0.4)', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(245,158,11,0.15)', color: '#fbbf24', fontSize: '24px', marginBottom: '12px' }}>🔒</div>
            <h3 style={{ fontSize: '19px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 8px 0' }}>Fitur Sub-Folder "{activeLockedCategory}" Khusus Paket Berlangganan</h3>
            <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6', margin: '0 0 20px 0' }}>
              Sistem kami berhasil mendeteksi sub-folder <strong>"{activeLockedCategory}"</strong> dari Google Drive Anda. Akses ke sub-folder ini khusus untuk pengguna berlangganan. Berlangganan <strong>Starter atau Pro Studio Plan</strong> untuk membuka seluruh kategorisasi otomatis sub-folder galeri bagi klien Anda!
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => setActiveLockedCategory(null)} style={{ padding: '10px 18px', borderRadius: '20px', background: 'rgba(255,255,255,0.08)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.15)', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
                Tutup & Kembali
              </button>
              <a href="/#pricing" style={{ padding: '10px 22px', borderRadius: '20px', background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#ffffff', fontWeight: 'bold', fontSize: '13px', textDecoration: 'none', boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}>
                🚀 Upgrade Paket Berlangganan
              </a>
            </div>
          </div>
        )}

        {filterMode === 'selected' && (
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', padding: '12px 20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: '#a5b4fc', fontWeight: '500' }}>
              👁️ Menampilkan <strong>{selectedPhotos.length} foto terpilih</strong> dari total {data.photos?.length || 0} foto.
            </span>
            <button
              onClick={() => setFilterMode('all')}
              style={{ background: 'transparent', border: 'none', color: '#818cf8', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Kembali Lihat Semua Foto &rarr;
            </button>
          </div>
        )}

        {filterMode === 'selected' && selectedPhotos.length === 0 ? (
          <div style={{ textAlignment: 'center', textAlign: 'center', padding: '60px 20px', background: '#0f172a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📷</div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '8px' }}>Belum Ada Foto Terpilih</h3>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>Tandai centang (✓) pada foto yang ingin Anda pilih terlebih dahulu.</p>
            <button
              onClick={() => setFilterMode('all')}
              style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '20px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
            >
              🖼️ Tampilkan Semua Foto
            </button>
          </div>
        ) : (
          <>
            {/* ── ZONE 1: Unlocked photos — masonry grid ── */}
            <div className="trial-photo-grid">
              {(() => {
                const allPhotos = data.photos || [];
                const hasRootPhotos = allPhotos.some(p => !p.category || p.category === '');
                const categories = Array.from(new Set(allPhotos.map(p => p.category).filter(Boolean)));

                let currentTab = activeCategoryTab;
                if (!currentTab) {
                  if (hasRootPhotos) currentTab = '__ROOT__';
                  else if (categories.length > 0) currentTab = categories[0];
                }

                const previewLimit = data.previewLimit || 12;

                const visiblePhotos = allPhotos
                  .filter(f => !f._isLocked)
                  .filter(f => {
                    if (filterMode === 'selected') {
                      const fn = f.name || f.filename;
                      return selectedPhotos.includes(fn);
                    }
                    if (currentTab === '__ROOT__') return !f.category || f.category === '';
                    return f.category === currentTab;
                  });

                const unlockedPhotos = filterMode === 'selected' ? visiblePhotos : visiblePhotos.slice(0, previewLimit);

                return unlockedPhotos.map((file, idx) => {
                  const fileName = file.name || file.filename || `Photo_${idx + 1}.jpg`;
                  const thumbSrc = file.thumbUrl || file.url || `/api/proxy/thumb/${file.id}?sz=w400`;
                  const origSrc = file.origUrl || file.popupUrl || `/api/proxy/thumb/${file.id}?sz=w1200`;
                  const isSelected = selectedPhotos.includes(fileName);
                  return (
                    <div
                      key={file.id || idx}
                      className="photo-card"
                      style={{
                        position: 'relative', borderRadius: '10px', overflow: 'hidden',
                        background: '#0f172a',
                        border: isSelected ? '2px solid #10b981' : '2px solid transparent',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 6px 20px rgba(16,185,129,0.3)' : '0 4px 12px rgba(0,0,0,0.3)',
                        cursor: 'pointer',
                      }}
                      onClick={() => setActivePhoto({ ...file, fileName, origSrc, index: idx })}
                    >
                      <img
                        src={thumbSrc} alt="" loading="lazy"
                        onContextMenu={e => e.preventDefault()}
                        onDragStart={e => e.preventDefault()}
                        style={{ width: '100%', height: 'auto', display: 'block', userSelect: 'none', WebkitUserSelect: 'none', pointerEvents: 'none' }}
                      />
                      <button
                        onClick={e => { e.stopPropagation(); toggleSelectPhoto(fileName); }}
                        disabled={isExpired || submitted}
                        style={{
                          position: 'absolute', top: '8px', right: '8px',
                          width: '26px', height: '26px', borderRadius: '50%',
                          border: isSelected ? 'none' : '1.5px solid rgba(255,255,255,0.5)',
                          background: isSelected ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(9,9,24,0.45)',
                          color: '#fff', fontSize: '13px', fontWeight: 'bold',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: isSelected ? '0 4px 12px rgba(16,185,129,0.4)' : 'none',
                          transition: 'all 0.2s ease',
                        }}
                      >{isSelected ? '✓' : ''}</button>
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40px', background: 'linear-gradient(to top, rgba(9,9,24,0.95) 0%, rgba(9,9,24,0.4) 70%, transparent 100%)', pointerEvents: 'none', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '6px', userSelect: 'none' }}>
                        <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#a5b4fc', letterSpacing: '0.8px', textTransform: 'uppercase', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>⚡ TRIAL PREVIEW</div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* ── ZONE 2: Locked zone — blurred photos as bg + overlay card ── */}
            {(() => {
              const allPhotos = data.photos || [];
              const hasRootPhotos = allPhotos.some(p => !p.category || p.category === '');
              const categories = Array.from(new Set(allPhotos.map(p => p.category).filter(Boolean)));
              
              let currentTab = activeCategoryTab;
              if (!currentTab) {
                if (hasRootPhotos) currentTab = '__ROOT__';
                else if (categories.length > 0) currentTab = categories[0];
              }

              const previewLimit = data.previewLimit || 12;

              const visiblePhotos = allPhotos
                .filter(f => !f._isLocked)
                .filter(f => {
                  if (currentTab === '__ROOT__') return !f.category || f.category === '';
                  return f.category === currentTab;
                });

              const lockedPhotos = visiblePhotos.slice(previewLimit);
              const totalVisible = visiblePhotos.length;
              const lockedSubfolderCount = allPhotos.filter(p => p._isLocked).reduce((s, p) => s + (p._count || 0), 0);

              if (filterMode === 'selected' || lockedPhotos.length === 0) return null;

              // Build background texture: use last unlocked photos + locked photos, tiled to fill 12 slots
              const bgSources = [...visiblePhotos.slice(-8), ...lockedPhotos];
              const bgTiles = Array.from({ length: 12 }, (_, i) => bgSources[i % bgSources.length]);

              return (
                <div style={{ position: 'relative', marginTop: '12px', borderRadius: '20px', overflow: 'hidden' }}>

                  {/* Blurred photos — CSS grid as texture background, always filled */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '6px',
                    padding: '6px',
                    filter: 'blur(10px)',
                    opacity: 0.55,
                    pointerEvents: 'none',
                    userSelect: 'none',
                    transform: 'scale(1.05)',
                  }}>
                    {bgTiles.map((file, idx) => (
                      <div key={idx} style={{ borderRadius: '8px', overflow: 'hidden', background: '#0f172a', aspectRatio: '4/3' }}>
                        <img
                          src={file.thumbUrl || `/api/proxy/thumb/${file.id}?sz=w400`}
                          alt="" loading="lazy"
                          onContextMenu={e => e.preventDefault()}
                          onDragStart={e => e.preventDefault()}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Gradient fade from top (seamless transition from unlocked photos above) */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '120px',
                    background: 'linear-gradient(to bottom, #090918 0%, transparent 100%)',
                    pointerEvents: 'none',
                  }} />

                  {/* Full overlay — semi-transparent dark backdrop */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to bottom, rgba(9,9,24,0.3) 0%, rgba(9,9,24,0.75) 40%, rgba(9,9,24,0.92) 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '32px 20px',
                  }}>
                    {/* Lock card — glassmorphism */}
                    <div style={{
                      background: 'rgba(15,23,42,0.65)',
                      border: '1px solid rgba(99,102,241,0.35)',
                      borderRadius: '24px',
                      padding: '36px 32px',
                      textAlign: 'center',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)',
                      maxWidth: '460px',
                      width: '100%',
                      position: 'relative',
                      overflow: 'hidden',
                    }}>
                      {/* Glow accent */}
                      <div style={{ position: 'absolute', top: '-60px', left: '50%', transform: 'translateX(-50%)', width: '240px', height: '240px', background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

                      {/* Lock icon */}
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', fontSize: '26px', marginBottom: '16px' }}>🔒</div>

                      <h3 style={{ fontSize: '21px', fontWeight: '800', color: '#ffffff', margin: '0 0 10px 0', letterSpacing: '-0.4px' }}>
                        {lockedPhotos.length} Foto Lainnya Terkunci
                      </h3>
                      <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.7', margin: '0 0 20px 0' }}>
                        Kamu baru melihat <strong style={{ color: '#c4b5fd' }}>{previewLimit} dari {totalVisible} foto</strong> di tab ini.
                        Upgrade untuk buka akses penuh + semua sub-folder galeri.
                      </p>

                      {/* Stats */}
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0', margin: '0 0 24px 0', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                        {[
                          { val: totalVisible, label: 'Foto Tab Ini', color: '#818cf8' },
                          { val: lockedSubfolderCount || '—', label: 'Foto Sub-folder', color: '#a855f7' },
                          { val: '∞', label: 'Akses Penuh', color: '#34d399' },
                        ].map((stat, i) => (
                          <div key={i} style={{ flex: 1, padding: '14px 8px', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.07)' : 'none', textAlign: 'center' }}>
                            <div style={{ fontSize: '20px', fontWeight: '900', color: stat.color }}>{stat.val}</div>
                            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{stat.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* CTA Buttons */}
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <a href="/#pricing" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '12px 26px', borderRadius: '50px', background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff', fontWeight: '700', fontSize: '14px', textDecoration: 'none', boxShadow: '0 6px 22px rgba(99,102,241,0.45)' }}>
                          🚀 Lihat Paket
                        </a>
                        {data.contactWhatsapp && (
                          <a href={`https://wa.me/${data.contactWhatsapp.replace(/\D/g, '')}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '12px 22px', borderRadius: '50px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', color: '#94a3b8', fontWeight: '600', fontSize: '13px', textDecoration: 'none' }}>
                            💬 Hubungi Studio
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </>
        )}

        <style jsx>{`
          .trial-photo-grid {
            column-count: 6;
            column-gap: 12px;
            margin-top: 20px;
          }
          .trial-photo-grid .photo-card {
            break-inside: avoid;
            margin-bottom: 12px;
          }

          /* Category Tabs */
          .trial-cat-tabs {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
            justify-content: center;
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 40px;
            padding: 6px 8px;
            backdrop-filter: blur(12px);
          }
          .trial-cat-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 18px;
            border-radius: 30px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
            letter-spacing: 0.01em;
          }
          .trial-cat-locked {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 18px;
            border-radius: 30px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
            letter-spacing: 0.01em;
          }
          .trial-cat-locked:hover {
            background: rgba(245, 158, 11, 0.2) !important;
          }

          /* Action Bar Base */
          .trial-action-bar {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
          }
          .trial-action-btn {
            color: #ffffff;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 13px;
            cursor: pointer;
            backdrop-filter: blur(12px);
            transition: all 0.2s ease;
            white-space: nowrap;
          }
          .trial-counter-bar {
            background: rgba(30, 41, 59, 0.75);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 6px 6px 6px 14px;
            border-radius: 24px;
            backdrop-filter: blur(12px);
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .trial-counter-label {
            font-size: 13px;
            color: #94a3b8;
          }
          .trial-submit-btn {
            border: none;
            padding: 8px 18px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 13px;
            transition: all 0.2s ease;
            white-space: nowrap;
          }

          @media (max-width: 640px) {
            .trial-photo-grid {
              column-count: 3 !important;
              column-gap: 6px !important;
            }
            .trial-photo-grid .photo-card {
              margin-bottom: 6px !important;
            }
            .trial-cat-tabs {
              padding: 4px 6px;
              gap: 6px;
            }
            .trial-cat-btn, .trial-cat-locked {
              padding: 6px 14px;
              font-size: 12px;
            }
            .trial-action-bar {
              gap: 6px;
            }
            .trial-action-btn {
              padding: 6px 10px;
              font-size: 11px;
              border-radius: 16px;
            }
            .trial-counter-bar {
              padding: 4px 4px 4px 10px;
              gap: 6px;
              border-radius: 18px;
            }
            .trial-counter-label {
              font-size: 11px;
            }
            .trial-submit-btn {
              padding: 6px 12px;
              font-size: 11px;
              border-radius: 16px;
            }
          }
          @media (min-width: 641px) and (max-width: 1024px) {
            .trial-photo-grid {
              column-count: 4;
              column-gap: 10px;
            }
          }
        `}</style>
      </main>

      {/* LIGHTBOX MODAL WITH FULL NAVIGATION */}
      {activePhoto && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.94)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backdropFilter: 'blur(12px)' }}
          onClick={() => setActivePhoto(null)}
          onTouchStart={(e) => setTouchStart(e.targetTouches[0].clientX)}
          onTouchEnd={(e) => {
            const touchEnd = e.changedTouches[0].clientX;
            if (touchStart - touchEnd > 50) handleNextPhoto();
            if (touchStart - touchEnd < -50) handlePrevPhoto();
          }}
        >
          {/* TOMBOL PANAH PREVIOUS (KIRI) */}
          <button
            type="button"
            onClick={handlePrevPhoto}
            aria-label="Foto Sebelumnya"
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 110,
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#ffffff',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              fontSize: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s ease',
            }}
          >
            ❮
          </button>

          {/* TOMBOL PANAH NEXT (KANAN) */}
          <button
            type="button"
            onClick={handleNextPhoto}
            aria-label="Foto Selanjutnya"
            style={{
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 110,
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#ffffff',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              fontSize: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s ease',
            }}
          >
            ❯
          </button>

          {/* CONTAINER UTAMA MODAL FOTO */}
          <div style={{ maxWidth: '92vw', maxHeight: '92vh', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
            
            {/* COUNTER NAMA & URUTAN FOTO */}
            <div style={{ background: 'rgba(9, 9, 24, 0.75)', border: '1px solid rgba(255,255,255,0.15)', padding: '6px 16px', borderRadius: '20px', fontSize: '13px', color: '#cbd5e1', marginBottom: '12px', backdropFilter: 'blur(8px)' }}>
              Foto {(activePhoto.index !== undefined ? activePhoto.index : 0) + 1} dari {data.photos?.length || 0} &bull; <strong style={{ color: '#ffffff' }}>{activePhoto.fileName}</strong>
            </div>

            {/* GAMBAR FULL SIZE WITH WATERMARK */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '16px' }}>
              <img
                src={activePhoto.origSrc || activePhoto.thumbUrl}
                alt=""
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
                style={{ maxWidth: '100%', maxHeight: '74vh', borderRadius: '16px', objectFit: 'contain', boxShadow: '0 25px 60px rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', userSelect: 'none', WebkitUserSelect: 'none', pointerEvents: 'none' }}
              />
              {/* Overlay transparan: blok right-click & drag di lightbox */}
              <div
                style={{ position: 'absolute', inset: 0, background: 'transparent', zIndex: 2 }}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
              />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)', pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '20px 16px 16px 16px', color: '#a5b4fc', fontSize: '13px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', userSelect: 'none', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                <span style={{ fontSize: '14px', color: '#ffffff', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>⚡ TRIAL PREVIEW</span>
                <span style={{ fontSize: '11px', color: '#a5b4fc', textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}>PICK YOUR PHOTO</span>
              </div>
            </div>

            {/* CONTROLS BAR BOTTOM */}
            <div style={{ marginTop: '16px', display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => toggleSelectPhoto(activePhoto.fileName)}
                disabled={isExpired || submitted}
                style={{
                  background: selectedPhotos.includes(activePhoto.fileName) ? '#ef4444' : 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '30px',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
                }}
              >
                {selectedPhotos.includes(activePhoto.fileName) ? '❌ Batal Pilih' : '✓ Pilih Foto Ini'}
              </button>

              <button
                onClick={() => setActivePhoto(null)}
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '12px 22px', borderRadius: '30px', cursor: 'pointer', fontSize: '13px' }}
              >
                Tutup (Esc)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL: SALIN URL GALERI TRIAL */}
      {showSuccessModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(9, 9, 24, 0.92)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)', border: '1px solid #6366f1', borderRadius: '20px', padding: '32px', maxWidth: '540px', width: '100%', textDecoration: 'none', boxShadow: '0 20px 50px rgba(99,102,241,0.3)', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 8px 0' }}>
              Galeri Trial Instan Berhasil Dibuat!
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 24px 0', lineHeight: '1.5' }}>
              Folder Drive publik Anda telah berhasil terhubung (0 Bytes disk server terpakai). Silakan salin link di bawah ini untuk dibagikan atau dites.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textOverflow: 'ellipsis', textAlign: 'left', marginBottom: '24px' }}>
              {/* Box 1: Link Galeri Klien */}
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(99,102,241,0.3)', padding: '12px 14px', borderRadius: '10px' }}>
                <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📱 Link Galeri Klien (Halaman Seleksi Foto):</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <code style={{ fontSize: '12px', color: '#e2e8f0', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {typeof window !== 'undefined' ? `${window.location.origin}/trial-gallery/${data.slug}` : `/trial-gallery/${data.slug}`}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/trial-gallery/${data.slug}`;
                      navigator.clipboard.writeText(url);
                      alert('✓ Link Galeri Klien berhasil disalin!');
                    }}
                    style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0 }}
                  >
                    📋 Salin
                  </button>
                </div>
              </div>

              {/* Box 2: Link Hasil Seleksi */}
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(16,185,129,0.3)', padding: '12px 14px', borderRadius: '10px' }}>
                <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📋 Link Hasil Seleksi (Halaman Lightroom Ready):</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <code style={{ fontSize: '12px', color: '#e2e8f0', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {typeof window !== 'undefined' ? `${window.location.origin}/trial-gallery/${data.slug}/result` : `/trial-gallery/${data.slug}/result`}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/trial-gallery/${data.slug}/result`;
                      navigator.clipboard.writeText(url);
                      alert('✓ Link Hasil Seleksi berhasil disalin!');
                    }}
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0 }}
                  >
                    📋 Salin
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowSuccessModal(false)}
              style={{ width: '100%', background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
            >
              📱 Buka &amp; Tes Galeri Seleksi Sekarang
            </button>
          </div>
        </div>
      )}

      {/* STICKY BOTTOM BANNER UPGRADE */}
      <footer style={{ background: '#1e293b', borderTop: '1px solid #334155', padding: '20px', textAlign: 'center' }}>
        <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
          💡 Suka dengan kecepatan galeri ini? Nikmati galeri tanpa batas waktu, logo kustom, & kuota lebih besar dengan berlangganan{' '}
          <Link href="/register" style={{ color: '#6366f1', fontWeight: 'bold', textDecoration: 'underline' }}>Akun Pro Pick-Your-Photo</Link>.
        </p>
      </footer>

    </div>
  );
}
