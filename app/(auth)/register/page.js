"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import NativeQrisDisplay from '@/components/NativeQrisDisplay';

export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [password, setPassword] = useState('');
    const [plan, setPlan] = useState('');
    const [paymentProof, setPaymentProof] = useState(null);
    const [plans, setPlans] = useState([]);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [selectedTab, setSelectedTab] = useState('limit');
    const [step, setStep] = useState(1);
    
    // --- NEW: Registration status state & payment method ---
    const [regStatus, setRegStatus] = useState({ registration_open: true, free_trial_available: true, reason_closed: null });
    const [checkingStatus, setCheckingStatus] = useState(true);
    const [paymentMethod, setPaymentMethod] = useState('');

    const isGatewayEnabled = settings?.enable_payment_gateway === '1' || settings?.enable_payment_gateway === 'true';

    useEffect(() => {
        if (isGatewayEnabled) {
            const clientKey = settings?.payment_gateway_client_key || '';
            const isProd = settings?.payment_gateway_is_production === '1';
            const snapUrl = isProd 
                ? 'https://app.midtrans.com/snap/snap.js'
                : 'https://app.sandbox.midtrans.com/snap/snap.js';

            if (!document.getElementById('midtrans-snap-script')) {
                const script = document.createElement('script');
                script.id = 'midtrans-snap-script';
                script.src = snapUrl;
                if (clientKey) script.setAttribute('data-client-key', clientKey);
                document.body.appendChild(script);
            }
        }
    }, [settings, isGatewayEnabled]);


    // Free plan removed from registration — use trial gallery on landing page instead

    useEffect(() => {
        const checkRegStatus = async () => {
            try {
                const res = await fetch('/api/register/status', { cache: 'no-store' });

                if (res.ok) {
                    const data = await res.json();
                    setRegStatus(data);
                }
            } catch (err) {
                console.error('Failed to check registration status:', err);
            } finally {
                setCheckingStatus(false);
            }
        };
        const fetchPlans = async () => {
            try {
                const res = await fetch('/api/plans');
                if (res.ok) {
                    const data = await res.json();
                    const plansList = Array.isArray(data) ? data : (data.plans || []);
                    setPlans(plansList);
                    if (plansList.length > 0) {
                        const firstLimit = plansList.find(p => p.planType === 'limit') || plansList[0];
                        setSelectedTab(firstLimit.planType || 'limit');
                    }
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
                    setSettings(data);
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
            // NOTE: status=pending means awaiting admin approval (no payment),
            // NOT payment success. Do NOT call setSuccess here.
            // Payment success is triggered only via payment polling in NativeQrisDisplay.
            if (urlParams.get('step') === 'select-plan') {
                const userEmail = urlParams.get('email');
                if (userEmail) setEmail(userEmail);
                setStep(2);
            }
        }
    }, []);

    const [pendingOrder, setPendingOrder] = useState(null);
    const [expiredOrder, setExpiredOrder] = useState(null);

    useEffect(() => {
        if (email && email.includes('@')) {
            fetch(`/api/payment/check-pending?email=${encodeURIComponent(email)}`)
                .then(r => r.json())
                .then(d => {
                    if (d.hasPending) {
                        setPendingOrder(d);
                        setExpiredOrder(null);
                    } else if (d.hasExpired) {
                        setExpiredOrder(d);
                        setPendingOrder(null);
                    } else {
                        setPendingOrder(null);
                        setExpiredOrder(null);
                    }
                })
                .catch(() => { setPendingOrder(null); setExpiredOrder(null); });
        } else {
            setPendingOrder(null);
            setExpiredOrder(null);
        }
    }, [email]);

    const [showSummary, setShowSummary] = useState(false);
    const [validatingSummary, setValidatingSummary] = useState(false);

    const handleNextStep = (e) => {
        e.preventDefault();
        if (!name || !email || !password) {
            setError('Nama, Email, dan Password wajib diisi.');
            return;
        }
        if (password.length < 6) {
            setError('Password minimal harus 6 karakter.');
            return;
        }
        setError('');
        setStep(2);
    };


    const handleProceedToSummary = async (e) => {
        if (e) e.preventDefault();
        setError('');
        
        if (!plan) {
            setError('Silakan pilih salah satu paket langganan terlebih dahulu.');
            return;
        }


        setValidatingSummary(true);
        try {
            const res = await fetch('/api/auth/validate-register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, whatsapp })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Validasi registrasi gagal.');
            }

            setShowSummary(true);
        } catch (err) {
            setError(err.message || 'Gagal memverifikasi nomor WhatsApp.');
        } finally {
            setValidatingSummary(false);
        }
    };

    const getFeatures = (p) => {
        return [
            `Maksimal ${p.maxProjects} Project Aktif`,
            'Foto Unlimited',
            'Galeri Online & Seleksi Foto Klien',
            p.allowCustomLogo === 1 || p.allowCustomLogo === true || p.name.includes('Pro') || p.name.includes('Business')
                ? 'Bisa Menggunakan Logo Studio Sendiri'
                : 'Logo Platform Standard',
            p.allowRawSelector === 1 || p.allowRawSelector === true
                ? 'Fitur Auto-Sorter / Selector File RAW'
                : 'Fitur RAW Selector Nonaktif'
        ];
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess(false);

        if (!plan) {
            setError('Silakan pilih salah satu paket langganan terlebih dahulu.');
            setLoading(false);
            return;
        }

        const selectedPlan = plans.find(p => p.id === parseInt(plan));
        if (!selectedPlan) {
            setError('Paket yang dipilih tidak valid.');
            setLoading(false);
            return;
        }


        const isGateway = isGatewayEnabled && paymentMethod === 'gateway';

        if (!isGateway && !paymentProof) {
            setError('Silakan upload bukti pembayaran/transfer terlebih dahulu.');
            setLoading(false);
            return;
        }

        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('email', email);
            formData.append('whatsapp', whatsapp);
            formData.append('password', password);
            formData.append('plan', plan);
            formData.append('paymentMethod', isGateway ? 'gateway' : 'manual');
            if (paymentProof) {
                formData.append('paymentProof', paymentProof);
            }

            const res = await fetch('/api/auth/register', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Registration failed.');
            }

            // Handle Automatic Payment Gateway Checkout if selected
            if (isGateway && data.vendorId) {
                try {
                    const payRes = await fetch('/api/payment/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ vendorId: data.vendorId, planId: selectedPlan.id })
                    });
                    const payData = await payRes.json();
                    
                    if (payRes.ok && payData.token) {
                        // Directly render Native QRIS Embedded Card (No Popup Window!)
                        setPendingOrder({
                            hasPending: true,
                            vendorId: data.vendorId,
                            name: name,
                            email: email,
                            whatsapp: whatsapp,
                            orderId: payData.orderId,
                            token: payData.token,
                            redirectUrl: payData.redirectUrl,
                            qrUrl: payData.qrUrl || payData.redirectUrl,
                            amount: payData.amount || selectedPlan.price,
                            expiresAt: payData.expiresAt,
                            planName: selectedPlan.name,
                            planPrice: selectedPlan.price
                        });
                        setLoading(false);
                        return;
                    }

                    // Fallback to original redirect logic if needed
                    if (payData.redirectUrl) {
                        window.location.href = payData.redirectUrl;
                        return;
                    }
                } catch (payErr) {
                    console.error('[Payment Gateway Launch Error]:', payErr);
                }
            }


            setSuccess(true);
            setName('');
            setEmail('');
            setPassword('');
        } catch (err) {
            setError(err.message);
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
                    <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔒</div>
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

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '90vh', padding: '16px' }}>
            <style>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(12px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .fade-in-up {
                    animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @media (max-width: 640px) {
                    .register-glass-card {
                        padding: 16px 8px !important;
                        border-radius: 16px !important;
                        border: none !important;
                        background: transparent !important;
                        box-shadow: none !important;
                    }
                    .plans-swipe-container {
                        grid-template-columns: 1fr !important;
                        gap: 16px !important;
                        padding: 4px 0 16px 0 !important;
                    }
                    .plan-card-item {
                        padding: 24px 16px 20px 16px !important;
                        min-height: auto !important;
                        background: rgba(15, 23, 42, 0.95) !important;
                        border-radius: 16px !important;
                    }
                }
            `}</style>
            <div className="glass-card register-glass-card" style={{ width: '100%', maxWidth: step === 1 ? '400px' : '940px', transition: 'max-width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>

                {success ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            width: '80px', 
                            height: '80px', 
                            borderRadius: '50%', 
                            background: 'rgba(34, 197, 94, 0.1)', 
                            border: '2px solid rgba(34, 197, 94, 0.25)', 
                            color: '#22c55e', 
                            fontSize: '42px', 
                            marginBottom: '28px',
                            fontWeight: 'bold'
                        }}>
                            ✓
                        </div>
                        <h2 className="title-gradient" style={{ fontSize: '26px', margin: '0 0 14px 0' }}>Pendaftaran Berhasil!</h2>
                        <p style={{ color: '#a1a1aa', fontSize: '14px', lineHeight: '1.6', margin: '0 0 32px 0' }}>
                            Akun fotografer Anda sedang menunggu konfirmasi/persetujuan dari administrator sebelum Anda dapat melakukan login ke dashboard.
                        </p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {settings?.contact_whatsapp && (() => {
                            const selectedPlan = plans.find(p => p.id === parseInt(plan)) || plans[0];
                            const planName = selectedPlan ? `${selectedPlan.name} Plan` : 'Basic Plan';
                            const waMessage = `Halo Admin, saya baru saja mendaftar sebagai fotografer di Pick Your Photo.\n\nBerikut detail pendaftaran saya:\n- Nama: ${name}\n- Email: ${email}\n- Paket: ${planName}\n\nSaya sudah menyelesaikan proses pembayaran. Mohon disetujui pendaftarannya. Terima kasih!`;
                            
                            return (
                                <a 
                                    href={`https://wa.me/${settings.contact_whatsapp}?text=${encodeURIComponent(waMessage)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ 
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        width: '100%', 
                                        background: 'linear-gradient(135deg, #22c55e, #16a34a)', 
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '12px',
                                        padding: '14px 24px',
                                        fontWeight: '600',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        boxShadow: '0 4px 16px rgba(34, 197, 94, 0.3)',
                                        textDecoration: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(34, 197, 94, 0.45)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(34, 197, 94, 0.3)';
                                    }}
                                >
                                    <svg style={{ width: '18px', height: '18px', fill: 'currentColor' }} viewBox="0 0 24 24">
                                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.638 1.977 14.167.953 11.54.953c-5.442 0-9.866 4.372-9.87 9.802 0 1.63.43 3.22 1.245 4.634L1.879 21.8l6.4-1.676zM17.487 14.39c-.3-.15-1.782-.879-2.057-.979-.275-.1-.475-.15-.675.15-.2.3-.775.979-.95 1.179-.175.2-.35.225-.65.075-.3-.15-1.265-.467-2.41-1.485-.89-.794-1.49-1.775-1.665-2.075-.175-.3-.019-.463.13-.612.135-.133.3-.35.45-.525.15-.175.2-.3.3-.5s.05-.375-.025-.525c-.075-.15-.675-1.625-.925-2.225-.244-.589-.491-.51-.675-.52-.175-.01-.375-.01-.575-.01-.2 0-.525.075-.8.375-.275.3-1.05 1.025-1.05 2.5s1.075 2.9 1.225 3.1c.15.2 2.11 3.224 5.11 4.522.714.31 1.272.496 1.707.635.717.227 1.37.195 1.887.118.575-.085 1.782-.729 2.032-1.433.25-.704.25-1.307.175-1.433-.075-.125-.275-.2-.575-.35z"/>
                                    </svg>
                                    Hubungi Admin via WhatsApp
                                </a>
                            );
                        })()}

                            <Link 
                                href="/login" 
                                style={{ 
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '100%', 
                                    background: 'rgba(255, 255, 255, 0.05)', 
                                    color: '#e4e4e7',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '12px',
                                    padding: '14px 24px',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    textDecoration: 'none',
                                    boxSizing: 'border-box'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                }}
                            >
                                Kembali ke Login
                            </Link>
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                            <h2 className="title-gradient" style={{ fontSize: '28px', margin: '0 0 8px 0' }}>Join Pick Your Photo</h2>
                            <p style={{ color: '#a1a1aa', margin: 0, fontSize: '14px' }}>
                                {step === 1 ? 'Tahap 1: Isi Data Diri Anda' : 'Tahap 2: Pilih Paket Langganan'}
                            </p>
                        </div>

                        {error && (
                            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            {step === 1 ? (
                                <div className="fade-in-up" key="step1" style={{ textAlign: 'center', padding: '10px 0' }}>
                                    <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '24px', lineHeight: '1.6' }}>
                                        Daftar instan dalam 1 klik dengan akun Google Anda untuk mulai mengelola galeri foto seleksi klien.
                                    </p>

                                    <a
                                        href="/api/auth/google?action=register"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '12px',
                                            width: '100%',
                                            padding: '14px',
                                            borderRadius: '12px',
                                            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                            border: 'none',
                                            color: '#ffffff',
                                            fontSize: '15px',
                                            fontWeight: 'bold',
                                            textDecoration: 'none',
                                            marginBottom: '20px',
                                            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
                                            transition: 'all 0.2s ease',
                                            boxSizing: 'border-box'
                                        }}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24">
                                            <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                            <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                            <path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                                            <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                                        </svg>
                                        🚀 Daftar Cepat dengan Google
                                    </a>

                                    <p style={{ fontSize: '12px', color: '#71717a', margin: 0 }}>
                                        Aman, praktis & tanpa perlu membuat password baru.
                                    </p>
                                </div>
                            ) : (
                                <div className="fade-in-up" key="step2">
                                    {expiredOrder ? (
                                        /* ===== EXPIRED QRIS STATE ===== */
                                        <div className="fade-in-up" style={{ background: 'linear-gradient(160deg,rgba(15,23,42,0.98),rgba(10,17,35,0.99))', border: '1.5px solid rgba(239,68,68,0.5)', borderRadius: '22px', overflow: 'hidden', marginBottom: '24px', boxShadow: '0 20px 60px rgba(239,68,68,0.15)' }}>
                                            {/* Header */}
                                            <div style={{ background: 'linear-gradient(90deg,rgba(239,68,68,0.15),rgba(220,38,38,0.1))', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div>
                                                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#fca5a5' }}>Pembayaran QRIS Kedaluwarsa</div>
                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>{expiredOrder.email}</div>
                                                </div>
                                                <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', padding: '4px 10px', borderRadius: '99px' }}>
                                                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#ef4444' }}>⏰ EXPIRED</span>
                                                </div>
                                            </div>
                                            {/* Body */}
                                            <div style={{ padding: '28px 24px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '48px', marginBottom: '12px' }}>⏰</div>
                                                <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '800', color: '#fca5a5' }}>
                                                    QRIS untuk {expiredOrder.planName} Telah Kedaluwarsa
                                                </h3>
                                                <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#94a3b8' }}>
                                                    Nominal: <strong style={{ color: '#34d399' }}>Rp {(expiredOrder.planPrice || expiredOrder.amount || 0).toLocaleString('id-ID')}</strong>
                                                </p>
                                                <p style={{ margin: '0 0 24px', fontSize: '12px', color: '#64748b' }}>
                                                    Silakan lakukan pembayaran ulang. Pilih metode yang diinginkan:
                                                </p>
                                                {/* Retry options */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            setLoading(true);
                                                            try {
                                                                // Cancel expired order
                                                                await fetch('/api/payment/cancel', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ orderId: expiredOrder.orderId, email: expiredOrder.email })
                                                                });
                                                                // Create new QRIS payment
                                                                const payRes = await fetch('/api/payment/create', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ vendorId: expiredOrder.vendorId, planId: expiredOrder.planId })
                                                                });
                                                                const payData = await payRes.json();
                                                                if (!payRes.ok) throw new Error(payData.message || 'Gagal membuat pembayaran baru');
                                                                setExpiredOrder(null);
                                                                setPendingOrder({
                                                                    orderId: payData.orderId,
                                                                    email: expiredOrder.email,
                                                                    token: payData.token,
                                                                    qrUrl: payData.qrUrl,
                                                                    expiresAt: payData.expiresAt,
                                                                    planName: expiredOrder.planName,
                                                                    planPrice: expiredOrder.planPrice || expiredOrder.amount,
                                                                });
                                                            } catch (e) {
                                                                setError(e.message);
                                                            } finally {
                                                                setLoading(false);
                                                            }
                                                        }}
                                                        style={{ padding: '13px', borderRadius: '12px', border: 'none', background: loading ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: '700', fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 20px rgba(99,102,241,0.3)' }}
                                                        disabled={loading}
                                                    >
                                                        {loading ? '⏳ Memproses...' : '🔄 Bayar Ulang via QRIS'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setExpiredOrder(null);
                                                            setPlan(String(expiredOrder.planId));
                                                            setShowSummary(true);
                                                        }}
                                                        style={{ padding: '13px', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: '#a5b4fc', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
                                                    >
                                                        🏦 Transfer Manual / Upload Bukti Bayar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setExpiredOrder(null);
                                                            setPlan('');
                                                            setShowSummary(false);
                                                        }}
                                                        style={{ padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#64748b', fontWeight: '500', fontSize: '13px', cursor: 'pointer' }}
                                                    >
                                                        📦 Ganti Paket
                                                    </button>
                                                </div>
                                                {error && <p style={{ marginTop: '12px', color: '#ef4444', fontSize: '12px' }}>{error}</p>}
                                            </div>
                                        </div>

                                    ) : pendingOrder ? (
                                        <NativeQrisDisplay
                                            pendingOrder={pendingOrder}
                                            onCancel={async () => {
                                                if (pendingOrder.orderId) {
                                                    try {
                                                        await fetch('/api/payment/cancel', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ orderId: pendingOrder.orderId, email: pendingOrder.email })
                                                        });
                                                    } catch (e) {}
                                                }
                                                setPendingOrder(null);
                                            }}
                                        />
                                    ) : showSummary ? (

                                        <div className="fade-in-up" style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '16px', padding: '24px', marginBottom: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 'bold', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '4px 12px', borderRadius: '20px' }}>
                                                    KONFIRMASI DETAIL & PEMBAYARAN
                                                </span>
                                                <h3 style={{ margin: '8px 0 4px 0', fontSize: '20px', fontWeight: 'bold', color: '#ffffff' }}>
                                                    Periksa Pesanan & Pilih Metode Pembayaran
                                                </h3>
                                                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                                                    Pastikan data pendaftaran benar lalu pilih metode pembayaran Anda.
                                                </p>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
                                                {/* 1. Account Info Summary */}
                                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px' }}>
                                                    <div style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 'bold', marginBottom: '6px' }}>👤 DETAIL AKUN VENDOR</div>
                                                    <div style={{ color: '#ffffff', fontWeight: '600' }}>{name}</div>
                                                    <div style={{ color: '#cbd5e1', fontSize: '12px' }}>✉️ {email}</div>
                                                    {whatsapp && <div style={{ color: '#38bdf8', fontSize: '12px', fontWeight: 'bold', marginTop: '4px' }}>📱 +{whatsapp}</div>}

                                                </div>

                                                {/* 2. Selected Plan Summary */}
                                                {(() => {
                                                    const selPlan = plans.find(p => p.id === parseInt(plan));
                                                    return selPlan ? (
                                                        <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '12px', padding: '16px' }}>
                                                            <div style={{ fontSize: '11px', color: '#a5b4fc', fontWeight: 'bold', marginBottom: '8px' }}>📦 PAKET SAAS YANG DIPILIH</div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                                <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '16px' }}>{selPlan.name}</span>
                                                                <span style={{ color: '#fbbf24', fontWeight: '850', fontSize: '17px' }}>Rp {selPlan.price ? selPlan.price.toLocaleString('id-ID') : '0'}</span>
                                                            </div>
                                                            
                                                            <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.08)', margin: '10px 0' }} />

                                                            {/* Plan Features List Details */}
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#d4d4d8' }}>
                                                                <div>✓ Maksimal <strong>{selPlan.maxProjects} Project Aktif</strong></div>
                                                                <div>✓ Foto <strong>Unlimited</strong> / project</div>
                                                                <div>✓ <strong>Galeri Online & Seleksi Foto Klien</strong></div>
                                                                {selPlan.allowCustomLogo === 1 || selPlan.allowCustomLogo === true || selPlan.name.includes('Pro') || selPlan.name.includes('Business') ? (
                                                                    <div style={{ color: '#34d399', fontWeight: 'bold' }}>✓ Bisa Menggunakan Logo Studio Sendiri</div>
                                                                ) : (
                                                                    <div style={{ color: '#71717a' }}>• Logo Platform Standard</div>
                                                                )}
                                                                {selPlan.allowRawSelector === 1 || selPlan.allowRawSelector === true ? (
                                                                    <div style={{ color: '#34d399', fontWeight: 'bold' }}>✓ Fitur Auto-Sorter / Selector File RAW</div>
                                                                ) : (
                                                                    <div style={{ color: '#71717a' }}>• Fitur RAW Selector Nonaktif</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : null;
                                                })()}


                                                {/* 3. PAYMENT METHOD SELECTION IN STEP 3 */}
                                                {isGatewayEnabled && (
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#e4e4e7', marginBottom: '12px' }}>
                                                            💳 Pilih Metode Pembayaran
                                                        </label>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                                                            {/* Option 1: Automatic Gateway */}
                                                            <div
                                                                onClick={() => setPaymentMethod('gateway')}
                                                                style={{
                                                                    background: paymentMethod === 'gateway' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                                                                    border: paymentMethod === 'gateway' ? '2px solid #34d399' : '1px solid rgba(255, 255, 255, 0.08)',
                                                                    borderRadius: '12px',
                                                                    padding: '14px 16px',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s ease',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: '6px'
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: paymentMethod === 'gateway' ? '#34d399' : '#ffffff' }}>
                                                                        ⚡ Pembayaran Otomatis (QRIS, VA & E-Wallet)
                                                                    </span>
                                                                    <span style={{ fontSize: '10px', background: 'rgba(52, 211, 153, 0.2)', color: '#34d399', padding: '2px 6px', borderRadius: '6px', fontWeight: 'bold' }}>
                                                                        OTOMATIS & INSTAN
                                                                    </span>
                                                                </div>
                                                                <span style={{ fontSize: '11px', color: '#a1a1aa', lineHeight: '1.4' }}>
                                                                    Bayar via QRIS, Virtual Account Bank (BCA, Mandiri, BRI, BNI), GoPay, atau ShopeePay. Akun <strong>otomatis aktif seketika</strong> tanpa upload foto bukti.
                                                                </span>
                                                            </div>

                                                            <div
                                                                onClick={() => setPaymentMethod('manual')}
                                                                style={{
                                                                    background: paymentMethod === 'manual' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                                                                    border: paymentMethod === 'manual' ? '2px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.08)',
                                                                    borderRadius: '12px',
                                                                    padding: '14px 16px',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s ease',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: '6px'
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: paymentMethod === 'manual' ? '#818cf8' : '#ffffff' }}>
                                                                        🏦 Transfer Bank Manual
                                                                    </span>
                                                                    <span style={{ fontSize: '10px', background: 'rgba(255, 255, 255, 0.08)', color: '#a1a1aa', padding: '2px 6px', borderRadius: '6px' }}>
                                                                        MANUAL
                                                                    </span>
                                                                </div>
                                                                <span style={{ fontSize: '11px', color: '#a1a1aa', lineHeight: '1.4' }}>
                                                                    Transfer ke Rekening Admin & upload foto bukti transfer (membutuhkan approval manual Admin).
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {paymentMethod === 'manual' ? (
                                                    <>
                                                        <div className="form-group" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '14px', borderRadius: '10px', marginTop: '6px' }}>
                                                            <span style={{ fontSize: '12px', color: '#a1a1aa', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Tujuan Transfer Pembayaran:</span>
                                                            <div style={{ fontSize: '13px', color: '#f4f4f5', lineHeight: '1.6' }}>
                                                                <div>Bank: <strong>{settings?.bank_name || 'BCA (Bank Central Asia)'}</strong></div>
                                                                <div>No. Rekening: <strong style={{ color: '#818cf8', fontSize: '14px' }}>{settings?.bank_account_number || '1234-5678-90'}</strong></div>
                                                                <div>Atas Nama: <strong>{settings?.bank_account_name || 'PT Pick Your Photo'}</strong></div>
                                                                {settings?.contact_email && (
                                                                    <div style={{ fontSize: '11px', color: '#a1a1aa', marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px' }}>
                                                                        Hubungi: {settings.contact_email} {settings.contact_whatsapp && ` | WA: +${settings.contact_whatsapp}`}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="form-group">
                                                            <label className="form-label">Upload Bukti Pembayaran / Transfer</label>
                                                            <input
                                                                type="file"
                                                                className="input-text"
                                                                required={paymentMethod === 'manual'}
                                                                accept="image/*"
                                                                onChange={(e) => setPaymentProof(e.target.files ? e.target.files[0] : null)}
                                                                disabled={loading}
                                                                style={{ cursor: 'pointer' }}
                                                            />
                                                            <span style={{ fontSize: '11px', color: '#71717a' }}>Format gambar yang didukung: JPG, PNG.</span>
                                                        </div>
                                                    </>
                                                ) : paymentMethod === 'gateway' ? (
                                                    <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '14px 16px', borderRadius: '12px', fontSize: '13px', color: '#34d399', lineHeight: '1.5' }}>
                                                        ⚡ Anda memilih <strong>Pembayaran Otomatis (Instan)</strong>. Jendela pembayaran instan Midtrans (QRIS/VA) akan langsung terbuka setelah Anda menekan tombol bayar.
                                                    </div>
                                                ) : (
                                                    <div style={{ background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '14px 16px', borderRadius: '12px', fontSize: '13px', color: '#fbbf24', lineHeight: '1.5', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <span style={{ fontSize: '18px' }}>💡</span>
                                                        <span>Silakan <strong>pilih salah satu metode pembayaran di atas</strong> untuk mengaktifkan tombol konfirmasi & pembayaran.</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowSummary(false)}
                                                    style={{
                                                        background: 'rgba(255, 255, 255, 0.05)',
                                                        color: '#e4e4e7',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        borderRadius: '12px',
                                                        padding: '14px 20px',
                                                        fontWeight: '600',
                                                        fontSize: '13px',
                                                        cursor: 'pointer',
                                                        flex: 1
                                                    }}
                                                >
                                                    ✏️ Ubah Data
                                                </button>
                                                <button 
                                                    type="submit" 
                                                    className="btn-primary" 
                                                    style={{ 
                                                        flex: 2, 
                                                        padding: '14px 20px', 
                                                        fontSize: '14px',
                                                        opacity: (loading || !paymentMethod) ? 0.5 : 1,
                                                        cursor: (loading || !paymentMethod) ? 'not-allowed' : 'pointer'
                                                    }} 
                                                    disabled={loading || !paymentMethod}
                                                >
                                                    {loading 
                                                        ? 'Memproses Transaksi...' 
                                                        : !paymentMethod 
                                                            ? '⚠️ Pilih Metode Pembayaran' 
                                                            : '🚀 Confirm & Bayar Sekarang'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="form-group" style={{ marginBottom: '24px' }}>
                                                 {/* Mobile Plan Stepper Switcher */}
                                                 <style>{`
                                                     .plans-swipe-container {
                                                         display: grid;
                                                         grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
                                                         gap: 20px;
                                                         margin-top: 16px;
                                                         margin-bottom: 20px;
                                                         padding: 10px 4px 20px 4px;
                                                     }
                                                     .plan-card-item {
                                                         width: 100%;
                                                         box-sizing: border-box;
                                                     }
                                                     .mobile-plan-tabs, .mobile-plan-nav {
                                                         display: none;
                                                     }
                                                     @media (max-width: 640px) {
                                                         .plans-swipe-container {
                                                             display: block !important;
                                                             padding: 0 !important;
                                                             margin-bottom: 12px !important;
                                                         }
                                                         .plan-card-item {
                                                             display: none !important;
                                                         }
                                                         .plan-card-item.active-mobile-plan {
                                                             display: flex !important;
                                                             width: 100% !important;
                                                             max-width: 360px !important;
                                                             margin: 0 auto !important;
                                                             min-height: auto !important;
                                                             padding: 28px 20px 24px 20px !important;
                                                             border-radius: 18px !important;
                                                         }
                                                         .mobile-plan-tabs, .mobile-plan-nav {
                                                             display: flex !important;
                                                         }
                                                     }
                                                 `}</style>

                                                 {/* Mobile Top Tab Selector */}
                                                 {(() => {
                                                     const paidPlansList = plans.filter(p => p.price > 0);
                                                     const activePlanId = parseInt(plan) || 0;
                                                     const currentIdx = Math.max(0, paidPlansList.findIndex(p => p.id === activePlanId));

                                                     return (
                                                         <>
                                                             <div className="plans-swipe-container fade-in-up">
                                                                 {paidPlansList.map(p => {
                                                                     const isSelected = activePlanId === p.id;
                                                                     const isBestSeller = p.name.includes('Pro');
                                                                     return (
                                                                         <div 
                                                                             key={p.id}
                                                                             className={`plan-card-item ${isSelected ? 'active-mobile-plan' : ''}`}
                                                                             onClick={() => !loading && setPlan(p.id.toString())}
                                                                             style={{
                                                                                 position: 'relative',
                                                                                 background: isSelected 
                                                                                     ? 'rgba(99, 102, 241, 0.12)' 
                                                                                     : 'rgba(255, 255, 255, 0.02)',
                                                                                 border: isSelected 
                                                                                     ? '2px solid #818cf8' 
                                                                                     : isBestSeller
                                                                                         ? '1px solid rgba(99, 102, 241, 0.4)'
                                                                                         : '1px solid rgba(255, 255, 255, 0.08)',
                                                                                 borderRadius: '16px',
                                                                                 padding: '36px 20px 24px 20px',
                                                                                 cursor: loading ? 'not-allowed' : 'pointer',
                                                                                 transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                                 boxShadow: isSelected ? '0 12px 28px rgba(99, 102, 241, 0.25)' : 'none',
                                                                                 transform: isSelected ? 'translateY(-2px)' : 'none',
                                                                                 boxSizing: 'border-box',
                                                                                 display: 'flex',
                                                                                 flexDirection: 'column',
                                                                                 justify: 'space-between',
                                                                                 minHeight: '320px'
                                                                             }}
                                                                         >
                                                                             {isBestSeller && (
                                                                                 <div style={{
                                                                                     position: 'absolute',
                                                                                     top: '-12px',
                                                                                     right: '20px',
                                                                                     background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                                                                     color: '#ffffff',
                                                                                     padding: '4px 12px',
                                                                                     borderRadius: '20px',
                                                                                     fontSize: '10px',
                                                                                     fontWeight: 'bold',
                                                                                     letterSpacing: '0.05em'
                                                                                 }}>
                                                                                     BEST SELLER
                                                                                 </div>
                                                                             )}

                                                                             <div style={{ textAlign: 'center' }}>
                                                                                 <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold', color: '#ffffff' }}>{p.name}</h3>
                                                                                  {p.discountedPrice && p.discountedPrice < p.originalPrice ? (
                                                                                      <div>
                                                                                          <div style={{ fontSize: '13px', color: '#94a3b8', textDecoration: 'line-through' }}>
                                                                                              Rp {p.originalPrice ? p.originalPrice.toLocaleString('id-ID') : '0'}
                                                                                          </div>
                                                                                          <div style={{ fontSize: '26px', fontWeight: '850', color: '#ef4444', marginBottom: '4px' }}>
                                                                                              Rp {p.discountedPrice ? p.discountedPrice.toLocaleString('id-ID') : '0'}
                                                                                              <span style={{ fontSize: '11px', color: '#71717a', fontWeight: 'normal' }}> / {p.activePeriodDays} hari</span>
                                                                                          </div>
                                                                                      </div>
                                                                                  ) : (
                                                                                      <div style={{ fontSize: '26px', fontWeight: '850', color: '#fbbf24', marginBottom: '4px' }}>
                                                                                          Rp {p.price ? p.price.toLocaleString('id-ID') : '0'}
                                                                                          <span style={{ fontSize: '11px', color: '#71717a', fontWeight: 'normal' }}> / {p.activePeriodDays} hari</span>
                                                                                      </div>
                                                                                  )}
                                                                             </div>

                                                                             <div style={{
                                                                                 width: '100%',
                                                                                 height: '1px',
                                                                                 background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
                                                                                 margin: '16px 0'
                                                                             }} />

                                                                             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: '#d4d4d8' }}>
                                                                                 <div>✓ <strong>Foto Unlimited</strong></div>
                                                                                 <div>✓ <strong>Galeri Online & Seleksi Foto Klien</strong></div>
                                                                                 <div>✓ Maksimal <strong>{p.maxProjects} Project Aktif</strong></div>
                                                                                 {p.allowCustomLogo === 1 || p.allowCustomLogo === true || p.name.includes('Pro') || p.name.includes('Business') ? (
                                                                                     <div style={{ color: '#34d399', fontWeight: 'bold' }}>✓ Bisa Menggunakan Logo Studio Sendiri</div>
                                                                                 ) : (
                                                                                     <div style={{ color: '#71717a' }}>• Logo Platform Standard</div>
                                                                                 )}
                                                                                 {p.allowRawSelector === 1 || p.allowRawSelector === true ? (
                                                                                     <div style={{ color: '#34d399', fontWeight: 'bold' }}>✓ Fitur Auto-Sorter / Selector File RAW</div>
                                                                                 ) : (
                                                                                     <div style={{ color: '#71717a' }}>• Fitur RAW Selector Nonaktif</div>
                                                                                 )}
                                                                             </div>

                                                                             <button
                                                                                 type="button"
                                                                                 style={{
                                                                                     width: '100%',
                                                                                     padding: '12px 16px',
                                                                                     borderRadius: '10px',
                                                                                     fontWeight: '800',
                                                                                     fontSize: '12px',
                                                                                     cursor: loading ? 'not-allowed' : 'pointer',
                                                                                     transition: 'all 0.3s ease',
                                                                                     background: isSelected 
                                                                                         ? 'linear-gradient(135deg, #6366f1, #4f46e5)' 
                                                                                         : 'rgba(255, 255, 255, 0.04)',
                                                                                     color: '#ffffff',
                                                                                     border: isSelected ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
                                                                                     marginTop: '16px'
                                                                                 }}
                                                                             >
                                                                                 {isSelected ? '✓ TERPILIH' : 'PILIH PAKET'}
                                                                             </button>
                                                                         </div>
                                                                     );
                                                                 })}
                                                             </div>

                                                             {/* Clean Floating Icon Arrows Navigation (Infinite Circular Loop) */}
                                                             <div className="mobile-plan-nav" style={{ justifyContent: 'center', alignItems: 'center', gap: '40px', marginTop: '16px', marginBottom: '8px' }}>
                                                                 <button
                                                                     type="button"
                                                                     onClick={() => {
                                                                         const prevIdx = (currentIdx - 1 + paidPlansList.length) % paidPlansList.length;
                                                                         setPlan(paidPlansList[prevIdx].id.toString());
                                                                     }}
                                                                     title="Paket Sebelumnya"
                                                                     style={{
                                                                         background: 'none',
                                                                         border: 'none',
                                                                         color: '#818cf8',
                                                                         fontSize: '32px',
                                                                         fontWeight: 'bold',
                                                                         cursor: 'pointer',
                                                                         padding: '6px 20px',
                                                                         transition: 'all 0.2s ease',
                                                                         lineHeight: 1
                                                                     }}
                                                                 >
                                                                     ❮
                                                                 </button>
                                                                 <button
                                                                     type="button"
                                                                     onClick={() => {
                                                                         const nextIdx = (currentIdx + 1) % paidPlansList.length;
                                                                         setPlan(paidPlansList[nextIdx].id.toString());
                                                                     }}
                                                                     title="Paket Selanjutnya"
                                                                     style={{
                                                                         background: 'none',
                                                                         border: 'none',
                                                                         color: '#818cf8',
                                                                         fontSize: '32px',
                                                                         fontWeight: 'bold',
                                                                         cursor: 'pointer',
                                                                         padding: '6px 20px',
                                                                         transition: 'all 0.2s ease',
                                                                         lineHeight: 1
                                                                     }}
                                                                 >
                                                                     ❯
                                                                 </button>
                                                             </div>


                                                         </>
                                                     );
                                                 })()}
                                            </div>



                                            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                                                <button 
                                                    type="button" 
                                                    onClick={() => setStep(1)} 
                                                    style={{
                                                        background: 'rgba(255, 255, 255, 0.05)',
                                                        color: '#e4e4e7',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        borderRadius: '12px',
                                                        padding: '14px 24px',
                                                        fontWeight: '600',
                                                        fontSize: '14px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease',
                                                        flex: 1
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                                    }}
                                                >
                                                    Kembali
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={handleProceedToSummary}
                                                    className="btn-primary" 
                                                    style={{ flex: 2 }} 
                                                    disabled={loading || validatingSummary}
                                                >
                                                    {validatingSummary ? 'Memeriksa Data...' : 'Lanjut Konfirmasi Detail'}

                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </form>

                        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#a1a1aa' }}>
                            Already have an account?{' '}
                            <Link href="/login" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: '500' }}>
                                Sign in instead
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
