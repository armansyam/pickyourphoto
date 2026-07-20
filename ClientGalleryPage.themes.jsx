"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * 4 gallery themes a vendor can pick for their client gallery.
 * In production, replace the demo `theme` state below with the value
 * saved on the project, e.g. `project.galleryTheme` from the API
 * (fallback to 'contactSheet' if the vendor never picked one).
 */
const THEMES = {
    contactSheet: {
        label: 'Kontak Studio',
        blurb: 'Gelap, ala lembar kontak fotografer profesional',
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
        grid: 'wall',
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
        grid: 'scatter',
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

    const [toasts, setToasts] = useState([]);
    const addToast = useCallback((message, type = 'info', duration = 10000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type, duration }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    }, []);

    // DEMO ONLY: swap this for `project?.galleryTheme` once the vendor
    // setting is wired up. Keeping local state here just so you can
    // preview all four looks in one page.
    const [themeKey, setThemeKey] = useState('contactSheet');
    const theme = THEMES[themeKey];

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
            // if (data.project.galleryTheme) setThemeKey(data.project.galleryTheme);

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

    const maxSelection = project?.maxSelection || 0;

    const handleToggleSelect = (photoId) => {
        if (submitted || project?.isProjectExpired) return;
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(photoId)) {
                next.delete(photoId);
            } else {
                if (maxSelection > 0 && next.size >= maxSelection) {
                    addToast(`⚠️ Batas maksimal pilihan foto adalah ${maxSelection}. Silakan hapus pilihan lainnya terlebih dahulu.`, 'warning', 12000);
                    return prev;
                }
                next.add(photoId);
            }
            return next;
        });
    };

    const isAtLimit = maxSelection > 0 && selectedIds.size >= maxSelection;

    const handleSubmitSelection = () => {
        if (project?.isProjectExpired) { addToast('🔒 Proyek ini telah kedaluwarsa dan terkunci.', 'error', 12000); return; }
        if (selectedIds.size === 0) { addToast('📸 Silakan pilih minimal satu foto sebelum mengirim.', 'warning', 10000); return; }
        setShowConfirmModal(true);
    };

    const handleConfirmAndSubmit = async () => {
        setShowConfirmModal(false);
        setSubmitting(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/select?key=${clientKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ photoIds: Array.from(selectedIds) })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Gagal mengirim pilihan.');
            setSubmitted(true);
            setShowSuccessOverlay(true);
            addToast('✅ Pilihan foto berhasil dikirim dan terkunci!', 'success', 15000);
        } catch (err) {
            addToast(`❌ ${err.message}`, 'error', 15000);
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

            {/* DEMO THEME SWITCHER — remove once wired to the vendor's saved setting */}
            <div className="theme-switcher">
                {Object.entries(THEMES).map(([key, t]) => (
                    <button key={key} className={key === themeKey ? 'is-active' : ''} onClick={() => setThemeKey(key)} title={t.blurb}>
                        {t.label}
                    </button>
                ))}
            </div>

            {branding && (branding.brandName || branding.brandLogo) && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '64px', marginBottom: '8px' }}>
                    {branding.brandLogo && <img src={branding.brandLogo} alt="Brand Logo" style={{ maxHeight: '55px', maxWidth: '140px', objectFit: 'contain' }} />}
                    {branding.brandName && <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{branding.brandName}</span>}
                </div>
            )}

            <div style={{ textAlign: 'center', marginTop: branding ? '12px' : '64px', marginBottom: '32px' }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '38px', margin: '0 0 8px 0', fontWeight: themeKey === 'polaroid' ? 400 : 700, color: 'var(--text)' }}>{project.name}</h1>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '14px' }}>
                    {submitted ? '✓ Selection completed' : project.isProjectExpired ? 'Galeri ini sudah kedaluwarsa (Locked)' : maxSelection > 0 ? `Pilih maksimal ${maxSelection} foto favorit Anda` : 'Pilih foto favorit Anda lalu kirim di bawah'}
                </p>
            </div>

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
                    <div className={`photo-grid grid-${theme.grid}`}>
                        {photos.map((photo, index) => {
                            const isSelected = selectedIds.has(photo.id);
                            const pickNumber = isSelected ? getPickNumber(photo.id) : null;
                            const num = (index + 1).toString().padStart(3, '0');

                            return (
                                <div key={photo.id} className={`photo-card ${isSelected ? 'is-selected' : ''}`} onClick={() => handleToggleSelect(photo.id)}>
                                    <div className="photo-card-frame">
                                        <img src={photo.thumbnailPath} alt={`Frame ${index + 1}`} loading="lazy" />

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

                                        {themeKey === 'polaroid' && <span className="pl-pin" />}

                                        <button className="preview-btn" onClick={(e) => { e.stopPropagation(); setActiveLightboxIndex(index); }} aria-label="Perbesar foto" title="Perbesar">⤢</button>
                                    </div>

                                    {themeKey === 'galleryWall' && (
                                        <div className="gw-caption">No. {num}{isSelected ? ` · Dipilih #${pickNumber}` : ''}</div>
                                    )}
                                    {themeKey === 'polaroid' && (
                                        <div className="pl-caption">{isSelected ? `dipilih ♡ #${pickNumber}` : `foto ${num}`}</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="action-tray">
                        <div className="action-tray-inner">
                            <div className="action-tray-head">
                                <div>
                                    <h4>{selectedIds.size}{maxSelection > 0 ? ` / ${maxSelection}` : ''} Foto Dipilih</h4>
                                    <p>{submitted ? 'Pilihan terkunci' : project.isProjectExpired ? 'Proyek kedaluwarsa & terkunci' : isAtLimit ? 'Batas maksimal tercapai!' : 'Klik foto untuk menandai pilihan'}</p>
                                </div>
                                {submitted ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '14px' }}>✓ Finalized</span>
                                        <button className="btn-secondary-t" onClick={() => setShowSubmittedPreview(true)}>Lihat Pilihan</button>
                                    </div>
                                ) : project.isProjectExpired ? (
                                    <span style={{ color: 'var(--danger)', fontWeight: 'bold', fontSize: '14px' }}>🔒 Locked</span>
                                ) : (
                                    <button className="btn-primary-t" onClick={handleSubmitSelection} disabled={submitting || selectedIds.size === 0}>
                                        {submitting ? 'Mengirim...' : 'Kirim Pilihan'}
                                    </button>
                                )}
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
                    <div className="modal-content-t" style={{ textAlign: 'center', maxWidth: '420px' }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', margin: '0 0 12px 0' }}>Selections Finalized!</h3>
                        <p style={{ color: 'var(--text-muted)', margin: '0 0 24px 0', fontSize: '14px', lineHeight: '1.5' }}>Pilihan foto Anda telah berhasil dikirim ke fotografer. Terima kasih!</p>
                        <button className="btn-primary-t" style={{ width: '100%', marginBottom: '12px' }} onClick={() => { setShowSuccessOverlay(false); setShowSubmittedPreview(true); }}>Lihat Foto yang Sudah Dikirim</button>
                        <button className="btn-secondary-t" style={{ width: '100%' }} onClick={() => setShowSuccessOverlay(false)}>Tutup</button>
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
                        <img src={photos[activeLightboxIndex].originalPath} alt="Preview" style={{ maxHeight: '74vh', maxWidth: '85vw', objectFit: 'contain', userSelect: 'none' }} onClick={e => e.stopPropagation()} />
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
                                Periksa kembali foto pilihan Anda.<br /><strong style={{ color: 'var(--accent)' }}>Setelah dikunci, pilihan tidak dapat diubah lagi.</strong>
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
                                {submitting ? 'Mengirim...' : '🔒 Kunci & Kirim ke Vendor'}
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

            <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '380px', pointerEvents: 'none' }}>
                {toasts.map(toast => (
                    <div key={toast.id} className="toast-t" style={{ pointerEvents: 'auto' }}>
                        <div style={{ flex: 1 }}>{toast.message}</div>
                        <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="toast-close">&times;</button>
                    </div>
                ))}
            </div>

            <style jsx>{`
                .theme-switcher {
                    position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
                    display: flex; gap: 6px; z-index: 2000; flex-wrap: wrap; justify-content: center;
                    background: rgba(0,0,0,0.5); padding: 6px; border-radius: 10px; backdrop-filter: blur(8px);
                }
                .theme-switcher button {
                    font-size: 11px; padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.15);
                    background: rgba(255,255,255,0.06); color: #fff; cursor: pointer; font-family: system-ui, sans-serif;
                }
                .theme-switcher button.is-active { background: #fff; color: #111; font-weight: 700; }

                /* ── Grid layouts ── */
                .photo-grid { padding: 0 20px 20px; }
                .grid-masonry { column-count: 4; column-gap: 14px; }
                @media (max-width: 1100px) { .grid-masonry { column-count: 3; } }
                @media (max-width: 720px) { .grid-masonry { column-count: 2; } }
                @media (max-width: 420px) { .grid-masonry { column-count: 1; } }

                .grid-wall { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 36px 28px; max-width: 1200px; margin: 0 auto; }

                .grid-scatter { display: flex; flex-wrap: wrap; gap: 26px 18px; justify-content: center; max-width: 1200px; margin: 0 auto; }

                .photo-card { cursor: pointer; }
                .grid-masonry .photo-card { break-inside: avoid; margin-bottom: 14px; }
                .grid-scatter .photo-card { width: 170px; }
                .grid-scatter .photo-card:nth-child(odd) { transform: rotate(-2.5deg); }
                .grid-scatter .photo-card:nth-child(even) { transform: rotate(2deg); }
                .grid-scatter .photo-card:hover { transform: rotate(0deg) scale(1.03); }

                .photo-card-frame { position: relative; overflow: hidden; }
                .grid-masonry .photo-card-frame { border-radius: var(--radius); border: 1px solid var(--card-border); background: var(--surface-solid); transition: transform 0.25s ease, box-shadow 0.25s ease; }
                .grid-masonry .photo-card:hover .photo-card-frame { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(0,0,0,0.35); }
                .grid-masonry .photo-card.is-selected .photo-card-frame { box-shadow: 0 0 0 2px var(--accent); }
                .photo-card-frame img { display: block; width: 100%; height: auto; }

                .grid-wall .photo-card-frame { background: var(--surface); padding: 10px 10px 10px; border: 1px solid var(--card-border); box-shadow: 0 6px 18px rgba(0,0,0,0.08); transition: box-shadow 0.2s ease, transform 0.2s ease; }
                .grid-wall .photo-card:hover .photo-card-frame { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,0.12); }
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
                .gw-caption { text-align: center; font-family: var(--font-mono); font-size: 12px; color: var(--text-muted); padding: 8px 4px 0; letter-spacing: 0.03em; }

                /* Polaroid signature */
                .pl-pin { position: absolute; top: 6px; left: 50%; transform: translateX(-50%); width: 10px; height: 10px; border-radius: 50%; background: var(--accent2); box-shadow: 0 1px 2px rgba(0,0,0,0.3); }
                .pl-caption { text-align: center; font-family: var(--font-display); font-size: 15px; color: var(--text); padding: 8px 6px 12px; background: var(--surface); }

                .preview-btn { position: absolute; bottom: 8px; right: 8px; width: 26px; height: 26px; border-radius: 50%; background: rgba(0,0,0,0.5); color: white; border: 1px solid rgba(255,255,255,0.15); font-size: 12px; cursor: pointer; opacity: 0; transition: opacity 0.2s ease; display: flex; align-items: center; justify-content: center; }
                .photo-card:hover .preview-btn { opacity: 1; }

                /* ── Buttons ── */
                :global(.btn-primary-t) { font-family: var(--font-body); background: var(--accent); color: var(--accent-contrast); border: none; padding: 10px 20px; border-radius: var(--radius); font-size: 14px; font-weight: 700; cursor: pointer; }
                :global(.btn-primary-t:disabled) { opacity: 0.5; cursor: not-allowed; }
                :global(.btn-secondary-t) { font-family: var(--font-body); background: transparent; color: var(--text); border: 1px solid var(--card-border); padding: 10px 20px; border-radius: var(--radius); font-size: 14px; cursor: pointer; }

                /* ── Action tray ── */
                .action-tray { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); width: 92%; max-width: 640px; z-index: 900; }
                .action-tray-inner { background: var(--surface-solid); border: 1px solid var(--card-border); border-radius: var(--radius); padding: 14px 18px; box-shadow: 0 10px 40px rgba(0,0,0,0.25); }
                .action-tray-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
                .action-tray-head h4 { margin: 0; font-size: 16px; font-weight: bold; font-family: var(--font-display); }
                .action-tray-head p { margin: 2px 0 0 0; font-size: 12px; color: var(--text-muted); }
                .filmstrip { display: flex; gap: 8px; overflow-x: auto; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--card-border); }
                .filmstrip-thumb { position: relative; flex: 0 0 auto; width: 44px; height: 44px; border-radius: 6px; overflow: hidden; border: 1px solid var(--accent); }
                .filmstrip-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
                .filmstrip-index { position: absolute; top: 2px; left: 2px; font-size: 9px; font-weight: 700; background: rgba(0,0,0,0.6); color: var(--accent); padding: 0 4px; border-radius: 3px; }
                .filmstrip-remove { position: absolute; top: -4px; right: -4px; width: 16px; height: 16px; border-radius: 50%; background: var(--danger); color: white; border: none; font-size: 11px; cursor: pointer; }

                /* ── Modals ── */
                :global(.modal-overlay-t) { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; padding: 20px; }
                :global(.modal-content-t) { background: var(--surface-solid); border: 1px solid var(--card-border); border-radius: var(--radius); padding: 28px; color: var(--text); font-family: var(--font-body); }
                .confirm-thumb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 12px; background: rgba(0,0,0,0.04); border: 1px solid var(--card-border); border-radius: var(--radius); padding: 16px; max-height: 260px; overflow-y: auto; }
                .confirm-thumb { position: relative; aspect-ratio: 1/1; border-radius: 6px; overflow: hidden; border: 1px solid var(--card-border); }
                .confirm-thumb img { width: 100%; height: 100%; object-fit: cover; }
                .confirm-thumb-index { position: absolute; bottom: 4px; left: 4px; font-size: 10px; font-weight: 700; background: rgba(0,0,0,0.6); color: var(--accent); padding: 1px 5px; border-radius: 4px; }
                .confirm-thumb-remove { position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; border-radius: 50%; background: var(--danger); color: white; border: none; font-size: 12px; cursor: pointer; }

                /* ── Lightbox ── */
                :global(.lightbox-nav) { position: absolute; background: rgba(255,255,255,0.08); color: white; border: 1px solid rgba(255,255,255,0.15); border-radius: 50%; width: 44px; height: 44px; font-size: 18px; cursor: pointer; z-index: 10; }
                :global(.lightbox-nav-left) { left: 16px; }
                :global(.lightbox-nav-right) { right: 16px; }
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
