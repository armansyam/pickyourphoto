'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FolderIcon, PhotoIcon, CopyLinkIcon, AlertTriangleIcon } from '@/components/StorageIcons.jsx';

export default function StorageGalleryStandalonePage() {
  const params = useParams();
  const router = useRouter();
  const folderId = params?.folderId;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeLightboxIndex, setActiveLightboxIndex] = useState(null);

  useEffect(() => {
    if (!folderId) return;
    fetchGalleryData();
  }, [folderId]);

  const fetchGalleryData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/storage/gallery/${folderId}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.message || 'Gagal memuat galeri folder.');
      }
    } catch {
      setError('Terjadi kesalahan koneksi saat memuat galeri.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (data?.folder) {
      const rootCount = data.folder.rootFilesCount ?? data.files.filter(f => f.parentFolderId === data.folder.driveFolderId).length;
      if (rootCount > 0) {
        setActiveCategory('ROOT');
      } else if (data.subFolders && data.subFolders.length > 0) {
        setActiveCategory(data.subFolders[0].name);
      } else {
        setActiveCategory('ALL');
      }
    }
  }, [data]);

  const { folder, vendor, files, subFolders } = data || {};

  const rootFilesCount = (files || []).filter(f => f.parentFolderId === folder?.driveFolderId).length;
  const hasSubFolders = subFolders && subFolders.length > 0;

  const displayFiles = !hasSubFolders
    ? (files || [])
    : (activeCategory === 'ROOT' || !activeCategory)
      ? (files || []).filter(f => f.parentFolderId === folder?.driveFolderId)
      : activeCategory === 'ALL'
        ? (files || [])
        : (files || []).filter(f => f.subFolderName === activeCategory || f.parentFolderId === subFolders.find(s => s.name === activeCategory)?.driveFolderId);

  const handlePrevPhoto = (e) => {
    e?.stopPropagation();
    if (activeLightboxIndex === null || !displayFiles || displayFiles.length === 0) return;
    setActiveLightboxIndex(prev => (prev > 0 ? prev - 1 : displayFiles.length - 1));
  };

  const handleNextPhoto = (e) => {
    e?.stopPropagation();
    if (activeLightboxIndex === null || !displayFiles || displayFiles.length === 0) return;
    setActiveLightboxIndex(prev => (prev < displayFiles.length - 1 ? prev + 1 : 0));
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (activeLightboxIndex === null) return;
      if (e.key === 'ArrowLeft') {
        setActiveLightboxIndex(prev => (prev > 0 ? prev - 1 : (displayFiles?.length ? displayFiles.length - 1 : 0)));
      }
      if (e.key === 'ArrowRight') {
        setActiveLightboxIndex(prev => (prev < (displayFiles?.length || 1) - 1 ? prev + 1 : 0));
      }
      if (e.key === 'Escape') {
        setActiveLightboxIndex(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeLightboxIndex, displayFiles]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#09090b', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#34d399', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px auto' }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <p style={{ margin: 0, fontSize: '14px', color: '#a1a1aa', fontWeight: '600' }}>Memuat Galeri Folder...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#09090b', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ background: '#121215', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '20px', padding: '36px', maxWidth: '440px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <AlertTriangleIcon size={48} color="#f87171" />
          </div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '800', color: '#ffffff' }}>Galeri Tidak Ditemukan</h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#a1a1aa', lineHeight: '1.5' }}>{error || 'Folder storage ini tidak dapat diakses atau telah dihapus.'}</p>
          <button onClick={() => router.push('/dashboard/storage')} style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.08)', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
            ← Kembali ke Storage
          </button>
        </div>
      </div>
    );
  }



  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#ffffff', fontFamily: 'Inter, system-ui, sans-serif', paddingBottom: '60px' }}>
      {/* HEADER NAVBAR & BRANDING */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 24px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          
          {/* Studio Brand & Folder Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {vendor?.logoUrl ? (
              <img
                src={vendor.logoUrl}
                alt={vendor.name}
                style={{ height: '42px', width: 'auto', maxHeight: '42px', objectFit: 'contain', borderRadius: '8px' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '800' }}>
                {vendor?.name?.charAt(0) || 'S'}
              </div>
            )}

            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#34d399' }}>
                {vendor?.name || 'Studio Photography'}
              </div>
              <h1 style={{ margin: '2px 0 0 0', fontSize: '20px', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderIcon size={20} color="#34d399" />
                <span>{folder.name}</span>
              </h1>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleCopyLink}
              style={{
                padding: '8px 14px',
                background: copied ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)',
                color: copied ? '#34d399' : '#e4e4e7',
                border: copied ? '1px solid rgba(52,211,153,0.4)' : '1px solid rgba(255,255,255,0.12)',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <CopyLinkIcon size={13} color={copied ? '#34d399' : '#e4e4e7'} />
              <span>{copied ? 'Link Tersalin' : 'Salin Link'}</span>
            </button>

            <button
              onClick={() => router.push('/dashboard/storage')}
              style={{
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.08)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              ← Storage
            </button>
          </div>

        </div>
      </header>

      {/* MAIN GALLERY CONTAINER */}
      <main style={{ maxWidth: '1280px', margin: '32px auto 0 auto', padding: '0 24px' }}>
        
        {/* TAB HIRARKI: HANYA TAMPIL JIKA ADA MINIMAL 1 SUBFOLDER */}
        {hasSubFolders && (
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '24px', scrollbarWidth: 'none' }}>
            
            {/* TAB 1: ROOT FOLDER UTAMA */}
            {rootFilesCount > 0 && (
              <button
                onClick={() => setActiveCategory('ROOT')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  background: activeCategory === 'ROOT' ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.05)',
                  color: activeCategory === 'ROOT' ? '#ffffff' : '#a1a1aa',
                  border: activeCategory === 'ROOT' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  boxShadow: activeCategory === 'ROOT' ? '0 4px 14px rgba(16,185,129,0.3)' : 'none',
                  transition: 'all 0.2s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FolderIcon size={14} color={activeCategory === 'ROOT' ? '#fff' : '#a1a1aa'} />
                <span>{folder.name} ({rootFilesCount})</span>
              </button>
            )}

            {/* TAB 2: SUB-FOLDER SESI */}
            {subFolders.map((sub) => {
              const count = files.filter(f => f.subFolderName === sub.name || f.parentFolderId === sub.driveFolderId).length;
              const isActive = activeCategory === sub.name;
              return (
                <button
                  key={sub.id}
                  onClick={() => setActiveCategory(sub.name)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    background: isActive ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.05)',
                    color: isActive ? '#ffffff' : '#a1a1aa',
                    border: isActive ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    boxShadow: isActive ? '0 4px 14px rgba(16,185,129,0.3)' : 'none',
                    transition: 'all 0.2s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <FolderIcon size={14} color={isActive ? '#fff' : '#a1a1aa'} />
                  <span>{sub.name} ({count})</span>
                </button>
              );
            })}

            {/* TAB 3: SEMUA FOTO */}
            <button
              onClick={() => setActiveCategory('ALL')}
              style={{
                padding: '10px 20px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: activeCategory === 'ALL' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255,255,255,0.05)',
                color: activeCategory === 'ALL' ? '#ffffff' : '#a1a1aa',
                border: activeCategory === 'ALL' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                boxShadow: activeCategory === 'ALL' ? '0 4px 14px rgba(99,102,241,0.3)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              Semua Foto ({files.length})
            </button>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ fontSize: '13px', color: '#a1a1aa' }}>
            Menampilkan <strong style={{ color: '#ffffff' }}>{displayFiles.length}</strong> foto/media {
              activeCategory === 'ROOT' ? `di folder "${folder.name}"` :
              activeCategory === 'ALL' ? `di seluruh folder "${folder.name}"` :
              `di subfolder "${activeCategory}"`
            }
          </div>
        </div>

        {displayFiles.length === 0 ? (
          <div style={{ background: '#121215', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '80px 20px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <PhotoIcon size={48} color="#71717a" />
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '800', color: '#ffffff' }}>Belum Ada Foto</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#a1a1aa' }}>Tidak ada berkas foto pada kategori/subfolder ini.</p>
          </div>
        ) : (
          /* MASONRY MEDIA GRID SHOWCASE (6 KOLOM HARMONIS SAMA DENGAN GALERI TRIAL) */
          <>
            <div className="storage-photo-grid">
              {displayFiles.map((file, idx) => {
                const cleanFileName = file.name ? file.name.split('/').pop() : (file.name || '');
                const isImg = file.mimeType?.startsWith('image/') || cleanFileName?.match(/\.(jpg|jpeg|png|webp|gif)$/i);
                const thumbUrl = `https://lh3.googleusercontent.com/d/${file.driveFileId}=w600`;

                return (
                  <div
                    key={file.id}
                    className="photo-card"
                    onClick={() => isImg && setActiveLightboxIndex(idx)}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      cursor: isImg ? 'pointer' : 'default',
                      position: 'relative',
                      transition: 'transform 0.2s ease, border-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(52,211,153,0.4)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    {isImg ? (
                      <>
                        <img
                          src={thumbUrl}
                          alt={cleanFileName}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          style={{ width: '100%', height: 'auto', display: 'block' }}
                          onError={(e) => {
                            const retries = parseInt(e.target.dataset.retries || '0', 10);
                            if (retries < 3) {
                              e.target.dataset.retries = String(retries + 1);
                              setTimeout(() => {
                                e.target.src = `https://lh3.googleusercontent.com/d/${file.driveFileId}=w600&t=${Date.now()}`;
                              }, 1200);
                            }
                          }}
                        />
                        {/* GRADIEN HALUS BAGIAN BAWAH KARTU AGAR TAMPIL DINAMIS (TANPA TEKS NAMA FILE) */}
                        <div style={{ position: 'absolute', bottom: 0, inset: 'auto 0 0 0', height: '35%', background: 'linear-gradient(to top, rgba(0,0,0,0.45), transparent)', pointerEvents: 'none' }} />
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', color: '#a1a1aa', padding: '20px 14px' }}>
                        <span style={{ fontSize: '32px', display: 'block', marginBottom: '6px' }}>📄</span>
                        <span style={{ fontSize: '11px', color: '#e4e4e7', wordBreak: 'break-all', fontWeight: '600' }}>{cleanFileName}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <style jsx>{`
              .storage-photo-grid {
                column-count: 6;
                column-gap: 12px;
                margin-top: 16px;
              }
              .storage-photo-grid .photo-card {
                break-inside: avoid;
                margin-bottom: 12px;
              }
              @media (min-width: 641px) and (max-width: 1024px) {
                .storage-photo-grid {
                  column-count: 4;
                  column-gap: 10px;
                }
              }
              @media (max-width: 640px) {
                .storage-photo-grid {
                  column-count: 3;
                  column-gap: 6px;
                }
                .storage-photo-grid .photo-card {
                  margin-bottom: 6px;
                }
              }
            `}</style>
          </>
        )}

      </main>

      {/* FULLSCREEN LIGHTBOX PREVIEW SHOWCASE */}
      {activeLightboxIndex !== null && displayFiles[activeLightboxIndex] && (() => {
        const currentFile = displayFiles[activeLightboxIndex];
        const cleanName = currentFile.name ? currentFile.name.split('/').pop() : (currentFile.name || '');
        const fullUrl = `https://lh3.googleusercontent.com/d/${currentFile.driveFileId}=w1600`;

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              background: 'rgba(0,0,0,0.95)',
              backdropFilter: 'blur(20px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={() => setActiveLightboxIndex(null)}
          >
            {/* FLOATING CLOSE BUTTON IN TOP RIGHT OF SCREEN */}
            <button
              onClick={() => setActiveLightboxIndex(null)}
              style={{
                position: 'fixed',
                top: '24px',
                right: '24px',
                zIndex: 100001,
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.25)',
                color: '#ffffff',
                borderRadius: '50%',
                width: '44px',
                height: '44px',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                transition: 'all 0.2s ease'
              }}
              title="Tutup (Esc)"
            >
              ✕
            </button>

            {/* FLOATING PREVIOUS BUTTON ON LEFT OF SCREEN BACKDROP */}
            <button
              onClick={handlePrevPhoto}
              style={{
                position: 'fixed',
                left: '24px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 100001,
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#ffffff',
                borderRadius: '50%',
                width: '52px',
                height: '52px',
                fontSize: '24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                transition: 'all 0.2s ease'
              }}
              title="Foto Sebelumnya (Panah Kiri)"
            >
              ❮
            </button>

            {/* FLOATING NEXT BUTTON ON RIGHT OF SCREEN BACKDROP */}
            <button
              onClick={handleNextPhoto}
              style={{
                position: 'fixed',
                right: '24px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 100001,
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#ffffff',
                borderRadius: '50%',
                width: '52px',
                height: '52px',
                fontSize: '24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                transition: 'all 0.2s ease'
              }}
              title="Foto Selanjutnya (Panah Kanan)"
            >
              ❯
            </button>

            {/* NATURAL CANVAS IMAGE DISPLAY WITH WATERMARK BRANDING OVERLAY DIRECTLY ON TOP OF PHOTO */}
            <div
              style={{
                position: 'relative',
                maxWidth: '85vw',
                maxHeight: '82vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 30px 90px rgba(0,0,0,0.9)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={fullUrl}
                alt={cleanName || 'Preview'}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const retries = parseInt(e.target.dataset.retries || '0', 10);
                  if (retries < 3) {
                    e.target.dataset.retries = String(retries + 1);
                    setTimeout(() => {
                      e.target.src = `https://lh3.googleusercontent.com/d/${currentFile.driveFileId}=w1600&t=${Date.now()}`;
                    }, 1200);
                  }
                }}
                style={{
                  maxWidth: '85vw',
                  maxHeight: '82vh',
                  objectFit: 'contain',
                  borderRadius: '16px',
                  display: 'block'
                }}
              />

              {/* WATERMARK BRANDING OVERLAY DIRECTLY ON TOP OF PREVIEW PHOTO AT THE BOTTOM (100% DEAD CENTER) */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  zIndex: 10,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)',
                  padding: '24px 16px 20px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  boxSizing: 'border-box',
                  pointerEvents: 'none'
                }}
              >
                {/* ATAS: LOGO VENDOR */}
                {vendor?.logoUrl ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', pointerEvents: 'auto' }}>
                    <img
                      src={vendor.logoUrl}
                      alt={vendor?.name || 'Studio'}
                      style={{
                        height: '40px',
                        width: 'auto',
                        maxHeight: '40px',
                        maxWidth: '200px',
                        objectFit: 'contain',
                        display: 'block',
                        margin: '0 auto',
                        filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.9))'
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '800', boxShadow: '0 4px 12px rgba(16,185,129,0.4)', margin: '0 auto', pointerEvents: 'auto' }}>
                    {vendor?.name?.charAt(0) || 'S'}
                  </div>
                )}

                {/* BAWAH: NAMA VENDOR */}
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff', textShadow: '0 2px 10px rgba(0,0,0,0.9)', letterSpacing: '0.5px', textAlign: 'center', width: '100%', margin: 0, pointerEvents: 'auto' }}>
                  {vendor?.name || 'Studio Photography'}
                </div>
              </div>

            </div>

          </div>
        );
      })()}

    </div>
  );
}
