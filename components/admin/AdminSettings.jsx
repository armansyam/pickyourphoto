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
  gracePeriodDays = 7, setGracePeriodDays,
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

  // Backup & Recovery Suite State
  const [backupsList, setBackupsList] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [uploadingBackup, setUploadingBackup] = useState(false);
  const [restoreModal, setRestoreModal] = useState(null); // { open: true, fileName, date, size }
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [systemReloading, setSystemReloading] = useState(false);
  const [reloadCountdown, setReloadCountdown] = useState(3);

  const fetchBackupsList = async () => {
    setLoadingBackups(true);
    try {
      const res = await fetch('/api/admin/backups');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.backups)) {
          setBackupsList(data.backups);
        }
      }
    } catch (e) {
      console.error('Failed to fetch backups:', e);
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      const res = await fetch('/api/admin/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (addToast) addToast(data.message || 'Snapshot database berhasil dibuat!', 'success');
        fetchBackupsList();
      } else {
        if (addToast) addToast(data.message || 'Gagal membuat backup database.', 'error');
      }
    } catch (err) {
      if (addToast) addToast(err.message || 'Terjadi kesalahan saat membuat backup.', 'error');
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleUploadRestore = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.db')) {
      if (addToast) addToast('Format file salah. Harap pilih file database SQLite (.db).', 'error');
      e.target.value = '';
      return;
    }

    const confirmUpload = window.confirm(
      `Peringatan: Anda akan mengunggah dan langsung memulihkan database dari berkas "${file.name}".\n\nData saat ini akan digantikan dan snapshot darurat akan dibuat otomatis.\n\nLanjutkan?`
    );
    if (!confirmUpload) {
      e.target.value = '';
      return;
    }

    setUploadingBackup(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/backups', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (addToast) addToast(data.message || 'Database berhasil dipulihkan dari file unggahan!', 'success');
        // Trigger visual reload countdown
        setSystemReloading(true);
        let count = 3;
        const interval = setInterval(() => {
          count -= 1;
          setReloadCountdown(count);
          if (count <= 0) {
            clearInterval(interval);
            window.location.reload();
          }
        }, 1000);
      } else {
        if (addToast) addToast(data.message || 'Gagal memulihkan database dari file unggahan.', 'error');
      }
    } catch (err) {
      if (addToast) addToast(err.message || 'Terjadi kesalahan saat mengunggah file.', 'error');
    } finally {
      setUploadingBackup(false);
      e.target.value = '';
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreModal?.fileName) return;
    setRestoringBackup(true);
    try {
      const res = await fetch(`/api/admin/backups/${encodeURIComponent(restoreModal.fileName)}`, {
        method: 'POST'
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (addToast) addToast(data.message || 'Database berhasil dipulihkan!', 'success');
        setRestoreModal(null);
        // Trigger visual reload countdown
        setSystemReloading(true);
        let count = 3;
        const interval = setInterval(() => {
          count -= 1;
          setReloadCountdown(count);
          if (count <= 0) {
            clearInterval(interval);
            window.location.reload();
          }
        }, 1000);
      } else {
        if (addToast) addToast(data.message || 'Gagal memulihkan database.', 'error');
      }
    } catch (err) {
      if (addToast) addToast(err.message || 'Terjadi kesalahan saat memulihkan database.', 'error');
    } finally {
      setRestoringBackup(false);
    }
  };

  const handleDeleteBackup = async (fileName) => {
    if (!window.confirm(`Hapus berkas cadangan "${fileName}" secara permanen?`)) return;
    try {
      const res = await fetch(`/api/admin/backups/${encodeURIComponent(fileName)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (addToast) addToast(data.message || 'Berkas cadangan berhasil dihapus.', 'success');
        fetchBackupsList();
      } else {
        if (addToast) addToast(data.message || 'Gagal menghapus berkas cadangan.', 'error');
      }
    } catch (err) {
      if (addToast) addToast(err.message || 'Terjadi kesalahan.', 'error');
    }
  };

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
    fetchBackupsList();
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
                  <option value="ipaymu">⭐ IPaymu Direct QRIS API (Rekomendasi Bebas Iframe)</option>
                  <option value="midtrans">QRIS Gateway Otomatis (Midtrans Snap)</option>
                  <option value="xendit">Xendit Invoice API (QRIS, E-Wallet, VA)</option>
                  <option value="tripay">Tripay Payment API (QRIS, VA, Alfamart)</option>
                  <option value="duitku">Duitku Pop-Up API (QRIS, VA, E-Wallet)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>
                    {paymentGatewayProvider === 'ipaymu' ? 'Nomor Virtual Account (VA) Merchant' : 'Client Key / Public Key'}
                  </label>
                  <input 
                    type="text" 
                    className="input-text" 
                    placeholder={paymentGatewayProvider === 'ipaymu' ? 'Contoh: 0000001234567890' : 'Client Key'}
                    value={paymentGatewayClientKey} 
                    onChange={e => setPaymentGatewayClientKey(e.target.value)} 
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>
                    {paymentGatewayProvider === 'ipaymu' ? 'API Key IPaymu' : 'Server Key / Secret Key'}
                  </label>
                  <input 
                    type="password" 
                    className="input-text" 
                    placeholder={paymentGatewayProvider === 'ipaymu' ? 'API Key dari dashboard IPaymu' : 'Server Key'}
                    value={paymentGatewayServerKey} 
                    onChange={e => setPaymentGatewayServerKey(e.target.value)} 
                  />
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

              <div className="form-group" style={{ margin: '16px 0 0 0' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Masa Tenggang Platform (Grace Period Days)</label>
                <input
                  type="number"
                  className="input-text"
                  placeholder="Default: 7 Hari"
                  value={gracePeriodDays}
                  onChange={e => setGracePeriodDays(parseInt(e.target.value) || 7)}
                />
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0 0' }}>
                  Jumlah hari masa tenggang (grace period) sebelum berkas vendor kedaluwarsa dibersihkan total dari Google Drive Worker (Hard Purge).
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
            {/* DATABASE BACKUP, SNAPSHOT & RECOVERY SUITE */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '15px', color: '#818cf8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                </svg>
                Backup & Disaster Recovery Database
              </h4>
              <span style={{ fontSize: '11px', background: sysEnableBackup ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.1)', color: sysEnableBackup ? '#34d399' : '#94a3b8', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
                {sysEnableBackup ? '🟢 AUTO-BACKUP AKTIF' : '⚪ AUTO-BACKUP NONAKTIF'}
              </span>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
              
              {/* 1. Kontrol Auto-Backup Periodik */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="enable_auto_backup"
                    checked={!!sysEnableBackup}
                    onChange={e => setSysEnableBackup(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <div>
                    <label htmlFor="enable_auto_backup" style={{ cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', color: sysEnableBackup ? '#34d399' : '#94a3b8' }}>
                      Aktifkan Penjadwalan Auto-Backup Otomatis
                    </label>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>
                      Server akan otomatis membuat snapshot cadangan berkala di background daemon.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: sysEnableBackup ? 1 : 0.4 }}>
                  <label style={{ fontSize: '12px', color: '#a1a1aa' }}>Interval:</label>
                  <select
                    className="input-text"
                    value={sysBackupInterval ?? 6}
                    onChange={e => setSysBackupInterval(parseInt(e.target.value) || 6)}
                    disabled={!sysEnableBackup}
                    style={{ maxWidth: '140px', padding: '6px 10px', fontSize: '12px' }}
                  >
                    <option value={3}>Tiap 3 Jam</option>
                    <option value={6}>Tiap 6 Jam</option>
                    <option value={12}>Tiap 12 Jam</option>
                    <option value={24}>Tiap 24 Jam</option>
                  </select>
                </div>
              </div>

              {/* 2. Action Bar: Manual Snapshot & Upload Restore */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', margin: '20px 0 16px' }}>
                <div>
                  <h5 style={{ margin: 0, fontSize: '13px', color: '#ffffff', fontWeight: 'bold' }}>
                    Riwayat Berkas Cadangan di Server ({backupsList.length})
                  </h5>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#71717a' }}>
                    Retensi otomatis 7 hari. File pre-restore snapshot otomatis diamankan sebelum setiap restore.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {/* Tombol Buat Snapshot Manual */}
                  <button
                    type="button"
                    disabled={creatingBackup}
                    onClick={handleCreateBackup}
                    style={{
                      background: 'rgba(99, 102, 241, 0.15)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      color: '#818cf8',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: creatingBackup ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                    </svg>
                    {creatingBackup ? 'Membuat Snapshot...' : 'Snapshot Sekarang'}
                  </button>

                  {/* Tombol Upload & Restore */}
                  <label
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#34d399',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: uploadingBackup ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      margin: 0
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    {uploadingBackup ? 'Mengunggah & Memulihkan...' : 'Upload & Restore .db'}
                    <input
                      type="file"
                      accept=".db"
                      onChange={handleUploadRestore}
                      disabled={uploadingBackup}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>

              {/* 3. Tabel Daftar File Backup */}
              {loadingBackups ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '12px' }}>
                  Memuat daftar berkas cadangan...
                </div>
              ) : backupsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.08)' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#71717a' }}>
                    Belum ada berkas cadangan (.db) tersimpan di server. Klik "Snapshot Sekarang" untuk membuat cadangan pertama.
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', maxHeight: '280px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#71717a', textAlign: 'left' }}>
                        <th style={{ padding: '8px 12px' }}>Nama Berkas</th>
                        <th style={{ padding: '8px 12px' }}>Tipe</th>
                        <th style={{ padding: '8px 12px' }}>Tanggal Dibuat</th>
                        <th style={{ padding: '8px 12px' }}>Ukuran</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backupsList.map((item, idx) => (
                        <tr key={item.fileName} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                          {/* Nama Berkas */}
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#e4e4e7', fontWeight: 'bold' }}>
                            {item.fileName}
                          </td>

                          {/* Tipe Badge */}
                          <td style={{ padding: '10px 12px' }}>
                            {item.isPreRestore ? (
                              <span style={{ fontSize: '10px', background: 'rgba(168,85,247,0.15)', color: '#c084fc', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                Pre-Restore Snapshot
                              </span>
                            ) : item.isUploaded ? (
                              <span style={{ fontSize: '10px', background: 'rgba(56,189,248,0.15)', color: '#38bdf8', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                File Unggahan
                              </span>
                            ) : (
                              <span style={{ fontSize: '10px', background: 'rgba(52,211,153,0.15)', color: '#34d399', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                Auto Backup
                              </span>
                            )}
                          </td>

                          {/* Tanggal */}
                          <td style={{ padding: '10px 12px', color: '#a1a1aa' }}>
                            {item.dateFormatted}, {item.timeFormatted}
                          </td>

                          {/* Ukuran */}
                          <td style={{ padding: '10px 12px', color: '#fbbf24', fontWeight: 'bold' }}>
                            {item.sizeFormatted}
                          </td>

                          {/* Tombol Aksi */}
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              {/* Unduh */}
                              <a
                                href={`/api/admin/backups/${encodeURIComponent(item.fileName)}`}
                                download
                                style={{
                                  background: 'rgba(255,255,255,0.05)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  color: '#e4e4e7',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  textDecoration: 'none',
                                  cursor: 'pointer'
                                }}
                                title="Unduh file .db ke komputer"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                  <polyline points="7 10 12 15 17 10"></polyline>
                                  <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                                Unduh
                              </a>

                              {/* Restore */}
                              <button
                                type="button"
                                onClick={() => setRestoreModal({
                                  open: true,
                                  fileName: item.fileName,
                                  date: `${item.dateFormatted}, ${item.timeFormatted}`,
                                  size: item.sizeFormatted
                                })}
                                style={{
                                  background: 'rgba(251, 191, 36, 0.15)',
                                  border: '1px solid rgba(251, 191, 36, 0.3)',
                                  color: '#fbbf24',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  cursor: 'pointer'
                                }}
                                title="Pulihkan database dari file ini"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                                  <path d="M3 3v5h5"></path>
                                </svg>
                                Restore
                              </button>

                              {/* Hapus */}
                              <button
                                type="button"
                                onClick={() => handleDeleteBackup(item.fileName)}
                                style={{
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  border: '1px solid rgba(239, 68, 68, 0.2)',
                                  color: '#f87171',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  cursor: 'pointer'
                                }}
                                title="Hapus file cadangan ini"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── MODAL KONFIRMASI RESTORE DATABASE ── */}
            {restoreModal && (
              <div className="modal-overlay" onClick={() => { if (!restoringBackup) setRestoreModal(null); }}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '90%', borderRadius: '16px' }}>
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(251,191,36,0.15)', color: '#fbbf24', marginBottom: '14px' }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 8px' }}>
                      Konfirmasi Pemulihan Database
                    </h3>
                    <p style={{ color: '#a1a1aa', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>
                      Apakah Anda yakin ingin memulihkan seluruh database dari berkas ini?
                    </p>
                  </div>

                  {/* Detail Box */}
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '14px', fontSize: '12px', lineHeight: '1.6', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#71717a' }}>Berkas:</span>
                      <strong style={{ color: '#34d399', fontFamily: 'monospace' }}>{restoreModal.fileName}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#71717a' }}>Waktu Cadangan:</span>
                      <span style={{ color: '#e4e4e7' }}>{restoreModal.date}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#71717a' }}>Ukuran:</span>
                      <strong style={{ color: '#fbbf24' }}>{restoreModal.size}</strong>
                    </div>
                  </div>

                  {/* Security Notice */}
                  <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', padding: '12px', fontSize: '11px', color: '#34d399', lineHeight: '1.4', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                      <polyline points="9 12 11 14 15 10"></polyline>
                    </svg>
                    <span><strong>Garansi Keamanan:</strong> Snapshot darurat database saat ini akan otomatis dibuat sebelum file ditimpa.</span>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      disabled={restoringBackup}
                      onClick={() => setRestoreModal(null)}
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#e4e4e7', fontSize: '13px', cursor: 'pointer' }}
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={restoringBackup}
                      onClick={handleConfirmRestore}
                      style={{ flex: 2, padding: '10px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000000', fontWeight: 'bold', fontSize: '13px', cursor: restoringBackup ? 'not-allowed' : 'pointer' }}
                    >
                      {restoringBackup ? 'Memulihkan Data...' : 'Konfirmasi & Pulihkan'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── SYSTEM RELOADING FULLSCREEN OVERLAY ── */}
            {systemReloading && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '4px solid rgba(99,102,241,0.2)', borderTopColor: '#818cf8', animation: 'spin 1s linear infinite', marginBottom: '20px' }}></div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 8px' }}>Memuat Ulang Sistem...</h3>
                <p style={{ color: '#a1a1aa', fontSize: '14px', margin: 0 }}>
                  Database berhasil dipulihkan. Halaman akan otomatis memuat ulang dalam <strong>{reloadCountdown}</strong> detik.
                </p>
                <style>{`
                  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                `}</style>
              </div>
            )}

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
