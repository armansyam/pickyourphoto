"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import useRawSorter from '@/hooks/useRawSorter';
import { 
    FolderIcon, LockIcon, CopyLinkIcon, SpeedBoltIcon, 
    SettingsManageIcon, RefreshCwIcon, SparklesUpgradeIcon,
    FileDocumentIcon, TerminalIcon, AppleIcon, WindowsIcon, InfoLightIcon,
    AlertTriangleIcon, CheckIcon, CloseIcon, ClockIcon
} from '@/components/StorageIcons.jsx';

/**
 * RawSorterDrawer — Full-featured centered modal for sorting RAW files
 * 
 * Props:
 *   isOpen              - boolean, controls modal visibility
 *   onClose             - function, called when modal should close
 *   project             - { id, name, status, selectedPhotosCount } from dashboard
 *   vendorPlan          - string, e.g. "free_trial", "limit_based", "storage_based"
 *   preloadedFileNames  - string[] (optional) — jika disediakan, skip API fetch
 *   preloadedTitle      - string (optional) — nama project untuk modal header
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
    const modalRef = useRef(null);

    const isTrial = vendorPlan === 'free_trial';
    const [TRIAL_LIMIT, setTrialLimit] = useState(5); // default, akan di-fetch dari admin settings

    const [showMagicGuide, setShowMagicGuide] = useState(false);
    const [copyFeedback, setCopyFeedback] = useState('');

    const sanitizeList = (arr) => {
        if (!Array.isArray(arr)) return [];
        return arr.map(f => {
            const noQuery = String(f || '').split('?')[0];
            const rawName = noQuery.split('/').pop() || '';
            try {
                return decodeURIComponent(rawName).trim();
            } catch (_) {
                return rawName.trim();
            }
        }).filter(n => n.length > 0);
    };

    const {
        sourceName, destName,
        isRunning, isDone,
        logs, progress, summary,
        isSupported,
        pickSourceFolder, pickDestFolder,
        runSorter, abort, reset, fullReset,
        downloadMagicScript
    } = useRawSorter();

    // Copy Lightroom Query string
    const handleCopyLightroom = useCallback(() => {
        if (!fileNames || fileNames.length === 0) return;
        const query = fileNames.map(f => {
            const dot = f.lastIndexOf('.');
            return dot > 0 ? f.substring(0, dot) : f;
        }).join(', ');

        navigator.clipboard.writeText(query).then(() => {
            setCopyFeedback('Query Lightroom Disalin!');
            setTimeout(() => setCopyFeedback(''), 2500);
        }).catch(() => {});
    }, [fileNames]);

    // Export simple text list
    const handleExportTxt = useCallback(() => {
        if (!fileNames || fileNames.length === 0) return;
        const text = fileNames.join('\n');
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `daftar_foto_${(projectName || 'seleksi').replace(/\s+/g, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [fileNames, projectName]);

    // Fetch selected file names when modal opens
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
            const cleanPreloaded = sanitizeList(preloadedFileNames);
            setFileNames(cleanPreloaded);
            setProjectName(preloadedTitle || project?.name || '');
            setTotalSelected(cleanPreloaded.length);
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
                    const cleanList = sanitizeList(data.fileNames || []);
                    setFileNames(cleanList);
                    setProjectName(data.projectName || project.name || '');
                    setTotalSelected(cleanList.length);
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
    }, [fileNames, mode, isTrial, runSorter, TRIAL_LIMIT]);

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
        <div
            onClick={() => !isRunning && handleClose()}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.78)',
                backdropFilter: 'blur(8px)',
                zIndex: 9998,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                animation: 'rawSorterFadeIn 0.2s ease',
            }}
        >
            {/* Centered Modal Container */}
            <div
                ref={modalRef}
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: '880px',
                    maxHeight: '90vh',
                    background: 'linear-gradient(180deg, #0e111a 0%, #121422 100%)',
                    borderRadius: '16px',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(99, 102, 241, 0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    animation: 'rawSorterPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
            >
                {/* ── HEADER ── */}
                <div style={{
                    padding: '18px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    background: 'rgba(99, 102, 241, 0.03)',
                    flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.35)',
                        }}>
                            <FolderIcon size={20} color="#fff" />
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <h2 style={{
                                margin: 0,
                                fontSize: '17px',
                                fontWeight: '700',
                                color: '#f4f4f5',
                                letterSpacing: '-0.01em',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}>
                                RAW Sorter
                            </h2>
                            <p style={{
                                margin: '2px 0 0',
                                fontSize: '12px',
                                color: '#818cf8',
                                fontWeight: '500',
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
                                border: '1px solid rgba(99, 102, 241, 0.25)',
                            }}>
                                {totalSelected} foto dipilih
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isRunning}
                            style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '10px',
                                border: '1px solid rgba(255,255,255,0.08)',
                                background: 'rgba(255,255,255,0.04)',
                                color: '#94a3b8',
                                cursor: isRunning ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                                opacity: isRunning ? 0.4 : 1,
                            }}
                            onMouseEnter={e => { if (!isRunning) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#f4f4f5'; }}}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94a3b8'; }}
                        >
                            <CloseIcon size={16} />
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

                    {/* Trial warning banner */}
                    {isTrial && (
                        <div style={{
                            margin: '14px 20px 0',
                            padding: '10px 14px',
                            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(139, 92, 246, 0.12))',
                            border: '1px solid rgba(168, 85, 247, 0.2)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            fontSize: '12px',
                            color: '#c4b5fd',
                            lineHeight: '1.5',
                        }}>
                            <LockIcon size={16} color="#c084fc" />
                            <div>
                                <strong style={{ color: '#ddd6fe' }}>Free Trial</strong> — Hanya <strong>{TRIAL_LIMIT} file pertama</strong> yang akan disortir.
                                Upgrade untuk sortir semua file tanpa batas.
                            </div>
                        </div>
                    )}

                    {/* ── TWO-COLUMN SETUP AREA ── */}
                    {!isRunning && !isDone && (
                        <div className="raw-sorter-modal-columns" style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '0',
                            minHeight: 0,
                            flex: 1,
                        }}>
                            {/* LEFT COLUMN: File List */}
                            <div style={{
                                padding: '18px 20px',
                                borderRight: '1px solid rgba(255,255,255,0.05)',
                                display: 'flex',
                                flexDirection: 'column',
                                minHeight: 0,
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <h3 style={{
                                        margin: 0,
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        color: '#a1a1aa',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.06em',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                    }}>
                                        <FileDocumentIcon size={13} color="#818cf8" />
                                        <span>Daftar File Terpilih</span>
                                    </h3>
                                    {copyFeedback && (
                                        <span style={{ fontSize: '11px', color: '#34d399', fontWeight: '600', animation: 'fadeIn 0.2s ease', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <CheckIcon size={12} color="#34d399" />
                                            <span>{copyFeedback}</span>
                                        </span>
                                    )}
                                </div>

                                {loadingFiles ? (
                                    <div style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#52525b',
                                        fontSize: '13px',
                                        minHeight: '220px',
                                    }}>
                                        <div style={{
                                            width: '20px', height: '20px',
                                            border: '2px solid rgba(99,102,241,0.2)',
                                            borderTop: '2px solid #6366f1',
                                            borderRadius: '50%',
                                            animation: 'rawSorterSpin 0.8s linear infinite',
                                            marginRight: '10px',
                                        }} />
                                        Memuat daftar file...
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
                                        <CloseIcon size={14} color="#f87171" style={{ display: 'inline', marginRight: '6px' }} />
                                        {fetchError}
                                    </div>
                                ) : (
                                    <>
                                        <div style={{
                                            flex: 1,
                                            overflow: 'auto',
                                            borderRadius: '10px',
                                            background: 'rgba(0, 0, 0, 0.25)',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            padding: '6px',
                                            marginBottom: '12px',
                                            minHeight: '220px',
                                            maxHeight: '340px',
                                        }}>
                                            {fileNames.length === 0 ? (
                                                <div style={{
                                                    padding: '32px 16px',
                                                    textAlign: 'center',
                                                    color: '#52525b',
                                                    fontSize: '12px',
                                                }}>
                                                    Belum ada foto yang dipilih klien
                                                </div>
                                            ) : (
                                                fileNames.map((name, i) => {
                                                    const isLockedTrial = isTrial && i >= TRIAL_LIMIT;
                                                    return (
                                                        <div
                                                            key={i}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                padding: '6px 10px',
                                                                borderRadius: '6px',
                                                                fontSize: '11.5px',
                                                                fontFamily: 'monospace',
                                                                color: isLockedTrial ? '#52525b' : '#cbd5e1',
                                                                background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                                                                opacity: isLockedTrial ? 0.5 : 1,
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                                                <span style={{ color: '#52525b', fontSize: '10px', width: '22px', textAlign: 'right', flexShrink: 0 }}>
                                                                    {i + 1}
                                                                </span>
                                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {name}
                                                                </span>
                                                            </div>
                                                            {isLockedTrial && (
                                                                <span style={{
                                                                    fontSize: '9.5px',
                                                                    color: '#a855f7',
                                                                    background: 'rgba(168,85,247,0.1)',
                                                                    padding: '2px 6px',
                                                                    borderRadius: '4px',
                                                                    flexShrink: 0,
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '3px'
                                                                }}>
                                                                    <LockIcon size={9} color="#a855f7" />
                                                                    <span>trial limit</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>

                                        {/* Quick Export Tools under list */}
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                type="button"
                                                onClick={handleCopyLightroom}
                                                disabled={fileNames.length === 0}
                                                style={{
                                                    flex: 1,
                                                    padding: '9px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    color: '#cbd5e1',
                                                    fontSize: '11px',
                                                    fontWeight: '600',
                                                    cursor: fileNames.length === 0 ? 'not-allowed' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    transition: 'all 0.2s',
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                                            >
                                                <CopyLinkIcon size={12} color="#a5b4fc" />
                                                <span>Salin Query Lightroom</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleExportTxt}
                                                disabled={fileNames.length === 0}
                                                style={{
                                                    padding: '9px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    color: '#94a3b8',
                                                    fontSize: '11px',
                                                    fontWeight: '500',
                                                    cursor: fileNames.length === 0 ? 'not-allowed' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    transition: 'all 0.2s',
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                                            >
                                                <FileDocumentIcon size={12} color="#94a3b8" />
                                                <span>Export .TXT</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* RIGHT COLUMN: Folder Picker & Magic-Sort Controls */}
                            <div style={{
                                padding: '18px 20px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                overflowY: 'auto',
                            }}>
                                {/* ── JIKA BROWSER TIDAK MENDUKUNG: MAGIC-SORT NAIK JADI HIGHLIGHT UTAMA DI ATAS ── */}
                                {!isSupported ? (
                                    <>
                                        {/* Magic-Sort Card as Top Highlight */}
                                        <div style={{
                                            padding: '14px 16px',
                                            borderRadius: '12px',
                                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.05))',
                                            border: '1px solid rgba(139, 92, 246, 0.25)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '10px',
                                        }}>
                                            {/* Magic Sort Header */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <SparklesUpgradeIcon size={15} color="#c084fc" />
                                                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#f5f3ff' }}>
                                                        Magic-Sort (1-Klik)
                                                    </span>
                                                </div>
                                                <span style={{
                                                    fontSize: '10px',
                                                    fontWeight: '600',
                                                    background: 'rgba(99, 102, 241, 0.2)',
                                                    color: '#c4b5fd',
                                                    padding: '2px 8px',
                                                    borderRadius: '6px',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}>
                                                    <SpeedBoltIcon size={10} color="#fbbf24" />
                                                    <span>Opsi Rekomendasi</span>
                                                </span>
                                            </div>

                                            {/* Copywriting Singkat & Padat */}
                                            <p style={{
                                                margin: 0,
                                                fontSize: '11.5px',
                                                color: '#cbd5e1',
                                                lineHeight: '1.45',
                                            }}>
                                                Sortir otomatis tanpa browser. Unduh skrip, letakkan di folder RAW, lalu klik ganda (*double click*).
                                            </p>

                                            {/* 2 Download Buttons */}
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => downloadMagicScript(fileNames, projectName, 'mac', mode)}
                                                    disabled={fileNames.length === 0}
                                                    style={{
                                                        flex: 1,
                                                        padding: '9px 12px',
                                                        borderRadius: '8px',
                                                        border: '1px solid rgba(255,255,255,0.12)',
                                                        background: 'rgba(255,255,255,0.06)',
                                                        color: '#ffffff',
                                                        fontSize: '12px',
                                                        fontWeight: '600',
                                                        cursor: fileNames.length === 0 ? 'not-allowed' : 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px',
                                                        transition: 'all 0.15s',
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                                                >
                                                    <AppleIcon size={13} color="#fff" />
                                                    <span>Mac (.command)</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => downloadMagicScript(fileNames, projectName, 'windows', mode)}
                                                    disabled={fileNames.length === 0}
                                                    style={{
                                                        flex: 1,
                                                        padding: '9px 12px',
                                                        borderRadius: '8px',
                                                        border: '1px solid rgba(59, 130, 246, 0.3)',
                                                        background: 'rgba(59, 130, 246, 0.12)',
                                                        color: '#93c5fd',
                                                        fontSize: '12px',
                                                        fontWeight: '600',
                                                        cursor: fileNames.length === 0 ? 'not-allowed' : 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px',
                                                        transition: 'all 0.15s',
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.22)'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.12)'; }}
                                                >
                                                    <WindowsIcon size={12} color="#93c5fd" />
                                                    <span>Windows (.bat)</span>
                                                </button>
                                            </div>

                                            {/* Collapsible Accordion Guide (Default Hidden) */}
                                            <div style={{
                                                borderRadius: '6px',
                                                background: 'rgba(0, 0, 0, 0.25)',
                                                border: '1px solid rgba(255, 255, 255, 0.04)',
                                                overflow: 'hidden',
                                            }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowMagicGuide(!showMagicGuide)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '7px 10px',
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: '#94a3b8',
                                                        fontSize: '10.5px',
                                                        fontWeight: '500',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        transition: 'background 0.15s',
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.color = '#cbd5e1'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
                                                >
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                                        <InfoLightIcon size={12} color="#818cf8" />
                                                        <span>Panduan Singkat (3 Langkah)</span>
                                                    </span>
                                                    <span style={{ fontSize: '9px', color: '#818cf8' }}>{showMagicGuide ? '▲ Tutup' : '▼ Lihat'}</span>
                                                </button>

                                                {showMagicGuide && (
                                                    <div style={{
                                                        padding: '8px 10px',
                                                        borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                                                        fontSize: '10.5px',
                                                        color: '#94a3b8',
                                                        lineHeight: '1.5',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '4px',
                                                        animation: 'fadeIn 0.15s ease',
                                                    }}>
                                                        <div>1. <strong>Unduh:</strong> Pilih skrip Mac atau Windows di atas.</div>
                                                        <div>2. <strong>Pindahkan:</strong> Taruh file skrip ke folder foto RAW Anda.</div>
                                                        <div>3. <strong>Jalankan:</strong> Klik ganda skrip untuk sortir instan.</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Compact Locked Browser Info */}
                                        <div style={{
                                            padding: '12px 14px',
                                            borderRadius: '10px',
                                            background: 'rgba(255, 255, 255, 0.02)',
                                            border: '1px solid rgba(255, 255, 255, 0.06)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            opacity: 0.65,
                                        }}>
                                            <LockIcon size={16} color="#fbbf24" />
                                            <div>
                                                <div style={{ fontSize: '11px', fontWeight: '600', color: '#a1a1aa' }}>
                                                    Sortir Langsung di Browser Terkunci
                                                </div>
                                                <div style={{ fontSize: '10px', color: '#71717a', marginTop: '1px' }}>
                                                    Browser ini (Brave/Safari/Firefox) membatasi akses folder web demi privasi. Buka lewat Google Chrome / Edge untuk sortir langsung di browser.
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    /* ── JIKA BROWSER MENDUKUNG (CHROME / EDGE): TAMPILKAN NATIVE SORTER + MAGIC SORT DI BAWAH ── */
                                    <>
                                        <h3 style={{
                                            margin: 0,
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            color: '#a1a1aa',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.06em',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                        }}>
                                            <SettingsManageIcon size={13} color="#818cf8" />
                                            <span>Pengaturan Sortir</span>
                                        </h3>

                                        {/* Source Folder Picker */}
                                        <div>
                                            <label style={{ fontSize: '11.5px', color: '#a1a1aa', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
                                                Folder Sumber (RAW Files)
                                            </label>
                                            <button
                                                type="button"
                                                onClick={pickSourceFolder}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 14px',
                                                    borderRadius: '10px',
                                                    border: `1px solid ${sourceName ? 'rgba(52, 211, 153, 0.3)' : 'rgba(255,255,255,0.08)'}`,
                                                    background: sourceName ? 'rgba(52, 211, 153, 0.06)' : 'rgba(255,255,255,0.03)',
                                                    color: sourceName ? '#6ee7b7' : '#71717a',
                                                    fontSize: '12px',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    transition: 'all 0.2s',
                                                }}
                                                onMouseEnter={e => { if (!sourceName) e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)'; }}
                                                onMouseLeave={e => { if (!sourceName) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                                            >
                                                {sourceName ? <CheckIcon size={14} color="#34d399" /> : <FolderIcon size={14} color="#818cf8" />}
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {sourceName || 'Pilih folder sumber...'}
                                                </span>
                                            </button>
                                        </div>

                                        {/* Destination Folder Picker */}
                                        <div>
                                            <label style={{ fontSize: '11.5px', color: '#a1a1aa', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
                                                Folder Tujuan
                                            </label>
                                            <button
                                                type="button"
                                                onClick={pickDestFolder}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 14px',
                                                    borderRadius: '10px',
                                                    border: `1px solid ${destName ? 'rgba(52, 211, 153, 0.3)' : 'rgba(255,255,255,0.08)'}`,
                                                    background: destName ? 'rgba(52, 211, 153, 0.06)' : 'rgba(255,255,255,0.03)',
                                                    color: destName ? '#6ee7b7' : '#71717a',
                                                    fontSize: '12px',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    transition: 'all 0.2s',
                                                }}
                                                onMouseEnter={e => { if (!destName) e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)'; }}
                                                onMouseLeave={e => { if (!destName) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                                            >
                                                {destName ? <CheckIcon size={14} color="#34d399" /> : <FolderIcon size={14} color="#818cf8" />}
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {destName || 'Pilih folder tujuan...'}
                                                </span>
                                            </button>
                                        </div>

                                        {/* Mode Toggle */}
                                        <div>
                                            <label style={{ fontSize: '11.5px', color: '#a1a1aa', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
                                                Metode
                                            </label>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {[
                                                    { value: 'copy', label: 'Salin (Copy)', desc: 'File asli tetap di sumber' },
                                                    { value: 'move', label: 'Pindah (Move)', desc: 'File dipindah ke tujuan' },
                                                ].map(opt => (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => setMode(opt.value)}
                                                        style={{
                                                            flex: 1,
                                                            padding: '8px',
                                                            borderRadius: '10px',
                                                            border: `1.5px solid ${mode === opt.value ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255,255,255,0.06)'}`,
                                                            background: mode === opt.value
                                                                ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(139, 92, 246, 0.08))'
                                                                : 'rgba(255,255,255,0.02)',
                                                            cursor: 'pointer',
                                                            textAlign: 'center',
                                                            transition: 'all 0.2s',
                                                        }}
                                                    >
                                                        <div style={{
                                                            fontSize: '11.5px',
                                                            fontWeight: '700',
                                                            color: mode === opt.value ? '#c7d2fe' : '#a1a1aa',
                                                        }}>{opt.label}</div>
                                                        <div style={{
                                                            fontSize: '9.5px',
                                                            color: '#71717a',
                                                            marginTop: '2px',
                                                        }}>{opt.desc}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Start Button */}
                                        <button
                                            type="button"
                                            onClick={handleStart}
                                            disabled={!canStart}
                                            style={{
                                                width: '100%',
                                                padding: '11px 16px',
                                                borderRadius: '10px',
                                                border: 'none',
                                                background: canStart
                                                    ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                                                    : 'rgba(255,255,255,0.04)',
                                                color: canStart ? '#fff' : '#52525b',
                                                fontSize: '12.5px',
                                                fontWeight: '700',
                                                cursor: canStart ? 'pointer' : 'not-allowed',
                                                boxShadow: canStart ? '0 4px 20px rgba(99, 102, 241, 0.3)' : 'none',
                                                transition: 'all 0.3s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                            }}
                                        >
                                            <SpeedBoltIcon size={13} color="#fff" />
                                            <span>Mulai Sortir di Browser{isTrial ? ` (Maks ${TRIAL_LIMIT})` : ''}</span>
                                        </button>

                                        {/* ── MAGIC-SORT CARD (DI BAWAH UNTUK CHROME) ── */}
                                        <div style={{
                                            marginTop: '2px',
                                            padding: '12px 14px',
                                            borderRadius: '10px',
                                            background: 'rgba(255, 255, 255, 0.02)',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <SparklesUpgradeIcon size={14} color="#a5b4fc" />
                                                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#f4f4f5' }}>
                                                        Magic-Sort
                                                    </span>
                                                </div>
                                                <span style={{
                                                    fontSize: '9.5px',
                                                    color: '#818cf8',
                                                    background: 'rgba(99, 102, 241, 0.1)',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                }}>
                                                    Opsi Skrip Otomatis
                                                </span>
                                            </div>

                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => downloadMagicScript(fileNames, projectName, 'mac', mode)}
                                                    disabled={fileNames.length === 0}
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px 10px',
                                                        borderRadius: '8px',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        background: 'rgba(255,255,255,0.04)',
                                                        color: '#f4f4f5',
                                                        fontSize: '11px',
                                                        fontWeight: '600',
                                                        cursor: fileNames.length === 0 ? 'not-allowed' : 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '5px',
                                                        transition: 'all 0.15s',
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                                >
                                                    <AppleIcon size={12} color="#fff" />
                                                    <span>Mac (.command)</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => downloadMagicScript(fileNames, projectName, 'windows', mode)}
                                                    disabled={fileNames.length === 0}
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px 10px',
                                                        borderRadius: '8px',
                                                        border: '1px solid rgba(59, 130, 246, 0.25)',
                                                        background: 'rgba(59, 130, 246, 0.1)',
                                                        color: '#93c5fd',
                                                        fontSize: '11px',
                                                        fontWeight: '600',
                                                        cursor: fileNames.length === 0 ? 'not-allowed' : 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '5px',
                                                        transition: 'all 0.15s',
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.18)'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'; }}
                                                >
                                                    <WindowsIcon size={11} color="#93c5fd" />
                                                    <span>Windows (.bat)</span>
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── RUNNING & COMPLETED VIEW ── */}
                    {(isRunning || isDone) && (
                        <div style={{
                            padding: '20px 24px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            flex: 1,
                            minHeight: 0,
                        }}>
                            {/* Progress Header */}
                            <div style={{
                                padding: '16px 20px',
                                borderRadius: '12px',
                                background: isDone ? 'rgba(52, 211, 153, 0.06)' : 'rgba(99, 102, 241, 0.06)',
                                border: `1px solid ${isDone ? 'rgba(52, 211, 153, 0.2)' : 'rgba(99, 102, 241, 0.2)'}`,
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '600', color: isDone ? '#6ee7b7' : '#c7d2fe', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {isRunning ? (
                                            <>
                                                <RefreshCwIcon size={14} color="#a5b4fc" style={{ animation: 'rawSorterSpin 1s linear infinite' }} />
                                                <span>Sedang memproses...</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckIcon size={15} color="#34d399" />
                                                <span>Proses Sortir Selesai</span>
                                            </>
                                        )}
                                    </span>
                                    <span style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: '700', color: '#f4f4f5' }}>
                                        {progress.current} / {progress.total} ({progressPercent}%)
                                    </span>
                                </div>

                                {/* Progress Bar */}
                                <div style={{
                                    height: '6px',
                                    borderRadius: '3px',
                                    background: 'rgba(255,255,255,0.06)',
                                    overflow: 'hidden',
                                }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${progressPercent}%`,
                                        background: isDone
                                            ? 'linear-gradient(90deg, #10b981, #34d399)'
                                            : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                        borderRadius: '3px',
                                        transition: 'width 0.2s ease',
                                    }} />
                                </div>
                            </div>

                            {/* Live Terminal Log */}
                            <div
                                ref={terminalRef}
                                style={{
                                    flex: 1,
                                    minHeight: '160px',
                                    maxHeight: '260px',
                                    overflow: 'auto',
                                    borderRadius: '10px',
                                    background: '#07070b',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    padding: '12px 14px',
                                    fontFamily: 'monospace',
                                    fontSize: '11px',
                                    lineHeight: '1.7',
                                }}
                            >
                                {logs.map((log, i) => {
                                    const style = getLogStyle(log.type);
                                    return (
                                        <div key={i} style={{ color: style.color, display: 'flex', gap: '8px' }}>
                                            <span style={{ color: '#52525b', flexShrink: 0 }}>[{log.time}]</span>
                                            <span style={{ flexShrink: 0, fontWeight: '700' }}>{style.icon}</span>
                                            <span style={{ wordBreak: 'break-all' }}>{log.message}</span>
                                        </div>
                                    );
                                })}
                                {isRunning && (
                                    <div style={{ color: '#6366f1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ animation: 'rawSorterBlink 1s infinite' }}>▋</span>
                                        <span>Memproses...</span>
                                    </div>
                                )}
                            </div>

                            {/* Summary Card (when done) */}
                            {isDone && summary && (
                                <div style={{
                                    padding: '16px 20px',
                                    borderRadius: '12px',
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                }}>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                                        gap: '12px',
                                        marginBottom: '14px',
                                    }}>
                                        <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(52, 211, 153, 0.06)', borderRadius: '8px' }}>
                                            <div style={{ fontSize: '18px', fontWeight: '800', color: '#34d399' }}>{summary.found}</div>
                                            <div style={{ fontSize: '10.5px', color: '#a1a1aa', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                <CheckIcon size={10} color="#34d399" />
                                                <span>Berhasil</span>
                                            </div>
                                        </div>

                                        {summary.notFound > 0 && (
                                            <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(251, 191, 36, 0.06)', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '18px', fontWeight: '800', color: '#fbbf24' }}>{summary.notFound}</div>
                                                <div style={{ fontSize: '10.5px', color: '#a1a1aa', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                    <AlertTriangleIcon size={10} color="#fbbf24" />
                                                    <span>Tidak Ditemukan</span>
                                                </div>
                                            </div>
                                        )}

                                        {summary.errors > 0 && (
                                            <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(239, 68, 68, 0.06)', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '18px', fontWeight: '800', color: '#f87171' }}>{summary.errors}</div>
                                                <div style={{ fontSize: '10.5px', color: '#a1a1aa', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                    <CloseIcon size={10} color="#f87171" />
                                                    <span>Error</span>
                                                </div>
                                            </div>
                                        )}

                                        {summary.skippedTrial > 0 && (
                                            <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(192, 132, 252, 0.06)', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '18px', fontWeight: '800', color: '#c084fc' }}>{summary.skippedTrial}</div>
                                                <div style={{ fontSize: '10.5px', color: '#a1a1aa', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                    <LockIcon size={10} color="#c084fc" />
                                                    <span>Trial Limit</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                        <button
                                            type="button"
                                            onClick={handleExportLog}
                                            style={{
                                                padding: '8px 14px',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                background: 'rgba(255,255,255,0.04)',
                                                color: '#cbd5e1',
                                                fontSize: '12px',
                                                fontWeight: '500',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                            }}
                                        >
                                            <FileDocumentIcon size={13} color="#cbd5e1" />
                                            <span>Export Log (.txt)</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={fullReset}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                color: '#fff',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                            }}
                                        >
                                            <RefreshCwIcon size={12} color="#fff" />
                                            <span>Sortir Lagi</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Cancel Button while running */}
                            {isRunning && (
                                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px' }}>
                                    <button
                                        type="button"
                                        onClick={abort}
                                        style={{
                                            padding: '8px 20px',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                            background: 'rgba(239, 68, 68, 0.08)',
                                            color: '#f87171',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                        }}
                                    >
                                        <CloseIcon size={13} color="#f87171" />
                                        <span>Batalkan Proses</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* CSS Animations */}
            <style jsx global>{`
                @keyframes rawSorterFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes rawSorterPopIn {
                    from { opacity: 0; transform: scale(0.96) translateY(8px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes rawSorterSpin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes rawSorterBlink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
                
                @media (max-width: 720px) {
                    .raw-sorter-modal-columns {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
}
