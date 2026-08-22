"use client";

import React, { useState } from 'react';

// Crisp Minimalist SVG Icons (Strictly NO native platform emojis)
function PhoneIcon({ size = 16, color = "currentColor" }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
    );
}

function MapPinIcon({ size = 13, color = "currentColor" }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    );
}

function WhatsAppIcon({ size = 15, color = "currentColor" }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
    );
}

function ArrowRightIcon({ size = 14, color = "currentColor" }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
        </svg>
    );
}

function ExpandIcon({ size = 16, color = "currentColor" }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
        </svg>
    );
}

function CloseIcon({ size = 20, color = "currentColor" }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

export default function StudioPortalLanding({ vendor, subdomain, rootDomain, portfolioItems = [] }) {
    const [phone, setPhone] = useState('');
    const [searching, setSearching] = useState(false);
    const [result, setResult] = useState(null);
    const [autoRedirecting, setAutoRedirecting] = useState(false);
    const [activeLightbox, setActiveLightbox] = useState(null);

    const displayName = vendor?.brandName || vendor?.name || 'Studio Gallery';
    const cleanStudioWa = (vendor?.whatsapp || vendor?.studio_whatsapp || '').replace(/\D/g, '');
    const locationCity = vendor?.city ? vendor.city.trim().toUpperCase() : '';
    const hasPortfolio = Array.isArray(portfolioItems) && portfolioItems.length > 0;

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        const cleanPhone = phone.trim().replace(/\D/g, '');

        if (!cleanPhone || cleanPhone.length < 8) {
            setResult({
                searched: true,
                error: 'Nomor WhatsApp minimal 8 digit.'
            });
            return;
        }

        setSearching(true);
        setResult(null);

        try {
            const res = await fetch(`/api/studio/${encodeURIComponent(subdomain)}/lookup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: cleanPhone })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setResult({
                    searched: true,
                    projects: data.projects || [],
                    totalFound: data.totalFound || 0,
                    error: ''
                });

                if (data.projects && data.projects.length === 1 && data.projects[0].displayStatus === 'active') {
                    setAutoRedirecting(true);
                    setTimeout(() => {
                        window.location.href = data.projects[0].galleryUrl;
                    }, 1000);
                }
            } else {
                setResult({
                    searched: true,
                    projects: [],
                    totalFound: 0,
                    error: data.message || 'Galeri tidak ditemukan untuk nomor ini.'
                });
            }
        } catch (err) {
            setResult({
                searched: true,
                projects: [],
                totalFound: 0,
                error: 'Koneksi terganggu. Silakan coba lagi.'
            });
        } finally {
            setSearching(false);
        }
    };

    return (
        <div style={{
            minHeight: 'calc(100vh - 120px)',
            padding: hasPortfolio ? '48px 24px 80px' : '64px 24px 80px',
            boxSizing: 'border-box',
            background: 'radial-gradient(ellipse at top, #ffffff 0%, #fafaf9 100%)',
            display: 'flex',
            alignItems: hasPortfolio ? 'flex-start' : 'center',
            justifyContent: 'center'
        }}>
            <div style={{
                maxWidth: hasPortfolio ? '1080px' : '560px',
                width: '100%',
                margin: '0 auto',
                textAlign: 'center'
            }}>
                
                {/* 1. STUDIO EMBLEM / LOGO */}
                <div style={{ marginBottom: '20px' }}>
                    {vendor?.brandLogo ? (
                        <img 
                            src={vendor.brandLogo} 
                            alt={displayName} 
                            style={{ 
                                maxHeight: '84px', 
                                maxWidth: '220px', 
                                objectFit: 'contain', 
                                margin: '0 auto',
                                display: 'block',
                                filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.06))'
                            }} 
                        />
                    ) : (
                        <div style={{
                            width: '72px',
                            height: '72px',
                            borderRadius: '18px',
                            background: 'linear-gradient(135deg, #c5a059, #996515)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '28px',
                            fontWeight: 900,
                            color: '#ffffff',
                            margin: '0 auto',
                            boxShadow: '0 8px 24px rgba(197,160,89,0.25)'
                        }}>
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>

                {/* 2. STUDIO TITLE & CITY LOCATION */}
                <h1 style={{
                    fontSize: 'clamp(28px, 5vw, 40px)',
                    fontWeight: 800,
                    color: '#0f172a',
                    letterSpacing: '-0.025em',
                    margin: '0 0 8px 0',
                    lineHeight: 1.2
                }}>
                    {displayName}
                </h1>

                {locationCity && (
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '12px',
                        fontWeight: 700,
                        letterSpacing: '0.2em',
                        color: '#b48c36',
                        textTransform: 'uppercase',
                        marginBottom: '32px'
                    }}>
                        <MapPinIcon size={12} color="#b48c36" />
                        <span>{locationCity}</span>
                    </div>
                )}

                {/* 3. SLEEK WHITE SEARCH CAPSULE */}
                <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '24px',
                    padding: '24px 20px',
                    boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.07), 0 0 0 1px rgba(0,0,0,0.02)',
                    marginBottom: '20px',
                    maxWidth: '480px',
                    margin: '0 auto 20px auto'
                }}>
                    <div style={{
                        fontSize: '12px',
                        color: '#64748b',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        marginBottom: '14px',
                        textTransform: 'uppercase'
                    }}>
                        Akses Galeri Foto
                    </div>

                    <form onSubmit={handleSearch}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: '#f8fafc',
                            border: '1.5px solid #e2e8f0',
                            borderRadius: '30px',
                            padding: '4px 6px 4px 16px',
                            transition: 'all 0.2s ease'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginRight: '8px', color: '#94a3b8' }}>
                                <PhoneIcon size={15} color="#94a3b8" />
                            </div>
                            <input 
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Nomor WhatsApp (0812...)"
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#0f172a',
                                    fontSize: '13.5px',
                                    outline: 'none',
                                    padding: '9px 0',
                                    letterSpacing: '0.01em',
                                    fontWeight: 500
                                }}
                            />
                            <button
                                type="submit"
                                disabled={searching}
                                style={{
                                    background: 'linear-gradient(135deg, #c5a059, #996515)',
                                    border: 'none',
                                    color: '#ffffff',
                                    borderRadius: '24px',
                                    padding: '9px 20px',
                                    fontSize: '12.5px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 4px 12px rgba(197,160,89,0.3)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {searching ? (
                                    <span>...</span>
                                ) : (
                                    <>
                                        <span>Buka</span>
                                        <ArrowRightIcon size={12} color="#ffffff" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Result Feedback */}
                    {result && result.searched && (
                        <div style={{ marginTop: '16px', textAlign: 'left' }}>
                            {result.error && (
                                <div style={{
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    borderRadius: '12px',
                                    padding: '12px 14px',
                                    color: '#dc2626',
                                    fontSize: '12.5px'
                                }}>
                                    {result.error}
                                </div>
                            )}

                            {result.projects && result.projects.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {result.projects.map((proj) => {
                                        const isActive = proj.displayStatus === 'active';
                                        return (
                                            <a
                                                key={proj.id}
                                                href={isActive ? proj.galleryUrl : undefined}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    background: isActive ? '#f0fdf4' : '#f8fafc',
                                                    border: `1px solid ${isActive ? '#bbf7d0' : '#e2e8f0'}`,
                                                    borderRadius: '12px',
                                                    padding: '12px 16px',
                                                    textDecoration: 'none',
                                                    color: '#0f172a'
                                                }}
                                            >
                                                <div>
                                                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>{proj.name}</div>
                                                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                                                        {isActive ? `${proj.photoCount} Foto • Siap Dipilih` : 'Selesai'}
                                                    </div>
                                                </div>
                                                <div style={{
                                                    fontSize: '12px',
                                                    color: isActive ? '#15803d' : '#64748b',
                                                    fontWeight: 700,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}>
                                                    <span>{autoRedirecting ? 'Membuka...' : 'Masuk'}</span>
                                                    <ArrowRightIcon size={12} color="currentColor" />
                                                </div>
                                            </a>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 4. DIRECT STUDIO CONTACT ACTION */}
                {cleanStudioWa && (
                    <div style={{ marginBottom: hasPortfolio ? '48px' : '0px' }}>
                        <a 
                            href={`https://wa.me/${cleanStudioWa}?text=${encodeURIComponent(`Halo ${displayName}, saya ingin booking konsultasi sesi foto.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                color: '#334155',
                                padding: '9px 20px',
                                borderRadius: '24px',
                                fontSize: '12.5px',
                                fontWeight: 600,
                                textDecoration: 'none',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <WhatsAppIcon size={14} color="#059669" />
                            <span>Booking & Konsultasi Sesi Foto</span>
                        </a>
                    </div>
                )}

                {/* 5. AESTHETIC 4-CARD SHOWCASE PORTFOLIO (Only shown when Drive URL is configured & has photos) */}
                {hasPortfolio && (
                    <div style={{ paddingTop: '20px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                        <div style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.2em',
                            color: '#94a3b8',
                            textTransform: 'uppercase',
                            marginBottom: '20px'
                        }}>
                            Galeri Portofolio
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: '20px',
                            textAlign: 'left'
                        }}>
                            {portfolioItems.map((item) => (
                                <div 
                                    key={item.id}
                                    onClick={() => setActiveLightbox(item)}
                                    style={{
                                        background: '#ffffff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '16px',
                                        overflow: 'hidden',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                        position: 'relative'
                                    }}
                                >
                                    <div style={{
                                        position: 'relative',
                                        width: '100%',
                                        aspectRatio: '4/5',
                                        overflow: 'hidden',
                                        background: '#f1f5f9'
                                    }}>
                                        <img 
                                            src={item.image} 
                                            alt={displayName} 
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                display: 'block',
                                                transition: 'transform 0.5s ease'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        />
                                    </div>
                                    <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                                            {displayName}
                                        </div>
                                        <div style={{ color: '#94a3b8' }}>
                                            <ExpandIcon size={14} color="#94a3b8" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>

            {/* 6. MINIMAL LIGHTBOX MODAL */}
            {activeLightbox && (
                <div 
                    onClick={() => setActiveLightbox(null)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(15, 23, 42, 0.92)',
                        backdropFilter: 'blur(12px)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px'
                    }}
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            maxWidth: '720px',
                            width: '100%',
                            background: '#090d16',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '20px',
                            overflow: 'hidden',
                            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                            position: 'relative'
                        }}
                    >
                        <button
                            onClick={() => setActiveLightbox(null)}
                            style={{
                                position: 'absolute',
                                top: '14px',
                                right: '14px',
                                background: 'rgba(0,0,0,0.6)',
                                border: 'none',
                                color: '#ffffff',
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                zIndex: 10
                            }}
                        >
                            <CloseIcon size={18} color="#ffffff" />
                        </button>
                        <img 
                            src={activeLightbox.image} 
                            alt={displayName} 
                            style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', display: 'block', background: '#000' }}
                        />
                        <div style={{ padding: '16px 20px', background: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                                {displayName}
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
