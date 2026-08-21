"use client";

import React from 'react';
import InlineWhatsappContact from '@/components/InlineWhatsappContact';
import { SparklesUpgradeIcon, ClockIcon } from '@/components/StorageIcons.jsx';

export default function RegisterOrderSummary({
    name,
    email,
    whatsapp,
    onWhatsappSaved,
    selectedPlan,
    expiredNotice = false,
    onResetPlan,
    onPayQris,
    loading = false,
    error = ''
}) {
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    if (!selectedPlan) return null;

    const handleSingleClickPay = (e) => {
        if (isSubmitting || loading) return;
        setIsSubmitting(true);
        if (onPayQris) onPayQris(e);
    };

    const planPrice = Number(selectedPlan.discountedPrice || selectedPlan.price || 0);
    const originalPrice = Number(selectedPlan.originalPrice || selectedPlan.price || 0);

    return (
        <div className="fade-in-up" style={{
            background: 'linear-gradient(160deg, rgba(15, 23, 42, 0.96), rgba(10, 15, 30, 0.98))',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '28px 24px',
            marginBottom: '20px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
        }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.02em' }}>
                    Konfirmasi Pesanan
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                    Periksa detail pesanan Anda sebelum melanjutkan pembayaran
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
                    marginBottom: '16px'
                }}>
                    {error}
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* 1. Detail Akun Vendor Card */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '14px 16px'
                }}>
                    <div style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Detail Akun
                    </div>
                    <div style={{ color: '#ffffff', fontWeight: '700', fontSize: '14px' }}>{name}</div>
                    <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>{email}</div>
                    <InlineWhatsappContact email={email} initialWhatsapp={whatsapp} onSaved={onWhatsappSaved} />
                </div>

                {/* 2. Paket Berlangganan Card */}
                <div style={{
                    background: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    borderRadius: '12px',
                    padding: '16px'
                }}>
                    <div style={{ fontSize: '11px', color: '#a5b4fc', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Paket Pilihan
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '16px' }}>{selectedPlan.name}</span>
                        {selectedPlan.discountedPrice && selectedPlan.discountedPrice < originalPrice ? (
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ textDecoration: 'line-through', color: '#64748b', fontSize: '12px', marginRight: '6px' }}>
                                    Rp {originalPrice.toLocaleString('id-ID')}
                                </span>
                                <span style={{ color: '#ef4444', fontWeight: '850', fontSize: '17px' }}>
                                    Rp {planPrice.toLocaleString('id-ID')}
                                </span>
                            </div>
                        ) : (
                            <span style={{ color: '#fbbf24', fontWeight: '850', fontSize: '17px' }}>
                                Rp {planPrice.toLocaleString('id-ID')}
                            </span>
                        )}
                    </div>

                    <div style={{ width: '100%', height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '8px 0 10px 0' }} />

                    {/* Features Checklist */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', color: '#d4d4d8' }}>
                        <div>✓ Maksimal <strong>{selectedPlan.maxProjects} Project Aktif</strong></div>
                        <div>✓ Foto <strong>Unlimited</strong> / project</div>
                        <div>✓ <strong>Galeri Online &amp; Seleksi Foto Klien</strong></div>
                        {selectedPlan.allowCustomLogo === 1 || selectedPlan.allowCustomLogo === true || selectedPlan.name?.includes('Pro') || selectedPlan.name?.includes('Business') ? (
                            <div style={{ color: '#34d399', fontWeight: 'bold' }}>✓ Bisa Menggunakan Logo Studio Sendiri</div>
                        ) : (
                            <div style={{ color: '#71717a' }}>• Logo Platform Standard</div>
                        )}
                        {selectedPlan.allowRawSelector === 1 || selectedPlan.allowRawSelector === true ? (
                            <div style={{ color: '#34d399', fontWeight: 'bold' }}>✓ Fitur Auto-Sorter / Selector File RAW</div>
                        ) : (
                            <div style={{ color: '#71717a' }}>• Fitur RAW Selector Nonaktif</div>
                        )}
                    </div>
                </div>

                {/* 3. Metode Pembayaran Info Row */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '12px 16px'
                }}>
                    <div>
                        <div style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 'bold', textTransform: 'uppercase' }}>Metode Pembayaran</div>
                        <div style={{ fontSize: '13px', color: '#ffffff', fontWeight: '600', marginTop: '2px' }}>QRIS (Semua Bank &amp; E-Wallet)</div>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '3px 8px', borderRadius: '6px' }}>
                        Aktivasi Instan
                    </span>
                </div>

                {/* 4. Expired Notice Bar (If Expired) */}
                {expiredNotice && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontSize: '11px',
                        color: '#f87171',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        textAlign: 'center'
                    }}>
                        <ClockIcon size={14} color="#f87171" />
                        <span>Sesi QRIS sebelumnya telah kedaluwarsa. Silakan klik tombol di bawah untuk membuat pembayaran baru.</span>
                    </div>
                )}

                {/* 5. Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <button
                        type="button"
                        onClick={onResetPlan}
                        style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            color: '#cbd5e1',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '10px',
                            padding: '12px 16px',
                            fontWeight: '600',
                            fontSize: '13px',
                            cursor: 'pointer',
                            flex: 1
                        }}
                    >
                        Ubah Paket
                    </button>
                    <button
                        type="button"
                        onClick={handleSingleClickPay}
                        className="btn-primary"
                        style={{
                            flex: 2,
                            padding: '12px 20px',
                            fontSize: '14px',
                            fontWeight: '700',
                            opacity: (loading || isSubmitting) ? 0.5 : 1,
                            cursor: (loading || isSubmitting) ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                        }}
                        disabled={loading || isSubmitting}
                    >
                        {(loading || isSubmitting) ? (
                            <span>Memproses...</span>
                        ) : (
                            <>
                                <SparklesUpgradeIcon size={14} />
                                <span>Bayar via QRIS</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
