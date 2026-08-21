"use client";

import React, { useState } from 'react';
import Link from 'next/link';

export default function RegisterGoogleEntry({ platformName = 'Photota', onStartGoogleAuth, loading, error }) {
    return (
        <div className="fade-in-up" style={{ textAlign: 'center' }}>
            <div style={{
                background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.8) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '24px',
                padding: '36px 28px',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)'
            }}>
                <div style={{ marginBottom: '24px' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(56, 189, 248, 0.1)',
                        border: '1px solid rgba(56, 189, 248, 0.2)',
                        padding: '4px 12px',
                        borderRadius: '99px',
                        color: '#38bdf8',
                        fontSize: '11px',
                        fontWeight: '700',
                        letterSpacing: '0.04em',
                        marginBottom: '12px'
                    }}>
                        <span>AKUN VENDOR BARU</span>
                    </div>
                    <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#ffffff', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                        Mulai Kelola Studio Anda
                    </h2>
                    <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>
                        Daftar cepat dan aman menggunakan akun Google Anda untuk mengaktifkan portal klien &amp; galeri foto.
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#f87171',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        marginBottom: '20px',
                        textAlign: 'left'
                    }}>
                        {error}
                    </div>
                )}

                <button
                    type="button"
                    onClick={onStartGoogleAuth}
                    disabled={loading}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        background: '#ffffff',
                        color: '#0f172a',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '14px 20px',
                        fontSize: '14px',
                        fontWeight: '700',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.7 : 1,
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 12px rgba(255, 255, 255, 0.15)'
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>{loading ? 'Menghubungkan...' : 'Daftar Cepat dengan Google'}</span>
                </button>

                <div style={{ marginTop: '20px', fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                    Dengan mendaftar, Anda menyetujui Ketentuan Layanan dan Kebijakan Privasi {platformName}.
                </div>
            </div>
        </div>
    );
}
