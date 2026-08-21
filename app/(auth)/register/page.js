"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import NativeQrisDisplay from '@/components/NativeQrisDisplay';
import RegisterGoogleEntry from '@/components/register/RegisterGoogleEntry';
import RegisterPlanSelector from '@/components/register/RegisterPlanSelector';
import RegisterOrderSummary from '@/components/register/RegisterOrderSummary';
import { LockIcon } from '@/components/StorageIcons.jsx';

export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [plan, setPlan] = useState('');
    const [plans, setPlans] = useState([]);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState(1);
    
    const [regStatus, setRegStatus] = useState({ registration_open: true, reason_closed: null });
    const [checkingStatus, setCheckingStatus] = useState(true);
    const [flashPromoInfo, setFlashPromoInfo] = useState(null);
    const [countdownText, setCountdownText] = useState('00:00:00');
    
    const [pendingOrder, setPendingOrder] = useState(null);
    const [showSummary, setShowSummary] = useState(false);
    const [expiredNotice, setExpiredNotice] = useState(false);

    // 1. Check existing logged in session
    useEffect(() => {
        const checkExistingSession = async () => {
            try {
                const res = await fetch('/api/vendor/profile');
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.id) {
                        window.location.href = '/dashboard';
                    }
                }
            } catch {}
        };
        checkExistingSession();
    }, []);

    // 2. Flash promo countdown timer
    useEffect(() => {
        if (flashPromoInfo && flashPromoInfo.active && flashPromoInfo.endsAt) {
            const updateTimer = () => {
                const diff = new Date(flashPromoInfo.endsAt).getTime() - new Date().getTime();
                if (diff <= 0) {
                    setCountdownText('00:00:00');
                    return;
                }
                const h = Math.floor(diff / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diff % (1000 * 60)) / 1000);
                setCountdownText(`${h < 10 ? '0' + h : h}:${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`);
            };
            updateTimer();
            const interval = setInterval(updateTimer, 1000);
            return () => clearInterval(interval);
        }
    }, [flashPromoInfo]);

    // 3. Load initial configuration and plans
    useEffect(() => {
        let isMounted = true;
        const checkRegStatus = async () => {
            try {
                const res = await fetch('/api/register/status', { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted) setRegStatus(data);
                }
            } catch (err) {
                console.error('Failed to check registration status:', err);
            } finally {
                if (isMounted) setCheckingStatus(false);
            }
        };

        const timeout = setTimeout(() => {
            if (isMounted) setCheckingStatus(false);
        }, 2500);

        const fetchPlans = async () => {
            try {
                const res = await fetch('/api/plans');
                if (res.ok) {
                    const data = await res.json();
                    const plansList = Array.isArray(data) ? data : (data.plans || []);
                    if (isMounted) setPlans(plansList);
                    if (data.flashPromo && isMounted) setFlashPromoInfo(data.flashPromo);
                }
            } catch (err) {
                console.error('Failed to load plans:', err);
            }
        };

        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/settings');
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted) setSettings(data);
                }
            } catch (err) {
                console.error('Failed to load SaaS settings:', err);
            }
        };

        checkRegStatus();
        fetchPlans();
        fetchSettings();

        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const targetPlanId = urlParams.get('planId');
            if (targetPlanId && isMounted) {
                setPlan(targetPlanId);
            }
            if (urlParams.get('step') === 'select-plan') {
                const userEmail = urlParams.get('email');
                const userName = urlParams.get('name');
                if (userEmail && isMounted) setEmail(userEmail);
                if (userName && isMounted) setName(userName);
                if (isMounted) setStep(2);
            }
        }

        return () => {
            isMounted = false;
            clearTimeout(timeout);
        };
    }, []);

    // 4. Synchronize live payment session or persisted step on refresh
    useEffect(() => {
        if (email && email.includes('@')) {
            fetch(`/api/payment/check-pending?email=${encodeURIComponent(email)}`)
                .then(r => r.json())
                .then(d => {
                    if (d.name) {
                        setName(d.name);
                    }
                    if (d.hasPending) {
                        setPendingOrder(d);
                        setShowSummary(false);
                        setExpiredNotice(false);
                    } else if (d.hasExpired && d.planId) {
                        setPlan(String(d.planId));
                        setShowSummary(true);
                        setPendingOrder(null);
                        setExpiredNotice(true);
                    } else if (d.planId) {
                        setPlan(String(d.planId));
                        setShowSummary(true);
                        setPendingOrder(null);
                        setExpiredNotice(false);
                    } else {
                        setPlan('');
                        setShowSummary(false);
                        setPendingOrder(null);
                        setExpiredNotice(false);
                    }
                })
                .catch(() => { setPendingOrder(null); });
        } else {
            setPendingOrder(null);
        }
    }, [email]);

    // Backward transition: Ubah Paket (Step 3 -> Step 2)
    const handleResetPlan = async () => {
        setShowSummary(false);
        setPlan('');
        setExpiredNotice(false);
        if (email) {
            try {
                await fetch('/api/register/select-plan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, planId: null })
                });
            } catch (e) {}
        }
    };

    // Forward transition: Pilih Paket -> Detail Summary (Step 2 -> Step 3)
    const handleProceedToSummary = async (e) => {
        if (e) e.preventDefault();
        setError('');
        
        if (!plan) {
            setError('Silakan pilih salah satu paket langganan terlebih dahulu.');
            return;
        }

        setShowSummary(true);
        setExpiredNotice(false);

        if (email) {
            try {
                await fetch('/api/register/select-plan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, planId: parseInt(plan, 10) })
                });
            } catch (e) {}
        }
    };

    // Forward transition: Detail Summary -> QRIS Payment (Step 3 -> Step 4)
    const handlePayQris = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');

        const selectedPlan = plans.find(p => p.id === parseInt(plan));
        if (!selectedPlan) {
            setError('Paket yang dipilih tidak valid.');
            setLoading(false);
            return;
        }

        try {
            const payRes = await fetch('/api/payment/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email,
                    vendorEmail: email,
                    planId: selectedPlan.id
                })
            });
            const payData = await payRes.json();
            
            if (payRes.ok && (payData.token || payData.qrUrl || payData.redirectUrl)) {
                setPendingOrder({
                    hasPending: true,
                    vendorId: payData.vendorId,
                    name: name || 'Vendor',
                    email: email,
                    whatsapp: whatsapp,
                    orderId: payData.orderId,
                    provider: payData.provider || 'midtrans',
                    token: payData.token,
                    redirectUrl: payData.redirectUrl,
                    qrUrl: payData.qrUrl || payData.redirectUrl,
                    amount: payData.amount || selectedPlan.price,
                    expiresAt: payData.expiresAt,
                    planName: selectedPlan.name,
                    planPrice: selectedPlan.price
                });
                setShowSummary(false);
                setExpiredNotice(false);
                setLoading(false);
                return;
            }

            setError(payData.message || 'Sesi pembayaran QRIS gagal dibuat. Silakan coba lagi.');
        } catch (payErr) {
            console.error('[Payment Launch Error]:', payErr);
            setError('Koneksi ke sistem pembayaran gagal. Silakan coba beberapa saat lagi.');
        } finally {
            setLoading(false);
        }
    };

    if (checkingStatus) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#09090b', color: '#ffffff' }}>
                <p style={{ color: '#a1a1aa' }}>Checking system status...</p>
            </div>
        );
    }

    if (!regStatus.registration_open) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '16px', background: '#09090b', color: '#ffffff' }}>
                <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '40px 32px', textAlign: 'center', borderRadius: '20px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                        <LockIcon size={64} color="#ef4444" />
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '16px', color: '#ef4444' }}>Pendaftaran Ditutup</h2>
                    <p style={{ color: '#a1a1aa', fontSize: '15px', lineHeight: '1.6', marginBottom: '24px' }}>
                        {regStatus.reason_closed || 'Pendaftaran vendor baru saat ini sedang ditutup.'}
                    </p>
                    <a href="/login" className="btn-secondary" style={{ display: 'inline-block', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', textDecoration: 'none', color: '#ffffff' }}>
                        Kembali ke Login
                    </a>
                </div>
            </div>
        );
    }

    const platformName = settings?.saas_name || 'Photota';
    const selectedPlanObj = plans.find(p => p.id === parseInt(plan));

    return (
        <div style={{ minHeight: '100vh', background: '#09090b', color: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px 16px', boxSizing: 'border-box' }}>
            <div style={{ maxWidth: (step === 2 && !showSummary && !pendingOrder) ? '980px' : '520px', width: '100%', transition: 'max-width 0.3s ease' }}>
                
                {/* Header Branding */}
                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                    <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                        {settings?.logo_url ? (
                            <img src={settings.logo_url} alt={platformName} style={{ height: '40px', objectFit: 'contain', marginBottom: '12px' }} />
                        ) : (
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                            </div>
                        )}
                        <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em', color: '#ffffff' }}>
                            Join with <span style={{ color: '#38bdf8' }}>{platformName}</span>
                        </h1>
                    </Link>
                    <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>
                        {pendingOrder ? 'Tahap 4: Pembayaran QRIS' : showSummary ? 'Ringkasan Pesanan' : step === 2 ? 'Tahap 2: Pilih Paket Langganan' : 'Pendaftaran Studio Baru'}
                    </p>
                </div>

                {/* 4-Stage Modular Lifecycle Views */}
                {pendingOrder ? (
                    /* Stage 4: Native QRIS Display (Timer + Expiry Handling) */
                    <NativeQrisDisplay
                        pendingOrder={pendingOrder}
                        platformName={platformName}
                        onExpired={(order) => {
                            setPlan(String(order.planId));
                            setShowSummary(true);
                            setPendingOrder(null);
                            setExpiredNotice(true);
                        }}
                        onCancel={async () => {
                            if (pendingOrder.orderId) {
                                try {
                                    await fetch('/api/payment/cancel', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ orderId: pendingOrder.orderId, email })
                                    });
                                } catch (e) {}
                            }
                            setPendingOrder(null);
                            setShowSummary(true);
                        }}
                    />
                ) : showSummary && selectedPlanObj ? (
                    /* Stage 3: Order Summary & Detail Confirmation */
                    <RegisterOrderSummary
                        name={name}
                        email={email}
                        whatsapp={whatsapp}
                        onWhatsappSaved={(newWa) => setWhatsapp(newWa)}
                        selectedPlan={selectedPlanObj}
                        expiredNotice={expiredNotice}
                        onResetPlan={handleResetPlan}
                        onPayQris={handlePayQris}
                        loading={loading}
                        error={error}
                    />
                ) : step === 2 ? (
                    /* Stage 2: Plan Selection Grid */
                    <RegisterPlanSelector
                        plans={plans}
                        selectedPlanId={plan}
                        onSelectPlan={(id) => setPlan(id)}
                        onProceedToSummary={handleProceedToSummary}
                        flashPromoInfo={flashPromoInfo}
                        countdownText={countdownText}
                        loading={loading}
                        userEmail={email}
                        onLogout={() => {
                            setEmail('');
                            setName('');
                            setStep(1);
                            setShowSummary(false);
                            setPlan('');
                        }}
                    />
                ) : (
                    /* Stage 1: Google 1-Click Fast Sign-In */
                    <RegisterGoogleEntry
                        platformName={platformName}
                        onStartGoogleAuth={() => {
                            window.location.href = '/api/auth/google?role=vendor';
                        }}
                        loading={loading}
                        error={error}
                    />
                )}

                {/* Footer Login Link */}
                <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: '#64748b' }}>
                    Already have an account?{' '}
                    <Link href="/login" style={{ color: '#818cf8', fontWeight: '600', textDecoration: 'none' }}>
                        Sign in instead
                    </Link>
                </div>
            </div>
        </div>
    );
}
