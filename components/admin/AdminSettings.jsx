'use client';

import React, { useState } from 'react';

export default function AdminSettings({
  googleClientId, setGoogleClientId,
  googleClientSecret, setGoogleClientSecret,
  googleMasterFolderId, setGoogleMasterFolderId,
  googleRefreshToken,
  googleMasterAccountEmail,
  maxUploadConcurrencyThreads = 4, setMaxUploadConcurrencyThreads,

  newPassword, setNewPassword,
  bankName, setBankName,
  bankAccountNumber, setBankAccountNumber,
  bankAccountName, setBankAccountName,
  contactEmail, setContactEmail,
  contactWhatsapp, setContactWhatsapp,
  enablePaymentGateway = false, setEnablePaymentGateway,
  paymentGatewayProvider = 'midtrans', setPaymentGatewayProvider,
  paymentGatewayClientKey = '', setPaymentGatewayClientKey,
  paymentGatewayServerKey = '', setPaymentGatewayServerKey,
  qrisExpirationMinutes = 15, setQrisExpirationMinutes,
  smtpEnable = true, setSmtpEnable,
  smtpHost = 'smtp.gmail.com', setSmtpHost,
  smtpPort = 465, setSmtpPort,
  smtpEmail = '', setSmtpEmail,
  smtpPassword = '', setPassword, setSmtpPassword,
  smtpFromName = 'Pick Your Photo', setSmtpFromName,
  addToast,
  sysEnableReg, setSysEnableReg,
  sysMaxQuota, setSysMaxQuota,
  sysEnableBackup, setSysEnableBackup,
  sysBackupInterval, setSysBackupInterval,
  lastBackupTime = 'Belum pernah',
  lastBackupFileName = null,
  lastBackupSizeFormatted = null,
  customStoragePricePerGb = 1250, setCustomStoragePricePerGb,
  workerStorageWarningThresholdGb = 10, setWorkerStorageWarningThresholdGb,
  savingProfile,
  profileSuccessMsg,
  setProfileSuccessMsg,
  profileErrorMsg,
  handleSaveProfile
}) {
  const [activeSubTab, setActiveSubTab] = useState('integrations'); // 'integrations' | 'payments' | 'system'
  const [isEditingGoogleCredentials, setIsEditingGoogleCredentials] = useState(false);
  const [isEditingPaymentGateway, setIsEditingPaymentGateway] = useState(false);
  const [isEditingSmtp, setIsEditingSmtp] = useState(false);

  const [paymentTestStatus, setPaymentTestStatus] = useState({ loading: false, success: '', error: '' });
  const [testEmailStatus, setTestEmailStatus] = useState({ loading: false, success: '', error: '' });

  // Sub-Admin Management state
  const [adminList, setAdminList] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [submittingAdmin, setSubmittingAdmin] = useState(false);

  const fetchAdminList = async () => {
    setLoadingAdmins(true);
    try {
      const res = await fetch('/api/admin/admins');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.admins)) {
          setAdminList(data.admins);
        }
      }
    } catch (e) {} finally {
      setLoadingAdmins(false);
    }
  };

  React.useEffect(() => {
    fetchAdminList();
  }, []);

  const handleCreateSubAdmin = async (e) => {
    e.preventDefault();
    if (!newAdminName || !newAdminEmail || !newAdminPass) {
      if (addToast) addToast('Nama, email, dan password wajib diisi!', 'error');
      return;
    }
    setSubmittingAdmin(true);
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newAdminName, email: newAdminEmail, password: newAdminPass })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (addToast) addToast(data.message || 'Sub-Admin berhasil ditambahkan!', 'success');
        setShowAddAdminModal(false);
        setNewAdminName('');
        setNewAdminEmail('');
        setNewAdminPass('');
        fetchAdminList();
      } else {
        if (addToast) addToast(data.error || 'Gagal menambah Sub-Admin.', 'error');
      }
    } catch (err) {
      if (addToast) addToast(err.message, 'error');
    } finally {
      setSubmittingAdmin(false);
    }
  };

  const handleDeleteAdmin = async (adminObj) => {
    if (adminObj.isRoot === 1 || Number(adminObj.id) === 1) {
      if (addToast) addToast('Root Master Admin tidak boleh dihapus demi keamanan sistem.', 'error');
      return;
    }
    if (!confirm(`Apakah Anda yakin ingin menghapus akun Sub-Admin "${adminObj.name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/admins?id=${adminObj.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        if (addToast) addToast(data.message || 'Sub-Admin berhasil dihapus.', 'success');
        fetchAdminList();
      } else {
        if (addToast) addToast(data.error || 'Gagal menghapus Sub-Admin.', 'error');
      }
    } catch (err) {
      if (addToast) addToast(err.message, 'error');
    }
  };

  return (
    <div className="glass-card" style={{ padding: '28px', borderRadius: '16px', maxWidth: '850px', margin: '0 auto', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
      
      {/* ── SETTINGS TITLE & HEADER ── */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <span style={{ fontSize: '11px', fontWeight: 'bold', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '4px 14px', borderRadius: '20px', letterSpacing: '0.05em' }}>
          ⚙️ PUSAT KONFIGURASI SAAS & SYSTEM
        </span>
        <h3 style={{ margin: '10px 0 6px 0', fontSize: '24px', fontWeight: 'bold', color: '#ffffff' }}>
          Pengaturan Terpusat Platform
        </h3>
        <p style={{ color: '#94a3b8', margin: 0, fontSize: '13px' }}>
          Kelola integrasi Google Cloud, Payment Gateway, Mailer SMTP, dan Keamanan Superadmin.
        </p>
      </div>

      {profileSuccessMsg && (
        <div 
          style={{ 
            background: 'rgba(16, 185, 129, 0.12)', 
            color: '#34d399', 
            border: '1px solid rgba(16, 185, 129, 0.3)', 
            padding: '12px 16px', 
            borderRadius: '10px', 
            marginBottom: '20px', 
            fontSize: '14px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
            <span>✓</span>
            <span>{profileSuccessMsg}</span>
          </div>
          {setProfileSuccessMsg && (
            <button
              type="button"
              onClick={() => setProfileSuccessMsg('')}
              style={{ background: 'transparent', border: 'none', color: '#34d399', fontSize: '16px', cursor: 'pointer' }}
            >
              &times;
            </button>
          )}
        </div>
      )}

      {profileErrorMsg && (
        <div style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '14px' }}>
          ❌ {profileErrorMsg}
        </div>
      )}

      {/* ── CATEGORIZED SUB-TABS NAVIGATION ── */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px', marginBottom: '28px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveSubTab('integrations')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '700',
            border: '1px solid',
            borderColor: activeSubTab === 'integrations' ? '#818cf8' : 'rgba(255,255,255,0.08)',
            background: activeSubTab === 'integrations' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255,255,255,0.03)',
            color: activeSubTab === 'integrations' ? '#ffffff' : '#94a3b8',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          🌐 Integrasi Google & Email
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('payments')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '700',
            border: '1px solid',
            borderColor: activeSubTab === 'payments' ? '#10b981' : 'rgba(255,255,255,0.08)',
            background: activeSubTab === 'payments' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.03)',
            color: activeSubTab === 'payments' ? '#ffffff' : '#94a3b8',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          💳 Payment Gateway & QRIS
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('system')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '700',
            border: '1px solid',
            borderColor: activeSubTab === 'system' ? '#f59e0b' : 'rgba(255,255,255,0.08)',
            background: activeSubTab === 'system' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.03)',
            color: activeSubTab === 'system' ? '#ffffff' : '#94a3b8',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ⚙️ Sistem & Keamanan Superadmin
        </button>
      </div>

      <form onSubmit={handleSaveProfile}>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* SUB-TAB 1: INTEGRASI GOOGLE & EMAIL SMTP                          */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'integrations' && (
          <div className="fade-in-up">
            
            {/* GOOGLE OAUTH SECTION */}
            <h4 style={{ margin: '0 0 16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', fontSize: '15px', color: '#818cf8', fontWeight: 'bold' }}>
              🔑 Integrasi Google Cloud & OAuth 2.0 Studio
            </h4>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px', marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff' }}>Kredensial Master Google OAuth 2.0</span>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>Digunakan untuk Google Sign-in Vendor & sinkronisasi Google Drive Studio.</p>
                </div>
                <span style={{ fontSize: '11px', background: googleRefreshToken ? 'rgba(16,185,129,0.15)' : 'rgba(251,191,36,0.15)', color: googleRefreshToken ? '#34d399' : '#fbbf24', padding: '4px 12px', borderRadius: '12px', fontWeight: 'bold' }}>
                  {googleRefreshToken ? '🟢 OAuth Active' : '⚠️ Belum Terhubung'}
                </span>
              </div>

              {!isEditingGoogleCredentials && googleClientId && googleClientSecret ? (
                <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '18px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '12px', marginBottom: '16px' }}>
                    <div>
                      <span style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Google Client ID:</span>
                      <strong style={{ color: '#ffffff', wordBreak: 'break-all', fontFamily: 'monospace' }}>{googleClientId.substring(0, 24)}...</strong>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Client Secret:</span>
                      <strong style={{ color: '#34d399', letterSpacing: '2px' }}>••••••••••••••••</strong>
                    </div>
                  </div>

                  <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                    <div style={{ background: 'rgba(56, 189, 248, 0.06)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '10px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                      <div>
                        <span style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', fontWeight: '700' }}>
                          Akun Master Terhubung
                        </span>
                        <strong style={{ color: googleMasterAccountEmail ? '#38bdf8' : '#fbbf24', fontSize: '13px' }}>
                          {googleMasterAccountEmail || 'Belum Terhubung'}
                        </strong>
                      </div>
                      <a 
                        href="/api/admin/auth/google" 
                        style={{ 
                          fontSize: '11px', 
                          color: '#ffffff', 
                          background: 'linear-gradient(135deg, #0284c7, #0369a1)', 
                          padding: '6px 14px', 
                          borderRadius: '8px', 
                          textDecoration: 'none', 
                          fontWeight: '700',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 10px rgba(2, 132, 199, 0.35)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        🔄 Ganti Akun ➔
                      </a>
                    </div>

                    <button 
                      type="button" 
                      onClick={() => setIsEditingGoogleCredentials(true)} 
                      className="btn-secondary" 
                      style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '8px' }}
                    >
                      ✏️ Edit Kredensial
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>Google Client ID</label>
                    <input
                      type="text"
                      className="input-text"
                      placeholder="733578075321-xxxxxx.apps.googleusercontent.com"
                      value={googleClientId}
                      onChange={e => setGoogleClientId(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>Google Client Secret</label>
                    <input
                      type="password"
                      className="input-text"
                      placeholder="GOCSPX-xxxxxxxxxxxxxx"
                      value={googleClientSecret}
                      onChange={e => setGoogleClientSecret(e.target.value)}
                    />
                  </div>
                  {isEditingGoogleCredentials && (
                    <button type="button" onClick={() => setIsEditingGoogleCredentials(false)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '12px', alignSelf: 'flex-end' }}>
                      Selesai Edit
                    </button>
                  )}
                </div>
              )}

              {/* MAX UPLOAD CONCURRENCY THREADS CONFIGURATION */}
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <label className="form-label" style={{ fontSize: '12px', color: '#ffffff', fontWeight: 'bold' }}>
                  ⚙️ Maksimal Thread Worker Upload Serentak (Parallel Concurrency):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="input-text"
                    style={{ width: '120px', fontWeight: 'bold', color: '#818cf8' }}
                    value={maxUploadConcurrencyThreads || 4}
                    onChange={e => setMaxUploadConcurrencyThreads && setMaxUploadConcurrencyThreads(parseInt(e.target.value) || 1)}
                  />
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Thread paralel simultan (Default: <strong>4</strong>). Maksimal dibatasi hingga jumlah Akun Worker aktif yang tersedia.
                  </span>
                </div>
              </div>
            </div>

            {/* EMAIL SMTP SECTION */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '15px', color: '#818cf8', fontWeight: 'bold' }}>
                📧 Server Email Notifikasi Otomatis (SMTP Gmail)
              </h4>
              <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '12px', background: (smtpEnable && smtpEmail && smtpPassword) ? 'rgba(52,211,153,0.15)' : 'rgba(251,191,36,0.15)', color: (smtpEnable && smtpEmail && smtpPassword) ? '#34d399' : '#fbbf24', border: (smtpEnable && smtpEmail && smtpPassword) ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(251,191,36,0.3)' }}>
                {(smtpEnable && smtpEmail && smtpPassword) ? '🟢 SMTP Aktif' : '⚠️ SMTP Belum Aktif'}
              </span>
            </div>

            {(!smtpEnable || !smtpEmail || !smtpPassword) && (
              <div style={{ background: 'rgba(251, 191, 36, 0.12)', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>⚠️</span>
                <div>
                  <strong>Server SMTP Email Belum Aktif / Dikonfigurasi!</strong>
                  <div style={{ fontSize: '11px', color: '#d4d4d8', marginTop: '2px' }}>
                    Email notifikasi persetujuan vendor, perpanjangan paket, dan peringatan tenggang storage (H-15 & H-3) akan ditangguhkan sampai kredensial Email & App Password Gmail diisi dan disimpan.
                  </div>
                </div>
              </div>
            )}

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>SMTP Host</label>
                  <input type="text" className="input-text" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>SMTP Port</label>
                  <input type="number" className="input-text" value={smtpPort} onChange={e => setSmtpPort(parseInt(e.target.value) || 465)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Email Pengirim (Sender Email)</label>
                  <input type="email" className="input-text" value={smtpEmail} onChange={e => setSmtpEmail(e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Password / App Password</label>
                  <input type="password" className="input-text" value={smtpPassword} onChange={e => setSmtpPassword(e.target.value)} />
                </div>
              </div>

              <div className="form-group" style={{ margin: '0 0 16px 0' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Nama Pengirim Email (Sender Name)</label>
                <input type="text" className="input-text" value={smtpFromName} onChange={e => setSmtpFromName(e.target.value)} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  disabled={testEmailStatus.loading || !smtpEmail || !smtpPassword}
                  onClick={async (e) => {
                    setTestEmailStatus({ loading: true, success: '', error: '' });
                    try {
                      const res = await fetch('/api/admin/smtp/test', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ targetEmail: smtpEmail, smtpEmail, smtpPassword, smtpHost, smtpPort, smtpFromName })
                      });
                      const data = await res.json();
                      if (res.ok && data.success) {
                        if (addToast) addToast(data.message || 'Email uji coba BERHASIL dikirim!', 'success');
                      } else {
                        if (addToast) addToast(data.message || 'Gagal mengirim email uji coba.', 'error');
                      }
                    } catch (err) {
                      if (addToast) addToast(err.message, 'error');
                    } finally {
                      setTestEmailStatus({ loading: false, success: '', error: '' });
                    }
                  }}
                  style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {testEmailStatus.loading ? '⏳ Menguji...' : '📧 Tes Kirim Email'}
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* SUB-TAB 2: PAYMENT GATEWAY & QRIS                                */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'payments' && (
          <div className="fade-in-up">
            
            {/* REKENING MANUAL */}
            <h4 style={{ margin: '0 0 16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', fontSize: '15px', color: '#818cf8', fontWeight: 'bold' }}>
              🏦 Tujuan Rekening Transfer Manual Vendor
            </h4>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px', marginBottom: '28px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Nama Bank</label>
                  <input type="text" className="input-text" value={bankName} onChange={e => setBankName(e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Nomor Rekening</label>
                  <input type="text" className="input-text" value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} />
                </div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Atas Nama Rekening</label>
                <input type="text" className="input-text" value={bankAccountName} onChange={e => setBankAccountName(e.target.value)} />
              </div>
            </div>

            {/* AUTOMATIC PAYMENT GATEWAY MODULE */}
            <h4 style={{ margin: '0 0 16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', fontSize: '15px', color: '#818cf8', fontWeight: 'bold' }}>
              💳 Automatic Payment Gateway (Midtrans, Xendit, Tripay, Duitku)
            </h4>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="enablePaymentGateway"
                    checked={enablePaymentGateway}
                    onChange={e => setEnablePaymentGateway(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="enablePaymentGateway" style={{ cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', color: enablePaymentGateway ? '#34d399' : '#f87171' }}>
                    Aktifkan Pembayaran Otomatis Payment Gateway
                  </label>
                </div>
                <span style={{ fontSize: '11px', background: enablePaymentGateway ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: enablePaymentGateway ? '#34d399' : '#f87171', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
                  {enablePaymentGateway ? '🟢 GATEWAY AKTIF' : '🔴 NONAKTIF'}
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Pilih Provider Payment Gateway</label>
                <select
                  className="input-text"
                  value={paymentGatewayProvider}
                  onChange={e => setPaymentGatewayProvider(e.target.value)}
                  style={{ background: 'rgba(0,0,0,0.3)' }}
                >
                  <option value="midtrans">QRIS Gateway Otomatis (QRIS, E-Wallet, Card)</option>
                  <option value="xendit">Xendit Invoice API (QRIS, E-Wallet, VA)</option>
                  <option value="tripay">Tripay Payment API (QRIS, VA, Alfamart)</option>
                  <option value="duitku">Duitku Pop-Up API (QRIS, VA, E-Wallet)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Client Key / Public Key</label>
                  <input type="text" className="input-text" value={paymentGatewayClientKey} onChange={e => setPaymentGatewayClientKey(e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Server Key / Secret Key</label>
                  <input type="password" className="input-text" value={paymentGatewayServerKey} onChange={e => setPaymentGatewayServerKey(e.target.value)} />
                </div>
              </div>

              {/* QRIS EXPIRATION MINUTES SETTING */}
              <div className="form-group" style={{ background: 'rgba(251, 191, 36, 0.05)', border: '1px solid rgba(251, 191, 36, 0.2)', padding: '14px', borderRadius: '10px', marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 'bold' }}>
                  ⏱️ Batas Waktu Expired QRIS Pembayaran (Menit)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    className="input-text"
                    placeholder="15"
                    value={qrisExpirationMinutes}
                    onChange={e => setQrisExpirationMinutes && setQrisExpirationMinutes(parseInt(e.target.value) || 15)}
                    style={{ background: 'rgba(0,0,0,0.4)', width: '110px', color: '#fbbf24', fontWeight: 'bold' }}
                  />
                  <span style={{ fontSize: '12px', color: '#e2e8f0', lineHeight: '1.4' }}>
                    Menit (Default: <strong>15 Menit</strong>). Mengatur batas hitung mundur expired QRIS Gateway & Database secara presisi.
                  </span>
                </div>
              </div>

              {/* WEBHOOK URL INFO */}
              <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '12px 14px', borderRadius: '8px', fontSize: '12px', marginBottom: '16px' }}>
                <div style={{ color: '#818cf8', fontWeight: 'bold', marginBottom: '4px' }}>🔗 URL Notification / Webhook Callback:</div>
                <code style={{ background: 'rgba(0,0,0,0.4)', padding: '4px 8px', borderRadius: '4px', color: '#34d399', wordBreak: 'break-all', display: 'block' }}>
                  {typeof window !== 'undefined' ? `${window.location.origin}/api/payment/notification` : '/api/payment/notification'}
                </code>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  disabled={paymentTestStatus.loading || !paymentGatewayServerKey}
                  onClick={async () => {
                    setPaymentTestStatus({ loading: true, success: '', error: '' });
                    try {
                      const res = await fetch('/api/admin/payment/test', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ provider: paymentGatewayProvider, clientKey: paymentGatewayClientKey, serverKey: paymentGatewayServerKey, isProduction: false })
                      });
                      const data = await res.json();
                      if (res.ok && data.success) {
                        if (addToast) addToast(data.message || 'Koneksi Payment Gateway BERHASIL!', 'success');
                      } else {
                        if (addToast) addToast(data.message || 'Tes koneksi gagal.', 'error');
                      }
                    } catch (err) {
                      if (addToast) addToast(err.message, 'error');
                    } finally {
                      setPaymentTestStatus({ loading: false, success: '', error: '' });
                    }
                  }}
                  style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {paymentTestStatus.loading ? '⏳ Memeriksa...' : '🔍 Tes Payment Gateway'}
                </button>
              </div>

            </div>

          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* SUB-TAB 3: SISTEM & KEAMANAN SUPERADMIN                          */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'system' && (
          <div className="fade-in-up">
            
            {/* OPERATIONAL REGISTRATION CONTROL */}
            <h4 style={{ margin: '0 0 16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', fontSize: '15px', color: '#818cf8', fontWeight: 'bold' }}>
              ⚙️ Kontrol Akses & Registration System
            </h4>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px', marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="enable_registration"
                    checked={sysEnableReg}
                    onChange={e => setSysEnableReg(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="enable_registration" style={{ cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', color: sysEnableReg ? '#34d399' : '#f87171' }}>
                    Buka Pendaftaran Vendor Baru (Public Registration)
                  </label>
                </div>
                <span style={{ fontSize: '11px', background: sysEnableReg ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: sysEnableReg ? '#34d399' : '#f87171', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
                  {sysEnableReg ? '🟢 REGISTRASI DIBUKA' : '🔴 REGISTRASI DITUTUP'}
                </span>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Batas Maksimal Vendor Aktif (Quota)</label>
                <input
                  type="number"
                  className="input-text"
                  placeholder="Kosongkan untuk tanpa batas quota"
                  value={sysMaxQuota === null ? '' : sysMaxQuota}
                  onChange={e => setSysMaxQuota(e.target.value === '' ? null : parseInt(e.target.value))}
                />
              </div>
              <div className="form-group" style={{ margin: '16px 0 0 0' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Tarif Custom Storage per GB / Bulan (Rp)</label>
                <input
                  type="number"
                  className="input-text"
                  placeholder="Default: 1250 (Rp 1.250 / GB)"
                  value={customStoragePricePerGb}
                  onChange={e => setCustomStoragePricePerGb(parseInt(e.target.value) || 1250)}
                />
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0 0' }}>
                  Tarif grosir dinamis per GB / bulan yang digunakan pada kalkulator slider Custom Storage vendor.
                </p>
              </div>

              <div className="form-group" style={{ margin: '16px 0 0 0' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Ambang Batas Peringatan Worker Storage (GB)</label>
                <input
                  type="number"
                  className="input-text"
                  placeholder="Default: 10 (Warn saat sisa <= 10 GB)"
                  value={workerStorageWarningThresholdGb}
                  onChange={e => setWorkerStorageWarningThresholdGb(parseInt(e.target.value) || 10)}
                />
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0 0' }}>
                  Pemicu notifikasi peringatan dini di Admin Panel untuk segera menambah akun Master Drive Worker baru.
                </p>
              </div>
            </div>

            {/* SUPERADMIN PASSWORD CHANGE */}
            <h4 style={{ margin: '0 0 16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', fontSize: '15px', color: '#818cf8', fontWeight: 'bold' }}>
              🔒 Keamanan Akun Superadmin
            </h4>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px', marginBottom: '28px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Ganti Password Master Superadmin</label>
                <input
                  type="password"
                  className="input-text"
                  placeholder="Masukkan password baru (Kosongkan jika tidak ingin mengganti)"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  disabled={savingProfile}
                />
              </div>
            </div>

            {/* AUTO-BACKUP DATABASE */}
            <h4 style={{ margin: '0 0 16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', fontSize: '15px', color: '#818cf8', fontWeight: 'bold' }}>
              💾 Auto-Backup Database
            </h4>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="enable_auto_backup"
                    checked={!!sysEnableBackup}
                    onChange={e => setSysEnableBackup(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="enable_auto_backup" style={{ cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', color: sysEnableBackup ? '#34d399' : '#94a3b8' }}>
                    Aktifkan Auto-Backup Database Otomatis
                  </label>
                </div>
                <span style={{ fontSize: '11px', background: sysEnableBackup ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.1)', color: sysEnableBackup ? '#34d399' : '#94a3b8', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
                  {sysEnableBackup ? '🟢 BACKUP AKTIF' : '⚪ BACKUP NONAKTIF'}
                </span>
              </div>

              {/* Info Status Backup Terakhir (System Log) */}
              <div style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '12px',
                padding: '14px 18px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#a5b4fc', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    🕒 Backup Terakhir (System Log)
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff', marginTop: '3px' }}>
                    {lastBackupTime || 'Belum pernah'}
                  </div>
                </div>

                {lastBackupFileName && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Berkas Backup Terakhir:</div>
                    <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#34d399', fontWeight: 'bold' }}>
                      {lastBackupFileName} {lastBackupSizeFormatted ? `(${lastBackupSizeFormatted})` : ''}
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group" style={{ margin: 0, opacity: sysEnableBackup ? 1 : 0.4, transition: 'opacity 0.2s' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Interval Backup (Jam)</label>
                <input
                  type="number"
                  className="input-text"
                  placeholder="Contoh: 6 (backup setiap 6 jam)"
                  min="1"
                  max="168"
                  value={sysBackupInterval ?? 6}
                  onChange={e => setSysBackupInterval(parseInt(e.target.value) || 6)}
                  disabled={!sysEnableBackup}
                  style={{ maxWidth: '200px' }}
                />
                <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0 0' }}>
                  Backup berjalan otomatis secara otonom di background daemon server (<code>lib/db.js</code>).
                  File backup tersimpan di folder <code>backups/</code> di server.
                </p>
              </div>
            </div>

            {/* ── 4. TIM ADMINISTRATOR & SUB-ADMIN MANAGEMENT ── */}
            <div style={{ marginTop: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <h5 style={{ margin: 0, fontSize: '14px', color: '#818cf8', fontWeight: 'bold' }}>
                    👥 Tim Administrator & Sub-Admin
                  </h5>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                    Kelola daftar Superadmin Root dan Staf Sub-Admin yang memiliki akses ke Admin Dashboard.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddAdminModal(true)}
                  style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}
                >
                  ➕ Tambah Sub-Admin
                </button>
              </div>

              {loadingAdmins ? (
                <div style={{ fontSize: '12px', color: '#94a3b8', padding: '12px' }}>⏳ Memuat daftar admin...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {adminList.map(adm => (
                    <div key={adm.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '16px' }}>{adm.isRoot === 1 ? '👑' : '👨‍💼'}</span>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {adm.name}
                            {adm.isRoot === 1 ? (
                              <span style={{ fontSize: '10px', background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.4)', padding: '1px 6px', borderRadius: '4px' }}>Root Master Admin</span>
                            ) : (
                              <span style={{ fontSize: '10px', background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.4)', padding: '1px 6px', borderRadius: '4px' }}>Sub-Admin</span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{adm.email}</div>
                        </div>
                      </div>

                      {adm.isRoot !== 1 && Number(adm.id) !== 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAdmin(adm)}
                          style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          🗑️ Hapus
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      {/* ── MODAL TAMBAH SUB-ADMIN ── */}
      {showAddAdminModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', width: '90%', maxWidth: '420px', padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '16px', color: '#818cf8', fontWeight: 'bold' }}>➕ Tambah Sub-Admin Baru</h4>
              <button type="button" onClick={() => setShowAddAdminModal(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Nama Lengkap Staf</label>
                <input type="text" className="input-text" placeholder="Contoh: Budi Santoso (Staf CS)" value={newAdminName} onChange={e => setNewAdminName(e.target.value)} required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Email Admin</label>
                <input type="email" className="input-text" placeholder="admin2@domain.com" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Password Akses</label>
                <input type="password" className="input-text" placeholder="Minimal 6 karakter" value={newAdminPass} onChange={e => setNewAdminPass(e.target.value)} required />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowAddAdminModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e4e4e7', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>Batal</button>
                <button type="button" disabled={submittingAdmin} onClick={handleCreateSubAdmin} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#ffffff', padding: '8px 20px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {submittingAdmin ? '⏳ Menyimpan...' : '✓ Tambah Admin'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* ── STICKY/GLOBAL SAVE ALL SETTINGS BUTTON AT BOTTOM ── */}
        <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={savingProfile}
            className="btn-primary"
            style={{
              padding: '12px 36px',
              fontSize: '14px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              boxShadow: '0 4px 18px rgba(16, 185, 129, 0.3)'
            }}
          >
            💾 {savingProfile ? 'Memproses Simpan...' : 'Simpan Seluruh Pengaturan Database'}
          </button>
        </div>

      </form>

    </div>
  );
}
