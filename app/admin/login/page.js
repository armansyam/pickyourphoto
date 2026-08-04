'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AdminLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/admin/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Login admin gagal.');
            }

            // Successfully authenticated as admin
            window.location.href = '/admin';
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '16px',
            background: 'radial-gradient(circle at top, #1e1b4b 0%, #09090b 100%)',
            color: '#f4f4f5',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '420px',
                background: 'rgba(15, 15, 23, 0.9)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(129, 140, 248, 0.25)',
                borderRadius: '20px',
                padding: '36px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.7)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '48px',
                        height: '48px',
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                        marginBottom: '14px',
                        fontSize: '24px',
                        boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)'
                    }}>
                        🛡️
                    </div>
                    <h2 style={{
                        fontSize: '24px',
                        margin: '0 0 6px 0',
                        color: '#ffffff',
                        fontWeight: '800',
                        letterSpacing: '-0.02em'
                    }}>
                        SaaS Owner Console
                    </h2>
                    <p style={{ color: '#818cf8', margin: 0, fontSize: '13px', fontWeight: '500' }}>
                        Portal Otentikasi Khusus Administrator
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        padding: '14px 16px',
                        borderRadius: '12px',
                        marginBottom: '24px',
                        fontSize: '13px',
                        lineHeight: '1.5'
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#a5b4fc', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Email Administrator
                        </label>
                        <input
                            type="email"
                            required
                            placeholder="admin@domain.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: '10px',
                                color: '#ffffff',
                                fontSize: '14px',
                                outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'all 0.2s ease'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#a5b4fc', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Password
                        </label>
                        <input
                            type="password"
                            required
                            placeholder="••••••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: '10px',
                                color: '#ffffff',
                                fontSize: '14px',
                                outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'all 0.2s ease'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '14px 20px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                            color: '#ffffff',
                            border: 'none',
                            fontWeight: '700',
                            fontSize: '14px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.35)',
                            marginTop: '8px',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Memverifikasi Kredensial...' : '🔒 Masuk ke Owner Console'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '28px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px' }}>
                    <Link
                        href="/login"
                        style={{ color: '#71717a', fontSize: '12px', textDecoration: 'none', transition: 'color 0.2s' }}
                    >
                        ← Kembali ke Login Fotografer / Vendor
                    </Link>
                </div>
            </div>
        </div>
    );
}
