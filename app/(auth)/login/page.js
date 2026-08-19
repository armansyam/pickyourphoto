"use client";

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangleIcon } from '@/components/StorageIcons.jsx';

function LoginForm() {
    const searchParams = useSearchParams();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
            } catch {
                // Sesi kosong, tetap di halaman login
            }
        };
        checkExistingSession();

        const urlError = searchParams?.get('error');
        if (urlError) {
            setError(decodeURIComponent(urlError));
        }
    }, [searchParams]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Login failed.');
            }

            // Redirect based on role
            if (data.role === 'admin') {
                window.location.href = '/admin';
            } else {
                window.location.href = '/dashboard';
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '16px', background: '#09090b', color: '#f4f4f5', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <div style={{ width: '100%', maxWidth: '400px', background: 'rgba(18, 18, 24, 0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '16px', padding: '32px', boxShadow: '0 15px 40px rgba(0,0,0,0.5)' }}>
                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                    <h2 style={{ fontSize: '28px', margin: '0 0 8px 0', background: 'linear-gradient(135deg, #a5b4fc, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '800' }}>
                        Pick Your Photo
                    </h2>
                    <p style={{ color: '#a1a1aa', margin: 0, fontSize: '14px' }}>Masuk sebagai Fotografer / Vendor</p>
                </div>

                {error && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '14px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '14px', lineHeight: '1.5' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertTriangleIcon size={16} color="#f87171" />
                            <span>{error}</span>
                        </div>
                        {error.includes('belum terdaftar') && (
                            <div style={{ marginTop: '10px' }}>
                                <Link
                                    href="/register"
                                    style={{ display: 'inline-block', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#ffffff', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '13px', boxShadow: '0 2px 8px rgba(99,102,241,0.4)' }}
                                >
                                    Daftar Akun Baru Sekarang &rarr;
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                <a
                    href="/api/auth/google?action=login"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#ffffff',
                        fontSize: '14px',
                        fontWeight: '600',
                        textDecoration: 'none',
                        marginBottom: '20px',
                        transition: 'all 0.2s ease',
                        boxSizing: 'border-box'
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    Masuk dengan Google
                </a>

                <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '12px' }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                    <span style={{ fontSize: '12px', color: '#71717a' }}>atau via Email</span>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                            Email Address
                        </label>
                        <input
                            type="email"
                            required
                            placeholder="vendor@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            style={{ width: '100%', padding: '12px 14px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#cbd5e1', margin: 0 }}>Password</label>
                            <Link href="/forgot-password" style={{ color: '#818cf8', fontSize: '12px', textDecoration: 'none' }}>
                                Lupa Password?
                            </Link>
                        </div>
                        <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            style={{ width: '100%', padding: '12px 14px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{ width: '100%', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#ffffff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)' }}
                    >
                        {loading ? 'Memuat...' : 'Masuk Akun'}
                    </button>
                </form>

                <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#a1a1aa' }}>
                    Belum punya akun?{' '}
                    <Link href="/register" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 'bold' }}>
                        Daftar sekarang
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#09090b', color: '#a5b4fc', fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Memuat Halaman Login...</div>
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}

