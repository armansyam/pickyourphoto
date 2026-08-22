'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  SpeedBoltIcon, SparklesUpgradeIcon, AlertTriangleIcon, 
  CopyLinkIcon, RefreshCwIcon, FolderIcon 
} from '@/components/StorageIcons.jsx';

export default function TrialWidget() {
  const router = useRouter();
  const [folderUrl, setFolderUrl] = useState('');
  const [title, setTitle] = useState('');
  const [maxSelection, setMaxSelection] = useState(10);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState('links'); // 'links' | 'live'
  const [liveData, setLiveData] = useState(null);
  const [syncingLive, setSyncingLive] = useState(false);
  const [copiedLive, setCopiedLive] = useState(false);
  const formRef = useRef(null);
  const [formHeight, setFormHeight] = useState(0);

  const [trialSettings, setTrialSettings] = useState({
    enable_free_trial: true,
    trial_expiration_minutes: 60,
    trial_max_photos: 50,
    trial_max_selection: 10,
    trial_cta_text: '',
    trial_cta_subtext: '',
  });

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((s) => {
        if (!s) return;
        setTrialSettings({
          enable_free_trial: s.enable_free_trial !== 0 && s.enable_free_trial !== 'false' && s.enable_free_trial !== false,
          trial_expiration_minutes: parseInt(s.trial_expiration_minutes) || 60,
          trial_max_photos: parseInt(s.trial_max_photos) || 50,
          trial_max_selection: parseInt(s.trial_max_selection) || 10,
          trial_cta_text: s.trial_cta_text || '',
          trial_cta_subtext: s.trial_cta_subtext || '',
        });
        if (s.trial_max_selection) {
          setMaxSelection(parseInt(s.trial_max_selection) || 10);
        }
      })
      .catch(() => {});
  }, []);

  const getDurationText = (minutes) => {
    const m = minutes || 60;
    if (m < 60) return `${m} Menit`;
    const h = m / 60;
    return Number.isInteger(h) ? `${h} Jam` : `${h.toFixed(1)} Jam`;
  };

  const durationStr = getDurationText(trialSettings.trial_expiration_minutes);

  const fetchLiveResult = async (slug) => {
    const targetSlug = slug || result?.slug;
    if (!targetSlug) return;
    try {
      setSyncingLive(true);
      const res = await fetch(`/api/trial/${targetSlug}`);
      if (res.ok) {
        const json = await res.json();
        setLiveData(json.gallery || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSyncingLive(false);
    }
  };

  // Measure form height for smooth animation
  useEffect(() => {
    if (formRef.current) {
      setFormHeight(formRef.current.scrollHeight);
    }
  }, [showForm, error, logoPreview]);

  // Kompresi gambar ke WebP via Canvas API (client-side)
  const compressToWebP = (file, maxDim, quality) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const webpDataUrl = canvas.toDataURL('image/webp', quality);
        URL.revokeObjectURL(img.src);
        resolve(webpDataUrl);
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error('Gagal memproses gambar logo'));
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran file logo maksimal 5MB. Silakan gunakan gambar yang lebih kecil dari 5MB.');
      return;
    }

    try {
      setError('');
      const quality = file.size > 1 * 1024 * 1024 ? 0.65 : 0.75;
      const compressedDataUrl = await compressToWebP(file, 320, quality);
      setLogoUrl(compressedDataUrl);
      setLogoPreview(compressedDataUrl);
    } catch (err) {
      setError(err.message || 'Gagal memproses logo');
    }
  };

  const handleCreateTrial = async (e) => {
    e.preventDefault();
    if (!folderUrl.trim()) {
      setError('Masukkan link folder Google Drive publik terlebih dahulu.');
      return;
    }

    try {
      setError('');
      // 1. INSTAN 0 DETIK: Langsung tampilkan Result Card
      setResult({
        isPreparing: true,
        slug: '',
        clientUrl: '#',
        resultUrl: '#'
      });
      setShowForm(false);
      setViewMode('links');

      const res = await fetch('/api/trial/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderUrl: folderUrl.trim(),
          title: title.trim() || 'Galeri Seleksi Foto (Trial)',
          maxSelection: parseInt(maxSelection) || 10,
          logoUrl: logoUrl || undefined,
        }),
      });

      const isJson = res.headers.get('content-type')?.includes('application/json');
      const json = isJson ? await res.json() : null;

      if (!res.ok) {
        const defaultMsg = res.status === 413
          ? 'Ukuran logo terlalu besar. Gunakan gambar yang lebih kecil.'
          : 'Gagal membuat galeri trial. Pastikan link Google Drive publik!';
        throw new Error(json?.error || json?.message || defaultMsg);
      }

      const clientUrl = `/trial-gallery/${json.slug}`;
      const resultUrl = `/trial-gallery/${json.slug}/result`;

      setResult({
        ...json,
        isPreparing: false,
        clientUrl,
        resultUrl,
        photoCount: json.totalPhotos || 0
      });
    } catch (err) {
      setResult(null);
      setShowForm(true);
      setError(err.message);
    }
  };

  if (!trialSettings.enable_free_trial) return null;

  return (
    <div style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)', border: '1px solid #334155', borderRadius: '20px', padding: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', maxWidth: '640px', width: '100%', margin: '0 auto' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', color: '#818cf8', fontWeight: 'bold', marginBottom: '16px' }}>
        <SpeedBoltIcon size={14} color="#818cf8" />
        <span>FREE INSTANT TRIAL ({durationStr.toUpperCase()}) — TANPA DAFTAR</span>
      </div>
      
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f8fafc', margin: '0 0 8px' }}>
        Uji Coba Galeri Seleksi Klien
      </h2>
      <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 24px', lineHeight: '1.5' }}>
        {trialSettings.trial_cta_subtext || 'Tempelkan link folder Google Drive publik Anda. Galeri seleksi akan dibuat secara instan tanpa mendownload foto ke server!'}
      </p>

      {/* CTA BUTTON — Visible when form is hidden and no result */}
      {!showForm && !result && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #6366f1, #9333ea)',
            color: '#fff',
            border: 'none',
            padding: '16px 24px',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
          }}
        >
          <SparklesUpgradeIcon size={16} color="#fff" />
          <span>Mulai Uji Coba Gratis</span>
          <span style={{ fontSize: '18px', transition: 'transform 0.3s ease' }}>→</span>
        </button>
      )}

      {/* COLLAPSIBLE FORM AREA */}
      <div
        style={{
          maxHeight: showForm ? `${formHeight + 40}px` : '0px',
          overflow: 'hidden',
          transition: 'max-height 0.45s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease',
          opacity: showForm ? 1 : 0,
        }}
      >
        <div ref={formRef}>
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangleIcon size={16} color="#fca5a5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleCreateTrial} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                Link Folder Google Drive (Public) *
              </label>
              <input
                type="url"
                placeholder="https://drive.google.com/drive/folders/..."
                value={folderUrl}
                onChange={(e) => setFolderUrl(e.target.value)}
                required
                style={{ width: '100%', padding: '12px 16px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none' }}
              />
              <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748b' }}>
                <span>* Pastikan folder diset: &quot;Siapa saja yang memiliki link dapat melihat&quot;.</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                  Judul Galeri (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Wisuda Sarah 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                  Batas Foto Dipilih (Kuota)
                </label>
                <input
                  type="number"
                  min="1"
                  max={trialSettings.trial_max_selection}
                  value={maxSelection}
                  onChange={(e) => setMaxSelection(Math.min(parseInt(e.target.value) || 1, trialSettings.trial_max_selection))}
                  style={{ width: '100%', padding: '10px 14px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                Upload Logo Studio Anda (Opsional - Simulasi White-Label)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleLogoChange}
                  style={{ flex: 1, padding: '8px 12px', background: '#0f172a', border: '1px dashed #6366f1', borderRadius: '8px', color: '#94a3b8', fontSize: '13px', cursor: 'pointer' }}
                />
                {logoPreview && (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={logoPreview} alt="Preview Logo" style={{ height: '40px', width: 'auto', maxHeight: '40px', borderRadius: '6px', border: '1px solid rgba(129, 140, 248, 0.5)', background: 'rgba(19, 16, 36, 0.8)', padding: '4px', objectFit: 'contain' }} />
                    <button
                      type="button"
                      onClick={() => { setLogoUrl(''); setLogoPreview(''); }}
                      style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
              <div style={{ fontSize: '11px', color: '#71717a', marginTop: '6px' }}>
                * Maks 5MB • Format: PNG/JPG/WebP • Otomatis dikompresi ke WebP untuk loading optimal
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #6366f1, #9333ea)',
                  color: '#fff',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: 'bold',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                  transition: 'transform 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {loading ? (
                  <span>Memindai Folder Drive...</span>
                ) : (
                  <>
                    <SparklesUpgradeIcon size={14} color="#fff" />
                    <span>{trialSettings.trial_cta_text || `Buat Galeri Trial (Aktif ${durationStr})`}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#64748b',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                ✕
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* RESULT SECTION */}
      {result && viewMode === 'links' && (
        <div style={{ background: '#0f172a', border: '1px solid #6366f1', padding: '24px', borderRadius: '14px', textAlign: 'left', animation: 'fadeIn 0.35s ease' }}>
          <div style={{ color: '#34d399', fontWeight: 'bold', fontSize: '18px', marginBottom: '6px' }}>
            🎉 Galeri Trial Instan Berhasil Dibuat!
          </div>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>
            Folder Drive publik Anda berhasil terhubung (0 Bytes disk server terpakai). Silakan salin link di bawah ini:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
            {/* Box 1: Link Galeri Klien */}
            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(129,140,248,0.3)', padding: '12px', borderRadius: '10px' }}>
              <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📱 Link Galeri Klien (Halaman Seleksi Foto):</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                <code style={{ fontSize: '12px', color: '#e2e8f0', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {typeof window !== 'undefined' ? `${window.location.origin}${result.clientUrl}` : result.clientUrl}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}${result.clientUrl}`;
                    navigator.clipboard.writeText(url);
                    alert('✓ Link Galeri Klien berhasil disalin!');
                  }}
                  style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <CopyLinkIcon size={12} />
                  <span>Salin</span>
                </button>
              </div>
            </div>

            {/* Box 2: Link Hasil Seleksi & Live Button */}
            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(16,185,129,0.3)', padding: '14px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 'bold' }}>Link Hasil Seleksi (Halaman Lightroom Ready):</span>
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}${result.resultUrl}`;
                    navigator.clipboard.writeText(url);
                    alert('✓ Link Hasil Seleksi berhasil disalin!');
                  }}
                  style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#34d399', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <CopyLinkIcon size={12} />
                  <span>Salin Link</span>
                </button>
              </div>
              <code style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {typeof window !== 'undefined' ? `${window.location.origin}${result.resultUrl}` : result.resultUrl}
              </code>
              <button
                type="button"
                onClick={() => {
                  setViewMode('live');
                  fetchLiveResult(result.slug);
                }}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                }}
              >
                <span>Cek Hasil Seleksi Live (In-App) &rarr;</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <a
              href={result.isPreparing ? '#' : result.clientUrl}
              target={result.isPreparing ? '_self' : '_blank'}
              rel="noreferrer"
              style={{
                flex: 1,
                background: result.isPreparing ? 'rgba(99, 102, 241, 0.4)' : 'linear-gradient(135deg, #6366f1, #818cf8)',
                color: '#fff',
                textAlign: 'center',
                padding: '14px',
                borderRadius: '10px',
                fontWeight: 'bold',
                textDecoration: 'none',
                fontSize: '14px',
                pointerEvents: result.isPreparing ? 'none' : 'auto',
                cursor: result.isPreparing ? 'wait' : 'pointer'
              }}
            >
              {result.isPreparing ? '⏳ Menyiapkan Galeri Seleksi...' : '📱 Buka &amp; Tes Galeri Seleksi →'}
            </a>
            <button
              onClick={() => { setResult(null); setFolderUrl(''); setShowForm(false); setViewMode('links'); }}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '14px 18px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}
            >
              ↺ Buat Baru
            </button>
          </div>
        </div>
      )}

      {/* CARD 3: LIVE VIEW HASIL SELEKSI (IN-APP DISPLAY) */}
      {result && viewMode === 'live' && (
        <div style={{ background: '#0f172a', border: '1px solid #10b981', padding: '24px', borderRadius: '14px', textAlign: 'left', boxShadow: '0 10px 30px rgba(16, 185, 129, 0.15)', animation: 'fadeIn 0.35s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
            <div>
              <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold', letterSpacing: '0.5px' }}>LIVE RESULT</span>
              <h3 style={{ fontSize: '17px', fontWeight: 'bold', color: '#fff', margin: '4px 0 0 0' }}>
                {liveData?.title || result.title || 'Hasil Seleksi Foto Trial'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => fetchLiveResult(result.slug)}
              disabled={syncingLive}
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#38bdf8', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {syncingLive ? (
                <span>Syncing...</span>
              ) : (
                <>
                  <RefreshCwIcon size={12} color="#38bdf8" />
                  <span>Sync Live</span>
                </>
              )}
            </button>
          </div>

          <div style={{ background: 'rgba(11,9,24,0.8)', border: '1px solid rgba(129,140,248,0.2)', padding: '12px 14px', borderRadius: '10px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
              Status: <strong style={{ color: (liveData?.selectedPhotos?.length || 0) > 0 ? '#34d399' : '#fbbf24' }}>
                {(liveData?.selectedPhotos?.length || 0) > 0 ? 'Klien Sudah Memilih' : 'Menunggu Pilihan Klien...'}
              </strong>
            </div>
            <div style={{ fontSize: '13px', color: '#34d399', fontWeight: 'bold' }}>
              {liveData?.selectedPhotos?.length || 0} Foto Dipilih
            </div>
          </div>

          {/* LIGHTROOM FILENAMES BOX */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>List Nama File (Format Lightroom Filter):</span>
              <button
                type="button"
                onClick={() => {
                  const photos = liveData?.selectedPhotos || [];
                  if (photos.length > 0) {
                    const stripped = photos.map(n => n.replace(/\.[^.]+$/, '')).join(', ');
                    navigator.clipboard.writeText(stripped);
                    setCopiedLive(true);
                    setTimeout(() => setCopiedLive(false), 2500);
                  } else {
                    alert('Klien belum memilih foto.');
                  }
                }}
                style={{ background: copiedLive ? '#10b981' : 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <CopyLinkIcon size={12} />
                <span>{copiedLive ? 'Berhasil Disalin!' : 'Salin Nama File'}</span>
              </button>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(16,185,129,0.3)', padding: '14px', borderRadius: '10px', fontFamily: 'monospace', fontSize: '13px', color: (liveData?.selectedPhotos?.length || 0) > 0 ? '#38bdf8' : '#94a3b8', minHeight: '56px', maxHeight: '120px', overflowY: 'auto', wordBreak: 'break-all', lineHeight: '1.6' }}>
              {(liveData?.selectedPhotos?.length || 0) > 0 ? (
                liveData.selectedPhotos.map(n => n.replace(/\.[^.]+$/, '')).join(', ')
              ) : (
                <em>Belum ada foto terpilih. Buka tab Galeri Klien untuk memilih foto.</em>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setViewMode('links')}
              style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#eae8f7', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              ← Kembali ke Link Galeri
            </button>
            <a
              href={result.resultUrl}
              target="_blank"
              rel="noreferrer"
              style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 'bold', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <FolderIcon size={14} color="#fff" />
              <span>Halaman RAW Sorter →</span>
            </a>
            <button
              onClick={() => { setResult(null); setFolderUrl(''); setShowForm(false); setViewMode('links'); }}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}
            >
              ↺ Buat Baru
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
