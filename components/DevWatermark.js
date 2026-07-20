"use client";

import { useState } from 'react';

export default function DevWatermark() {
    const [showDevOverlay, setShowDevOverlay] = useState(false);

    return (
        <>
            {/* Developer Watermark Button */}
            <button 
                className="dev-watermark-btn" 
                onClick={() => setShowDevOverlay(!showDevOverlay)}
                title="Developer Info"
            >
                <img 
                    src="/ams-logo.png" 
                    alt="AMS Logo" 
                    style={{ width: '38px', height: '38px', objectFit: 'contain' }} 
                />
            </button>

            {/* Developer Watermark Popup */}
            {showDevOverlay && (
                <div className="dev-watermark-popup">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', fontWeight: 700 }}>Developer Credit</span>
                        <div className="dev-watermark-status">
                            <span className="dev-watermark-dot" />
                            <span>Active Release</span>
                        </div>
                    </div>
                    <div>
                        <img 
                            src="/ams-logo.png" 
                            alt="AMS Logo" 
                            style={{ height: '36px', objectFit: 'contain', marginBottom: '8px', display: 'block' }} 
                        />
                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
                            Designed, built, and optimized with Next.js, SQLite, and custom styling.
                        </p>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                        <span style={{ color: '#64748b' }}>System Version</span>
                        <strong style={{ color: '#1e293b' }}>v1.0.0</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <a 
                            href="https://github.com/armansyam"
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
