"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { SpeedBoltIcon, SparklesUpgradeIcon } from '@/components/StorageIcons.jsx';

export default function RegisterPlanSelector({
    plans = [],
    selectedPlanId,
    onSelectPlan,
    onProceedToSummary,
    flashPromoInfo,
    countdownText,
    loading,
    userEmail,
    onLogout
}) {
    const [selectedTab, setSelectedTab] = useState('limit');
    const [mobileActiveIndex, setMobileActiveIndex] = useState(0);

    const filteredPlans = plans.filter(p => {
        if (!p.planType) return true;
        return p.planType === selectedTab;
    });

    const activeList = filteredPlans.length > 0 ? filteredPlans : plans;

    return (
        <div className="fade-in-up">
            {/* Header Title */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(99, 102, 241, 0.12)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    padding: '3px 12px',
                    borderRadius: '99px',
                    color: '#818cf8',
                    fontSize: '11px',
                    fontWeight: '800',
                    letterSpacing: '0.04em',
                    marginBottom: '8px'
                }}>
                    <span>TAHAP 2: PILIH PAKET LANGGANAN</span>
                </div>
                <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#ffffff', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                    Pilih Paket Terbaik untuk Studio Anda
                </h2>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                    Tersedia pilihan kuota fleksibel untuk mendukung operasional galeri foto klien Anda.
                </p>
                {userEmail && (
                    <div style={{ marginTop: '6px', fontSize: '12px', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <span>Terhubung sebagai: <strong>{userEmail}</strong></span>
                        {onLogout && (
                            <button
                                type="button"
                                onClick={onLogout}
                                style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                                Ganti Akun
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Flash Promo Banner if active */}
            {flashPromoInfo && flashPromoInfo.active && (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.25))',
                    border: '1px solid rgba(239,68,68,0.4)',
                    borderRadius: '16px',
                    padding: '12px 18px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                }}>
                    <div>
                        <div style={{ color: '#ffffff', fontWeight: '800', fontSize: '13px' }}>
                            {flashPromoInfo.title || 'Flash Promo Terbatas'}
                        </div>
                        <div style={{ color: '#fca5a5', fontSize: '11px' }}>
                            Diskon spesial otomatis berlaku saat konfirmasi detail.
                        </div>
                    </div>
                    <div style={{
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(239,68,68,0.4)',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        color: '#f87171',
                        fontWeight: '800',
                        fontSize: '13px',
                        fontFamily: 'monospace'
                    }}>
                        {countdownText}
                    </div>
                </div>
            )}

            {/* Plan Cards Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '20px',
                marginBottom: '28px'
            }}>
                {activeList.map((p) => {
                    const isSelected = String(selectedPlanId) === String(p.id);
                    const isPopular = p.name.includes('Pro') || p.name.includes('Business');
                    const finalPrice = Number(p.discountedPrice || p.price || 0);

                    return (
                        <div
                            key={p.id}
                            onClick={() => onSelectPlan(String(p.id))}
                            style={{
                                background: isSelected 
                                    ? 'linear-gradient(180deg, rgba(99,102,241,0.15) 0%, rgba(30,27,75,0.4) 100%)' 
                                    : 'linear-gradient(180deg, rgba(30,41,59,0.4) 0%, rgba(15,23,42,0.6) 100%)',
                                border: isSelected 
                                    ? '2px solid #818cf8' 
                                    : isPopular 
                                        ? '1px solid rgba(99,102,241,0.4)' 
                                        : '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '20px',
                                padding: '24px 20px',
                                cursor: 'pointer',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                transition: 'all 0.2s ease',
                                boxShadow: isSelected ? '0 12px 30px rgba(99,102,241,0.25)' : 'none'
                            }}
                        >
                            {isPopular && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-10px',
                                    right: '16px',
                                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                    color: '#ffffff',
                                    fontSize: '10px',
                                    fontWeight: '800',
                                    padding: '2px 8px',
                                    borderRadius: '99px',
                                    letterSpacing: '0.04em'
                                }}>
                                    POPULER
                                </div>
                            )}

                            <div>
                                <div style={{ color: '#ffffff', fontWeight: '800', fontSize: '17px', marginBottom: '4px' }}>
                                    {p.name}
                                </div>
                                <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '16px', minHeight: '34px' }}>
                                    {p.description || `Kapasitas hingga ${p.maxProjects} project aktif dengan fitur seleksi online.`}
                                </div>

                                <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    {p.discountedPrice && p.discountedPrice < p.price ? (
                                        <div>
                                            <span style={{ textDecoration: 'line-through', color: '#64748b', fontSize: '12px', marginRight: '6px' }}>
                                                Rp {Number(p.price).toLocaleString('id-ID')}
                                            </span>
                                            <div style={{ color: '#ef4444', fontWeight: '900', fontSize: '22px' }}>
                                                Rp {finalPrice.toLocaleString('id-ID')}
                                                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'normal' }}> / 30 hari</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ color: '#fbbf24', fontWeight: '900', fontSize: '22px' }}>
                                            Rp {finalPrice.toLocaleString('id-ID')}
                                            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'normal' }}> / 30 hari</span>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#cbd5e1' }}>
                                    <div>✓ <strong>{p.maxProjects} Project Aktif</strong></div>
                                    <div>✓ Foto <strong>Unlimited</strong> / project</div>
                                    <div>✓ Galeri Online &amp; Seleksi Foto</div>
                                    {p.allowCustomLogo === 1 || p.allowCustomLogo === true || isPopular ? (
                                        <div style={{ color: '#34d399', fontWeight: 'bold' }}>✓ Custom Logo Studio</div>
                                    ) : (
                                        <div style={{ color: '#64748b' }}>• Logo Platform Standard</div>
                                    )}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectPlan(String(p.id));
                                }}
                                style={{
                                    marginTop: '20px',
                                    width: '100%',
                                    padding: '11px',
                                    borderRadius: '10px',
                                    border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.12)',
                                    background: isSelected ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255,255,255,0.04)',
                                    color: '#ffffff',
                                    fontWeight: '700',
                                    fontSize: '13px',
                                    cursor: 'pointer'
                                }}
                            >
                                {isSelected ? 'Paket Dipilih' : 'Pilih Paket Ini'}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Bottom Action: Proceed to Detail Summary */}
            <div style={{ textAlign: 'center' }}>
                <button
                    type="button"
                    onClick={onProceedToSummary}
                    disabled={!selectedPlanId || loading}
                    style={{
                        minWidth: '240px',
                        padding: '14px 28px',
                        background: selectedPlanId 
                            ? 'linear-gradient(135deg, #6366f1, #4f46e5)' 
                            : 'rgba(255,255,255,0.08)',
                        color: selectedPlanId ? '#ffffff' : '#64748b',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: '700',
                        cursor: selectedPlanId && !loading ? 'pointer' : 'not-allowed',
                        boxShadow: selectedPlanId ? '0 8px 25px rgba(99,102,241,0.4)' : 'none',
                        transition: 'all 0.2s ease'
                    }}
                >
                    {loading ? 'Memproses...' : 'Lanjut Konfirmasi Detail'}
                </button>
            </div>
        </div>
    );
}
