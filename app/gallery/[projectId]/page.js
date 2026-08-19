"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { LockIcon, WhatsAppIcon, AlertTriangleIcon } from '@/components/StorageIcons.jsx';

/**
 * 4 gallery themes a vendor can pick for their client gallery.
 */
const THEMES = {
    default: {
        label: 'Tema Default Gallery',
        blurb: 'Gelap bawaan asli, aksen indigo & rapi',
        bg: '#09090b',
        surface: 'rgba(255,255,255,0.03)',
        surfaceSolid: '#18181b',
        text: '#f4f4f5',
        textMuted: '#a1a1aa',
        accent: '#6366f1',
        accentContrast: '#ffffff',
        accent2: '#818cf8',
        danger: '#ef4444',
        radius: '12px',
        fontDisplay: "system-ui, -apple-system, sans-serif",
        fontBody: "system-ui, -apple-system, sans-serif",
        fontMono: "ui-monospace, monospace",
        cardBorder: 'rgba(255,255,255,0.08)',
        grid: 'masonry',
    },
    midnightSlate: {
        label: 'Midnight Slate (Trial Dark)',
        blurb: 'Gelap modern, aksen slate & neon indigo ala Galeri Trial',
        bg: '#0f172a',
        surface: 'rgba(255,255,255,0.03)',
        surfaceSolid: '#1e293b',
        text: '#f8fafc',
        textMuted: '#94a3b8',
        accent: '#6366f1',
        accentContrast: '#ffffff',
        accent2: '#818cf8',
        danger: '#ef4444',
        radius: '14px',
        fontDisplay: "system-ui, -apple-system, sans-serif",
        fontBody: "system-ui, -apple-system, sans-serif",
        fontMono: "ui-monospace, monospace",
        cardBorder: 'rgba(255,255,255,0.1)',
        grid: 'masonry',
    },
    contactSheet: {
        label: 'Kontak Studio',
        blurb: 'Gelap retro, ala lembar kontak fotografer profesional',
        bg: '#0b0b0f',
        surface: 'rgba(255,255,255,0.04)',
        surfaceSolid: '#16161b',
        text: '#e4e4e7',
        textMuted: '#a1a1aa',
        accent: '#fbbf24',
        accentContrast: '#1a1408',
        accent2: '#6366f1',
        danger: '#ef4444',
        radius: '10px',
        fontDisplay: "'Helvetica Neue', Arial, sans-serif",
        fontBody: "system-ui, -apple-system, sans-serif",
        fontMono: "ui-monospace, SFMono-Regular, Menlo, monospace",
        cardBorder: 'rgba(255,255,255,0.08)',
        grid: 'masonry',
    },
    galleryWall: {
        label: 'Galeri Putih',
        blurb: 'Terang, tenang, seperti cetakan terpajang di galeri seni',
        bg: '#f3f2ee',
        surface: '#ffffff',
        surfaceSolid: '#ffffff',
        text: '#1c1c1e',
        textMuted: '#6b6b66',
        accent: '#2f4d3a',
        accentContrast: '#ffffff',
        accent2: '#2f4d3a',
        danger: '#a13d3d',
        radius: '2px',
        fontDisplay: "Georgia, 'Times New Roman', serif",
        fontBody: "'Helvetica Neue', Arial, sans-serif",
        fontMono: "Georgia, serif",
        cardBorder: 'rgba(0,0,0,0.12)',
        grid: 'masonry',
    },
    editorsMark: {
        label: 'Tanda Editor',
        blurb: 'Editorial tegas, coretan pilih ala meja redaksi',
        bg: '#fafafa',
        surface: '#ffffff',
        surfaceSolid: '#ffffff',
        text: '#111111',
        textMuted: '#555555',
        accent: '#dc2626',
        accentContrast: '#ffffff',
        accent2: '#111111',
        danger: '#111111',
        radius: '4px',
        fontDisplay: "'Arial Black', Arial, sans-serif",
        fontBody: "Arial, Helvetica, sans-serif",
        fontMono: "'Courier New', monospace",
        cardBorder: '#111111',
        grid: 'masonry',
    },
    polaroid: {
        label: 'Polaroid Kenangan',
        blurb: 'Hangat & santai, seperti foto instan di meja kerja',
        bg: '#f1e9dc',
        surface: '#fffdf8',
        surfaceSolid: '#fffdf8',
        text: '#3a2f28',
        textMuted: '#8a7a68',
        accent: '#b5697a',
        accentContrast: '#ffffff',
        accent2: '#c99a3c',
        danger: '#a13d3d',
        radius: '2px',
        fontDisplay: "'Bradley Hand', 'Segoe Script', cursive",
        fontBody: "'Segoe UI', sans-serif",
        fontMono: "'Bradley Hand', cursive",
        cardBorder: 'rgba(0,0,0,0.08)',
        grid: 'masonry',
    },
};

export default function ClientGalleryPage({ params }) {
    const { projectId } = params;
    const searchParams = useSearchParams();
    const clientKey = searchParams.get('key');

    const [project, setProject] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [branding, setBranding] = useState(null);

    const [activeLightboxIndex, setActiveLightboxIndex] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
    const [showSubmittedPreview, setShowSubmittedPreview] = useState(false);
    const [viewFilter, setViewFilter] = useState('all'); // 'all' or 'selected'
    const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' or specific folder category
    const [visibleLimit, setVisibleLimit] = useState(100);

    useEffect(() => {
        setVisibleLimit(100);
    }, [viewFilter, selectedCategory]);

    useEffect(() => {
        const handleScroll = () => {
            if ((window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 800)) {
                setVisibleLimit(prev => prev + 100);
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const [toasts, setToasts] = useState([]);
    const toastTimerRef = useRef(null);
    const addToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now();
        // Replace previous toast to prevent stacking/cluttering
        setToasts([{ id, message, type, duration }]);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => {
            setToasts([]);
        }, duration);
    }, []);

    const [themeKey, setThemeKey] = useState('default');
    const theme = THEMES[themeKey] || THEMES.default || THEMES.contactSheet;

    const fetchGallery = async () => {
        if (!clientKey) {
            setError('Access key is missing. Please use the link provided by your photographer.');
            setLoading(false);
            return;
        }
        try {
            const res = await fetch(`/api/projects/${projectId}?key=${clientKey}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to load gallery.');

            setProject(data.project);
            setBranding(data.vendorBranding || null);
            setPhotos(data.photos || []);
            
            const fetchedPhotos = data.photos || [];
            const hasSubfolders = fetchedPhotos.some(p => p.category && p.category !== 'Folder Utama');
            if (hasSubfolders) {
                const hasRootPhotos = fetchedPhotos.some(p => !p.category || p.category === 'Folder Utama');
                if (hasRootPhotos) {
                    setSelectedCategory('Folder Utama');
                } else {
                    const firstSub = fetchedPhotos.find(p => p.category && p.category !== 'Folder Utama')?.category;
                    if (firstSub) setSelectedCategory(firstSub);
                }
            }
            
            // Set dynamic theme based on project settings from database
            if (data.project && data.project.galleryTheme) {
                setThemeKey(data.project.galleryTheme);
            }

            const initialSelections = new Set();
            data.photos.forEach(p => { if (p.isSelected > 0) initialSelections.add(p.id); });
            setSelectedIds(initialSelections);

            if (data.project.status === 'completed') setSubmitted(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchGallery(); }, [projectId, clientKey]);

    const [draftStatus, setDraftStatus] = useState('saved'); // 'saved', 'saving', 'error'
    const draftTimerRef = useRef(null);
    const isInitialMount = useRef(true);

    // Auto-Save Cloud Draft di Latar Belakang (Debounced 800ms)
    useEffect(() => {
        if (loading) return;
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        if (submitted || !clientKey || project?.isProjectExpired) return;

        setDraftStatus('saving');
        if (draftTimerRef.current) clearTimeout(draftTimerRef.current);

        draftTimerRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/projects/${projectId}/select?key=${clientKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        photoIds: Array.from(selectedIds),
                        action: 'draft'
                    })
                });
                if (res.ok) {
                    setDraftStatus('saved');
                } else {
                    setDraftStatus('error');
                }
            } catch (e) {
                setDraftStatus('error');
            }
        }, 800);

        return () => {
            if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
        };
    }, [selectedIds, projectId, clientKey, submitted, project?.isProjectExpired, loading]);

    const maxSelection = project?.maxSelection || 0;

    const handleToggleSelect = (photoId) => {
        if (submitted || project?.isProjectExpired) return;
        
        // Prevent duplicate toasts by checking limit before state update
        if (!selectedIds.has(photoId) && maxSelection > 0 && selectedIds.size >= maxSelection) {
            addToast(`Batas maksimal pilihan foto adalah ${maxSelection}. Silakan hapus pilihan lainnya terlebih dahulu.`, 'warning', 3500);
            return;
        }

        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(photoId)) {
                next.delete(photoId);
            } else {
                next.add(photoId);
            }
            return next;
        });
    };

    const isAtLimit = maxSelection > 0 && selectedIds.size >= maxSelection;

    const handleSubmitSelection = () => {
        if (project?.isProjectExpired) { addToast('Project ini telah kedaluwarsa dan terkunci.', 'error', 3500); return; }
        if (selectedIds.size === 0) { addToast('Silakan pilih minimal satu foto sebelum mengirim.', 'warning', 3500); return; }
        setShowConfirmModal(true);
    };

    const handleConfirmAndSubmit = async () => {
        setShowConfirmModal(false);
        setSubmitting(true);
        if (draftTimerRef.current) clearTimeout(draftTimerRef.current);

        try {
            const res = await fetch(`/api/projects/${projectId}/select?key=${clientKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    photoIds: Array.from(selectedIds),
                    action: 'submit'
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Gagal mengirim pilihan.');
            setSubmitted(true);
            setDraftStatus('saved');
            setShowSuccessOverlay(true);
            addToast('✅ Pilihan foto berhasil dikirim dan terkunci!', 'success', 5000);
        } catch (err) {
            addToast(`❌ ${err.message}`, 'error', 4000);
        } finally {
            setSubmitting(false);
        }
    };

    const handlePrevImage = (e) => { e?.stopPropagation(); setActiveLightboxIndex(prev => (prev > 0 ? prev - 1 : photos.length - 1)); };
    const handleNextImage = (e) => { e?.stopPropagation(); setActiveLightboxIndex(prev => (prev < photos.length - 1 ? prev + 1 : 0)); };

    useEffect(() => {
        if (activeLightboxIndex === null) return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') setActiveLightboxIndex(null);
            if (e.key === 'ArrowLeft') handlePrevImage();
            if (e.key === 'ArrowRight') handleNextImage();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [activeLightboxIndex, photos.length]);

    const selectionOrder = useMemo(() => Array.from(selectedIds), [selectedIds]);
    const getPickNumber = (id) => selectionOrder.indexOf(id) + 1;
    const selectedPhotosList = useMemo(
        () => selectionOrder.map(id => photos.find(p => p.id === id)).filter(Boolean),
        [selectionOrder, photos]
    );

    const vars = {
        '--bg': theme.bg, '--surface': theme.surface, '--surface-solid': theme.surfaceSolid,
        '--text': theme.text, '--text-muted': theme.textMuted, '--accent': theme.accent,
        '--accent-contrast': theme.accentContrast, '--accent2': theme.accent2, '--danger': theme.danger,
        '--radius': theme.radius, '--font-display': theme.fontDisplay, '--font-body': theme.fontBody,
        '--font-mono': theme.fontMono, '--card-border': theme.cardBorder,
    };

    if (loading) {
        return (
            <div style={{ ...vars, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                <p>Memuat galeri...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ ...vars, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '16px', background: 'var(--bg)', fontFamily: 'var(--font-body)' }}>
                <div style={{ maxWidth: '450px', textAlign: 'center', background: 'var(--surface-solid)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius)', padding: '32px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', margin: '0 0 12px 0', color: 'var(--text)' }}>Access Denied</h3>
                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '14px', lineHeight: '1.5' }}>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`gtheme gtheme-${themeKey}`} style={{ ...vars, background: 'var(--bg)', minHeight: '100vh', paddingBottom: '150px', fontFamily: 'var(--font-body)', color: 'var(--text)' }}>

            {/* Glassmorphism Lock Overlay for Expired Vendor / Addon Storage Expiry */}
            {project?.isLocked && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 99999,
                    background: 'rgba(9, 9, 11, 0.85)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px'
                }}>
                    <div style={{
                        background: 'rgba(24, 24, 27, 0.95)',
                        border: '1.5px solid rgba(251, 191, 36, 0.4)',
                        borderRadius: '24px',
                        maxWidth: '480px',
                        width: '100%',
                        padding: '36px 28px',
                        textAlign: 'center',
                        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                            <LockIcon size={48} color="#fbbf24" />
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', padding: '4px 12px', borderRadius: '12px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                            AKSES GALERI DITANGGUHKAN
                        </span>
                        <h2 style={{ margin: '14px 0 10px 0', fontSize: '22px', fontWeight: '800', color: '#ffffff' }}>
                            GALERI TERKUNCI SEMENTARA
                        </h2>
                        <p style={{ fontSize: '13px', color: '#d4d4d8', lineHeight: '1.6', margin: '0 0 20px 0' }}>
                            {project.lockReason || 'Masa simpan cloud galeri foto ini sedang ditangguhkan. Foto Anda tersimpan aman. Silakan hubungi Studio Fotografer Anda untuk mengaktifkan kembali akses galeri.'}
                        </p>
                        {branding && (branding.brandName || branding.whatsapp) && (
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px', fontSize: '12px', color: '#a1a1aa', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div>Studio Fotografi: <strong style={{ color: '#ffffff' }}>{branding.brandName || 'Studio Vendor'}</strong></div>
                                {branding.whatsapp && (
                                    <a
                                        href={`https://wa.me/${branding.whatsapp.replace(/[^0-9]/g, '')}?text=Halo%20${encodeURIComponent(branding.brandName || '')},%20akses%20galeri%20proyek%20${encodeURIComponent(project.name)}%20saat%20ini%20terkunci.%20Mohon%20bantuannya.`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '10px', padding: '8px 16px', background: '#22c55e', color: '#ffffff', textDecoration: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '12px' }}
                                    >
                                        <WhatsAppIcon size={14} />
                                        <span>Hubungi Studio Via WhatsApp</span>
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {branding && (branding.brandName || branding.brandLogo) && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', paddingTop: '64px', marginBottom: '8px' }}>
                    {branding.brandLogo && <img src={branding.brandLogo} alt="Brand Logo" style={{ maxHeight: '55px', maxWidth: '140px', objectFit: 'contain' }} />}
                    {branding.brandName && <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{branding.brandName}</span>}
                </div>
            )}

            <div style={{ textAlign: 'center', marginTop: branding ? '12px' : '64px', marginBottom: '24px' }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '38px', margin: '0 0 8px 0', fontWeight: themeKey === 'polaroid' ? 400 : 700, color: 'var(--text)' }}>{project.name}</h1>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '14px' }}>
                    {submitted ? 'Selection completed' : project.isProjectExpired ? 'Galeri ini sudah kedaluwarsa (Locked)' : maxSelection > 0 ? `Pilih maksimal ${maxSelection} foto favorit Anda` : 'Pilih foto favorit Anda lalu kirim di bawah'}
                </p>
            </div>

            {/* Sub-Folder Category Tabs (If photos are categorized into sub-folders) */}
            {(() => {
                const subfolders = Array.from(new Set(photos.map(p => p.category).filter(c => c && c !== 'Folder Utama')));
                if (subfolders.length === 0) return null;

                const rootPhotosCount = photos.filter(p => !p.category || p.category === 'Folder Utama').length;

                return (
                    <div className="category-tabs-container">
                        <div className="category-tabs-scroll">
                            {rootPhotosCount > 0 && (
                                <button
                                    type="button"
                                    className={`category-tab ${selectedCategory === 'Folder Utama' ? 'is-active' : ''}`}
                                    onClick={() => setSelectedCategory('Folder Utama')}
                                >
                                    <span className="category-tab-label">Folder Utama</span>
                                    <span className="category-tab-count">{rootPhotosCount}</span>
                                </button>
                            )}

                            {subfolders.map(cat => {
                                const catCount = photos.filter(p => p.category === cat).length;
                                const displayCat = cat.replace(/\\u0026/g, '&').replace(/\\u([0-9a-fA-F]{4})/g, (m, hex) => String.fromCharCode(parseInt(hex, 16))).replace(/\\+$/g, '').replace(/\\+/g, '').trim();
                                return (
                                    <button
                                        key={cat}
                                        type="button"
                                        className={`category-tab ${selectedCategory === cat ? 'is-active' : ''}`}
                                        onClick={() => setSelectedCategory(cat)}
                                    >
                                        <span className="category-tab-label">{displayCat}</span>
                                        <span className="category-tab-count">{catCount}</span>
                                    </button>
                                );
                            })}

                            <button
                                type="button"
                                className={`category-tab ${selectedCategory === 'all' ? 'is-active' : ''}`}
                                onClick={() => setSelectedCategory('all')}
                            >
                                <span className="category-tab-label">Semua Foto</span>
                                <span className="category-tab-count">{photos.length}</span>
                            </button>
                        </div>
                    </div>
                );
            })()}

            {project.isProjectExpired && (
                <div style={{ background: 'color-mix(in srgb, var(--danger) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)', color: 'var(--danger)', padding: '14px 20px', borderRadius: 'var(--radius)', marginBottom: '32px', fontSize: '14px', maxWidth: '600px', margin: '0 auto 32px auto', lineHeight: '1.5' }}>
                    <strong>Galeri Terkunci!</strong> Batas waktu pemilihan foto telah berakhir pada {new Date(project.expiresAt).toLocaleDateString()}.
                </div>
            )}

            {project.filesDeleted === 1 ? (
                <div style={{ maxWidth: '650px', margin: '40px auto', padding: '32px', textAlign: 'center', background: 'var(--surface-solid)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius)' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', margin: '0 0 8px 0' }}>Pemilihan Foto Selesai / Kedaluwarsa</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6' }}>File fisik telah dihapus dari server. Berikut daftar nama file yang Anda pilih:</p>
                    <ol style={{ textAlign: 'left', fontSize: '13px', color: 'var(--text)' }}>
                        {selectedPhotosList.map(p => <li key={p.id}>{p.originalPath.split('/').pop()}</li>)}
                    </ol>
                </div>
            ) : (
                <>
                    {(() => {
                        let displayedPhotos = viewFilter === 'selected' ? photos.filter(p => selectedIds.has(p.id)) : photos;
                        if (selectedCategory !== 'all') {
                            if (selectedCategory === 'Folder Utama') {
                                displayedPhotos = displayedPhotos.filter(p => !p.category || p.category === 'Folder Utama');
                            } else {
                                displayedPhotos = displayedPhotos.filter(p => p.category === selectedCategory);
                            }
                        }
                        
                        if (displayedPhotos.length === 0) {
                            return (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '48px 20px', background: 'var(--surface-solid)', borderRadius: 'var(--radius)', border: '1px solid var(--card-border)', maxWidth: '480px', margin: '20px auto' }}>
                                    <p style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 6px 0', color: 'var(--text)' }}>{viewFilter === 'selected' ? 'Belum Ada Foto Dipilih' : 'Tidak Ada Foto'}</p>
                                    <p style={{ fontSize: '13px', margin: 0 }}>{viewFilter === 'selected' ? 'Klik foto di galeri untuk memilih foto favorit Anda.' : 'Tidak ada foto dalam kategori ini.'}</p>
                                    <button className="btn-secondary-t" style={{ marginTop: '16px', fontSize: '12px', padding: '8px 16px' }} onClick={() => { setViewFilter('all'); setSelectedCategory('all'); }}>Lihat Semua Foto</button>
                                </div>
                            );
                        }

                        const sliceToRender = displayedPhotos.slice(0, visibleLimit);

                        return (
                            <>
                                <div className={`photo-grid grid-${theme.grid}`}>
                                    {sliceToRender.map((photo, index) => {
                                        const originalIndex = photos.findIndex(p => p.id === photo.id);
                                        const isSelected = selectedIds.has(photo.id);
                                        const pickNumber = isSelected ? getPickNumber(photo.id) : null;
                                        const num = ((originalIndex >= 0 ? originalIndex : index) + 1).toString().padStart(3, '0');

                                        return (
                                            <div key={photo.id} className={`photo-card ${isSelected ? 'is-selected' : ''}`} onClick={() => handleToggleSelect(photo.id)}>
                                                <div className="photo-card-frame">
                                                    <img src={photo.thumbnailPath} alt={`Frame ${index + 1}`} loading="lazy" decoding="async" />

                                                    {themeKey === 'contactSheet' && (
                                                        <>
                                                            <span className="corner corner-tl" /><span className="corner corner-tr" />
                                                            <span className="corner corner-bl" /><span className="corner corner-br" />
                                                            <span className="cs-frame-number">N°{num}</span>
                                                            {isSelected && <span className="cs-pick-badge">{pickNumber}</span>}
                                                        </>
                                                    )}

                                                    {themeKey === 'editorsMark' && (
                                                        <>
                                                            <span className="em-number">{num}</span>
                                                            {isSelected && <span className="em-circle" />}
                                                            {isSelected && <span className="em-stamp">PILIH</span>}
                                                        </>
                                                    )}

                                                    {themeKey === 'galleryWall' && isSelected && <span className="gw-seal">✓</span>}
                                                    {themeKey === 'default' && isSelected && <span className="default-seal">✓</span>}

                                                    {themeKey === 'polaroid' && <span className="pl-pin" />}

                                                    <button className="preview-btn" onClick={(e) => { e.stopPropagation(); setActiveLightboxIndex(originalIndex >= 0 ? originalIndex : index); }} aria-label="Perbesar foto" title="Perbesar">⤢</button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {displayedPhotos.length > visibleLimit && (
                                    <div style={{ textAlign: 'center', margin: '32px 0 16px 0' }}>
                                        <button 
                                            className="btn-secondary-t" 
                                            style={{ padding: '10px 24px', fontSize: '13px', borderRadius: '20px', background: 'var(--surface-solid)', color: 'var(--text)', border: '1px solid var(--card-border)', cursor: 'pointer' }}
                                            onClick={() => setVisibleLimit(prev => prev + 60)}
                                        >
                                            Muat Lebih Banyak Foto ({visibleLimit} dari {displayedPhotos.length})
                                        </button>
                                    </div>
                                )}
                            </>
                        );
                    })()}

                    <div className="action-tray">
                        <div className="action-tray-inner">
                            <div className="action-tray-head">
                                <div className="action-tray-info">
                                    <div className="action-tray-counter">
                                        <span className="counter-current">{selectedIds.size}</span>
                                        {maxSelection > 0 && <span className="counter-separator">/</span>}
                                        {maxSelection > 0 && <span className="counter-max">{maxSelection}</span>}
                                    </div>
                                    <div className="action-tray-meta">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                            <span className="action-tray-label">Foto Dipilih</span>
                                            {!submitted && !project.isProjectExpired && (
                                                <span style={{ 
                                                    fontSize: '10px', 
                                                    padding: '2px 7px', 
                                                    borderRadius: '10px', 
                                                    background: draftStatus === 'saving' ? 'rgba(251,191,36,0.15)' : draftStatus === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(52,211,153,0.15)',
                                                    color: draftStatus === 'saving' ? '#fbbf24' : draftStatus === 'error' ? '#f87171' : '#34d399',
                                                    fontWeight: '600',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '3px'
                                                }}>
                                                    {draftStatus === 'saving' ? '💾 Menyimpan...' : draftStatus === 'error' ? '⚠️ Belum tersinkron' : '✓ Draft aman'}
                                                </span>
                                            )}
                                        </div>
                                        <span className="action-tray-hint">{submitted ? 'Pilihan terkunci' : project.isProjectExpired ? 'Kedaluwarsa' : isAtLimit ? 'Batas tercapai!' : 'Klik foto untuk memilih / batal'}</span>
                                    </div>
                                </div>
                                <div className="action-tray-actions">
                                    {selectedIds.size > 0 && (
                                        <button
                                            type="button"
                                            className="tray-btn tray-btn-ghost"
                                            onClick={() => setViewFilter(viewFilter === 'selected' ? 'all' : 'selected')}
                                        >
                                            {viewFilter === 'selected' ? 'Semua' : `Pilihan (${selectedIds.size})`}
                                        </button>
                                    )}
                                    
                                    {submitted ? (
                                        <div className="tray-status tray-status-done">✓ Final</div>
                                    ) : project.isProjectExpired ? (
                                        <div className="tray-status tray-status-locked" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <LockIcon size={12} color="#f87171" />
                                        </div>
                                    ) : (
                                        <button className="tray-btn tray-btn-submit" onClick={handleSubmitSelection} disabled={submitting || selectedIds.size === 0}>
                                            {submitting ? (
                                                <><span className="tray-spinner" /> Mengirim...</>
                                            ) : 'Kirim Pilihan'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {selectedPhotosList.length > 0 && (
                                <div className="filmstrip">
                                    {selectedPhotosList.map((p, i) => (
                                        <div key={p.id} className="filmstrip-thumb">
                                            <img src={p.thumbnailPath} alt={`Pilihan ${i + 1}`} />
                                            <span className="filmstrip-index">{i + 1}</span>
                                            {!submitted && !project.isProjectExpired && (
                                                <button className="filmstrip-remove" onClick={() => handleToggleSelect(p.id)} aria-label="Batal pilih">&times;</button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {showSuccessOverlay && (
                <div className="modal-overlay-t" style={{ zIndex: 1100 }}>
                    <div className="modal-content-t" style={{ textAlign: 'center', maxWidth: '440px', padding: '32px 28px' }}>
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            background: 'rgba(16,185,129,0.15)',
                            border: '1px solid rgba(16,185,129,0.3)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '16px',
                            fontSize: '24px'
                        }}>
                            ✓
                        </div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', margin: '0 0 10px 0', color: 'var(--text)' }}>Pilihan Berhasil Dikirim!</h3>
                        <p style={{ color: 'var(--text-muted)', margin: '0 0 24px 0', fontSize: '13.5px', lineHeight: '1.6' }}>
                            Pilihan <strong>{selectedIds.size} foto</strong> Anda telah berhasil dikunci dan diteruskan ke <strong>{branding?.brandName || 'Studio Fotografer'}</strong>.
                        </p>

                        {branding?.whatsapp && (
                            <a
                                href={`https://api.whatsapp.com/send?phone=${branding.whatsapp.replace(/\D/g, '').startsWith('0') ? '62' + branding.whatsapp.replace(/\D/g, '').slice(1) : branding.whatsapp.replace(/\D/g, '')}&text=${encodeURIComponent(`Halo ${branding.brandName || 'Studio'}, saya telah selesai memilih ${selectedIds.size} foto untuk project *${project.name}*. Mohon segera diproses ya. Terima kasih! 🙏`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary-t"
                                style={{ 
                                    width: '100%', 
                                    marginBottom: '12px', 
                                    background: 'linear-gradient(135deg, #10b981, #059669)', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    gap: '8px', 
                                    color: '#ffffff', 
                                    textDecoration: 'none', 
                                    padding: '13px 20px', 
                                    borderRadius: '10px', 
                                    fontWeight: '700',
                                    fontSize: '14px',
                                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                                    boxSizing: 'border-box'
                                }}
                            >
                                <WhatsAppIcon size={18} color="#ffffff" />
                                <span>Konfirmasi ke WhatsApp Studio</span>
                            </a>
                        )}

                        <button className="btn-primary-t" style={{ width: '100%', marginBottom: '10px', boxSizing: 'border-box' }} onClick={() => { setShowSuccessOverlay(false); setShowSubmittedPreview(true); }}>Lihat Foto yang Sudah Dikirim</button>
                        <button className="btn-secondary-t" style={{ width: '100%', boxSizing: 'border-box' }} onClick={() => setShowSuccessOverlay(false)}>Tutup</button>
                    </div>
                </div>
            )}

            {activeLightboxIndex !== null && (
                <div className="modal-overlay-t" style={{ background: 'rgba(0,0,0,0.96)', zIndex: 1200, padding: 0 }} onClick={() => setActiveLightboxIndex(null)}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)', zIndex: 10 }} onClick={e => e.stopPropagation()}>
                        <span style={{ fontSize: '13px', color: '#e4e4e7', fontFamily: 'var(--font-mono)' }}>
                            N°{(activeLightboxIndex + 1).toString().padStart(3, '0')} / {photos.length.toString().padStart(3, '0')} — {photos[activeLightboxIndex].originalPath.split('/').pop()}
                        </span>
                        <button onClick={() => setActiveLightboxIndex(null)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', position: 'relative' }}>
                        <button onClick={handlePrevImage} className="lightbox-nav lightbox-nav-left">&#10094;</button>
                        <div style={{ position: 'relative', display: 'inline-flex', overflow: 'hidden', borderRadius: '12px' }} onClick={e => e.stopPropagation()}>
                            <img src={photos[activeLightboxIndex].originalPath} alt="Preview" style={{ maxHeight: '74vh', maxWidth: '85vw', objectFit: 'contain', userSelect: 'none', display: 'block' }} />
                            
                            {/* SLEEK SMOOTH BLACK GRADIENT BRANDING OVERLAY (100% DEAD CENTER VERTICAL STACK) */}
                            <div style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)',
                                pointerEvents: 'none',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                padding: '24px 16px 18px 16px',
                                borderBottomLeftRadius: '12px',
                                borderBottomRightRadius: '12px'
                            }}>
                                {branding?.brandLogo ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', pointerEvents: 'auto' }}>
                                        <img src={branding.brandLogo} alt={branding.brandName || 'Studio Logo'} style={{ height: '36px', maxWidth: '180px', objectFit: 'contain', display: 'block', margin: '0 auto', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.9))' }} />
                                    </div>
                                ) : (
                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '800', margin: '0 auto', pointerEvents: 'auto' }}>
                                        {(branding?.brandName || project?.name || 'S').charAt(0)}
                                    </div>
                                )}
                                <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: '800', letterSpacing: '0.5px', textAlign: 'center', textShadow: '0 2px 8px rgba(0,0,0,0.9)', width: '100%', margin: 0, pointerEvents: 'auto' }}>
                                    {branding?.brandName || project?.name || 'STUDIO PHOTOGRAPHY'}
                                </div>
                            </div>
                        </div>
                        <button onClick={handleNextImage} className="lightbox-nav lightbox-nav-right">&#10095;</button>
                    </div>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)', zIndex: 10 }} onClick={e => e.stopPropagation()}>
                        {photos.length > 1 && (
                            <div className="lightbox-filmstrip">
                                {photos.map((p, i) => (
                                    <button key={p.id} className={`lightbox-filmstrip-thumb ${i === activeLightboxIndex ? 'is-active' : ''} ${selectedIds.has(p.id) ? 'is-selected' : ''}`} onClick={() => setActiveLightboxIndex(i)}>
                                        <img src={p.thumbnailPath} alt={`Frame ${i + 1}`} />
                                    </button>
                                ))}
                            </div>
                        )}
                        <button className="btn-primary-t" style={{ background: selectedIds.has(photos[activeLightboxIndex].id) ? 'var(--danger)' : 'var(--accent2)', color: selectedIds.has(photos[activeLightboxIndex].id) ? '#fff' : 'var(--accent-contrast)' }}
                            onClick={() => handleToggleSelect(photos[activeLightboxIndex].id)}
                            disabled={submitted || project.isProjectExpired || (isAtLimit && !selectedIds.has(photos[activeLightboxIndex].id))}>
                            {selectedIds.has(photos[activeLightboxIndex].id) ? 'Deselect Photo' : isAtLimit ? `Batas ${maxSelection} Tercapai` : 'Select Photo'}
                        </button>
                    </div>
                </div>
            )}

            {showConfirmModal && (
                <div className="modal-overlay-t" style={{ zIndex: 1300 }}>
                    <div className="modal-content-t" style={{ maxWidth: '520px', width: '90%' }}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', margin: '0 0 8px 0' }}>Konfirmasi Pilihan Anda</h3>
                            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '13px', lineHeight: '1.5' }}>
                                Periksa kembali foto pilihan Anda. <strong style={{ color: 'var(--accent)' }}>Setelah dikirim, pilihan tidak dapat diubah lagi.</strong>
                            </p>
                        </div>
                        <div className="confirm-thumb-grid">
                            {selectedPhotosList.map((p, i) => (
                                <div key={p.id} className="confirm-thumb">
                                    <img src={p.thumbnailPath} alt="Thumbnail" />
                                    <span className="confirm-thumb-index">{i + 1}</span>
                                    <button className="confirm-thumb-remove" onClick={(e) => { e.stopPropagation(); handleToggleSelect(p.id); }}>&times;</button>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button className="btn-secondary-t" style={{ flex: 1 }} onClick={() => setShowConfirmModal(false)}>← Kembali Memilih</button>
                            <button className="btn-primary-t" style={{ flex: 1.5 }} disabled={selectedIds.size === 0 || submitting} onClick={handleConfirmAndSubmit}>
                                {submitting ? 'Mengirim...' : 'Kirim ke Vendor'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSubmittedPreview && (
                <div className="modal-overlay-t" style={{ zIndex: 1300 }}>
                    <div className="modal-content-t" style={{ maxWidth: '520px', width: '90%' }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', margin: '0 0 16px 0', textAlign: 'center' }}>Foto yang Sudah Dikirim</h3>
                        <div className="confirm-thumb-grid">
                            {selectedPhotosList.map((p, i) => (
                                <div key={p.id} className="confirm-thumb">
                                    <img src={p.thumbnailPath} alt="Thumbnail" />
                                    <span className="confirm-thumb-index">{i + 1}</span>
                                </div>
                            ))}
                        </div>
                        <button className="btn-secondary-t" style={{ width: '100%', marginTop: '24px' }} onClick={() => setShowSubmittedPreview(false)}>Tutup</button>
                    </div>
                </div>
            )}

            {/* Toast Notifications */}
            <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '380px', width: '100%', pointerEvents: 'none' }}>
                {toasts.map(toast => {
                    const bgColor = toast.type === 'success' ? 'rgba(16,185,129,0.15)' :
                                    toast.type === 'error' ? 'rgba(239,68,68,0.15)' :
                                    toast.type === 'warning' ? 'rgba(251,191,36,0.15)' :
                                    'rgba(99,102,241,0.15)';
                    const borderColor = toast.type === 'success' ? 'rgba(16,185,129,0.3)' :
                                       toast.type === 'error' ? 'rgba(239,68,68,0.3)' :
                                       toast.type === 'warning' ? 'rgba(251,191,36,0.3)' :
                                       'rgba(99,102,241,0.3)';
                    const textColor = toast.type === 'success' ? '#34d399' :
                                     toast.type === 'error' ? '#f87171' :
                                     toast.type === 'warning' ? '#fbbf24' :
                                     '#a5b4fc';
                    return (
                        <div key={toast.id} className="toast-t" style={{
                            background: bgColor,
                            border: `1px solid ${borderColor}`,
                            borderRadius: '12px',
                            padding: '14px 18px 10px 18px',
                            color: textColor,
                            fontSize: '14px',
                            fontWeight: '500',
                            lineHeight: '1.5',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                            pointerEvents: 'auto',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <div style={{ flex: 1 }}>{toast.message}</div>
                                <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="toast-close" style={{ color: textColor }}>&times;</button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <style jsx>{`
                /* ── Highly Responsive Compact Grid Layouts ── */
                .photo-grid { padding: 0 16px 20px; }

                .grid-wall { 
                    display: grid; 
                    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); 
                    gap: 12px 10px; 
                    max-width: 1400px; 
                    margin: 0 auto; 
                }

                .grid-masonry { column-count: 6; column-gap: 12px; max-width: 1400px; margin: 0 auto; }
                @media (max-width: 1200px) { .grid-masonry { column-count: 5; } }
                @media (max-width: 900px) { .grid-masonry { column-count: 4; } }

                /* 📱 MOBILE VIEW (< 640px): 3 PHOTOS PER ROW */
                @media (max-width: 640px) {
                    .photo-grid { padding: 0 6px 16px; }
                    .grid-wall { 
                        grid-template-columns: repeat(3, 1fr) !important; 
                        gap: 6px !important; 
                    }
                    .grid-masonry { 
                        column-count: 3 !important; 
                        column-gap: 6px !important; 
                    }
                    .grid-masonry .photo-card { margin-bottom: 6px !important; }
                    .grid-wall .photo-card-frame { padding: 4px !important; border-radius: 6px !important; }
                }

                .grid-scatter { display: flex; flex-wrap: wrap; gap: 16px 12px; justify-content: center; max-width: 1400px; margin: 0 auto; }

                .photo-card { cursor: pointer; }
                .grid-masonry .photo-card { break-inside: avoid; margin-bottom: 12px; }
                .grid-scatter .photo-card { width: 130px; }
                .grid-scatter .photo-card:nth-child(odd) { transform: rotate(-2deg); }
                .grid-scatter .photo-card:nth-child(even) { transform: rotate(1.5deg); }
                .grid-scatter .photo-card:hover { transform: rotate(0deg) scale(1.03); }

                .photo-card-frame { position: relative; overflow: hidden; }
                .grid-masonry .photo-card-frame { border-radius: 8px; border: 1px solid var(--card-border); background: var(--surface-solid); transition: transform 0.2s ease, box-shadow 0.2s ease; }
                .grid-masonry .photo-card:hover .photo-card-frame { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.3); }
                .grid-masonry .photo-card.is-selected .photo-card-frame { box-shadow: 0 0 0 2px var(--accent); }
                .photo-card-frame img { display: block; width: 100%; height: auto; }

                .grid-wall .photo-card-frame { background: var(--surface); padding: 5px; border-radius: 8px; border: 1px solid var(--card-border); box-shadow: 0 4px 12px rgba(0,0,0,0.06); transition: box-shadow 0.2s ease, transform 0.2s ease; }
                .grid-wall .photo-card:hover .photo-card-frame { transform: translateY(-2px); box-shadow: 0 8px 18px rgba(0,0,0,0.1); }
                .grid-wall .photo-card.is-selected .photo-card-frame { box-shadow: 0 0 0 2px var(--accent); }

                .grid-scatter .photo-card-frame { background: var(--surface); padding: 10px 10px 0; box-shadow: 0 6px 16px rgba(0,0,0,0.15); transition: box-shadow 0.2s ease; }
                .grid-scatter .photo-card.is-selected .photo-card-frame { box-shadow: 0 0 0 2px var(--accent), 0 6px 16px rgba(0,0,0,0.15); }

                /* Contact sheet signature */
                .corner { position: absolute; width: 16px; height: 16px; border: 2px solid var(--accent); opacity: 0; transform: scale(0.7); transition: opacity 0.2s ease, transform 0.2s ease; }
                .corner-tl { top: 8px; left: 8px; border-right: none; border-bottom: none; }
                .corner-tr { top: 8px; right: 8px; border-left: none; border-bottom: none; }
                .corner-bl { bottom: 8px; left: 8px; border-right: none; border-top: none; }
                .corner-br { bottom: 8px; right: 8px; border-left: none; border-top: none; }
                .photo-card:hover .corner, .photo-card.is-selected .corner { opacity: 1; transform: scale(1); }
                .cs-frame-number { position: absolute; bottom: 8px; left: 8px; font-family: var(--font-mono); font-size: 10px; color: rgba(255,255,255,0.6); background: rgba(0,0,0,0.45); padding: 2px 6px; border-radius: 4px; }
                .photo-card.is-selected .cs-frame-number { opacity: 0; }
                .cs-pick-badge { position: absolute; top: 8px; left: 8px; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 11px; background: var(--accent); color: var(--accent-contrast); font-size: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; }

                /* Editor's mark signature */
                .em-number { position: absolute; top: 8px; left: 8px; font-family: var(--font-display); font-size: 13px; font-weight: 900; color: #111; background: rgba(255,255,255,0.85); padding: 1px 7px; border-radius: 3px; }
                .em-circle { position: absolute; inset: 6px; border: 3px solid var(--accent); border-radius: 48% 52% 45% 55% / 55% 45% 55% 45%; transform: rotate(-3deg); pointer-events: none; }
                .em-stamp { position: absolute; bottom: 14px; right: -18px; transform: rotate(-18deg); font-family: var(--font-display); font-size: 13px; font-weight: 900; color: var(--accent); border: 2px solid var(--accent); padding: 2px 10px; border-radius: 3px; background: rgba(255,255,255,0.85); }

                /* Gallery wall signature */
                .gw-seal { position: absolute; top: 14px; right: 14px; width: 26px; height: 26px; border-radius: 50%; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; }
                .default-seal { position: absolute; top: 12px; right: 12px; width: 26px; height: 26px; border-radius: 50%; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; z-index: 2; box-shadow: 0 2px 6px rgba(0,0,0,0.3); }
                .gw-caption { text-align: center; font-family: var(--font-mono); font-size: 12px; color: var(--text-muted); padding: 8px 4px 0; letter-spacing: 0.03em; }

                /* Polaroid signature */
                .pl-pin { position: absolute; top: 6px; left: 50%; transform: translateX(-50%); width: 10px; height: 10px; border-radius: 50%; background: var(--accent2); box-shadow: 0 1px 2px rgba(0,0,0,0.3); }
                .pl-caption { text-align: center; font-family: var(--font-display); font-size: 15px; color: var(--text); padding: 8px 6px 12px; background: var(--surface); }

                .preview-btn { position: absolute; bottom: 8px; right: 8px; width: 26px; height: 26px; border-radius: 50%; background: rgba(0,0,0,0.5); color: white; border: 1px solid rgba(255,255,255,0.15); font-size: 12px; cursor: pointer; opacity: 0; transition: opacity 0.2s ease; display: flex; align-items: center; justify-content: center; }
                .photo-card:hover .preview-btn { opacity: 1; }

                /* ── Category Tabs ── */
                .category-tabs-container {
                    display: flex;
                    justify-content: center;
                    margin: 0 auto 28px auto;
                    max-width: 900px;
                    padding: 0 16px;
                }
                .category-tabs-scroll {
                    display: flex;
                    gap: 6px;
                    flex-wrap: wrap;
                    justify-content: center;
                    padding: 6px;
                    background: rgba(255,255,255,0.04);
                    border-radius: 16px;
                    border: 1px solid rgba(255,255,255,0.06);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                }
                .category-tab {
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    padding: 8px 16px;
                    border-radius: 12px;
                    border: 1px solid transparent;
                    background: transparent;
                    color: var(--text-muted);
                    font-size: 13px;
                    font-weight: 500;
                    font-family: var(--font-body);
                    cursor: pointer;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    white-space: nowrap;
                    position: relative;
                    overflow: hidden;
                }
                .category-tab::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: 12px;
                    opacity: 0;
                    background: radial-gradient(circle at center, rgba(255,255,255,0.08), transparent 70%);
                    transition: opacity 0.25s ease;
                }
                .category-tab:hover {
                    color: var(--text);
                    background: rgba(255,255,255,0.06);
                    border-color: rgba(255,255,255,0.08);
                }
                .category-tab:hover::before {
                    opacity: 1;
                }
                .category-tab.is-active {
                    background: var(--accent);
                    color: var(--accent-contrast);
                    border-color: transparent;
                    font-weight: 700;
                    box-shadow: 0 2px 12px color-mix(in srgb, var(--accent) 35%, transparent),
                                0 0 0 1px color-mix(in srgb, var(--accent) 20%, transparent);
                    transform: scale(1.02);
                }
                .category-tab.is-active::before { opacity: 0; }
                .category-tab:active {
                    transform: scale(0.97);
                }
                .category-tab-label {
                    line-height: 1;
                }
                .category-tab-count {
                    font-size: 11px;
                    font-weight: 700;
                    min-width: 20px;
                    height: 20px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 10px;
                    padding: 0 6px;
                    background: rgba(255,255,255,0.1);
                    line-height: 1;
                }
                .category-tab.is-active .category-tab-count {
                    background: rgba(255,255,255,0.2);
                }

                /* ── Buttons ── */
                :global(.btn-primary-t) { font-family: var(--font-body); background: var(--accent); color: var(--accent-contrast); border: none; padding: 10px 20px; border-radius: var(--radius); font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s ease; }
                :global(.btn-primary-t:hover) { filter: brightness(1.1); transform: translateY(-1px); }
                :global(.btn-primary-t:active) { transform: translateY(0) scale(0.98); }
                :global(.btn-primary-t:disabled) { opacity: 0.5; cursor: not-allowed; transform: none; filter: none; }
                :global(.btn-secondary-t) { font-family: var(--font-body); background: transparent; color: var(--text); border: 1px solid var(--card-border); padding: 10px 20px; border-radius: var(--radius); font-size: 14px; cursor: pointer; transition: all 0.2s ease; }
                :global(.btn-secondary-t:hover) { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.15); }

                /* ── Action tray ── */
                .action-tray { 
                    position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); 
                    width: 92%; max-width: 540px; z-index: 900; 
                }
                .action-tray-inner { 
                    background: color-mix(in srgb, var(--surface-solid) 85%, transparent); 
                    backdrop-filter: blur(20px) saturate(1.4); 
                    -webkit-backdrop-filter: blur(20px) saturate(1.4);
                    border: 1px solid rgba(255,255,255,0.1); 
                    border-radius: 18px; 
                    padding: 12px 16px; 
                    box-shadow: 0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2);
                    transition: box-shadow 0.3s ease;
                }
                .action-tray-inner:hover {
                    box-shadow: 0 12px 40px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.25);
                }
                .action-tray-head { 
                    display: flex; justify-content: space-between; align-items: center; gap: 12px; 
                }
                .action-tray-info {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .action-tray-counter {
                    display: flex;
                    align-items: baseline;
                    gap: 2px;
                    font-family: var(--font-display);
                    line-height: 1;
                }
                .counter-current {
                    font-size: 24px;
                    font-weight: 800;
                    color: var(--accent);
                    letter-spacing: -0.02em;
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .counter-separator {
                    font-size: 16px;
                    font-weight: 400;
                    color: var(--text-muted);
                    margin: 0 1px;
                    opacity: 0.5;
                }
                .counter-max {
                    font-size: 16px;
                    font-weight: 600;
                    color: var(--text-muted);
                }
                .action-tray-meta {
                    display: flex;
                    flex-direction: column;
                    gap: 1px;
                }
                .action-tray-label {
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--text);
                    line-height: 1.2;
                }
                .action-tray-hint {
                    font-size: 11px;
                    color: var(--text-muted);
                    line-height: 1.2;
                }
                .action-tray-actions {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .tray-btn {
                    font-family: var(--font-body);
                    border: none;
                    border-radius: 10px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    white-space: nowrap;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                }
                .tray-btn-ghost {
                    padding: 7px 14px;
                    background: rgba(255,255,255,0.06);
                    color: var(--text-muted);
                    border: 1px solid rgba(255,255,255,0.08);
                }
                .tray-btn-ghost:hover {
                    background: rgba(255,255,255,0.1);
                    color: var(--text);
                    border-color: rgba(255,255,255,0.15);
                }
                .tray-btn-submit {
                    padding: 8px 20px;
                    background: var(--accent);
                    color: var(--accent-contrast);
                    box-shadow: 0 2px 10px color-mix(in srgb, var(--accent) 30%, transparent);
                }
                .tray-btn-submit:hover {
                    filter: brightness(1.1);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 16px color-mix(in srgb, var(--accent) 40%, transparent);
                }
                .tray-btn-submit:active {
                    transform: translateY(0) scale(0.97);
                }
                .tray-btn-submit:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                    transform: none;
                    filter: none;
                    box-shadow: none;
                }
                .tray-status {
                    font-size: 13px;
                    font-weight: 700;
                    padding: 6px 14px;
                    border-radius: 10px;
                }
                .tray-status-done {
                    color: var(--accent);
                    background: color-mix(in srgb, var(--accent) 12%, transparent);
                    border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
                }
                .tray-status-locked {
                    color: var(--danger);
                    background: color-mix(in srgb, var(--danger) 12%, transparent);
                }
                .tray-spinner {
                    display: inline-block;
                    width: 14px;
                    height: 14px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: var(--accent-contrast);
                    border-radius: 50%;
                    animation: tray-spin 0.6s linear infinite;
                }
                @keyframes tray-spin {
                    to { transform: rotate(360deg); }
                }

                .filmstrip { display: flex; gap: 6px; overflow-x: auto; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.06); }
                .filmstrip-thumb { position: relative; flex: 0 0 auto; width: 40px; height: 40px; border-radius: 8px; overflow: hidden; border: 1.5px solid var(--accent); transition: transform 0.2s ease; }
                .filmstrip-thumb:hover { transform: scale(1.08); }
                .filmstrip-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
                .filmstrip-index { position: absolute; top: 2px; left: 2px; font-size: 9px; font-weight: 700; background: rgba(0,0,0,0.65); color: var(--accent); padding: 0 4px; border-radius: 4px; }
                .filmstrip-remove { position: absolute; top: -3px; right: -3px; width: 15px; height: 15px; border-radius: 50%; background: var(--danger); color: white; border: none; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.15s ease; }
                .filmstrip-remove:hover { transform: scale(1.2); }

                @media (max-width: 640px) {
                    .category-tabs-scroll { gap: 4px; padding: 4px; }
                    .category-tab { padding: 6px 12px; font-size: 12px; border-radius: 10px; }
                    .category-tab-count { font-size: 10px; min-width: 18px; height: 18px; }
                    .action-tray { width: 96%; bottom: 12px; }
                    .action-tray-inner { padding: 10px 12px; border-radius: 14px; }
                    .counter-current { font-size: 20px; }
                    .counter-max { font-size: 14px; }
                    .action-tray-label { font-size: 12px; }
                    .action-tray-hint { font-size: 10px; }
                    .tray-btn { font-size: 12px; }
                    .tray-btn-ghost { padding: 6px 10px; }
                    .tray-btn-submit { padding: 7px 14px; }
                }

                /* ── Modals ── */
                :global(.modal-overlay-t) { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; padding: 20px; }
                :global(.modal-content-t) { background: var(--surface-solid); border: 1px solid var(--card-border); border-radius: var(--radius); padding: 28px; color: var(--text); font-family: var(--font-body); }
                .confirm-thumb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 12px; background: rgba(0,0,0,0.04); border: 1px solid var(--card-border); border-radius: var(--radius); padding: 16px; max-height: 260px; overflow-y: auto; }
                .confirm-thumb { position: relative; aspect-ratio: 1/1; border-radius: 6px; overflow: hidden; border: 1px solid var(--card-border); }
                .confirm-thumb img { width: 100%; height: 100%; object-fit: cover; }
                .confirm-thumb-index { position: absolute; bottom: 4px; left: 4px; font-size: 10px; font-weight: 700; background: rgba(0,0,0,0.6); color: var(--accent); padding: 1px 5px; border-radius: 4px; }
                .confirm-thumb-remove { position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; border-radius: 50%; background: var(--danger); color: white; border: none; font-size: 12px; cursor: pointer; }

                /* ── Lightbox ── */
                :global(.lightbox-nav) { position: fixed; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.12); color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 50%; width: 52px; height: 52px; font-size: 24px; cursor: pointer; z-index: 100001; backdrop-filter: blur(12px); display: flex; alignItems: center; justifyContent: center; transition: all 0.2s ease; }
                :global(.lightbox-nav-left) { left: 24px; }
                :global(.lightbox-nav-right) { right: 24px; }
                :global(.lightbox-filmstrip) { display: flex; gap: 6px; max-width: 90vw; overflow-x: auto; padding: 4px; }
                :global(.lightbox-filmstrip-thumb) { flex: 0 0 auto; width: 46px; height: 46px; border-radius: 5px; overflow: hidden; border: 2px solid transparent; opacity: 0.5; background: none; padding: 0; cursor: pointer; }
                :global(.lightbox-filmstrip-thumb img) { width: 100%; height: 100%; object-fit: cover; display: block; }
                :global(.lightbox-filmstrip-thumb.is-active) { opacity: 1; border-color: var(--accent); }

                /* ── Toasts ── */
                :global(.toast-t) { background: var(--surface-solid); border: 1px solid var(--card-border); border-radius: 10px; padding: 12px 16px; color: var(--text); font-size: 14px; display: flex; gap: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.25); }
                :global(.toast-close) { background: none; border: none; color: var(--text-muted); font-size: 16px; cursor: pointer; }
            `}</style>
        </div>
    );
}
