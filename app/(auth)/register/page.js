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
    
    const [addonPlans, setAddonPlans] = useState([]);
    const [selectedAddonId, setSelectedAddonId] = useState(null);
    const [paymentConfig, setPaymentConfig] = useState({ enableGateway: true, provider: 'ipaymu', bankName: 'BCA', bankAccountNumber: '', bankAccountName: '' });

    const [uploadingProof, setUploadingProof] = useState(false);
    const [proofUploaded, setProofUploaded] = useState(false);
    const [selectedProofFile, setSelectedProofFile] = useState(null);
    const [proofPreviewUrl, setProofPreviewUrl] = useState('');
    const [proofUploadMsg, setProofUploadMsg] = useState('');

    // 1. Check existing logged in session
    useEffect(() => {
        const checkExistingSession = async () => {
            try {
                const res = await fetch('/api/vendor/profile');
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.id && data.status === 'active') {
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

    // 3. Unified Fast Bootstrap: Single Request on Mount
    useEffect(() => {
        let isMounted = true;

        const bootstrap = async () => {
            let targetEmail = '';
            let targetName = '';
            let targetStep = 1;
            let targetPlanId = '';

            if (typeof window !== 'undefined') {
                const urlParams = new URLSearchParams(window.location.search);
                targetEmail = (urlParams.get('email') || '').trim();
                targetName = (urlParams.get('name') || '').trim();
                targetPlanId = (urlParams.get('planId') || '').trim();
                if (urlParams.get('step') === 'select-plan') {
                    targetStep = 2;
                }
            }

            try {
                const initUrl = targetEmail 
                    ? `/api/register/init?email=${encodeURIComponent(targetEmail)}` 
                    : '/api/register/init';

                const res = await fetch(initUrl, { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    if (!isMounted) return;

                    // A. Registration Status
                    setRegStatus({
                        registration_open: data.registrationOpen !== false,
                        reason_closed: data.reasonClosed || null
                    });

                    // B. SaaS Settings, Plans & Add-ons
                    setSettings({
                        saas_name: data.platformName,
                        saas_logo_url: data.logoUrl,
                        logo_url: data.logoUrl
                    });
                    setPlans(data.plans || []);
                    setAddonPlans(data.addonPlans || []);
                    if (data.paymentConfig) {
                        setPaymentConfig(data.paymentConfig);
                    }
                    if (data.flashPromo) {
                        setFlashPromoInfo(data.flashPromo);
                    }

                    // C. Form Identity
                    if (targetEmail) setEmail(targetEmail);
                    if (targetName) setName(targetName);

                    // D. Restore Stage State from DB Session
                    const session = data.vendorSession;
                    if (session) {
                        if (session.name) setName(session.name);
                        if (session.whatsapp) setWhatsapp(session.whatsapp);

                        if (session.hasPending && session.pendingOrder) {
                            if (session.planId || session.pendingOrder.planId) {
                                setPlan(String(session.planId || session.pendingOrder.planId));
                            }
                            setPendingOrder(session.pendingOrder);
                            setShowSummary(false);
                            setExpiredNotice(false);
                            setStep(2);
                        } else if (session.hasExpired && session.planId) {
                            setPlan(String(session.planId));
                            setShowSummary(true);
                            setPendingOrder(null);
                            setExpiredNotice(true);
                            setStep(2);
                        } else if (session.planId) {
                            setPlan(String(session.planId));
                            setShowSummary(true);
                            setPendingOrder(null);
                            setExpiredNotice(false);
                            setStep(2);
                        } else {
                            if (targetPlanId) setPlan(targetPlanId);
                            setStep(targetStep);
                            setShowSummary(false);
                            setPendingOrder(null);
                        }
                    } else {
                        if (targetPlanId) setPlan(targetPlanId);
                        setStep(targetStep);
                    }
                }
            } catch (err) {
                console.error('[Register Bootstrap Error]:', err);
            } finally {
                if (isMounted) {
                    setCheckingStatus(false);
                }
            }
        };

        bootstrap();

        return () => {
            isMounted = false;
        };
    }, []);

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

    // Forward transition: Detail Summary -> QRIS Payment (Instant Optimistic Transition to Stage 4)
    const handlePayQris = async (e, customParams = {}) => {
        if (e) e.preventDefault();
        setError('');

        const selectedPlan = plans.find(p => p.id === parseInt(plan));
        if (!selectedPlan) {
            setError('Paket yang dipilih tidak valid.');
            return;
        }

        const targetAddonId = customParams.addonPlanId !== undefined ? customParams.addonPlanId : selectedAddonId;
        const chosenAddon = addonPlans.find(a => a.id === targetAddonId);
        const addonPrice = chosenAddon ? Number(chosenAddon.price || 0) : 0;
        const finalAmount = Number(selectedPlan.discountedPrice || selectedPlan.price || 0) + addonPrice;

        // 1. Immediately switch to Stage 4 (0ms delay) with in-place skeleton loading
        setShowSummary(false);
        setExpiredNotice(false);
        setPendingOrder({
            isLoading: true,
            name: name || 'Vendor',
            email: email,
            whatsapp: whatsapp,
            planId: selectedPlan.id,
            planName: selectedPlan.name,
            planPrice: selectedPlan.price,
            addonPlanId: targetAddonId,
            amount: finalAmount
        });

        // 2. Fetch gateway in background
        try {
            const payRes = await fetch('/api/payment/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email,
                    vendorEmail: email,
                    planId: selectedPlan.id,
                    addonPlanId: targetAddonId
                })
            });
            const payData = await payRes.json();
            
            if (payRes.ok && (payData.token || payData.qrUrl || payData.redirectUrl)) {
                setPendingOrder({
                    isLoading: false,
                    hasPending: true,
                    vendorId: payData.vendorId,
                    name: name || 'Vendor',
                    email: email,
                    whatsapp: whatsapp,
                    orderId: payData.orderId,
                    provider: payData.provider || 'ipaymu',
                    token: payData.token,
                    redirectUrl: payData.redirectUrl,
                    qrUrl: payData.qrUrl || payData.redirectUrl,
                    qrImage: payData.qrUrl || payData.redirectUrl,
                    amount: payData.amount || finalAmount,
                    expiresAt: payData.expiresAt,
                    planId: selectedPlan.id,
                    planName: selectedPlan.name,
                    planPrice: selectedPlan.price
                });
                return;
            }

            // If failed, gracefully return to summary
            setError(payData.message || 'Sesi pembayaran QRIS gagal dibuat. Silakan coba lagi.');
            setPendingOrder(null);
            setShowSummary(true);
        } catch (payErr) {
            console.error('[Payment Launch Error]:', payErr);
            setError('Koneksi ke sistem pembayaran gagal. Silakan coba beberapa saat lagi.');
            setPendingOrder(null);
            setShowSummary(true);
        }
    };

    // Manual Bank Transfer Submission Handler (when gateway is disabled)
    const handleManualTransferSubmit = async (e, customParams = {}) => {
        if (e) e.preventDefault();
        setError('');

        const selectedPlan = plans.find(p => p.id === parseInt(plan));
        if (!selectedPlan) {
            setError('Paket yang dipilih tidak valid.');
            return;
        }

        const targetAddonId = customParams.addonPlanId !== undefined ? customParams.addonPlanId : selectedAddonId;

        try {
            const formData = new FormData();
            formData.append('email', email);
            formData.append('planId', selectedPlan.id);
            if (targetAddonId) formData.append('selectedAddonKey', targetAddonId);
            if (customParams.proofFile) formData.append('paymentProof', customParams.proofFile);

            const res = await fetch('/api/auth/register', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (res.ok) {
                // Switch to manual pending view
                setPendingOrder({
                    isManual: true,
                    name: name || 'Vendor',
                    email: email,
                    planName: selectedPlan.name,
                    bankName: paymentConfig.bankName,
                    bankAccountNumber: paymentConfig.bankAccountNumber,
                    bankAccountName: paymentConfig.bankAccountName
                });
                setShowSummary(false);
            } else {
                setError(data.message || 'Gagal mengirim konfirmasi transfer bank.');
            }
        } catch (err) {
            setError('Gagal mengirim konfirmasi. Silakan coba lagi.');
        }
    };

    const handleUploadProof = async (e) => {
        if (e) e.preventDefault();
        if (!selectedProofFile) {
            setError('Silakan pilih foto bukti transfer terlebih dahulu.');
            return;
        }
        setUploadingProof(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('email', email);
            formData.append('paymentProof', selectedProofFile);

            const res = await fetch('/api/register/upload-proof', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                setProofUploaded(true);
                setProofUploadMsg('Bukti transfer berhasil diunggah. Admin sedang memverifikasi pembayaran Anda.');
            } else {
                setError(data.message || 'Gagal mengunggah bukti transfer.');
            }
        } catch (err) {
            setError('Koneksi gagal saat mengunggah bukti transfer.');
        } finally {
            setUploadingProof(false);
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
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                        {(settings?.saas_logo_url || settings?.logo_url) && (
                            <img src={settings.saas_logo_url || settings.logo_url} alt={platformName} style={{ height: '38px', objectFit: 'contain', marginBottom: '10px' }} />
                        )}
                        <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em', color: '#ffffff' }}>
                            Join with <span style={{ color: '#38bdf8' }}>{platformName}</span>
                        </h1>
                    </Link>
                    <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>
                        {pendingOrder ? 'Pembayaran QRIS' : showSummary ? 'Konfirmasi Pesanan' : step === 2 ? 'Pilih Paket Langganan' : 'Pendaftaran Studio Baru'}
                    </p>
                </div>

                {/* 4-Stage Modular Lifecycle Views */}
                {pendingOrder?.isManual ? (
                    /* Stage 4 (Manual): Menunggu Verifikasi Pembayaran Manual */
                    <div className="fade-in-up" style={{
                        background: 'linear-gradient(160deg, rgba(15, 23, 42, 0.96), rgba(10, 15, 30, 0.98))',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: '20px',
                        padding: '32px 24px',
                        textAlign: 'center',
                        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
                    }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', fontSize: '24px' }}>
                            ⏳
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', margin: '0 0 8px 0' }}>
                            Menunggu Verifikasi Pembayaran
                        </h3>
                        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 20px 0', lineHeight: '1.5' }}>
                            Konfirmasi transfer bank untuk paket <strong>{pendingOrder.planName}</strong> telah diterima. Tim admin akan segera memeriksa dan mengaktifkan akun Anda.
                        </p>

                        {/* Rincian Rekening & Tagihan */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', marginBottom: '16px', textAlign: 'left', fontSize: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ color: '#94a3b8' }}>Akun:</span>
                                <strong style={{ color: '#ffffff' }}>{pendingOrder.email || email}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ color: '#94a3b8' }}>Bank Tujuan:</span>
                                <strong style={{ color: '#ffffff' }}>{paymentConfig.bankName}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ color: '#94a3b8' }}>No. Rekening:</span>
                                <strong style={{ color: '#fbbf24', letterSpacing: '0.04em' }}>{paymentConfig.bankAccountNumber}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#94a3b8' }}>Atas Nama:</span>
                                <strong style={{ color: '#ffffff' }}>{paymentConfig.bankAccountName || 'PT Pick Your Photo'}</strong>
                            </div>
                        </div>

                        {/* Form Upload Bukti Transfer */}
                        <div style={{
                            background: 'rgba(56, 189, 248, 0.04)',
                            border: '1px dashed rgba(56, 189, 248, 0.3)',
                            borderRadius: '14px',
                            padding: '16px',
                            marginBottom: '20px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
                                📁 Unggah Bukti Pembayaran
                            </div>

                            {proofUploaded ? (
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '12px', color: '#34d399', fontSize: '12px', fontWeight: '600' }}>
                                    ✅ Bukti transfer berhasil diunggah! Tim admin sedang memverifikasi pembayaran Anda.
                                </div>
                            ) : (
                                <div>
                                    <input 
                                        type="file" 
                                        id="proof_upload_input"
                                        accept="image/png,image/jpeg,image/jpg,.pdf" 
                                        style={{ display: 'none' }}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setSelectedProofFile(file);
                                                if (file.type.startsWith('image/')) {
                                                    setProofPreviewUrl(URL.createObjectURL(file));
                                                }
                                            }
                                        }}
                                    />
                                    <label 
                                        htmlFor="proof_upload_input"
                                        style={{
                                            display: 'block',
                                            padding: '14px',
                                            borderRadius: '10px',
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            color: '#cbd5e1',
                                            marginBottom: selectedProofFile ? '12px' : '0',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        {selectedProofFile ? (
                                            <span style={{ color: '#38bdf8', fontWeight: '600' }}>
                                                📄 {selectedProofFile.name} ({(selectedProofFile.size / 1024).toFixed(1)} KB)
                                            </span>
                                        ) : (
                                            <span>Klik di sini untuk memilih foto struk / bukti transfer (JPG / PNG)</span>
                                        )}
                                    </label>

                                    {proofPreviewUrl && (
                                        <div style={{ margin: '10px 0' }}>
                                            <img src={proofPreviewUrl} alt="Preview Bukti" style={{ maxHeight: '120px', maxWidth: '100%', borderRadius: '8px', objectFit: 'contain', border: '1px solid rgba(255,255,255,0.1)' }} />
                                        </div>
                                    )}

                                    {selectedProofFile && (
                                        <button
                                            type="button"
                                            onClick={handleUploadProof}
                                            disabled={uploadingProof}
                                            className="btn-primary"
                                            style={{
                                                width: '100%',
                                                padding: '10px 16px',
                                                fontSize: '13px',
                                                fontWeight: '700',
                                                cursor: uploadingProof ? 'not-allowed' : 'pointer',
                                                opacity: uploadingProof ? 0.6 : 1
                                            }}
                                        >
                                            {uploadingProof ? 'Mengunggah Bukti...' : 'Kirim Bukti Pembayaran'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Tombol Aksi Bawah */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={async () => {
                                    const targetPlanId = pendingOrder?.planId || plan;
                                    if (targetPlanId) {
                                        setPlan(String(targetPlanId));
                                    }
                                    setPendingOrder(null);
                                    setShowSummary(true);
                                    setExpiredNotice(false);

                                    // Revert vendor status to draft_plan in database
                                    try {
                                        await fetch('/api/payment/cancel', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ email })
                                        });
                                    } catch (e) {}
                                }}
                                style={{
                                    flex: 1,
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    color: '#cbd5e1',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '10px',
                                    padding: '12px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                Batalkan Pembayaran
                            </button>
                            <a
                                href={`https://wa.me/?text=${encodeURIComponent(`Halo Admin ${platformName}, saya sudah melakukan transfer untuk pendaftaran paket ${pendingOrder.planName} dengan email ${email}. Mohon bantuannya untuk verifikasi akun saya. Terima kasih!`)}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                    flex: 2,
                                    background: '#25D366',
                                    color: '#ffffff',
                                    textDecoration: 'none',
                                    borderRadius: '10px',
                                    padding: '12px',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                            >
                                Konfirmasi via WhatsApp
                            </a>
                        </div>
                    </div>
                ) : pendingOrder ? (
                    /* Stage 4: Native QRIS Display (Timer + Expiry Handling) */
                    <NativeQrisDisplay
                        pendingOrder={pendingOrder}
                        platformName={platformName}
                        onExpired={(order) => {
                            const targetPlanId = order?.planId || pendingOrder?.planId || plan;
                            if (targetPlanId) {
                                setPlan(String(targetPlanId));
                            }
                            setShowSummary(true);
                            setPendingOrder(null);
                            setExpiredNotice(true);
                        }}
                        onCancel={async () => {
                            const orderToCancel = pendingOrder?.orderId;
                            const targetPlanId = pendingOrder?.planId || plan;
                            
                            // Immediately retreat 1 step back to Stage 3 (Detail Summary)
                            if (targetPlanId) {
                                setPlan(String(targetPlanId));
                            }
                            setPendingOrder(null);
                            setShowSummary(true);
                            setExpiredNotice(false);

                            // Cancel payment session in database
                            if (orderToCancel) {
                                try {
                                    await fetch('/api/payment/cancel', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ orderId: orderToCancel, email })
                                    });
                                } catch (e) {}
                            }
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
                        addonPlans={addonPlans}
                        selectedAddonId={selectedAddonId}
                        onSelectAddon={(id) => setSelectedAddonId(id)}
                        paymentConfig={paymentConfig}
                        expiredNotice={expiredNotice}
                        onResetPlan={handleResetPlan}
                        onPayQris={handlePayQris}
                        onManualTransferSubmit={handleManualTransferSubmit}
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
                <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#64748b' }}>
                    Sudah memiliki akun studio?{' '}
                    <Link href="/login" style={{ color: '#38bdf8', fontWeight: '600', textDecoration: 'none' }}>
                        Masuk di sini
                    </Link>
                </div>
            </div>
        </div>
    );
}
