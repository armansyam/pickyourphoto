"use client";

import React, { useState } from 'react';
import InlineWhatsappContact from '@/components/InlineWhatsappContact';
import { SparklesUpgradeIcon, ClockIcon } from '@/components/StorageIcons.jsx';

export default function RegisterOrderSummary({
    name,
    email,
    whatsapp,
    onWhatsappSaved,
    selectedPlan,
    addonPlans = [],
    selectedAddonId = null,
    onSelectAddon,
    paymentConfig = { enableGateway: true, provider: 'ipaymu', bankName: 'BCA', bankAccountNumber: '', bankAccountName: '' },
    expiredNotice = false,
    onResetPlan,
    onPayQris,
    onManualTransferSubmit,
    loading = false,
    error = ''
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [proofFile, setProofFile] = useState(null);
    const [copied, setCopied] = useState(false);

    if (!selectedPlan) return null;

    const planPrice = Number(selectedPlan.discountedPrice || selectedPlan.price || 0);
    const originalPrice = Number(selectedPlan.originalPrice || selectedPlan.price || 0);

    const selectedAddon = Array.isArray(addonPlans) ? addonPlans.find(a => a.id === selectedAddonId) : null;
    const addonPrice = selectedAddon ? Number(selectedAddon.price || 0) : 0;
    const totalAmount = planPrice + addonPrice;

    const handleSingleClickPay = async (e) => {
        if (isSubmitting || loading) return;
        setIsSubmitting(true);
        try {
            if (paymentConfig?.enableGateway) {
                if (onPayQris) await onPayQris(e, { addonPlanId: selectedAddonId, totalAmount });
            } else {
                if (onManualTransferSubmit) await onManualTransferSubmit(e, { addonPlanId: selectedAddonId, totalAmount, proofFile });
            }
        } catch (err) {
            console.error('[Submit Pay Error]:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopyAccount = () => {
        if (paymentConfig?.bankAccountNumber) {
            navigator.clipboard.writeText(paymentConfig.bankAccountNumber);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

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

                {/* 3. Dynamic Add-on Cloud Storage Card (ONLY rendered if active in Admin) */}
                {Array.isArray(addonPlans) && addonPlans.length > 0 && (
                    <div style={{
                        background: 'rgba(56, 189, 248, 0.05)',
                        border: '1px solid rgba(56, 189, 248, 0.2)',
                        borderRadius: '12px',
                        padding: '14px 16px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Tambahan Penyimpanan (Opsional)
                            </span>
                            <span style={{ fontSize: '10px', color: '#94a3b8' }}>Add-On Storage</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '9px 12px',
                                borderRadius: '8px',
                                background: !selectedAddonId ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                                border: !selectedAddonId ? '1px solid rgba(56, 189, 248, 0.6)' : '1px solid rgba(255,255,255,0.06)',
                                cursor: 'pointer',
                                fontSize: '12px',
                                transition: 'all 0.15s ease'
                            }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: !selectedAddonId ? '#ffffff' : '#94a3b8', fontWeight: !selectedAddonId ? '600' : 'normal' }}>
                                    <input type="radio" name="addon_choice" checked={!selectedAddonId} onChange={() => onSelectAddon && onSelectAddon(null)} />
                                    <span>Tanpa Tambahan Storage</span>
                                </span>
                                <span style={{ color: '#71717a', fontSize: '11px' }}>Rp 0</span>
                            </label>

                            {addonPlans.map(addon => {
                                const isSelected = selectedAddonId === addon.id;
                                const quotaGb = Math.round(addon.quotaBytes / (1024 * 1024 * 1024));
                                return (
                                    <label key={addon.id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '9px 12px',
                                        borderRadius: '8px',
                                        background: isSelected ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.02)',
                                        border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.06)',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        transition: 'all 0.15s ease'
                                    }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isSelected ? '#ffffff' : '#e2e8f0', fontWeight: isSelected ? '700' : 'normal' }}>
                                            <input type="radio" name="addon_choice" checked={isSelected} onChange={() => onSelectAddon && onSelectAddon(addon.id)} />
                                            <span>{addon.name || `+${quotaGb} GB Cloud Storage`}</span>
                                        </span>
                                        <span style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '12px' }}>
                                            + Rp {Number(addon.price).toLocaleString('id-ID')}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 4. Total Tagihan & Subtotal Row */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '14px 16px'
                }}>
                    {selectedAddon && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px', fontSize: '12px', color: '#94a3b8' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Paket ({selectedPlan.name}):</span>
                                <span style={{ color: '#ffffff' }}>Rp {planPrice.toLocaleString('id-ID')}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Add-On ({selectedAddon.name}):</span>
                                <span style={{ color: '#38bdf8' }}>+ Rp {addonPrice.toLocaleString('id-ID')}</span>
                            </div>
                            <div style={{ width: '100%', height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '4px 0' }} />
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 'bold' }}>TOTAL TAGIHAN</span>
                        <span style={{ fontSize: '18px', color: '#34d399', fontWeight: '850' }}>
                            Rp {totalAmount.toLocaleString('id-ID')}
                        </span>
                    </div>
                </div>

                {/* 5. Dual-Mode Payment Info */}
                {paymentConfig?.enableGateway ? (
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
                ) : (
                    <div style={{
                        background: 'rgba(245, 158, 11, 0.06)',
                        border: '1px solid rgba(245, 158, 11, 0.25)',
                        borderRadius: '12px',
                        padding: '14px 16px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                Transfer Bank Manual
                            </span>
                            <span style={{ fontSize: '10px', color: '#fbbf24', background: 'rgba(245,158,11,0.2)', padding: '2px 6px', borderRadius: '4px' }}>
                                Verifikasi Manual
                            </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#e2e8f0', marginBottom: '4px' }}>
                            Bank: <strong>{paymentConfig?.bankName || 'BCA'}</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '8px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '13px', color: '#ffffff', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                                {paymentConfig?.bankAccountNumber || 'Nomor Rekening Admin'}
                            </span>
                            <button
                                type="button"
                                onClick={handleCopyAccount}
                                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: copied ? '#34d399' : '#38bdf8', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
                            >
                                {copied ? 'Tersalin!' : 'Salin'}
                            </button>
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                            Atas Nama: <strong>{paymentConfig?.bankAccountName || 'PT Pick Your Photo'}</strong>
                        </div>
                    </div>
                )}

                {/* 6. Expired Notice Bar (If Expired) */}
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
                        <span>Sesi pembayaran sebelumnya telah kedaluwarsa. Silakan klik tombol di bawah untuk memproses pembayaran baru.</span>
                    </div>
                )}

                {/* 7. Action Buttons */}
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
                                <span>Bayar</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
