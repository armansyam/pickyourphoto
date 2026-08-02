'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('App Error Boundary caught an error:', error);
  }, [error]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#09090b',
      color: '#f4f4f5',
      fontFamily: 'sans-serif',
      padding: '24px',
      textAlign: 'center'
    }}>
      <div style={{
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '500px',
        width: '100%'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
          Terjadi Kesalahan Sistem
        </h2>
        <p style={{ color: '#a1a1aa', fontSize: '14px', marginBottom: '24px' }}>
          {error?.message || 'Aplikasi mengalami kesalahan yang tidak terduga.'}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => reset()}
            style={{
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Coba Lagi
          </button>
          <a
            href="/admin"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: '600',
              textDecoration: 'none'
            }}
          >
            Kembali ke Admin
          </a>
        </div>
      </div>
    </div>
  );
}
