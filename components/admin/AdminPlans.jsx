'use client';

import React from 'react';

export default function AdminPlans({
  plans = [],
  loadingPlans = false,
  openPlanModal,
  setPlanToDelete
}) {
  return (
    <div className="glass-card" style={{ padding: '24px', borderRadius: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '600' }}>Kelola Paket Berlangganan</h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#a1a1aa' }}>
            Atur Paket Berbasis Fitur (Starter, Pro Studio, & Unlimited Master)
          </p>
        </div>
        <button
          onClick={() => openPlanModal()}
          className="btn-primary"
          style={{ padding: '10px 20px', fontSize: '13px', fontWeight: '600' }}
        >
          + Tambah Paket Baru
        </button>
      </div>

      {loadingPlans ? (
        <p style={{ textAlign: 'center', color: '#a1a1aa', padding: '24px 0' }}>Loading packages...</p>
      ) : plans.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#71717a', padding: '24px 0', fontSize: '14px' }}>
          Belum ada paket berlangganan. Klik tombol di atas untuk membuat paket baru.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {plans.map(p => (
            <div
              key={p.id}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: p.name.includes('Pro') ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px',
                padding: '24px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between'
              }}
            >
              {p.name.includes('Pro') && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  right: '20px',
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  padding: '3px 10px',
                  borderRadius: '10px',
                  letterSpacing: '0.05em'
                }}>
                  BEST SELLER
                </div>
              )}

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#ffffff' }}>{p.name}</h4>
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontWeight: 'bold',
                    background: p.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.08)',
                    color: p.status === 'active' ? '#34d399' : '#a1a1aa'
                  }}>
                    {p.status === 'active' ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                <div style={{ fontSize: '26px', fontWeight: '800', color: '#fbbf24', margin: '12px 0 16px 0' }}>
                  Rp {p.price ? p.price.toLocaleString('id-ID') : '0'}
                  <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#71717a' }}> / {p.activePeriodDays} hari</span>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', fontSize: '13px', color: '#e4e4e7', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <li>✓ Maksimal <strong>{p.maxProjects >= 99999 ? 'Unlimited' : p.maxProjects} Project</strong></li>
                  <li>✓ Foto <strong>Unlimited</strong></li>
                  <li>✓ Galeri Online & Seleksi Foto Klien</li>
                  {p.allowCustomLogo === 1 || p.allowCustomLogo === true || p.name.includes('Pro') || p.name.includes('Business') ? (
                    <li style={{ color: '#818cf8', fontWeight: 'bold' }}>✓ Bisa Menggunakan Logo Studio Sendiri</li>
                  ) : (
                    <li style={{ color: '#71717a' }}>• Logo Platform Standard</li>
                  )}
                  {p.allowRawSelector === undefined || p.allowRawSelector === 1 || p.allowRawSelector === true ? (
                    <li style={{ color: '#34d399', fontWeight: 'bold' }}>✓ Fitur Auto-Sorter / Selector File RAW</li>
                  ) : (
                    <li style={{ color: '#71717a' }}>• Fitur RAW Selector Nonaktif</li>
                  )}
                </ul>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <button
                  onClick={() => openPlanModal(p)}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '8px 12px', fontSize: '12px' }}
                >
                  ✏️ Edit Paket
                </button>
                <button
                  onClick={() => setPlanToDelete(p)}
                  className="btn-secondary"
                  style={{ padding: '8px 12px', fontSize: '12px', color: '#f87171' }}
                >
                  🗑️ Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
