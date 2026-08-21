'use client';

import React, { useState } from 'react';

export default function InlineWhatsappContact({ email, initialWhatsapp, onSaved }) {
    const [whatsapp, setWhatsapp] = useState(initialWhatsapp || '');
    const [isEditing, setIsEditing] = useState(!initialWhatsapp);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        if (saving) return;
        setSaving(true);
        try {
            const res = await fetch('/api/register/update-whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, whatsapp })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setSaveSuccess(true);
                setIsEditing(false);
                if (onSaved) onSaved(whatsapp);
                setTimeout(() => setSaveSuccess(false), 3000);
            }
        } catch (err) {
            console.error('Failed to update whatsapp:', err);
        } finally {
            setSaving(false);
        }
    };

    if (!isEditing && whatsapp) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
                <span style={{ color: '#22c55e', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    +{whatsapp}
                </span>
                <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#38bdf8',
                        fontSize: '11px',
                        cursor: 'pointer',
                        padding: '0',
                        textDecoration: 'underline',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                    }}
                >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Ubah
                </button>
                {saveSuccess && (
                    <span style={{ color: '#34d399', fontSize: '10px', fontWeight: 'bold' }}>Tersimpan</span>
                )}
            </div>
        );
    }

    return (
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: '240px' }}>
                    <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#22c55e', display: 'flex', alignItems: 'center' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                    </div>
                    <input
                        type="tel"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="Nomor WhatsApp (Opsional)"
                        style={{
                            width: '100%',
                            padding: '6px 10px 6px 30px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '6px',
                            color: '#ffffff',
                            fontSize: '11px',
                            boxSizing: 'border-box',
                            outline: 'none'
                        }}
                    />
                </div>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !whatsapp.trim()}
                    style={{
                        padding: '6px 12px',
                        background: whatsapp.trim() ? '#22c55e' : 'rgba(255,255,255,0.1)',
                        color: whatsapp.trim() ? '#ffffff' : '#71717a',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: whatsapp.trim() && !saving ? 'pointer' : 'default',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}
                >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
                {initialWhatsapp && (
                    <button
                        type="button"
                        onClick={() => { setWhatsapp(initialWhatsapp); setIsEditing(false); }}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '11px', cursor: 'pointer', padding: '0 4px' }}
                    >
                        Batal
                    </button>
                )}
            </div>
            <span style={{ fontSize: '10px', color: '#64748b' }}>Nomor aktif untuk konfirmasi &amp; bantuan aktivasi akun</span>
        </div>
    );
}
