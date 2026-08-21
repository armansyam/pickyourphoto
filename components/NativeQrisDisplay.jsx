'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SparklesUpgradeIcon, RefreshCwIcon, ClockIcon } from '@/components/StorageIcons.jsx';
import InlineWhatsappContact from '@/components/InlineWhatsappContact';

export default function NativeQrisDisplay({ pendingOrder, onCancel, platformName, onExpired }) {
    const brandTitle = platformName || pendingOrder?.platformName || pendingOrder?.saasName || 'Photota';
    // Deteksi provider dari pendingOrder (dikirim dari /api/payment/create response)
    const provider = (pendingOrder?.provider || 'midtrans').toLowerCase();
    const isMidtrans = provider === 'midtrans';
    const isDirectQr = Boolean(
        pendingOrder?.qrImage || 
        pendingOrder?.qrUrl || 
        provider === 'ipaymu'
    );
    const [timeLeft, setTimeLeft] = useState('');
    const [isExpired, setIsExpired] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [statusNotice, setStatusNotice] = useState(null);
    const [paidSuccess, setPaidSuccess] = useState(false);
    const [redirectCountdown, setRedirectCountdown] = useState(5);
    const snapEmbedDone = useRef(false);

    // Live countdown timer
    useEffect(() => {
        if (!pendingOrder?.expiresAt) return;
        snapEmbedDone.current = false; // reset on new order

        const update = () => {
            const diff = new Date(pendingOrder.expiresAt).getTime() - Date.now();
            if (diff <= 0) {
                setTimeLeft('00:00');
                setIsExpired(true);
                if (onExpired) onExpired(pendingOrder);
                return;
            }
            const s = Math.floor(diff / 1000);
            setTimeLeft(`${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`);
        };
        update();
        const t = setInterval(update, 1000);
        return () => clearInterval(t);
    }, [pendingOrder?.expiresAt]);

    // Auto polling every 3 seconds
    useEffect(() => {
        if (!pendingOrder?.orderId || isExpired || paidSuccess) return;

        const check = async () => {
            try {
                const res = await fetch(`/api/payment/status?orderId=${pendingOrder.orderId}`);
                const data = await res.json();
                if (data.paid) {
                    window.__paymentRedirectUrl = data.redirectUrl || '/dashboard';
                    setPaidSuccess(true);
                }
            } catch {}
        };

        check();
        const poll = setInterval(check, 3000);
        return () => clearInterval(poll);
    }, [pendingOrder?.orderId, isExpired, paidSuccess]);

    // Dynamically load Midtrans snap.js script — ONLY for Midtrans provider
    useEffect(() => {
        if (!isMidtrans) return; // Skip entirely for Xendit, Tripay, Duitku, Doku
        if (typeof window === 'undefined') return;
        if (window.snap) return;

        const loadSnapScript = async () => {
            try {
                const res = await fetch('/api/settings');
                const s = await res.json();
                const clientKey = s.payment_gateway_client_key || '';
                const isProd = s.payment_gateway_is_production === '1' || s.payment_gateway_is_production === true;
                
                const snapUrl = isProd
                    ? 'https://app.midtrans.com/snap/snap.js'
                    : 'https://app.sandbox.midtrans.com/snap/snap.js';

                if (!document.querySelector(`script[src="${snapUrl}"]`)) {
                    const script = document.createElement('script');
                    script.src = snapUrl;
                    if (clientKey) script.setAttribute('data-client-key', clientKey);
                    script.async = true;
                    document.body.appendChild(script);
                }
            } catch (e) {
                console.error('[NativeQrisDisplay] Failed to load Midtrans Snap script:', e);
            }
        };

        loadSnapScript();
    }, [isMidtrans]);

    // Snap embed — ONLY for Midtrans (other providers use iframe redirect instead)
    useEffect(() => {
        if (!isMidtrans || !pendingOrder?.token || snapEmbedDone.current || paidSuccess) return;

        let isMounted = true;
        const tryEmbed = () => {
            if (!isMounted) return;
            if (typeof window !== 'undefined' && window.snap && typeof window.snap.embed === 'function') {
                snapEmbedDone.current = true;
                try {
                    if (typeof window.snap.hide === 'function') {
                        try { window.snap.hide(); } catch (e) {}
                    }
                    const container = document.getElementById('midtrans-snap-embed');
                    if (container) container.innerHTML = '';

                    window.snap.embed(pendingOrder.token, {
                        embedId: 'midtrans-snap-embed',
                        onSuccess: async () => {
                            try {
                                await fetch(`/api/payment/status?orderId=${pendingOrder.orderId}`);
                            } catch (e) {}
                            window.__paymentRedirectUrl = '/dashboard';
                            setPaidSuccess(true);
                        },
                        onPending: () => {},
                        onError: () => {},
                        onClose: () => {},
                    });
                } catch (err) {
                    console.warn('[Snap Embed Warning Ignored]:', err);
                }
            } else {
                setTimeout(tryEmbed, 300);
            }
        };
        tryEmbed();

        return () => {
            isMounted = false;
        };
    }, [isMidtrans, pendingOrder?.token, paidSuccess]);

    const triggerRedirectToDashboard = async () => {
        try {
            await fetch(`/api/payment/status?orderId=${pendingOrder.orderId}`);
        } catch (e) {}
        window.location.href = window.__paymentRedirectUrl || '/dashboard';
    };

    // Redirect countdown after success
    useEffect(() => {
        if (!paidSuccess) return;
        setRedirectCountdown(5);
        const t = setInterval(() => {
            setRedirectCountdown(p => {
                if (p <= 1) { 
                    clearInterval(t); 
                    triggerRedirectToDashboard();
                    return 0; 
                }
                return p - 1;
            });
        }, 1000);
        return () => clearInterval(t);
    }, [paidSuccess]);

    const isUrgent = timeLeft && timeLeft < '05:00' && !isExpired;

    return (
        <>
            {/* ===== SUCCESS OVERLAY ===== */}
            {paidSuccess && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ background: 'linear-gradient(145deg,#0d1f17,#0a2e1c)', border: '1.5px solid #22c55e', borderRadius: '24px', padding: '40px 32px', textAlign: 'center', maxWidth: '360px', width: '90%', boxShadow: '0 0 60px rgba(34,197,94,0.25),0 24px 48px rgba(0,0,0,0.6)', animation: 'scaleIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275)' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg,#16a34a,#22c55e)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', boxShadow: '0 0 28px rgba(34,197,94,0.4)' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                        <h3 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: '800', color: '#4ade80' }}>Pembayaran Telah Diterima</h3>
                        <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#cbd5e1' }}>Akun <strong style={{ color: '#fff' }}>{pendingOrder.email}</strong> telah aktif.</p>
                        <p style={{ margin: '0 0 24px', fontSize: '12px', color: '#64748b' }}>Paket <strong style={{ color: '#818cf8' }}>{pendingOrder.planName}</strong> telah berjalan.</p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px' }}>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Mengarahkan dalam</span>
                            <span style={{ fontSize: '22px', fontWeight: '900', color: '#fbbf24' }}>{redirectCountdown}</span>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>detik</span>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '99px', height: '3px', marginBottom: '16px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(redirectCountdown / 5) * 100}%`, background: 'linear-gradient(90deg,#16a34a,#4ade80)', borderRadius: '99px', transition: 'width 0.9s linear' }}></div>
                        </div>
                        <button onClick={triggerRedirectToDashboard} style={{ width: '100%', padding: '11px', background: 'linear-gradient(135deg,#16a34a,#22c55e)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <SparklesUpgradeIcon size={14} color="#fff" />
                            <span>Lanjutkan ke Sistem</span>
                        </button>
                    </div>
                </div>
            )}


            {/* ===== MAIN QRIS CARD ===== */}
            <div className="fade-in-up" style={{ background: 'linear-gradient(160deg,rgba(15,23,42,0.98),rgba(10,17,35,0.99))', border: `1.5px solid ${isUrgent ? 'rgba(239,68,68,0.6)' : isExpired ? 'rgba(239,68,68,0.5)' : 'rgba(129,140,248,0.5)'}`, borderRadius: '22px', overflow: 'hidden', marginBottom: '24px', boxShadow: `0 20px 60px ${isUrgent ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.2)'}`, transition: 'border-color 0.5s,box-shadow 0.5s' }}>

                {/* Header bar */}
                <div style={{ background: 'linear-gradient(90deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1))', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0' }}>Pembayaran QRIS</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{pendingOrder.email}</div>
                        <InlineWhatsappContact email={pendingOrder.email} initialWhatsapp={pendingOrder.rawWhatsapp || pendingOrder.whatsapp} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', padding: '4px 10px', borderRadius: '99px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fbbf24', animation: 'qrisPulse 1.5s infinite' }}></span>
                        <span style={{ fontSize: '10px', fontWeight: '700', color: '#fbbf24' }}>MENUNGGU PEMBAYARAN</span>
                    </div>
                </div>

                {/* QRIS White Card — clean responsive square */}
                <div className="qris-card-body" style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>

                    {/* Merchant + Logo header */}
                    <div style={{ width: '100%', maxWidth: '380px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#e2e8f0' }}>{brandTitle}</div>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>{pendingOrder.planName || pendingOrder.addonName || 'Add-On Storage'} — <strong style={{ color: '#34d399' }}>Rp {(pendingOrder.planPrice || pendingOrder.amount || pendingOrder.proratedPrice || 0).toLocaleString('id-ID')}</strong></div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <img src="/icons/qris-logo.svg" alt="QRIS" onError={e => e.target.src = '/icons/qris-logo.png'} style={{ height: '18px', width: 'auto' }} />
                            <div style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.2)' }}></div>
                            <img src="/icons/gpn-logo.svg" alt="GPN" style={{ height: '18px', width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.7 }} />
                        </div>
                    </div>

                    {/* Loading State: Dark-themed formal transaction loader */}
                    {pendingOrder.isLoading || (!pendingOrder.qrImage && !pendingOrder.qrUrl && !pendingOrder.token) ? (
                        <div style={{
                            width: '100%',
                            maxWidth: '380px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px dashed rgba(255, 255, 255, 0.12)',
                            borderRadius: '16px',
                            padding: '36px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            gap: '14px',
                            boxSizing: 'border-box',
                            minHeight: '220px'
                        }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                border: '3px solid rgba(56, 189, 248, 0.2)',
                                borderTop: '3px solid #38bdf8',
                                borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite'
                            }} />
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff', marginBottom: '4px' }}>
                                    Memproses Transaksi...
                                </div>
                                <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>
                                    Sistem sedang menyiapkan tagihan QRIS untuk pesanan Anda.
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* QR Area — Direct QRIS Image (IPaymu) OR snap.embed (Midtrans) OR Iframe (Fallback) */
                        <div style={{
                            width: '100%', maxWidth: '380px',
                            background: '#fff', borderRadius: '12px', overflow: 'hidden',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                            position: 'relative', minHeight: isDirectQr ? '320px' : '680px',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            boxSizing: 'border-box',
                            animation: 'fadeIn 0.3s ease'
                        }}>
                            {/* MODE 1: DIRECT QRIS IMAGE (IPaymu / Native Direct QR) */}
                            {isDirectQr ? (
                                <div style={{ width: '100%', padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                                <div style={{
                                    background: '#ffffff',
                                    padding: '10px',
                                    borderRadius: '12px',
                                    border: '1.5px solid #e2e8f0',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <img 
                                        src={pendingOrder.qrImage || pendingOrder.qrUrl} 
                                        alt="QRIS Barcode" 
                                        style={{ width: '250px', height: '250px', objectFit: 'contain', display: 'block', borderRadius: '6px' }} 
                                    />
                                </div>
                                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '11px', color: '#475569', fontWeight: '600' }}>
                                        Scan dengan aplikasi e-Wallet atau Mobile Banking apa saja
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const qrSrc = pendingOrder.qrImage || pendingOrder.qrUrl;
                                            if (!qrSrc) return;
                                            const link = document.createElement('a');
                                            link.href = qrSrc;
                                            link.download = `QRIS-${pendingOrder.orderId || 'Payment'}.png`;
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                        }}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            padding: '6px 14px',
                                            background: '#f8fafc',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '6px',
                                            color: '#334155',
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                                    >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="7 10 12 15 17 10" />
                                            <line x1="12" y1="15" x2="12" y2="3" />
                                        </svg>
                                        <span>Unduh QR</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* MODE 2: MIDTRANS SNAP OR IFRAME */
                            <div id="midtrans-snap-embed" style={{ width: '100%', minHeight: '600px' }}>
                              {!isMidtrans && (pendingOrder?.redirectUrl || pendingOrder?.paymentUrl) && (
                                <iframe
                                  src={pendingOrder.redirectUrl || pendingOrder.paymentUrl}
                                  style={{ width: '100%', height: '620px', border: 'none', borderRadius: '12px', background: '#ffffff' }}
                                  title="Payment Gateway"
                                />
                              )}
                              {isMidtrans && !snapEmbedDone.current && (pendingOrder?.paymentUrl || pendingOrder?.redirectUrl) && (
                                <iframe
                                  src={pendingOrder.paymentUrl || pendingOrder.redirectUrl}
                                  style={{ width: '100%', height: '620px', border: 'none', borderRadius: '12px', background: '#ffffff' }}
                                  title="QRIS Instant Payment"
                                />
                              )}
                            </div>
                        )}
                        <style jsx global>{`
                            #midtrans-snap-embed {
                                width: 100% !important;
                                max-width: 380px !important;
                                margin: 0 auto !important;
                            }
                            #midtrans-snap-embed iframe {
                                width: 100% !important;
                                height: 680px !important;
                                min-height: 680px !important;
                                border: none !important;
                                overflow: hidden !important;
                            }
                            @media (max-width: 480px) {
                                .qris-card-body {
                                    padding: 10px 6px !important;
                                }
                            }
                        `}</style>
                    </div>
                )}




                    {/* Supported channels */}
                    <div style={{ marginTop: '10px', fontSize: '9px', color: '#475569', textAlign: 'center' }}>
                        BCA · Mandiri · BRI · BNI · GoPay · OVO · Dana · ShopeePay · LinkAja
                    </div>

                    {/* Timer + note */}
                    <p style={{ margin: '8px 0 0', fontSize: '10px', color: '#475569', textAlign: 'center' }}>
                        ✦ Auto verifikasi setiap 3 detik
                        {timeLeft && (
                            <span style={{ color: isExpired ? '#ef4444' : isUrgent ? '#f97316' : '#64748b', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>
                                {' '}· {isExpired ? 'Kedaluwarsa' : timeLeft}
                            </span>
                        )}
                    </p>
                </div>

                {/* Action buttons */}
                <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {statusNotice && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            color: statusNotice.type === 'warning' ? '#f59e0b' : '#f87171',
                            fontSize: '11px',
                            fontWeight: '500',
                            padding: '2px 0',
                            animation: 'fadeIn 0.2s ease'
                        }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <span>{statusNotice.text}</span>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={async () => {
                            if (checkingStatus) return;
                            setCheckingStatus(true);
                            setStatusNotice(null);
                            try {
                                const res = await fetch(`/api/payment/status?orderId=${pendingOrder.orderId}`);
                                const data = await res.json();
                                if (data.paid) {
                                    window.__paymentRedirectUrl = data.redirectUrl || '/dashboard';
                                    setPaidSuccess(true);
                                } else {
                                    setStatusNotice({ type: 'warning', text: 'Pembayaran belum terdeteksi' });
                                }
                            } catch {
                                setStatusNotice({ type: 'error', text: 'Gagal memeriksa status' });
                            } finally {
                                setCheckingStatus(false);
                            }
                        }}
                        style={{ padding: '13px', width: '100%', borderRadius: '12px', border: 'none', background: checkingStatus ? 'rgba(16,185,129,0.4)' : 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: '700', fontSize: '14px', cursor: checkingStatus ? 'not-allowed' : 'pointer', boxShadow: checkingStatus ? 'none' : '0 4px 20px rgba(16,185,129,0.3)' }}
                    >
                        {checkingStatus ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite', marginRight: '6px' }}>
                                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                </svg>
                                Memeriksa...
                            </span>
                        ) : 'Cek Pembayaran'}
                    </button>
                    <button type="button" onClick={onCancel} style={{ padding: '10px', width: '100%', borderRadius: '10px', background: 'transparent', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>
                        Batalkan Pembayaran
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
                @keyframes scaleIn { from { transform:scale(0.88);opacity:0 } to { transform:scale(1);opacity:1 } }
                @keyframes qrisPulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </>
    );
}
