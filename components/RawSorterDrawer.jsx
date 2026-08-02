"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import useRawSorter from '@/hooks/useRawSorter';

/**
 * RawSorterDrawer — Full-featured slide-in drawer for sorting RAW files
 * 
 * Props:
 *   isOpen              - boolean, controls drawer visibility
 *   onClose             - function, called when drawer should close
 *   project             - { id, name, status, selectedPhotosCount } from dashboard
 *   vendorPlan          - string, e.g. "free_trial", "limit_based", "storage_based"
 *   preloadedFileNames  - string[] (optional) — jika disediakan, skip API fetch
 *   preloadedTitle      - string (optional) — nama project untuk drawer header
 */
export default function RawSorterDrawer({ isOpen, onClose, project, vendorPlan, preloadedFileNames, preloadedTitle }) {
    const [fileNames, setFileNames] = useState([]);
    const [projectName, setProjectName] = useState('');
    const [totalSelected, setTotalSelected] = useState(0);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [fetchError, setFetchError] = useState('');
    const [mode, setMode] = useState('copy'); // 'copy' | 'move'
    const [showExportLog, setShowExportLog] = useState(false);

    const terminalRef = useRef(null);
    const drawerRef = useRef(null);

    const isTrial = vendorPlan === 'free_trial';
    const [TRIAL_LIMIT, setTrialLimit] = useState(5); // default, akan di-fetch dari admin settings

    const {
        sourceName, destName,
        isRunning, isDone,
        logs, progress, summary,
        isSupported,
        pickSourceFolder, pickDestFolder,
        runSorter, abort, reset, fullReset
    } = useRawSorter();

    // Fetch selected file names when drawer opens
    // Jika preloadedFileNames disediakan (e.g. dari trial), skip API call
    useEffect(() => {
        if (!isOpen) return;

        // Fetch dynamic trial limit dari admin settings (jika mode trial)
        if (isTrial) {
            fetch('/api/settings')
                .then(r => r.json())
                .then(s => {
                    const limit = parseInt(s.raw_sorter_trial_limit);
                    if (!isNaN(limit) && limit > 0) setTrialLimit(limit);
                })
                .catch(() => {}); // silent fail — pakai default
        }

        if (preloadedFileNames) {
            // Mode preloaded — data sudah tersedia
            setFileNames(preloadedFileNames);
            setProjectName(preloadedTitle || project?.name || '');
            setTotalSelected(preloadedFileNames.length);
            setLoadingFiles(false);
            return;
        }

        if (project?.id) {
            setLoadingFiles(true);
            setFetchError('');
            fetch(`/api/projects/${project.id}/selected-files`)
                .then(res => {
                    if (!res.ok) throw new Error('Gagal memuat data');
                    return res.json();
                })
                .then(data => {
                    setFileNames(data.fileNames || []);
                    setProjectName(data.projectName || project.name || '');
                    setTotalSelected(data.totalSelected || 0);
                })
                .catch(err => {
                    setFetchError(err.message);
                })
                .finally(() => setLoadingFiles(false));
        }
    }, [isOpen, project?.id, project?.name, preloadedFileNames, preloadedTitle, isTrial]);

    // Auto-scroll terminal
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [logs]);

    // Keyboard: Escape to close (only if not running)
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape' && isOpen && !isRunning) {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, isRunning]);

    // Close handler — reset states
    const handleClose = useCallback(() => {
        if (isRunning) return; // Can't close while running
        fullReset();
        setFileNames([]);
        setFetchError('');
        setMode('copy');
        setShowExportLog(false);
        onClose();
    }, [isRunning, fullReset, onClose]);

    // Start sorter
    const handleStart = useCallback(() => {
        const maxFiles = isTrial ? TRIAL_LIMIT : Infinity;
        runSorter(fileNames, mode, maxFiles);
    }, [fileNames, mode, isTrial, runSorter]);

    // Export log as .txt
    const handleExportLog = useCallback(() => {
        const text = logs.map(l => `[${l.time}] ${l.message}`).join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `raw-sorter-log-${projectName.replace(/\s+/g, '_')}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }, [logs, projectName]);

    // Log type → color & icon
    const getLogStyle = (type) => {
        switch (type) {
            case 'success': return { color: '#34d399', icon: '✓' };
            case 'error': return { color: '#f87171', icon: '✕' };
            case 'warning': return { color: '#fbbf24', icon: '⚠' };
            case 'not-found': return { color: '#fb923c', icon: '?' };
            case 'trial-limit': return { color: '#c084fc', icon: '🔒' };
            case 'info': default: return { color: '#94a3b8', icon: '›' };
        }
    };

    // Progress percentage
    const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

    const canStart = sourceName && destName && fileNames.length > 0 && !isRunning && !isDone;

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={() => !isRunning && handleClose()}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 9998,
                    transition: 'opacity 0.3s ease',
                    opacity: isOpen ? 1 : 0,
                }}
            />

            {/* Drawer */}
            <div
                ref={drawerRef}
                style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: '100%',
                    maxWidth: '860px',
                    background: 'linear-gradient(180deg, #0c0c14 0%, #111118 100%)',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
                    transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                    borderLeft: '1px solid rgba(99, 102, 241, 0.15)',
                    overflow: 'hidden',
                }}
            >
                {/* ── HEADER ── */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    background: 'rgba(99, 102, 241, 0.03)',
                    flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                        <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px',
                            flexShrink: 0,
                            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
                        }}>
                            📁
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <h2 style={{
                                margin: 0,
                                fontSize: '17px',
                                fontWeight: '700',
                                color: '#f4f4f5',
                                letterSpacing: '-0.02em',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}>
                                RAW Sorter
                            </h2>
                            <p style={{
                                margin: '2px 0 0',
                                fontSize: '12px',
                                color: '#71717a',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}>
                                {projectName || 'Loading...'}
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                        {totalSelected > 0 && (
                            <span style={{
                                background: 'rgba(99, 102, 241, 0.15)',
                                color: '#a5b4fc',
                                padding: '5px 12px',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: '600',
                                border: '1px solid rgba(99, 102, 241, 0.2)',
                            }}>
                                {totalSelected} foto dipilih
                            </span>
                        )}
                        <button
                            onClick={handleClose}
                            disabled={isRunning}
                            style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '10px',
                                border: '1px solid rgba(255,255,255,0.08)',
                                background: 'rgba(255,255,255,0.04)',
                                color: '#71717a',
                                cursor: isRunning ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '18px',
                                transition: 'all 0.2s',
                                opacity: isRunning ? 0.4 : 1,
                            }}
                            onMouseEnter={e => { if (!isRunning) { e.target.style.background = 'rgba(255,255,255,0.08)'; e.target.style.color = '#f4f4f5'; }}}
                            onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.04)'; e.target.style.color = '#71717a'; }}
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* ── BODY ── */}
                <div style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '0',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    {/* Browser compatibility warning */}
                    {!isSupported && (
                        <div style={{
                            margin: '16px 20px 0',
                            padding: '14px 18px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '12px',
                            color: '#f87171',
                            fontSize: '13px',
                            lineHeight: '1.5',
                        }}>
                            <strong>⚠️ Browser Tidak Didukung</strong>
                            <br />
                            RAW Sorter memerlukan <strong>Chrome 86+</strong> atau <strong>Edge 86+</strong>. 
                            Firefox dan Safari belum mendukung File System Access API.
                        </div>
                    )}

                    {/* Trial warning banner */}
                    {isTrial && isSupported && (
                        <div style={{
                            margin: '16px 20px 0',
                            padding: '12px 16px',
                            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(139, 92, 246, 0.12))',
                            border: '1px solid rgba(168, 85, 247, 0.2)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            fontSize: '12px',
                            color: '#c4b5fd',
                            lineHeight: '1.5',
                        }}>
                            <span style={{ fontSize: '20px', flexShrink: 0 }}>🔒</span>
                            <div>
                                <strong style={{ color: '#ddd6fe' }}>Free Trial</strong> — Hanya <strong>{TRIAL_LIMIT} file pertama</strong> yang akan disortir.
                                Upgrade untuk sortir semua file tanpa batas.
                            </div>
                        </div>
                    )}

                    {/* ── TWO-COLUMN SETUP AREA ── */}
                    {!isRunning && !isDone && isSupported && (
                        <div className="raw-sorter-drawer-columns" style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '0',
                            minHeight: 0,
                            flex: 1,
                        }}>
                            {/* LEFT COLUMN: File List */}
                            <div style={{
                                padding: '20px',
                                borderRight: '1px solid rgba(255,255,255,0.04)',
                                display: 'flex',
                                flexDirection: 'column',
                                minHeight: 0,
                            }}>
                                <h3 style={{
                                    margin: '0 0 12px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: '#a1a1aa',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.06em',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                }}>
                                    <span style={{ fontSize: '14px' }}>📄</span>
                                    Daftar File Terpilih
                                </h3>

                                {loadingFiles ? (
                                    <div style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#52525b',
                                        fontSize: '13px',
                                    }}>
                                        <div style={{
                                            width: '20px', height: '20px',
                                            border: '2px solid rgba(99,102,241,0.2)',
                                            borderTop: '2px solid #6366f1',
                                            borderRadius: '50%',
                                            animation: 'rawSorterSpin 0.8s linear infinite',
                                            marginRight: '10px',
                                        }} />
                                        Memuat...
                                    </div>
                                ) : fetchError ? (
                                    <div style={{
                                        padding: '16px',
                                        background: 'rgba(239, 68, 68, 0.08)',
                                        borderRadius: '10px',
                                        color: '#f87171',
                                        fontSize: '13px',
                                        textAlign: 'center',
                                    }}>
                                        ✕ {fetchError}
                                    </div>
                                ) : (
                                    <div style={{
                                        flex: 1,
                                        overflow: 'auto',
                                        borderRadius: '10px',
                                        background: 'rgba(0, 0, 0, 0.2)',
                                        border: '1px solid rgba(255,255,255,0.04)',
                                        padding: '4px',
                                    }}>
                                        {fileNames.length === 0 ? (
                                            <div style={{
                                                padding: '32px 16px',
                                                textAlign: 'center',
                                                color: '#52525b',
                                                fontSize: '13px',
                                            }}>
                                                Tidak ada foto yang dipilih klien
                                            </div>
                                        ) : (
                                            fileNames.map((name, i) => {
                                                const isOverLimit = isTrial && i >= TRIAL_LIMIT;
                                                return (
                                                    <div
                                                        key={i}
                                                        style={{
                                                            padding: '7px 12px',
                                                            fontSize: '12px',
                                                            fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
                                                            color: isOverLimit ? '#3f3f46' : '#d4d4d8',
                                                            borderBottom: '1px solid rgba(255,255,255,0.02)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            opacity: isOverLimit ? 0.5 : 1,
                                                            transition: 'background 0.15s',
                                                            borderRadius: '6px',
                                                        }}
                                                        onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.03)'}
                                                        onMouseLeave={e => e.target.style.background = 'transparent'}
                                                    >
                                                        <span style={{
                                                            fontSize: '10px',
                                                            color: isOverLimit ? '#27272a' : '#52525b',
                                                            fontFamily: 'inherit',
                                                            minWidth: '22px',
                                                            textAlign: 'right',
                                                        }}>
                                                            {i + 1}
                                                        </span>
                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {name}
                                                        </span>
                                                        {isOverLimit && i === TRIAL_LIMIT && (
                                                            <span style={{ fontSize: '10px', color: '#a855f7', marginLeft: 'auto', flexShrink: 0 }}>
                                                                🔒 trial limit
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* RIGHT COLUMN: Folder Picker & Controls */}
                            <div style={{
                                padding: '20px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px',
                            }}>
                                <h3 style={{
                                    margin: '0 0 0',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: '#a1a1aa',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.06em',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                }}>
                                    <span style={{ fontSize: '14px' }}>⚙️</span>
                                    Pengaturan Sortir
                                </h3>

                                {/* Source Folder Picker */}
                                <div>
                                    <label style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
                                        Folder Sumber (RAW Files)
                                    </label>
                                    <button
                                        onClick={pickSourceFolder}
                                        style={{
                                            width: '100%',
                                            padding: '14px 16px',
                                            borderRadius: '12px',
                                            border: `1px solid ${sourceName ? 'rgba(52, 211, 153, 0.3)' : 'rgba(255,255,255,0.08)'}`,
                                            background: sourceName ? 'rgba(52, 211, 153, 0.06)' : 'rgba(255,255,255,0.03)',
                                            color: sourceName ? '#6ee7b7' : '#71717a',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={e => {
                                            if (!sourceName) e.target.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                                        }}
                                        onMouseLeave={e => {
                                            if (!sourceName) e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                                        }}
                                    >
                                        <span style={{ fontSize: '18px' }}>{sourceName ? '✅' : '📂'}</span>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {sourceName || 'Pilih folder sumber...'}
                                        </span>
                                    </button>
                                </div>

                                {/* Destination Folder Picker */}
                                <div>
                                    <label style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
                                        Folder Tujuan
                                    </label>
                                    <button
                                        onClick={pickDestFolder}
                                        style={{
                                            width: '100%',
                                            padding: '14px 16px',
                                            borderRadius: '12px',
                                            border: `1px solid ${destName ? 'rgba(52, 211, 153, 0.3)' : 'rgba(255,255,255,0.08)'}`,
                                            background: destName ? 'rgba(52, 211, 153, 0.06)' : 'rgba(255,255,255,0.03)',
                                            color: destName ? '#6ee7b7' : '#71717a',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={e => {
                                            if (!destName) e.target.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                                        }}
                                        onMouseLeave={e => {
                                            if (!destName) e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                                        }}
                                    >
                                        <span style={{ fontSize: '18px' }}>{destName ? '✅' : '📂'}</span>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {destName || 'Pilih folder tujuan...'}
                                        </span>
                                    </button>
                                </div>

                                {/* Mode Toggle */}
                                <div>
                                    <label style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: '500', display: 'block', marginBottom: '10px' }}>
                                        Metode
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {[
                                            { value: 'copy', icon: '📋', label: 'Salin (Copy)', desc: 'File asli tetap di sumber' },
                                            { value: 'move', icon: '✂️', label: 'Pindah (Move)', desc: 'File dipindah ke tujuan' },
                                        ].map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setMode(opt.value)}
                                                style={{
                                                    flex: 1,
                                                    padding: '12px',
                                                    borderRadius: '12px',
                                                    border: `1.5px solid ${mode === opt.value ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255,255,255,0.06)'}`,
                                                    background: mode === opt.value
                                                        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(139, 92, 246, 0.08))'
                                                        : 'rgba(255,255,255,0.02)',
                                                    cursor: 'pointer',
                                                    textAlign: 'center',
                                                    transition: 'all 0.2s',
                                                }}
                                            >
                                                <div style={{ fontSize: '22px', marginBottom: '4px' }}>{opt.icon}</div>
                                                <div style={{
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    color: mode === opt.value ? '#c7d2fe' : '#a1a1aa',
                                                }}>{opt.label}</div>
                                                <div style={{
                                                    fontSize: '10px',
                                                    color: '#52525b',
                                                    marginTop: '2px',
                                                }}>{opt.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Move warning */}
                                {mode === 'move' && (
                                    <div style={{
                                        padding: '10px 14px',
                                        background: 'rgba(251, 191, 36, 0.06)',
                                        border: '1px solid rgba(251, 191, 36, 0.15)',
                                        borderRadius: '10px',
                                        fontSize: '11px',
                                        color: '#fbbf24',
                                        lineHeight: '1.5',
                                    }}>
                                        ⚠️ <strong>Mode Pindah:</strong> File akan disalin dulu ke tujuan, lalu sumber dihapus setelah verifikasi berhasil. Aman, tidak ada data hilang.
                                    </div>
                                )}

                                {/* Start Button */}
                                <button
                                    onClick={handleStart}
                                    disabled={!canStart}
                                    style={{
                                        width: '100%',
                                        padding: '14px 20px',
                                        borderRadius: '12px',
                                        border: 'none',
                                        background: canStart
                                            ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                                            : 'rgba(255,255,255,0.04)',
                                        color: canStart ? '#fff' : '#3f3f46',
                                        fontSize: '14px',
                                        fontWeight: '700',
                                        cursor: canStart ? 'pointer' : 'not-allowed',
                                        boxShadow: canStart ? '0 4px 20px rgba(99, 102, 241, 0.3)' : 'none',
                                        transition: 'all 0.3s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        marginTop: 'auto',
                                    }}
                                    onMouseEnter={e => {
                                        if (canStart) e.target.style.boxShadow = '0 6px 28px rgba(99, 102, 241, 0.45)';
                                    }}
                                    onMouseLeave={e => {
                                        if (canStart) e.target.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.3)';
                                    }}
                                >
                                    <span style={{ fontSize: '16px' }}>▶</span>
                                    Mulai Sortir{isTrial ? ` (Maks ${TRIAL_LIMIT} file)` : ''}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── RUNNING / DONE — Terminal + Progress ── */}
                    {(isRunning || isDone) && (
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '0',
                            minHeight: 0,
                        }}>
                            {/* Progress Bar */}
                            <div style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                                flexShrink: 0,
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '8px',
                                }}>
                                    <span style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: '500' }}>
                                        {isRunning ? '⏳ Sedang memproses...' : '✅ Selesai'}
                                    </span>
                                    <span style={{
                                        fontSize: '13px',
                                        color: '#c7d2fe',
                                        fontWeight: '700',
                                        fontVariantNumeric: 'tabular-nums',
                                    }}>
                                        {progress.current}/{progress.total} ({progressPercent}%)
                                    </span>
                                </div>
                                <div style={{
                                    width: '100%',
                                    height: '6px',
                                    borderRadius: '3px',
                                    background: 'rgba(255,255,255,0.06)',
                                    overflow: 'hidden',
                                }}>
                                    <div style={{
                                        width: `${progressPercent}%`,
                                        height: '100%',
                                        borderRadius: '3px',
                                        background: isDone
                                            ? 'linear-gradient(90deg, #34d399, #6ee7b7)'
                                            : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                        transition: 'width 0.3s ease, background 0.5s ease',
                                        boxShadow: isRunning ? '0 0 10px rgba(99,102,241,0.4)' : 'none',
                                    }} />
                                </div>
                            </div>

                            {/* Terminal Log */}
                            <div
                                ref={terminalRef}
                                style={{
                                    flex: 1,
                                    overflow: 'auto',
                                    background: '#09090b',
                                    fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
                                    fontSize: '12px',
                                    lineHeight: '1.7',
                                    padding: '14px 18px',
                                    minHeight: '200px',
                                }}
                            >
                                {logs.map((log, i) => {
                                    const style = getLogStyle(log.type);
                                    return (
                                        <div key={i} style={{ display: 'flex', gap: '8px', color: style.color }}>
                                            <span style={{ color: '#3f3f46', flexShrink: 0 }}>[{log.time}]</span>
                                            <span>{log.message}</span>
                                        </div>
                                    );
                                })}
                                {isRunning && (
                                    <div style={{ display: 'flex', gap: '8px', color: '#6366f1', animation: 'rawSorterBlink 1s infinite' }}>
                                        <span style={{ color: '#3f3f46' }}>▎</span>
                                    </div>
                                )}
                            </div>

                            {/* Summary Panel (after done) */}
                            {isDone && summary && (
                                <div style={{
                                    padding: '20px',
                                    borderTop: '1px solid rgba(255,255,255,0.06)',
                                    background: 'rgba(0,0,0,0.2)',
                                    flexShrink: 0,
                                }}>
                                    {/* Stats */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                                        gap: '10px',
                                        marginBottom: '16px',
                                    }}>
                                        <div style={{
                                            padding: '12px',
                                            borderRadius: '10px',
                                            background: 'rgba(52, 211, 153, 0.06)',
                                            border: '1px solid rgba(52, 211, 153, 0.12)',
                                            textAlign: 'center',
                                        }}>
                                            <div style={{ fontSize: '22px', fontWeight: '700', color: '#6ee7b7' }}>
                                                {summary.success}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#52525b', marginTop: '2px' }}>
                                                ✅ Berhasil
                                            </div>
                                        </div>
                                        {summary.notFound > 0 && (
                                            <div style={{
                                                padding: '12px',
                                                borderRadius: '10px',
                                                background: 'rgba(251, 191, 36, 0.06)',
                                                border: '1px solid rgba(251, 191, 36, 0.12)',
                                                textAlign: 'center',
                                            }}>
                                                <div style={{ fontSize: '22px', fontWeight: '700', color: '#fbbf24' }}>
                                                    {summary.notFound}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#52525b', marginTop: '2px' }}>
                                                    ⚠️ Tidak Ditemukan
                                                </div>
                                            </div>
                                        )}
                                        {summary.errors > 0 && (
                                            <div style={{
                                                padding: '12px',
                                                borderRadius: '10px',
                                                background: 'rgba(239, 68, 68, 0.06)',
                                                border: '1px solid rgba(239, 68, 68, 0.12)',
                                                textAlign: 'center',
                                            }}>
                                                <div style={{ fontSize: '22px', fontWeight: '700', color: '#f87171' }}>
                                                    {summary.errors}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#52525b', marginTop: '2px' }}>
                                                    ✕ Error
                                                </div>
                                            </div>
                                        )}
                                        {summary.trialLimited && summary.skippedByTrial > 0 && (
                                            <div style={{
                                                padding: '12px',
                                                borderRadius: '10px',
                                                background: 'rgba(168, 85, 247, 0.06)',
                                                border: '1px solid rgba(168, 85, 247, 0.12)',
                                                textAlign: 'center',
                                            }}>
                                                <div style={{ fontSize: '22px', fontWeight: '700', color: '#c084fc' }}>
                                                    {summary.skippedByTrial}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#52525b', marginTop: '2px' }}>
                                                    🔒 Dilewati (Trial)
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Trial upgrade CTA */}
                                    {summary.trialLimited && (
                                        <div style={{
                                            padding: '14px 18px',
                                            borderRadius: '12px',
                                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))',
                                            border: '1px solid rgba(139, 92, 246, 0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '12px',
                                            marginBottom: '16px',
                                        }}>
                                            <div style={{ fontSize: '13px', color: '#c4b5fd', lineHeight: '1.5' }}>
                                                🔓 Upgrade ke <strong>Basic</strong> untuk sortir semua <strong>{summary.total}</strong> file tanpa batas
                                            </div>
                                            <button
                                                onClick={() => {
                                                    handleClose();
                                                    // The upgrade modal is in the dashboard — we'll let the dashboard handle it
                                                    window.dispatchEvent(new CustomEvent('openUpgradeModal'));
                                                }}
                                                style={{
                                                    padding: '8px 18px',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                                                    color: '#fff',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    whiteSpace: 'nowrap',
                                                    flexShrink: 0,
                                                    transition: 'all 0.2s',
                                                    boxShadow: '0 2px 10px rgba(99,102,241,0.3)',
                                                }}
                                            >
                                                Upgrade →
                                            </button>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            onClick={() => {
                                                reset();
                                            }}
                                            style={{
                                                flex: 1,
                                                padding: '11px 16px',
                                                borderRadius: '10px',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                background: 'rgba(255,255,255,0.04)',
                                                color: '#d4d4d8',
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                            }}
                                            onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.08)'; }}
                                            onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.04)'; }}
                                        >
                                            🔄 Sortir Ulang
                                        </button>
                                        <button
                                            onClick={handleExportLog}
                                            style={{
                                                padding: '11px 16px',
                                                borderRadius: '10px',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                background: 'rgba(255,255,255,0.04)',
                                                color: '#a1a1aa',
                                                fontSize: '13px',
                                                fontWeight: '500',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                            }}
                                            onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.08)'; }}
                                            onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.04)'; }}
                                        >
                                            📥 Export Log
                                        </button>
                                        <button
                                            onClick={handleClose}
                                            style={{
                                                flex: 1,
                                                padding: '11px 16px',
                                                borderRadius: '10px',
                                                border: 'none',
                                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                color: '#fff',
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                boxShadow: '0 2px 12px rgba(99,102,241,0.25)',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            Tutup
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Abort button (while running) */}
                            {isRunning && (
                                <div style={{
                                    padding: '14px 20px',
                                    borderTop: '1px solid rgba(255,255,255,0.04)',
                                    flexShrink: 0,
                                    display: 'flex',
                                    justifyContent: 'center',
                                }}>
                                    <button
                                        onClick={abort}
                                        style={{
                                            padding: '10px 28px',
                                            borderRadius: '10px',
                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                            background: 'rgba(239, 68, 68, 0.08)',
                                            color: '#f87171',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                        }}
                                        onMouseEnter={e => { e.target.style.background = 'rgba(239, 68, 68, 0.15)'; }}
                                        onMouseLeave={e => { e.target.style.background = 'rgba(239, 68, 68, 0.08)'; }}
                                    >
                                        ⏹ Batalkan Proses
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* CSS Animations */}
            <style jsx global>{`
                @keyframes rawSorterSpin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes rawSorterBlink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
                
                /* Responsive: stack columns on smaller screens */
                @media (max-width: 680px) {
                    .raw-sorter-drawer-columns {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </>
    );
}
