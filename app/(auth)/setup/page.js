'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupWizardPage() {
    const router = useRouter();

    // Form States
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [city, setCity] = useState('');
    const [address, setAddress] = useState('');

    const [brandName, setBrandName] = useState('');
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState('');
    const [studioWhatsapp, setStudioWhatsapp] = useState('');
    const [sameAsOwnerWa, setSameAsOwnerWa] = useState(true);
    const [subdomain, setSubdomain] = useState('');
    const [rootDomain, setRootDomain] = useState('');
    const [saasName, setSaasName] = useState('Photota');
    const [saasLogoUrl, setSaasLogoUrl] = useState('');

    // Subdomain Validation State
    const [subdomainChecking, setSubdomainChecking] = useState(false);
    const [subdomainStatus, setSubdomainStatus] = useState(null); // { available: boolean, message: string }

    // Page & Modal States
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // Fetch initial vendor data for pre-fill
    useEffect(() => {
        let isMounted = true;
        if (typeof window !== 'undefined' && window.location.host) {
            setRootDomain(window.location.host);
        }
        const fetchInitialData = async () => {
            try {
                const res = await fetch('/api/vendor/setup');
                if (res.status === 401) {
                    router.push('/login');
                    return;
                }
                const data = await res.json();
                if (data.success && isMounted) {
                    const v = data.vendor;
                    setEmail(v.email || '');
                    setName(v.name || '');
                    setWhatsapp(v.whatsapp || '');
                    setCity(v.city || '');
                    setAddress(v.address || '');
                    setBrandName(v.brandName || '');
                    setStudioWhatsapp(v.studio_whatsapp || v.whatsapp || '');
                    setLogoPreview(v.brandLogo || '');
                    
                    if (data.saasName) setSaasName(data.saasName);
                    if (data.saasLogoUrl) setSaasLogoUrl(data.saasLogoUrl);

                    if (v.subdomain) {
                        setSubdomain(v.subdomain);
                    } else if (v.name || v.brandName) {
                        const raw = (v.brandName || v.name).toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 20);
                        setSubdomain(raw);
                    }

                    if (data.rootDomain) {
                        setRootDomain(data.rootDomain);
                    }
                }
            } catch (err) {
                console.error('Gagal memuat data awal setup:', err);
            } finally {
                if (isMounted) setLoadingInitial(false);
            }
        };

        fetchInitialData();
        return () => { isMounted = false; };
    }, [router]);

    // Sync Studio WA when toggle is active
    useEffect(() => {
        if (sameAsOwnerWa) {
            setStudioWhatsapp(whatsapp);
        }
    }, [sameAsOwnerWa, whatsapp]);

    // Handle Logo Selection
    const handleLogoChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setErrorMessage('Ukuran file logo maksimal 2MB.');
                return;
            }
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
            setErrorMessage('');
        }
    };

    // Check Subdomain Availability
    const handleCheckSubdomain = async () => {
        const clean = subdomain.toLowerCase().trim();
        if (!clean) {
            setSubdomainStatus({ available: false, message: 'Silakan masukkan nama subdomain terlebih dahulu.' });
            return;
        }

        setSubdomainChecking(true);
        setSubdomainStatus(null);
        try {
            const res = await fetch(`/api/vendor/check-subdomain?subdomain=${encodeURIComponent(clean)}`);
            const data = await res.json();
            if (data.available) {
                setSubdomainStatus({ available: true, message: 'Subdomain tersedia untuk digunakan.' });
            } else {
                setSubdomainStatus({ available: false, message: data.reason || 'Subdomain tidak tersedia.' });
            }
        } catch (err) {
            setSubdomainStatus({ available: false, message: 'Gagal memeriksa ketersediaan subdomain.' });
        } finally {
            setSubdomainChecking(false);
        }
    };

    // Open Preview Modal with Local Form Validation
    const handleOpenPreview = (e) => {
        if (e) e.preventDefault();
        setErrorMessage('');

        if (!name.trim()) {
            setErrorMessage('Nama pemilik akun wajib diisi.');
            return;
        }
        if (!whatsapp.trim()) {
            setErrorMessage('Nomor WhatsApp pemilik akun wajib diisi.');
            return;
        }
        if (!subdomain.trim()) {
            setErrorMessage('Subdomain studio wajib diisi.');
            return;
        }
        const effectiveStudioWa = sameAsOwnerWa ? whatsapp : studioWhatsapp;
        if (!effectiveStudioWa.trim()) {
            setErrorMessage('Nomor WhatsApp studio wajib diisi.');
            return;
        }

        setIsPreviewOpen(true);
    };

    // Final Save Handler
    const handleFinalSave = async () => {
        setSubmitting(true);
        setErrorMessage('');

        try {
            const formData = new FormData();
            formData.append('name', name.trim());
            formData.append('whatsapp', whatsapp.trim());
            formData.append('city', city.trim());
            formData.append('address', address.trim());
            formData.append('brandName', brandName.trim());
            formData.append('studio_whatsapp', (sameAsOwnerWa ? whatsapp : studioWhatsapp).trim());
            formData.append('subdomain', subdomain.toLowerCase().trim());
            if (logoFile) {
                formData.append('logo', logoFile);
            }

            const res = await fetch('/api/vendor/setup', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Gagal menyimpan data konfigurasi.');
            }

            // Redirect ke Dashboard
            router.push(data.redirectUrl || '/dashboard');
        } catch (err) {
            setErrorMessage(err.message || 'Terjadi kesalahan saat menyimpan data.');
            setIsPreviewOpen(false);
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingInitial) {
        return (
            <div style={{ minHeight: '100vh', background: '#090d16', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    <span>Memuat konfigurasi awal...</span>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#090d16', color: '#f4f4f5', padding: '40px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: '640px' }}>
                
                {/* Header Title & Branding */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    {saasLogoUrl ? (
                        <div style={{ marginBottom: '16px' }}>
                            <img 
                                src={saasLogoUrl} 
                                alt={saasName} 
                                style={{ height: '42px', maxWidth: '200px', objectFit: 'contain' }} 
                            />
                        </div>
                    ) : (
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', marginBottom: '16px' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                <circle cx="12" cy="13" r="4" />
                            </svg>
                        </div>
                    )}
                    <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.02em' }}>
                        Pengaturan Awal Profil Studio
                    </h1>
                    <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: '1.5' }}>
                        Lengkapi informasi biodata pemilik dan identitas studio Anda di <strong style={{ color: '#ffffff' }}>{saasName}</strong> sebelum memulai.
                    </p>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* Main Form Card */}
                <div style={{ background: 'linear-gradient(160deg, rgba(15, 23, 42, 0.95), rgba(10, 15, 30, 0.98))', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '20px', padding: '32px 28px', boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)' }}>
                    <form onSubmit={handleOpenPreview}>
                        
                        {/* BAGIAN 1: BIODATA PEMILIK */}
                        <div style={{ paddingBottom: '24px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                            <div style={{ fontSize: '11px', color: '#818cf8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                                <span>Bagian 1: Biodata Pemilik Akun</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Email (Terkunci) */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                                        Alamat Email Akun
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="email"
                                            value={email}
                                            disabled
                                            style={{ width: '100%', padding: '12px 14px 12px 36px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(255, 255, 255, 0.03)', color: '#94a3b8', fontSize: '13px', cursor: 'not-allowed', boxSizing: 'border-box' }}
                                        />
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '12px', top: '15px' }}>
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                        </svg>
                                    </div>
                                    <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>Email terdaftar permanen dari sesi otentikasi.</span>
                                </div>

                                {/* Nama Lengkap */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                                        Nama Lengkap Pemilik <span style={{ color: '#f87171' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Masukkan nama lengkap pemilik"
                                        required
                                        style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.12)', background: 'rgba(255, 255, 255, 0.04)', color: '#ffffff', fontSize: '13px', boxSizing: 'border-box' }}
                                    />
                                </div>

                                {/* No. WhatsApp Pemilik */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                                        Nomor WhatsApp Pribadi <span style={{ color: '#f87171' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={whatsapp}
                                        onChange={(e) => setWhatsapp(e.target.value)}
                                        placeholder="Contoh: 081234567890"
                                        required
                                        style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.12)', background: 'rgba(255, 255, 255, 0.04)', color: '#ffffff', fontSize: '13px', boxSizing: 'border-box' }}
                                    />
                                </div>

                                {/* Kota & Alamat (Opsional) */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                                            Kota <span style={{ color: '#64748b', fontSize: '11px' }}>(Opsional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            placeholder="Contoh: Surabaya"
                                            style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.12)', background: 'rgba(255, 255, 255, 0.04)', color: '#ffffff', fontSize: '13px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                                            Alamat Studio <span style={{ color: '#64748b', fontSize: '11px' }}>(Opsional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            placeholder="Contoh: Jl. Pemuda No. 10"
                                            style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.12)', background: 'rgba(255, 255, 255, 0.04)', color: '#ffffff', fontSize: '13px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* BAGIAN 2: PROFIL VENDOR / STUDIO */}
                        <div style={{ padding: '24px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                            <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                    <line x1="8" y1="21" x2="16" y2="21" />
                                    <line x1="12" y1="17" x2="12" y2="21" />
                                </svg>
                                <span>Bagian 2: Profil Studio &amp; Branding</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Nama Vendor / Studio */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                                        Nama Studio / Usaha Fotografi <span style={{ color: '#64748b', fontSize: '11px' }}>(Opsional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={brandName}
                                        onChange={(e) => setBrandName(e.target.value)}
                                        placeholder="Contoh: Irene Photography"
                                        style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.12)', background: 'rgba(255, 255, 255, 0.04)', color: '#ffffff', fontSize: '13px', boxSizing: 'border-box' }}
                                    />
                                    <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>Jika dikosongkan, galeri akan menampilkan nama standar pemilik.</span>
                                </div>

                                {/* Logo Studio */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                                        Logo Studio <span style={{ color: '#64748b', fontSize: '11px' }}>(Opsional, Disarankan)</span>
                                    </label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        {logoPreview ? (
                                            <div style={{ width: '48px', height: '48px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.15)', background: '#1e293b', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <img src={logoPreview} alt="Logo Studio" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                            </div>
                                        ) : (
                                            <div style={{ width: '48px', height: '48px', borderRadius: '8px', border: '1px dashed rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', flexShrink: 0 }}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                                    <polyline points="21 15 16 10 5 21" />
                                                </svg>
                                            </div>
                                        )}
                                        <div style={{ flex: 1 }}>
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                                                onChange={handleLogoChange}
                                                style={{ fontSize: '12px', color: '#cbd5e1', cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'block' }}>Format: JPG, PNG, WEBP, SVG (Maksimal 2MB).</span>
                                        </div>
                                    </div>
                                </div>

                                {/* No. WhatsApp Studio */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#cbd5e1' }}>
                                            Nomor WhatsApp Kontak Studio <span style={{ color: '#f87171' }}>*</span>
                                        </label>
                                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={sameAsOwnerWa}
                                                onChange={(e) => setSameAsOwnerWa(e.target.checked)}
                                                style={{ cursor: 'pointer' }}
                                            />
                                            <span>Samakan dengan WA Pemilik</span>
                                        </label>
                                    </div>
                                    <input
                                        type="text"
                                        value={studioWhatsapp}
                                        onChange={(e) => {
                                            setStudioWhatsapp(e.target.value);
                                            setSameAsOwnerWa(false);
                                        }}
                                        placeholder="Nomor WA untuk dihubungi klien di galeri"
                                        disabled={sameAsOwnerWa}
                                        required
                                        style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.12)', background: sameAsOwnerWa ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.04)', color: sameAsOwnerWa ? '#94a3b8' : '#ffffff', fontSize: '13px', boxSizing: 'border-box' }}
                                    />
                                    <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>Nomor ini ditampilkan pada tombol kontak di galeri klien.</span>
                                </div>

                                {/* Subdomain Studio */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                                        Subdomain Galeri Studio <span style={{ color: '#f87171' }}>*</span>
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <div style={{ position: 'relative', flex: 1 }}>
                                            <input
                                                type="text"
                                                value={subdomain}
                                                onChange={(e) => {
                                                    setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                                                    setSubdomainStatus(null);
                                                }}
                                                placeholder="nama-studio"
                                                required
                                                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.12)', background: 'rgba(255, 255, 255, 0.04)', color: '#38bdf8', fontWeight: '700', fontSize: '13px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>
                                            .{rootDomain}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleCheckSubdomain}
                                            disabled={subdomainChecking || !subdomain.trim()}
                                            style={{
                                                padding: '0 16px',
                                                borderRadius: '10px',
                                                border: '1px solid rgba(56, 189, 248, 0.3)',
                                                background: 'rgba(56, 189, 248, 0.1)',
                                                color: '#38bdf8',
                                                fontSize: '12px',
                                                fontWeight: '700',
                                                cursor: (subdomainChecking || !subdomain.trim()) ? 'not-allowed' : 'pointer',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {subdomainChecking ? 'Memeriksa...' : 'Cek Ketersediaan'}
                                        </button>
                                    </div>

                                    {subdomainStatus && (
                                        <div style={{ marginTop: '6px', fontSize: '11px', color: subdomainStatus.available ? '#34d399' : '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                {subdomainStatus.available ? (
                                                    <polyline points="20 6 9 17 4 12" />
                                                ) : (
                                                    <>
                                                        <circle cx="12" cy="12" r="10" />
                                                        <line x1="15" y1="9" x2="9" y2="15" />
                                                        <line x1="9" y1="9" x2="15" y2="15" />
                                                    </>
                                                )}
                                            </svg>
                                            <span>{subdomainStatus.message}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* TOMBOL PRATINJAU DATA (TERPISAH) */}
                        <div style={{ marginTop: '24px' }}>
                            <button
                                type="submit"
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                    color: '#ffffff',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)'
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                                <span>Pratinjau Data</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* POPUP MODAL PRATINJAU DATA */}
            {isPreviewOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                    <div style={{ background: 'linear-gradient(160deg, #0f172a, #0a0f1d)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px', width: '100%', maxWidth: '520px', padding: '28px', position: 'relative', boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)' }}>
                        
                        {/* Modal Header */}
                        <div style={{ textAlign: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                            <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '800', color: '#ffffff' }}>
                                Konfirmasi Data Profil Studio
                            </h3>
                            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                                Periksa ringkasan konfigurasi sebelum menyimpan ke sistem.
                            </p>
                        </div>

                        {/* Summary List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px', marginBottom: '24px' }}>
                            {/* Pemilik */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <span style={{ color: '#64748b', fontSize: '12px' }}>Nama Pemilik</span>
                                <span style={{ color: '#ffffff', fontWeight: '600', textAlign: 'right' }}>{name}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <span style={{ color: '#64748b', fontSize: '12px' }}>Alamat Email</span>
                                <span style={{ color: '#94a3b8', fontFamily: 'monospace', textAlign: 'right' }}>{email}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <span style={{ color: '#64748b', fontSize: '12px' }}>WhatsApp Pribadi</span>
                                <span style={{ color: '#ffffff', fontWeight: '600', textAlign: 'right' }}>{whatsapp}</span>
                            </div>
                            {city && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <span style={{ color: '#64748b', fontSize: '12px' }}>Kota</span>
                                    <span style={{ color: '#ffffff', textAlign: 'right' }}>{city}</span>
                                </div>
                            )}
                            
                            <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.06)', margin: '4px 0' }} />

                            {/* Studio */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <span style={{ color: '#64748b', fontSize: '12px' }}>Nama Studio</span>
                                <span style={{ color: '#38bdf8', fontWeight: '700', textAlign: 'right' }}>{brandName || '(Menggunakan nama pemilik)'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <span style={{ color: '#64748b', fontSize: '12px' }}>WhatsApp Kontak Galeri</span>
                                <span style={{ color: '#ffffff', fontWeight: '600', textAlign: 'right' }}>{sameAsOwnerWa ? whatsapp : studioWhatsapp}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <span style={{ color: '#64748b', fontSize: '12px' }}>Subdomain Galeri</span>
                                <span style={{ color: '#34d399', fontWeight: '700', fontFamily: 'monospace', textAlign: 'right' }}>{subdomain}.{rootDomain}</span>
                            </div>
                        </div>

                        {/* Modal Action Buttons */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={() => setIsPreviewOpen(false)}
                                disabled={submitting}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    color: '#cbd5e1',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: submitting ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Ubah Data
                            </button>
                            <button
                                type="button"
                                onClick={handleFinalSave}
                                disabled={submitting}
                                style={{
                                    flex: 2,
                                    padding: '12px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    color: '#ffffff',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    cursor: submitting ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                            >
                                {submitting ? (
                                    <span>Menyimpan Konfigurasi...</span>
                                ) : (
                                    <>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        <span>Simpan &amp; Masuk ke Dashboard</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
