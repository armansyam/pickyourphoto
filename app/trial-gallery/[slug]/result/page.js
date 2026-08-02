'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import RawSorterDrawer from '@/components/RawSorterDrawer';

export default function TrialResultPage({ params }) {
  const [slug, setSlug] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showSorter, setShowSorter] = useState(false);

  useEffect(() => {
    Promise.resolve(params).then((p) => {
      if (p?.slug) {
        setSlug(p.slug);
        fetchResult(p.slug);
      }
    });
  }, [params]);

  const fetchResult = async (targetSlug) => {
    const s = targetSlug || slug;
    if (!s) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/trial/${s}`);
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || errJson.error || 'Gagal memuat hasil seleksi trial');
      }
      const json = await res.json();
      setData(json.gallery);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyFilenames = () => {
    if (!data?.selectedPhotos || data.selectedPhotos.length === 0) return;
    const stripped = data.selectedPhotos.map(name => name.replace(/\.[^.]+$/, ''));
    navigator.clipboard.writeText(stripped.join(', '));
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff' }}>
        <p>Memuat Hasil Seleksi Trial...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff', padding: '20px' }}>
        <div style={{ background: '#1e293b', padding: '32px', borderRadius: '16px', textAlign: 'center' }}>
          <p style={{ color: '#ef4444' }}>{error}</p>
          <Link href="/" style={{ color: '#6366f1', marginTop: '16px', display: 'inline-block' }}>Kembali ke Beranda</Link>
        </div>
      </div>
    );
  }

  const selectedCount = data.selectedPhotos?.length || 0;
  const hasSelected = selectedCount > 0;
  const isCompleted = data.selectionStatus === 'completed' || hasSelected;

  // Format durasi dari menit → label singkat
  const formatTrialDuration = (minutes) => {
    if (!minutes) return 'Trial';
    if (minutes < 60) return `${minutes} Menit`;
    const h = minutes / 60;
    return Number.isInteger(h) ? `${h} Jam` : `${h.toFixed(1)} Jam`;
  };

  const durationLabel = formatTrialDuration(data.trialDurationMinutes);
  const durationLong = data.trialDurationMinutes < 60
    ? `hanya ${data.trialDurationMinutes} menit`
    : `hanya ${(data.trialDurationMinutes / 60 % 1 === 0 ? data.trialDurationMinutes / 60 : (data.trialDurationMinutes / 60).toFixed(1))} jam`;

  return (
    <div style={{ minHeight: '100vh', background: '#090d16', color: '#f8fafc', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        {/* ── HEADER CARD ── */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '32px', marginBottom: '16px' }}>
          <div style={{ borderBottom: '1px solid #334155', paddingBottom: '20px', marginBottom: '24px' }}>
            <span style={{ fontSize: '12px', background: '#6366f1', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold' }}>HASIL SELEKSI FOTO (TRIAL {durationLabel.toUpperCase()})</span>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '12px', color: '#f8fafc' }}>{data.title}</h1>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
              Status: {isCompleted ? '✅ Klien Sudah Memilih' : '⏳ Menunggu Pilihan Klien'}
            </p>
          </div>

          {/* ── ACTION BAR — hanya Salin Nama File ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
              Foto Terpilih: <span style={{ color: '#10b981' }}>{selectedCount} Foto</span>
            </h3>
            {hasSelected && (
              <button
                onClick={handleCopyFilenames}
                style={{
                  background: copied ? '#10b981' : '#6366f1',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'background 0.2s',
                }}
              >
                {copied ? '✓ Berhasil Disalin!' : '📋 Salin Nama File'}
              </button>
            )}
          </div>

          {/* ── FILE LIST BOX ── */}
          {!hasSelected ? (
            <div style={{ background: '#0f172a', padding: '32px', borderRadius: '12px', textAlign: 'center', color: '#94a3b8' }}>
              Klien belum menyelesaikan atau mengirimkan foto pilihan.
            </div>
          ) : (
            <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid #334155', fontFamily: 'monospace', fontSize: '14px', color: '#38bdf8', wordBreak: 'break-all', lineHeight: '1.6' }}>
              {data.selectedPhotos.map(name => name.replace(/\.[^.]+$/, '')).join(', ')}
            </div>
          )}
        </div>

        {/* ── COMBINED: RAW SORTER + UPGRADE CTA — SATU CARD PROMOSI ── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.12) 50%, rgba(168,85,247,0.08) 100%)',
          border: '1px solid rgba(139,92,246,0.25)',
          borderRadius: '18px',
          padding: '32px 28px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Dekoratif glow */}
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px', background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

          {/* Baris atas: RAW Sorter CTA */}
          {hasSelected && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '20px',
              flexWrap: 'wrap',
              paddingBottom: '24px',
              marginBottom: '24px',
              borderBottom: '1px solid rgba(139,92,246,0.15)',
            }}>
              <div style={{
                width: '52px', height: '52px', flexShrink: 0,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                borderRadius: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '26px',
                boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
              }}>📁</div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ fontWeight: '800', color: '#e0d7ff', fontSize: '17px', marginBottom: '6px', lineHeight: '1.3' }}>
                  File RAW kamu sudah siap disortir otomatis!
                </div>
                <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '14px' }}>
                  {selectedCount} foto sudah dipilih klien. Sekarang tinggal 1 klik — RAW Sorter akan mencocokkan dan memindahkan file RAW dari folder lokal kamu <strong style={{ color: '#c4b5fd' }}>100% di komputer, tanpa upload</strong>. Hemat waktu editing berjam-jam.
                </div>
                <button
                  onClick={() => setShowSorter(true)}
                  style={{
                    padding: '11px 26px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 18px rgba(99,102,241,0.4)',
                    transition: 'all 0.2s',
                    letterSpacing: '0.3px',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(99,102,241,0.5)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 18px rgba(99,102,241,0.4)'; }}
                >
                  📁 Coba RAW Sorter Sekarang →
                </button>
              </div>
            </div>
          )}

          {/* Baris bawah: Upgrade CTA */}
          <div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: '800', color: '#f8fafc', lineHeight: '1.3' }}>
                Kamu sudah merasakan sendiri — bayangkan tanpa batasan.
              </h4>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 16px', lineHeight: '1.7' }}>
                Galeri permanen, branding studio kamu sendiri, RAW Sorter penuh — semua dalam satu platform untuk fotografer profesional.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                {[
                  '♾️ Galeri tanpa batas waktu',
                  '🎨 Branding logo studio',
                  '📁 RAW Sorter tanpa limit',
                  '🗂️ Kelola proyek tak terbatas',
                  '🔗 Link eksklusif per klien',
                ].map(f => (
                  <span key={f} style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '5px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    color: '#cbd5e1',
                    fontWeight: '500',
                  }}>{f}</span>
                ))}
              </div>
              <Link
                href="/register"
                style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  color: '#fff',
                  padding: '13px 28px',
                  borderRadius: '10px',
                  fontWeight: '800',
                  textDecoration: 'none',
                  fontSize: '14px',
                  boxShadow: '0 4px 20px rgba(168,85,247,0.35)',
                  letterSpacing: '0.3px',
                }}
              >
                Buat Akun Pro Sekarang →
              </Link>
            </div>
          </div>
        </div>

      </div>

      {/* ── RAW SORTER DRAWER ── */}
      <RawSorterDrawer
        isOpen={showSorter}
        onClose={() => setShowSorter(false)}
        project={null}
        vendorPlan="free_trial"
        preloadedFileNames={data?.selectedPhotos || []}
        preloadedTitle={data?.title || ''}
      />
    </div>
  );
}
