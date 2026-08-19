"use client";

import { useState, useEffect, useRef } from 'react';

export default function DevWatermark() {
    const [showDevOverlay, setShowDevOverlay] = useState(false);
    const [versionData, setVersionData] = useState({
        enabled: process.env.NEXT_PUBLIC_SHOW_DEV_CREDIT !== 'false',
        release: 'v0.1.0',
        stack: 'Designed, built, and optimized with Next.js, SQLite, and custom styling.',
        status: 'Active Release',
        developer: {
            githubUrl: 'https://github.com/armansyam',
            logo: '/ams-logo.png'
        }
    });
    const popupRef = useRef(null);
    const btnRef = useRef(null);

    // Initial check from ENV
    const isEnvEnabled = process.env.NEXT_PUBLIC_SHOW_DEV_CREDIT !== 'false';

    useEffect(() => {
        if (!isEnvEnabled) return;

        let isMounted = true;
        fetch('/api/public/version')
            .then(res => res.json())
            .then(data => {
                if (isMounted && data) {
                    setVersionData(prev => ({
                        ...prev,
                        ...data,
                        enabled: data.enabled !== false && isEnvEnabled
                    }));
                }
            })
            .catch(() => {
                // Keep default state on network failure
            });

        return () => {
            isMounted = false;
        };
    }, [isEnvEnabled]);

    // Handle outside clicks and Esc key
    useEffect(() => {
        if (!showDevOverlay) return;

        const handleClickOutside = (e) => {
            if (
                popupRef.current && 
                !popupRef.current.contains(e.target) && 
                btnRef.current && 
                !btnRef.current.contains(e.target)
            ) {
                setShowDevOverlay(false);
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setShowDevOverlay(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [showDevOverlay]);

    // Do not render anything if disabled
    if (!isEnvEnabled || versionData.enabled === false) {
        return null;
    }

    const isUpdateAvailable = versionData.updateAvailable || false;

    return (
        <>
            {/* Developer Watermark Floating Button */}
            <button
                ref={btnRef}
                className="dev-watermark-btn"
                onClick={() => setShowDevOverlay(!showDevOverlay)}
                title="Developer Info"
                aria-label="Developer Credit & System Version"
            >
                <img
                    src={versionData.developer?.logo || "/ams-logo.png"}
                    alt="AMS Logo"
                    style={{ width: '38px', height: '38px', objectFit: 'contain' }}
                />
            </button>

            {/* Developer Watermark Modal / Popup */}
            {showDevOverlay && (
                <div 
                    ref={popupRef}
                    className="dev-watermark-popup"
                    role="dialog"
                    aria-modal="true"
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', fontWeight: 700 }}>
                            Developer Credit
                        </span>
                        <div 
                            className="dev-watermark-status"
                            style={isUpdateAvailable ? { background: '#fef3c7', borderColor: '#fde68a', color: '#92400e' } : {}}
                        >
                            <span 
                                className="dev-watermark-dot" 
                                style={isUpdateAvailable ? { background: '#f59e0b', boxShadow: '0 0 6px rgba(245, 158, 11, 0.6)' } : {}}
                            />
                            <span>{versionData.status || (isUpdateAvailable ? 'Update Tersedia' : 'Active Release')}</span>
                        </div>
                    </div>

                    <div>
                        <img
                            src={versionData.developer?.logo || "/ams-logo.png"}
                            alt="AMS Logo"
                            style={{ height: '36px', objectFit: 'contain', marginBottom: '8px', display: 'block' }}
                        />
                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
                            {versionData.stack || 'Designed, built, and optimized with Next.js, SQLite, and custom styling.'}
                        </p>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                        <span style={{ color: '#64748b' }}>System Version</span>
                        <strong style={{ color: '#1e293b', fontFamily: 'monospace', fontSize: '11.5px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                            {versionData.release || `v${versionData.version || '0.1.0'}`}
                        </strong>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <a
                            href={versionData.developer?.githubUrl || "https://github.com/armansyam"}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                flex: 1,
                                textAlign: 'center',
                                background: '#6366F1',
                                color: 'white',
                                padding: '8px 0',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 600,
                                textDecoration: 'none',
                                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.2)'
                            }}
                        >
                            GitHub Profile
                        </a>
                        <button
                            onClick={() => setShowDevOverlay(false)}
                            style={{
                                padding: '8px 12px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                background: 'white',
                                color: '#64748b',
                                fontSize: '12px',
                                cursor: 'pointer',
                                fontWeight: 600
                            }}
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
