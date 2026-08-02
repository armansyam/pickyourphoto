'use client';

export default function GlobalError({ error, reset }) {
  return (
    <html>
      <body style={{ background: '#09090b', color: '#f4f4f5', fontFamily: 'sans-serif', margin: 0 }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
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
              Global Application Error
            </h2>
            <p style={{ color: '#a1a1aa', fontSize: '14px', marginBottom: '24px' }}>
              {error?.message || 'Terjadi kesalahan sistem secara global.'}
            </p>
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
              Muat Ulang Aplikasi
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
