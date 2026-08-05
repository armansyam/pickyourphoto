'use client';

import React, { useState, useEffect, useCallback } from 'react';

// ── PEAK SEASON PRESETS ──────────────────────────────────────────────────
const PRESETS = [
    {
        id: 'wisuda',
        label: '🎓 Wisuda',
        desc: 'Mei–Jul & Nov–Des. Foto banyak, konversi tinggi.',
        color: '#10b981',
        settings: { trial_expiration_minutes: 60, raw_sorter_trial_limit: 8 },
    },
    {
        id: 'wedding',
        label: '💍 Wedding Season',
        desc: 'Jun–Sep. Urgency tinggi, limit ketat.',
        color: '#f59e0b',
        settings: { trial_expiration_minutes: 30, raw_sorter_trial_limit: 3 },
    },
    {
        id: 'holiday',
        label: '🎄 Liburan / Akhir Tahun',
        desc: 'Des–Jan. Awareness campaign, longgarkan.',
        color: '#6366f1',
        settings: { trial_expiration_minutes: 90, raw_sorter_trial_limit: 10 },
    },
    {
        id: 'offseason',
        label: '😴 Off-Season',
        desc: 'Sepi pesanan. Tarik leads baru sebanyak-banyaknya.',
        color: '#94a3b8',
        settings: { trial_expiration_minutes: 120, raw_sorter_trial_limit: 15 },
    },
    {
        id: 'flash',
        label: '🔒 Direct Sales (Matikan Trial)',
        desc: 'Matikan trial gratis → paksa langsung daftar berbayar.',
        color: '#ef4444',
        settings: { enable_free_trial: false, trial_expiration_minutes: 30, raw_sorter_trial_limit: 3 },
    },
];

// ── STAT CARD ────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = '#818cf8' }) {
    return (
        <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '14px',
            padding: '20px',
            flex: '1',
            minWidth: '140px',
        }}>
            <div style={{ fontSize: '22px', marginBottom: '8px' }}>{icon}</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '13px', color: '#a1a1aa', marginTop: '6px', fontWeight: '600' }}>{label}</div>
            {sub && <div style={{ fontSize: '11px', color: '#71717a', marginTop: '4px' }}>{sub}</div>}
        </div>
    );
}

export default function AdminTrialControl({ addToast }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [stats, setStats] = useState(null);
    const [recentTrials, setRecentTrials] = useState([]);

    // Settings state
    const [enableTrial, setEnableTrial] = useState(true);
    const [expirationMinutes, setExpirationMinutes] = useState(30);
    const [sorterLimit, setSorterLimit] = useState(5);
    const [maxSelection, setMaxSelection] = useState(10);
    const [maxPhotos, setMaxPhotos] = useState(50);
    const [maxSubfolders, setMaxSubfolders] = useState(1);
    const [previewPhotos, setPreviewPhotos] = useState(12);
    const [ctaText, setCtaText] = useState('');
    const [ctaSubtext, setCtaSubtext] = useState('');

    // Flash Promo Discount Engine States
    const [enableFlashPromo, setEnableFlashPromo] = useState(false);
    const [flashDiscountPercent, setFlashDiscountPercent] = useState(20);
    const [flashEndsAt, setFlashEndsAt] = useState('');
    const [flashTitle, setFlashTitle] = useState('⚡ FLASH SALE PROMO');
    const [flashBannerText, setFlashBannerText] = useState('Diskon Spesial Paket Berlangganan!');
    const [selectedDurationHours, setSelectedDurationHours] = useState(24);

    const [activePreset, setActivePreset] = useState(null);
    const [confirmFlash, setConfirmFlash] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/trial-stats');
            if (!res.ok) throw new Error('Gagal memuat data trial');
            const json = await res.json();
            setStats(json.stats);
            setRecentTrials(json.recentTrials || []);
            const s = json.settings;
            setEnableTrial(s.enable_free_trial === 1 || s.enable_free_trial === true);
            setExpirationMinutes(s.trial_expiration_minutes || 30);
            setSorterLimit(s.raw_sorter_trial_limit || 5);
            setMaxSelection(s.trial_max_selection || 10);
            setMaxPhotos(s.trial_max_photos || 50);
            setMaxSubfolders(s.trial_max_subfolders || 1);
            setPreviewPhotos(s.trial_preview_photos || 12);
            setCtaText(s.trial_cta_text || '');
            setCtaSubtext(s.trial_cta_subtext || '');

            setEnableFlashPromo(s.enable_flash_promo === 1 || s.enable_flash_promo === true);
            setFlashDiscountPercent(s.flash_promo_discount_percent || 20);
            setFlashEndsAt(s.flash_promo_ends_at || '');
            if (s.flash_promo_duration_hours) {
                setSelectedDurationHours(s.flash_promo_duration_hours);
            } else if (s.flash_promo_ends_at) {
                const diffMs = new Date(s.flash_promo_ends_at).getTime() - Date.now();
                if (diffMs > 0) {
                    const hoursRemaining = Math.round(diffMs / (1000 * 60 * 60));
                    const closest = [6, 12, 24, 48].reduce((prev, curr) => 
                        Math.abs(curr - hoursRemaining) < Math.abs(prev - hoursRemaining) ? curr : prev
                    );
                    setSelectedDurationHours(closest);
                }
            }
            setFlashTitle(s.flash_promo_title || '⚡ FLASH SALE PROMO');
            setFlashBannerText(s.flash_promo_banner_text || 'Diskon Spesial Paket Berlangganan!');
        } catch (err) {
            addToast?.('❌ ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSave = async (overrides = {}) => {
        if (saving) return;
        setSaving(true);
        try {
            const body = {
                enable_free_trial: overrides.enable_free_trial !== undefined ? overrides.enable_free_trial : enableTrial,
                trial_expiration_minutes: overrides.trial_expiration_minutes ?? expirationMinutes,
                raw_sorter_trial_limit: overrides.raw_sorter_trial_limit ?? sorterLimit,
                trial_max_selection: overrides.trial_max_selection ?? maxSelection,
                trial_max_photos: overrides.trial_max_photos ?? maxPhotos,
                trial_max_subfolders: overrides.trial_max_subfolders ?? maxSubfolders,
                trial_preview_photos: overrides.trial_preview_photos ?? previewPhotos,
                trial_cta_text: overrides.trial_cta_text ?? ctaText,
                trial_cta_subtext: overrides.trial_cta_subtext ?? ctaSubtext,
                enable_flash_promo: overrides.enable_flash_promo !== undefined ? overrides.enable_flash_promo : enableFlashPromo,
                flash_promo_discount_percent: overrides.flash_promo_discount_percent ?? flashDiscountPercent,
                flash_promo_ends_at: overrides.flash_promo_ends_at ?? flashEndsAt,
                flash_promo_duration_hours: overrides.flash_promo_duration_hours ?? selectedDurationHours,
                flash_promo_title: overrides.flash_promo_title ?? flashTitle,
                flash_promo_banner_text: overrides.flash_promo_banner_text ?? flashBannerText,
            };
            const res = await fetch('/api/admin/trial-stats', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
            addToast?.('✅ Trial settings berhasil disimpan!', 'success');
            await fetchData();
        } catch (err) {
            addToast?.('❌ ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const applyPreset = (preset) => {
        if (saving) return;
        if (preset.id === 'flash' && !confirmFlash) {
            setConfirmFlash(true);
            return;
        }
        setConfirmFlash(false);
        setActivePreset(preset.id);
        const s = preset.settings;
        if (s.enable_free_trial !== undefined) setEnableTrial(s.enable_free_trial);
        if (s.trial_expiration_minutes) setExpirationMinutes(s.trial_expiration_minutes);
        if (s.raw_sorter_trial_limit) setSorterLimit(s.raw_sorter_trial_limit);
        // Auto-save preset
        handleSave({
            enable_free_trial: s.enable_free_trial !== undefined ? s.enable_free_trial : enableTrial,
            trial_expiration_minutes: s.trial_expiration_minutes ?? expirationMinutes,
            raw_sorter_trial_limit: s.raw_sorter_trial_limit ?? sorterLimit,
        });
    };

    const formatDate = (d) => {
        if (!d) return '-';
        return new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', color: '#a1a1aa' }}>
                <span style={{ fontSize: '24px', marginRight: '12px' }}>⚙️</span> Memuat Trial Command Center...
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>

            {/* ── HEADER ── */}
            <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#f4f4f5' }}>
                        🎯 Trial Command Center
                    </h3>
                    <p style={{ margin: '6px 0 0', color: '#a1a1aa', fontSize: '14px' }}>
                        Kendalikan seluruh pengalaman trial secara real-time — tanpa deploy ulang.
                    </p>
                </div>
                {/* MASTER ON/OFF */}
                <button
                    onClick={() => {
                        const nextTrial = !enableTrial;
                        setEnableTrial(nextTrial);
                        if (nextTrial) setEnableFlashPromo(false);
                        handleSave({ enable_free_trial: nextTrial, enable_flash_promo: nextTrial ? false : enableFlashPromo });
                    }}
                    disabled={saving}
                    style={{
                        padding: '10px 22px',
                        borderRadius: '10px',
                        border: 'none',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: enableTrial
                            ? 'linear-gradient(135deg, #10b981, #059669)'
                            : 'linear-gradient(135deg, #ef4444, #dc2626)',
                        color: '#fff',
                        boxShadow: enableTrial
                            ? '0 4px 16px rgba(16,185,129,0.3)'
                            : '0 4px 16px rgba(239,68,68,0.3)',
                    }}
                >
                    {enableTrial ? '🟢 Trial AKTIF' : '🔴 Trial NONAKTIF'}
                </button>
            </div>

            {/* ── STATS ROW ── */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '28px' }}>
                <StatCard icon="🧪" label="Total Trial" value={stats?.totalTrials ?? 0} sub="Sepanjang masa" color="#818cf8" />
                <StatCard icon="📅" label="Hari Ini" value={stats?.trialsToday ?? 0} sub="Trial dibuat hari ini" color="#38bdf8" />
                <StatCard icon="⏳" label="Aktif" value={stats?.trialsActive ?? 0} sub="Belum expired" color="#f59e0b" />
                <StatCard icon="✅" label="Completed" value={stats?.trialsCompleted ?? 0} sub="Klien sudah pilih" color="#10b981" />
                <StatCard icon="📈" label="Konversi" value={`${stats?.conversionRate ?? 0}%`} sub="Trial → pilih foto" color="#a855f7" />
            </div>

            {/* ── PEAK SEASON PRESETS ── */}
            <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '14px',
                padding: '22px',
                marginBottom: '20px',
            }}>
                <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: '700', color: '#f4f4f5' }}>
                    ⚡ Peak Season Presets
                </h4>
                <p style={{ margin: '0 0 16px', color: '#71717a', fontSize: '13px' }}>
                    Terapkan sekaligus — durasi & limit RAW Sorter langsung tersimpan.
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {PRESETS.map(preset => (
                        <div key={preset.id}>
                            <button
                                onClick={() => applyPreset(preset)}
                                disabled={saving}
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: '10px',
                                    border: `1px solid ${activePreset === preset.id ? preset.color : 'rgba(255,255,255,0.1)'}`,
                                    background: activePreset === preset.id
                                        ? `linear-gradient(135deg, ${preset.color}22, ${preset.color}11)`
                                        : 'rgba(255,255,255,0.03)',
                                    color: activePreset === preset.id ? preset.color : '#a1a1aa',
                                    fontWeight: '600',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    textAlign: 'left',
                                    minWidth: '140px',
                                }}
                                title={preset.desc}
                            >
                                <div>{preset.label}</div>
                                <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '3px', fontWeight: '400' }}>{preset.desc}</div>
                            </button>
                            {preset.id === 'flash' && confirmFlash && (
                                <div style={{ marginTop: '8px', fontSize: '12px', color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '8px 12px' }}>
                                    ⚠️ Ini akan <strong>matikan trial</strong>!<br />
                                    <button
                                        onClick={() => applyPreset({ ...preset, _confirmed: true })}
                                        style={{ marginTop: '6px', padding: '4px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                                    >Ya, Nonaktifkan Trial</button>
                                    <button
                                        onClick={() => setConfirmFlash(false)}
                                        style={{ marginLeft: '6px', padding: '4px 10px', background: 'rgba(255,255,255,0.08)', color: '#a1a1aa', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
                                    >Batal</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── ⚡ FLASH SALE & DISCOUNT ENGINE CARD ── */}
            <div style={{
                background: enableFlashPromo ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(245, 158, 11, 0.08) 100%)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${enableFlashPromo ? 'rgba(239, 68, 68, 0.35)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: '14px',
                padding: '22px',
                marginBottom: '20px',
                transition: 'all 0.3s'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: enableFlashPromo ? '#f87171' : '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>⚡ Flash Sale & Engine Diskon Otomatis</span>
                        </h4>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#a1a1aa' }}>
                            Potong harga paket berlangganan secara dinamis dan aktifkan countdown timer di Landing Page & Checkout.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            const newStatus = !enableFlashPromo;
                            setEnableFlashPromo(newStatus);
                            if (newStatus) {
                                setEnableTrial(false);
                                const defaultEnds = flashEndsAt || new Date(Date.now() + selectedDurationHours * 60 * 60 * 1000).toISOString();
                                setFlashEndsAt(defaultEnds);
                                handleSave({ enable_flash_promo: true, enable_free_trial: false, flash_promo_ends_at: defaultEnds, flash_promo_duration_hours: selectedDurationHours });
                            } else {
                                setEnableTrial(true);
                                handleSave({ enable_flash_promo: false, enable_free_trial: true });
                            }
                        }}
                        style={{
                            padding: '8px 18px',
                            borderRadius: '10px',
                            border: 'none',
                            background: enableFlashPromo ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'rgba(255,255,255,0.08)',
                            color: enableFlashPromo ? '#ffffff' : '#a1a1aa',
                            fontWeight: '700',
                            fontSize: '12px',
                            cursor: 'pointer',
                            boxShadow: enableFlashPromo ? '0 4px 14px rgba(239, 68, 68, 0.35)' : 'none'
                        }}
                    >
                        {enableFlashPromo ? '🔥 FLASH SALE AKTIF' : '⚪ FLASH SALE MATI'}
                    </button>
                </div>

                <div style={{ opacity: enableFlashPromo ? 1 : 0.45, transition: 'opacity 0.2s', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#f87171', marginBottom: '8px' }}>
                                🏷️ Persentase Diskon (%)
                            </label>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {[10, 20, 30, 40, 50].map(pct => (
                                    <button
                                        key={pct}
                                        type="button"
                                        disabled={!enableFlashPromo}
                                        onClick={() => {
                                            setFlashDiscountPercent(pct);
                                            handleSave({ flash_promo_discount_percent: pct });
                                        }}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            border: flashDiscountPercent === pct ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                                            background: flashDiscountPercent === pct ? 'rgba(239,68,68,0.25)' : 'rgba(0,0,0,0.2)',
                                            color: flashDiscountPercent === pct ? '#f87171' : '#a1a1aa',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {pct}% Diskon
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#fbbf24', marginBottom: '8px' }}>
                                ⏳ Durasi Promo Kilat {flashEndsAt && (
                                    <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 'normal', marginLeft: '6px' }}>
                                        ({(() => {
                                            const diff = new Date(flashEndsAt).getTime() - Date.now();
                                            if (diff <= 0) return 'Expired';
                                            const h = Math.floor(diff / (1000 * 60 * 60));
                                            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                            return `Sisa: ${h}j ${m}m`;
                                        })()})
                                    </span>
                                )}
                            </label>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {[6, 12, 24, 48].map(hours => {
                                    const isSelected = selectedDurationHours === hours;
                                    return (
                                        <button
                                            key={hours}
                                            type="button"
                                            disabled={!enableFlashPromo}
                                            onClick={() => {
                                                setSelectedDurationHours(hours);
                                                const ends = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
                                                setFlashEndsAt(ends);
                                                handleSave({ flash_promo_duration_hours: hours, flash_promo_ends_at: ends });
                                            }}
                                            style={{
                                                padding: '6px 14px',
                                                borderRadius: '8px',
                                                border: isSelected ? '1px solid #fbbf24' : '1px solid rgba(251,191,36,0.3)',
                                                background: isSelected ? '#fbbf24' : 'rgba(251,191,36,0.1)',
                                                color: isSelected ? '#000000' : '#fbbf24',
                                                fontSize: '12px',
                                                fontWeight: '850',
                                                cursor: enableFlashPromo ? 'pointer' : 'not-allowed',
                                                transition: 'all 0.15s ease',
                                                boxShadow: isSelected ? '0 2px 10px rgba(251,191,36,0.35)' : 'none'
                                            }}
                                        >
                                            +{hours} Jam
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px' }}>
                        <div style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>
                            💡 Simulator Harga Terpotong (Live Real-Time)
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', fontSize: '12px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '8px' }}>
                                <div style={{ color: '#94a3b8' }}>Starter Plan (Rp 49k)</div>
                                <div style={{ color: '#34d399', fontWeight: 'bold', fontSize: '14px' }}>
                                    Rp {Math.round(49000 * (1 - flashDiscountPercent / 100)).toLocaleString('id-ID')}
                                </div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '8px' }}>
                                <div style={{ color: '#94a3b8' }}>Pro Studio (Rp 129k)</div>
                                <div style={{ color: '#34d399', fontWeight: 'bold', fontSize: '14px' }}>
                                    Rp {Math.round(129000 * (1 - flashDiscountPercent / 100)).toLocaleString('id-ID')}
                                </div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '8px' }}>
                                <div style={{ color: '#94a3b8' }}>Business Studio (Rp 249k)</div>
                                <div style={{ color: '#34d399', fontWeight: 'bold', fontSize: '14px' }}>
                                    Rp {Math.round(249000 * (1 - flashDiscountPercent / 100)).toLocaleString('id-ID')}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* ── SETTINGS FORM ── */}
            <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '14px',
                padding: '22px',
                marginBottom: '20px',
            }}>
                <h4 style={{ margin: '0 0 18px', fontSize: '15px', fontWeight: '700', color: '#f4f4f5' }}>
                    ⚙️ Pengaturan Manual
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>

                    {/* Durasi */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#a1a1aa', marginBottom: '8px' }}>
                            ⏱️ Durasi Galeri Trial (menit)
                        </label>
                        <input
                            type="number" min="5" max="10080"
                            value={expirationMinutes}
                            onChange={e => setExpirationMinutes(Math.max(5, parseInt(e.target.value) || 30))}
                            style={{ width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#f4f4f5', fontSize: '14px', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                            {[15, 30, 60, 90, 120].map(m => (
                                <button key={m} type="button" onClick={() => setExpirationMinutes(m)}
                                    style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s',
                                        background: expirationMinutes === m ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)',
                                        color: expirationMinutes === m ? '#818cf8' : '#71717a',
                                        border: expirationMinutes === m ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.1)'
                                    }}
                                >{m}m</button>
                            ))}
                        </div>
                    </div>

                    {/* RAW Sorter Limit */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#a1a1aa', marginBottom: '8px' }}>
                            📁 Limit RAW Sorter (file/sesi)
                        </label>
                        <input
                            type="number" min="1" max="10000"
                            value={sorterLimit}
                            onChange={e => setSorterLimit(Math.max(1, parseInt(e.target.value) || 5))}
                            style={{ width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#f4f4f5', fontSize: '14px', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                            {[3, 5, 8, 10, 15].map(n => (
                                <button key={n} type="button" onClick={() => setSorterLimit(n)}
                                    style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s',
                                        background: sorterLimit === n ? 'rgba(168,85,247,0.25)' : 'rgba(255,255,255,0.05)',
                                        color: sorterLimit === n ? '#a855f7' : '#71717a',
                                        border: sorterLimit === n ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.1)'
                                    }}
                                >{n} file</button>
                            ))}
                        </div>
                        <div style={{ marginTop: '6px', fontSize: '11px', color: '#52525b' }}>
                            RAW Sorter berhenti di tengah jalan setelah {sorterLimit} file berhasil disortir.
                        </div>
                    </div>

                    {/* Max Foto Dipilih Klien */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#a1a1aa', marginBottom: '8px' }}>
                            ✅ Max Foto Dipilih Klien (seleksi)
                        </label>
                        <input
                            type="number" min="1" max="10000"
                            value={maxSelection}
                            onChange={e => setMaxSelection(Math.max(1, parseInt(e.target.value) || 10))}
                            style={{ width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#f4f4f5', fontSize: '14px', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                            {[5, 10, 15, 20, 30].map(n => (
                                <button key={n} type="button" onClick={() => setMaxSelection(n)}
                                    style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s',
                                        background: maxSelection === n ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.05)',
                                        color: maxSelection === n ? '#10b981' : '#71717a',
                                        border: maxSelection === n ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)'
                                    }}
                                >{n} foto</button>
                            ))}
                        </div>
                        <div style={{ marginTop: '6px', fontSize: '11px', color: '#52525b' }}>
                            Klien hanya bisa memilih maks {maxSelection} foto dari galeri trial.
                        </div>
                    </div>

                    {/* Total Shared Quota Foto Trial (Pool) */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#a1a1aa', marginBottom: '8px' }}>
                            🖼️ Total Shared Quota Foto Trial (Pool)
                        </label>
                        <input
                            type="number" min="1" max="10000"
                            value={maxPhotos}
                            onChange={e => setMaxPhotos(Math.max(1, parseInt(e.target.value) || 50))}
                            style={{ width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#f4f4f5', fontSize: '14px', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                            {[20, 30, 50, 75, 100].map(n => (
                                <button key={n} type="button" onClick={() => setMaxPhotos(n)}
                                    style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s',
                                        background: maxPhotos === n ? 'rgba(56,189,248,0.25)' : 'rgba(255,255,255,0.05)',
                                        color: maxPhotos === n ? '#38bdf8' : '#71717a',
                                        border: maxPhotos === n ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)'
                                    }}
                                >{n} foto</button>
                            ))}
                        </div>
                        <div style={{ marginTop: '6px', fontSize: '11px', color: '#52525b' }}>
                            Total pool kuota foto yang di-load dan dibagi ke seluruh tab subfolder terbuka.
                        </div>
                    </div>

                    {/* Max Tab Subfolder Dibuka */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#a1a1aa', marginBottom: '8px' }}>
                            📂 Max Tab Subfolder Dibuka (trial)
                        </label>
                        <input
                            type="number" min="1" max="100"
                            value={maxSubfolders}
                            onChange={e => setMaxSubfolders(Math.max(1, parseInt(e.target.value) || 1))}
                            style={{ width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#f4f4f5', fontSize: '14px', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                            {[1, 2, 3, 5, 10].map(n => (
                                <button key={n} type="button" onClick={() => setMaxSubfolders(n)}
                                    style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s',
                                        background: maxSubfolders === n ? 'rgba(234,179,8,0.25)' : 'rgba(255,255,255,0.05)',
                                        color: maxSubfolders === n ? '#eab308' : '#71717a',
                                        border: maxSubfolders === n ? '1px solid #eab308' : '1px solid rgba(255,255,255,0.1)'
                                    }}
                                >{n} tab</button>
                            ))}
                        </div>
                        <div style={{ marginTop: '6px', fontSize: '11px', color: '#52525b' }}>
                            {maxSubfolders === 1
                                ? 'Hanya 1 tab subfolder pertama yang dapat dibuka. Tab lainnya terkunci (upsell).'
                                : `${maxSubfolders} tab subfolder pertama terbuka. Selebihnya terkunci (upsell).`
                            }
                        </div>
                    </div>

                    {/* Foto Ditampilkan Sebelum Blur (Preview Limit) */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#a1a1aa', marginBottom: '8px' }}>
                            👁️ Limit Foto per Tab (sebelum Blur)
                        </label>
                        <input
                            type="number" min="1" max="10000"
                            value={previewPhotos}
                            onChange={e => setPreviewPhotos(Math.max(1, parseInt(e.target.value) || 12))}
                            style={{ width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#f4f4f5', fontSize: '14px', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                            {[6, 9, 12, 15, 20].map(n => (
                                <button key={n} type="button" onClick={() => setPreviewPhotos(n)}
                                    style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s',
                                        background: previewPhotos === n ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.05)',
                                        color: previewPhotos === n ? '#f59e0b' : '#71717a',
                                        border: previewPhotos === n ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)'
                                    }}
                                >{n} foto</button>
                            ))}
                        </div>
                        <div style={{ marginTop: '6px', fontSize: '11px', color: '#52525b' }}>
                            Maks foto yang diambil per tab dari shared pool. Sisa pool mengalir ke tab berikutnya.
                        </div>
                    </div>

                </div>

                {/* CTA Copy */}
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <h5 style={{ margin: '0 0 14px', fontSize: '13px', color: '#a1a1aa', fontWeight: '700' }}>
                        💬 Conversion Copy (teks upgrade CTA — kosongkan untuk default)
                    </h5>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                        <div>
                            <label style={{ fontSize: '12px', color: '#71717a', display: 'block', marginBottom: '6px' }}>Judul CTA</label>
                            <input
                                type="text"
                                value={ctaText}
                                onChange={e => setCtaText(e.target.value)}
                                placeholder="e.g. Masih ada 18 file menunggu..."
                                style={{ width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#f4f4f5', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', color: '#71717a', display: 'block', marginBottom: '6px' }}>Sub-teks CTA</label>
                            <input
                                type="text"
                                value={ctaSubtext}
                                onChange={e => setCtaSubtext(e.target.value)}
                                placeholder="e.g. Upgrade sekarang, selesaikan semua dalam 1 klik"
                                style={{ width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#f4f4f5', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => handleSave()}
                    disabled={saving}
                    style={{
                        marginTop: '20px',
                        padding: '12px 28px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: '#fff',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: 'pointer',
                        opacity: saving ? 0.6 : 1,
                        boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
                    }}
                >
                    {saving ? '⏳ Menyimpan...' : '💾 Simpan Pengaturan Trial'}
                </button>
            </div>

            {/* ── RECENT TRIALS TABLE ── */}
            <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '14px',
                padding: '22px',
            }}>
                <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: '#f4f4f5' }}>
                    📋 10 Trial Terbaru
                </h4>
                {recentTrials.length === 0 ? (
                    <div style={{ color: '#52525b', textAlign: 'center', padding: '32px', fontSize: '14px' }}>
                        Belum ada trial yang dibuat.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    {['Nama', 'Slug', 'Foto', 'Dipilih', 'Dibuat', 'Expires', 'Status'].map(h => (
                                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#71717a', fontWeight: '600', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {recentTrials.map((t, i) => {
                                    const isCompleted = t.selectionStatus === 'completed';
                                    const isExpired = new Date(t.expiresAt) < new Date();
                                    return (
                                        <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                                            <td style={{ padding: '10px 12px', color: '#e4e4e7', fontWeight: '600' }}>{t.title}</td>
                                            <td style={{ padding: '10px 12px', color: '#71717a', fontFamily: 'monospace', fontSize: '11px' }}>{t.slug}</td>
                                            <td style={{ padding: '10px 12px', color: '#a1a1aa', textAlign: 'center' }}>{t.photoCount}</td>
                                            <td style={{ padding: '10px 12px', color: '#10b981', textAlign: 'center', fontWeight: '700' }}>{t.selectedCount}</td>
                                            <td style={{ padding: '10px 12px', color: '#71717a', whiteSpace: 'nowrap' }}>{formatDate(t.createdAt)}</td>
                                            <td style={{ padding: '10px 12px', color: isExpired ? '#f87171' : '#fbbf24', whiteSpace: 'nowrap' }}>{formatDate(t.expiresAt)}</td>
                                            <td style={{ padding: '10px 12px' }}>
                                                <span style={{
                                                    padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                                                    background: isCompleted ? 'rgba(16,185,129,0.15)' : isExpired ? 'rgba(239,68,68,0.12)' : 'rgba(251,191,36,0.12)',
                                                    color: isCompleted ? '#10b981' : isExpired ? '#f87171' : '#fbbf24',
                                                }}>
                                                    {isCompleted ? '✅ Completed' : isExpired ? '💀 Expired' : '⏳ Active'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
