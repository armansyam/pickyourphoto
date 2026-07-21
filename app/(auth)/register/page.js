"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

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

    const trialPlan = plans.find(p => p.price === 0 && p.planType === selectedTab);
    const hasTrial = !!trialPlan;

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const res = await fetch('/api/plans');
                if (res.ok) {
                    const data = await res.json();
                    setPlans(data);
                    if (data.length > 0) {
                        const firstLimit = data.find(p => p.planType === 'limit') || data[0];
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
        fetchPlans();
        fetchSettings();
    }, []);

    const handleNextStep = (e) => {
        e.preventDefault();
        if (!name || !email || !whatsapp || !password) {
            setError('Semua kolom data diri wajib diisi.');
            return;
        }
        if (password.length < 6) {
            setError('Password minimal harus 6 karakter.');
            return;
        }
        setError('');
        setStep(2);
    };

    const getFeatures = (p) => {
        if (p.planType === 'storage') {
            return [
                `Penyimpanan ${p.maxStorageMB >= 1024 ? `${(p.maxStorageMB / 1024).toFixed(0)} GB` : `${p.maxStorageMB} MB`}`,
                'Project Tanpa Batas',
                'Foto Tanpa Batas',
                `Masa Aktif ${p.activePeriodDays} Hari`
            ];
        } else {
            return [
                `Batas ${p.maxProjects} Project Aktif`,
                `Maks. ${p.maxPhotosPerProject} Foto / Project`,
                `Masa Aktif ${p.activePeriodDays} Hari`,
                'Sistem Cleaner 5 Hari'
            ];
        }
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

        const isFree = selectedPlan.price === 0;
        if (!isFree && !paymentProof) {
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
            `}</style>
            <div className="glass-card" style={{ width: '100%', maxWidth: step === 1 ? '400px' : '750px', transition: 'max-width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
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
                            const isFree = selectedPlan ? selectedPlan.price === 0 : false;
                            
                            const waMessage = isFree
                                ? `Halo Admin, saya baru saja mendaftar sebagai fotografer di Pick Your Photo.\n\nBerikut detail pendaftaran saya:\n- Nama: ${name}\n- Email: ${email}\n- Paket: ${planName} (Free Trial)\n\nMohon untuk diaktifkan masa uji coba gratis saya. Terima kasih!`
                                : `Halo Admin, saya baru saja mendaftar sebagai fotografer di Pick Your Photo.\n\nBerikut detail pendaftaran saya:\n- Nama: ${name}\n- Email: ${email}\n- Paket: ${planName}\n\nSaya sudah mengupload bukti bayar di form. Mohon disetujui pendaftarannya. Terima kasih!`;
                            
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
                                <div className="fade-in-up" key="step1">
                                    <div className="form-group">
                                        <label className="form-label">Full Name</label>
                                        <input
                                            type="text"
                                            className="input-text"
                                            required
                                            placeholder="John Doe"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            disabled={loading}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Email Address</label>
                                        <input
                                            type="email"
                                            className="input-text"
                                            required
                                            placeholder="vendor@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            disabled={loading}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">WhatsApp Number (WA)</label>
                                        <input
                                            type="text"
                                            className="input-text"
                                            required
                                            placeholder="Contoh: 6281234567890"
                                            value={whatsapp}
                                            onChange={(e) => setWhatsapp(e.target.value)}
                                            disabled={loading}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Password</label>
                                        <input
                                            type="password"
                                            className="input-text"
                                            required
                                            placeholder="Min 6 characters"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            disabled={loading}
                                        />
                                    </div>

                                    <button type="button" onClick={handleNextStep} className="btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                                        Lanjutkan Pilih Paket →
                                    </button>
                                </div>
                            ) : (
                                <div className="fade-in-up" key="step2">
                                    {hasTrial && (
                                        <div 
                                            onClick={() => !loading && setPlan(trialPlan.id.toString())}
                                            style={{
                                                background: parseInt(plan) === trialPlan.id 
                                                    ? 'rgba(99, 102, 241, 0.12)' 
                                                    : 'rgba(255, 255, 255, 0.02)',
                                                border: parseInt(plan) === trialPlan.id 
                                                    ? '2px solid #818cf8' 
                                                    : '1px solid rgba(255, 255, 255, 0.08)',
                                                borderRadius: '12px',
                                                padding: '16px 20px',
                                                marginBottom: '24px',
                                                cursor: loading ? 'not-allowed' : 'pointer',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                boxShadow: parseInt(plan) === trialPlan.id 
                                                    ? '0 6px 20px rgba(168, 85, 247, 0.2)' 
                                                    : 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '16px',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <span style={{ fontSize: '24px' }}>🎁</span>
                                                <div style={{ textAlign: 'left' }}>
                                                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#ffffff' }}>
                                                        Coba Gratis Sekarang! ({trialPlan.name})
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '2px' }}>
                                                        {trialPlan.planType === 'storage'
                                                            ? `Kapasitas Storage ${trialPlan.maxStorageMB >= 1024 ? `${(trialPlan.maxStorageMB / 1024).toFixed(0)} GB` : `${trialPlan.maxStorageMB} MB`} • Aktif ${trialPlan.activePeriodDays} Hari`
                                                            : `Batas ${trialPlan.maxProjects} Project • Maks. ${trialPlan.maxPhotosPerProject} Foto/Project • Aktif ${trialPlan.activePeriodDays} Hari`
                                                        }
                                                     </div>
                                                </div>
                                            </div>
                                            <div style={{
                                                padding: '6px 16px',
                                                borderRadius: '20px',
                                                fontSize: '11px',
                                                fontWeight: 'bold',
                                                background: parseInt(plan) === trialPlan.id 
                                                    ? 'linear-gradient(135deg, #a855f7, #3b82f6)' 
                                                    : 'rgba(255,255,255,0.06)',
                                                color: '#ffffff',
                                                border: parseInt(plan) === trialPlan.id ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {parseInt(plan) === trialPlan.id ? 'TERPILIH' : 'AKTIFKAN TRIAL'}
                                            </div>
                                        </div>
                                    )}

                                    <div className="form-group" style={{ marginBottom: '24px' }}>
                                        <label className="form-label" style={{ marginBottom: '12px', display: 'block', fontWeight: '600', color: '#e4e4e7' }}>Pilih Paket Langganan</label>
                                        
                                        {/* Tab Switcher */}
                                        <div style={{ 
                                            display: 'flex', 
                                            background: 'rgba(0, 0, 0, 0.25)', 
                                            padding: '4px', 
                                            borderRadius: '10px', 
                                            border: '1px solid rgba(255, 255, 255, 0.08)', 
                                            marginBottom: '16px' 
                                        }}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedTab('limit');
                                                    setPlan('');
                                                }}
                                                style={{
                                                    flex: 1,
                                                    background: selectedTab === 'limit' ? '#6366f1' : 'transparent',
                                                    color: selectedTab === 'limit' ? '#ffffff' : '#a1a1aa',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    padding: '8px 12px',
                                                    fontSize: '13px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    outline: 'none'
                                                }}
                                            >
                                                📁 Limit-Based
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedTab('storage');
                                                    setPlan('');
                                                }}
                                                style={{
                                                    flex: 1,
                                                    background: selectedTab === 'storage' ? '#6366f1' : 'transparent',
                                                    color: selectedTab === 'storage' ? '#ffffff' : '#a1a1aa',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    padding: '8px 12px',
                                                    fontSize: '13px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    outline: 'none'
                                                }}
                                            >
                                                📦 Storage-Based
                                            </button>
                                        </div>

                                        {/* Grid of Plans */}
                                        <style>{`
                                            .plans-swipe-container {
                                                display: flex;
                                                flex-flow: row nowrap;
                                                overflow-x: auto;
                                                scroll-snap-type: x mandatory;
                                                gap: 24px;
                                                margin-top: 30px;
                                                margin-bottom: 20px;
                                                padding: 10px 4px 20px 4px;
                                                scrollbar-width: none;
                                                -ms-overflow-style: none;
                                                justify-content: flex-start;
                                            }
                                            .plans-swipe-container::-webkit-scrollbar {
                                                display: none;
                                            }
                                            @media (min-width: 640px) {
                                                .plans-swipe-container {
                                                    justify-content: center;
                                                }
                                            }
                                            .plan-card-item {
                                                scroll-snap-align: start;
                                                flex: 0 0 280px;
                                            }
                                        `}</style>
                                        <div className="plans-swipe-container fade-in-up" key={selectedTab}>
                                            {plans.filter(p => p.price > 0 && p.planType === selectedTab).map(p => {
                                                const isSelected = parseInt(plan) === p.id;
                                                const isFree = p.price === 0;
                                                return (
                                                    <div 
                                                        key={p.id}
                                                        className="plan-card-item"
                                                        onClick={() => !loading && setPlan(p.id.toString())}
                                                        style={{
                                                            position: 'relative',
                                                            background: isSelected 
                                                                ? 'rgba(255, 255, 255, 0.05)' 
                                                                : 'rgba(255, 255, 255, 0.01)',
                                                            backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px)',
                                                            backgroundSize: '14px 14px',
                                                            border: isSelected 
                                                                ? '2px solid #818cf8' 
                                                                : '1px solid rgba(255, 255, 255, 0.08)',
                                                            borderRadius: '16px',
                                                            padding: '36px 20px 24px 20px',
                                                            cursor: loading ? 'not-allowed' : 'pointer',
                                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                            boxShadow: isSelected 
                                                                ? '0 12px 28px rgba(168, 85, 247, 0.25)' 
                                                                : 'none',
                                                            transform: isSelected 
                                                                ? 'translateY(-4px) scale(1.02)' 
                                                                : 'translateY(0) scale(1)',
                                                            boxSizing: 'border-box',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'stretch',
                                                            minHeight: '340px'
                                                        }}
                                                    >
                                                        {/* Speech Bubble Header Badge */}
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: '0',
                                                            left: '50%',
                                                            transform: 'translate(-50%, -50%)',
                                                            background: 'linear-gradient(135deg, #a855f7, #3b82f6)',
                                                            color: '#ffffff',
                                                            padding: '6px 20px',
                                                            borderRadius: '20px',
                                                            fontSize: '11px',
                                                            fontWeight: '800',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.08em',
                                                            boxShadow: isSelected ? '0 0 15px rgba(168, 85, 247, 0.4)' : '0 4px 10px rgba(0, 0, 0, 0.3)',
                                                            whiteSpace: 'nowrap',
                                                            border: '1px solid rgba(255, 255, 255, 0.15)'
                                                        }}>
                                                            {p.name.toUpperCase()}
                                                        </div>

                                                        {/* Price Block */}
                                                        <div style={{ textAlign: 'center', marginTop: '10px' }}>
                                                            <div style={{ fontSize: '26px', fontWeight: '850', color: '#ffffff', marginBottom: '2px' }}>
                                                                {isFree ? 'Rp 0' : `Rp ${p.price.toLocaleString()}`}
                                                                {!isFree && <span style={{ fontSize: '11px', color: '#71717a', fontWeight: 'normal' }}>/bln</span>}
                                                            </div>
                                                            <div style={{
                                                                fontSize: '10px',
                                                                fontWeight: '700',
                                                                color: isSelected ? '#a5b4fc' : '#71717a',
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '0.08em'
                                                            }}>
                                                                {p.planType === 'storage' ? 'STORAGE-BASED PLAN' : 'LIMIT-BASED PLAN'}
                                                            </div>
                                                        </div>

                                                        {/* Separator Line */}
                                                        <div style={{
                                                            width: '100%',
                                                            height: '1px',
                                                            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
                                                            margin: '18px 0'
                                                        }} />

                                                        {/* Features list */}
                                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', margin: '6px 0' }}>
                                                            {getFeatures(p).map((feat, idx) => (
                                                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#d4d4d8' }}>
                                                                    <span style={{ 
                                                                        width: '6px', 
                                                                        height: '6px', 
                                                                        borderRadius: '50%', 
                                                                        background: '#34d399',
                                                                        boxShadow: '0 0 6px #34d399'
                                                                    }} />
                                                                    <span>{feat}</span>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Select Button */}
                                                        <button
                                                            type="button"
                                                            style={{
                                                                width: '100%',
                                                                padding: '12px 16px',
                                                                borderRadius: '10px',
                                                                fontWeight: '800',
                                                                fontSize: '11px',
                                                                letterSpacing: '0.05em',
                                                                cursor: loading ? 'not-allowed' : 'pointer',
                                                                transition: 'all 0.3s ease',
                                                                background: isSelected 
                                                                    ? 'linear-gradient(135deg, #a855f7, #3b82f6)' 
                                                                    : 'rgba(255, 255, 255, 0.04)',
                                                                color: '#ffffff',
                                                                border: isSelected ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
                                                                boxShadow: isSelected ? '0 4px 15px rgba(168, 85, 247, 0.35)' : 'none',
                                                                marginTop: '20px'
                                                            }}
                                                        >
                                                            {isSelected ? 'TERPILIH' : 'PILIH PAKET'}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {(() => {
                                        const selectedPlanObj = plans.find(p => p.id === parseInt(plan)) || plans[0];
                                        const isFreePlan = selectedPlanObj ? selectedPlanObj.price === 0 : false;
                                        const showPayment = !isFreePlan && plans.length > 0;

                                        return (
                                            <div style={{
                                                maxHeight: showPayment ? '450px' : '0px',
                                                opacity: showPayment ? 1 : 0,
                                                transform: showPayment ? 'translateY(0)' : 'translateY(-10px)',
                                                overflow: 'hidden',
                                                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                                visibility: showPayment ? 'visible' : 'hidden'
                                            }}>
                                                <div className="form-group" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '14px', borderRadius: '10px', marginBottom: '20px' }}>
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

                                                <div className="form-group" style={{ marginBottom: '20px' }}>
                                                    <label className="form-label">Upload Bukti Pembayaran / Transfer</label>
                                                    <input
                                                        type="file"
                                                        className="input-text"
                                                        required={showPayment}
                                                        accept="image/*"
                                                        onChange={(e) => setPaymentProof(e.target.files ? e.target.files[0] : null)}
                                                        disabled={loading}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                    <span style={{ fontSize: '11px', color: '#71717a' }}>Format gambar yang didukung: JPG, PNG.</span>
                                                </div>
                                            </div>
                                        );
                                    })()}

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
                                        <button type="submit" className="btn-primary" style={{ flex: 2 }} disabled={loading}>
                                            {loading ? 'Daftar...' : 'Daftar Sekarang'}
                                        </button>
                                    </div>
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
