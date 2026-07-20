"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const [identifier, setIdentifier] = useState('');
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [registeredName, setRegisteredName] = useState('');

    useEffect(() => {
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
        fetchSettings();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Gagal mengirimkan permintaan.');
            }

            setRegisteredName(data.vendorName || '');
            setSuccess(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '90vh', padding: '16px' }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '400px' }}>
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
                        <h2 className="title-gradient" style={{ fontSize: '24px', margin: '0 0 14px 0' }}>Permintaan Terkirim!</h2>
                        <p style={{ color: '#a1a1aa', fontSize: '14px', lineHeight: '1.6', margin: '0 0 32px 0' }}>
                            Halo <strong>{registeredName}</strong>, permintaan reset password Anda telah diajukan ke admin. Silakan konfirmasi ke admin via WhatsApp untuk mendapatkan password baru Anda.
                        </p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {settings?.contact_whatsapp && (() => {
                                const waMessage = `Halo Admin, saya lupa password akun fotografer saya di Pick Your Photo.\n\nBerikut detail pendaftaran saya:\n- Nama: ${registeredName}\n- Email/WA: ${identifier}\n\nMohon bantuannya untuk mereset password akun saya. Terima kasih!`;
                                
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
                                        Konfirmasi via WhatsApp
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
                            <h2 className="title-gradient" style={{ fontSize: '28px', margin: '0 0 8px 0' }}>Lupa Password</h2>
                            <p style={{ color: '#a1a1aa', margin: 0, fontSize: '14px' }}>Masukkan email atau nomor WA terdaftar Anda</p>
                        </div>

                        {error && (
                            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="form-group" style={{ marginBottom: '24px' }}>
                                <label className="form-label">Email atau WhatsApp Vendor</label>
                                <input
                                    type="text"
                                    className="input-text"
                                    required
                                    placeholder="Contoh: vendor@example.com / 628123xxx"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    disabled={loading}
                                />
                            </div>

                            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '12px' }} disabled={loading}>
                                {loading ? 'Mengirimkan...' : 'Kirim Permintaan Reset'}
                            </button>
                        </form>

                        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#a1a1aa' }}>
                            Ingat password Anda?{' '}
                            <Link href="/login" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: '500' }}>
                                Sign in
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
