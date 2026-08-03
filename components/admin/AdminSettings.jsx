'use client';

import React from 'react';

export default function AdminSettings({
  googleClientId, setGoogleClientId,
  googleClientSecret, setGoogleClientSecret,
  googleMasterFolderId, setGoogleMasterFolderId,
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
  smtpEnable = true, setSmtpEnable,
  smtpHost = 'smtp.gmail.com', setSmtpHost,
  smtpPort = 465, setSmtpPort,
  smtpEmail = '', setSmtpEmail,
  smtpPassword = '', setPassword, setSmtpPassword,
  smtpFromName = 'Pick Your Photo', setSmtpFromName,
  addToast,
  sysEnableReg, setSysEnableReg,
  sysEnableTrial, setSysEnableTrial,
  sysMaxQuota, setSysMaxQuota,
  sysTrialExpirationMinutes = 30, setSysTrialExpirationMinutes,
  sysEnableBackup, setSysEnableBackup,
  sysBackupInterval, setSysBackupInterval,
  savingProfile,
  profileSuccessMsg,
  setProfileSuccessMsg,
  profileErrorMsg,
  handleSaveProfile
}) {
  const [isEditingGoogleCredentials, setIsEditingGoogleCredentials] = React.useState(false);
  const [isEditingSmtp, setIsEditingSmtp] = React.useState(false);
  const [testEmailStatus, setTestEmailStatus] = React.useState({ loading: false, success: '', error: '' });

  return (
    <div className="glass-card" style={{ padding: '28px', borderRadius: '16px', maxWidth: '750px', margin: '0 auto' }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>SaaS & Superadmin Settings</h3>
      <p style={{ color: '#a1a1aa', margin: '0 0 24px 0', fontSize: '14px' }}>
        Pengaturan terpusat DB-Driven untuk Google Studio, Pembayaran, dan Kontrol Operasional SaaS.
      </p>

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
            gap: '12px',
            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.15)',
            transition: 'all 0.3s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
            <span style={{ fontSize: '16px' }}>✓</span>
            <span>{profileSuccessMsg}</span>
          </div>
          {setProfileSuccessMsg && (
            <button
              type="button"
              onClick={() => setProfileSuccessMsg('')}
              aria-label="Tutup Notifikasi"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#34d399',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                padding: '0 4px',
                opacity: 0.8,
                transition: 'opacity 0.2s ease'
              }}
            >
              ✕
            </button>
          )}
        </div>
      )}

      {profileErrorMsg && (
        <div style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
          ⚠️ {profileErrorMsg}
        </div>
      )}

      <form onSubmit={handleSaveProfile}>
        {/* ── MODUL 1: GOOGLE SIGN-IN & OAUTH INTEGRATION ── */}
        <h4 style={{ margin: '0 0 12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', fontSize: '15px', color: '#10b981', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>🔑 Modul 1: Integrasi Google Sign-In Vendor</span>
          <span style={{ fontSize: '10px', background: 'rgba(16,185,129,0.15)', color: '#34d399', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>OAuth 2.0 Credentials</span>
        </h4>
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '24px' }}>
          {/* Minimalist Collapsible URL Helper */}
          <details style={{ marginBottom: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: '600', color: '#a5b4fc', outline: 'none', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📋 Salin URL Google Cloud Console (Origins & Redirect URI)</span>
            </summary>
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px' }}>
                <span style={{ fontSize: '11px', color: '#a1a1aa' }}>Origins: <code style={{ color: '#34d399', fontFamily: 'monospace' }}>{typeof window !== 'undefined' ? window.location.origin : 'https://domain-anda.com'}</code></span>
                <button
                  type="button"
                  onClick={() => {
                    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
                    navigator.clipboard.writeText(origin);
                    alert(`✓ Authorized JavaScript origins (${origin}) berhasil disalin!`);
                  }}
                  className="btn-secondary"
                  style={{ padding: '2px 8px', fontSize: '10px', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}
                >
                  📋 Salin
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px' }}>
                <span style={{ fontSize: '11px', color: '#a1a1aa' }}>Redirect URI: <code style={{ color: '#fbbf24', fontFamily: 'monospace' }}>{(typeof window !== 'undefined' ? window.location.origin : 'https://domain-anda.com') + '/api/auth/google/callback'}</code></span>
                <button
                  type="button"
                  onClick={() => {
                    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
                    const redirectUrl = `${origin}/api/auth/google/callback`;
                    navigator.clipboard.writeText(redirectUrl);
                    alert(`✓ Authorized redirect URIs (${redirectUrl}) berhasil disalin!`);
                  }}
                  className="btn-secondary"
                  style={{ padding: '2px 8px', fontSize: '10px', background: 'rgba(251,191,36,0.2)', color: '#fde68a' }}
                >
                  📋 Salin
                </button>
              </div>
            </div>
          </details>

          {/* Conditional UI: Connected Badge vs Input Form */}
          {googleClientId && googleClientSecret && !isEditingGoogleCredentials ? (
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '18px 20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399' }} />
                  <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#34d399' }}>OAuth 2.0 Credentials Terhubung & Aktif</span>
                </div>
                <div style={{ fontSize: '12px', color: '#a1a1aa', fontFamily: 'monospace', marginTop: '4px' }}>
                  Client ID: <span style={{ color: '#f4f4f5' }}>{googleClientId.substring(0, 18)}...{googleClientId.substring(googleClientId.length - 8)}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#71717a', marginTop: '6px' }}>
                  ⚡ Engine Google Drive API v3 & Sign-In Vendor Siap Digunakan.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <a
                  href="/api/admin/auth/google"
                  className="btn-primary"
                  style={{
                    padding: '8px 14px',
                    fontSize: '12px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 'bold'
                  }}
                >
                  🔗 Otorisasi Drive OAuth
                </a>
                <button
                  type="button"
                  onClick={() => setIsEditingGoogleCredentials(true)}
                  className="btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '12px', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}
                >
                  ✏️ Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGoogleClientId('');
                    setGoogleClientSecret('');
                    setIsEditingGoogleCredentials(true);
                  }}
                  className="btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '12px', background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
                >
                  🗑️ Putuskan
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px', color: '#cbd5e1' }}>Google Client ID</label>
                  <input
                    type="text"
                    className="input-text"
                    placeholder="e.g. 12345...apps.googleusercontent.com"
                    value={googleClientId}
                    onChange={e => setGoogleClientId(e.target.value)}
                    disabled={savingProfile}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px', color: '#cbd5e1' }}>Google Client Secret</label>
                  <input
                    type="password"
                    className="input-text"
                    placeholder="e.g. GOCSPX-..."
                    value={googleClientSecret}
                    onChange={e => setGoogleClientSecret(e.target.value)}
                    disabled={savingProfile}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: '11px', color: '#71717a' }}>
                  💡 Setelah Client ID & Secret diisi, simpan perubahan untuk mengaktifkan Google Sign-In.
                </span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {googleClientId && (
                    <button
                      type="button"
                      onClick={() => setIsEditingGoogleCredentials(false)}
                      className="btn-secondary"
                      style={{ padding: '10px 16px', fontSize: '13px' }}
                    >
                      Batal
                    </button>
                  )}
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={savingProfile}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      border: 'none',
                      borderRadius: '8px'
                    }}
                  >
                    💾 {savingProfile ? 'Memproses...' : 'Simpan Kredensial Google'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── MODUL 2: REKENING BANK & TOGGLE PAYMENT GATEWAY ── */}
        <h4 style={{ margin: '24px 0 12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', fontSize: '15px', color: '#818cf8', fontWeight: 'bold' }}>
          💳 Modul 2: Pembayaran & Payment Gateway
        </h4>

        {/* Manual Bank Transfer Routing */}
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#e4e4e7', marginBottom: '12px' }}>Tujuan Rekening Transfer Manual</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Nama Bank</label>
              <input
                type="text"
                className="input-text"
                required
                placeholder="Contoh: BCA (Bank Central Asia)"
                value={bankName}
                onChange={e => setBankName(e.target.value)}
                disabled={savingProfile}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Nomor Rekening</label>
              <input
                type="text"
                className="input-text"
                required
                placeholder="Contoh: 1234-5678-90"
                value={bankAccountNumber}
                onChange={e => setBankAccountNumber(e.target.value)}
                disabled={savingProfile}
              />
            </div>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '12px' }}>Atas Nama Rekening</label>
            <input
              type="text"
              className="input-text"
              required
              placeholder="Contoh: PT Pick Your Photo"
              value={bankAccountName}
              onChange={e => setBankAccountName(e.target.value)}
              disabled={savingProfile}
            />
          </div>
        </div>

        {/* Automatic Payment Gateway Toggle (Midtrans / Xendit) */}
        <div style={{ background: 'rgba(99,102,241,0.03)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.1)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                id="enablePaymentGateway"
                checked={enablePaymentGateway}
                onChange={e => setEnablePaymentGateway(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="enablePaymentGateway" style={{ cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#a5b4fc' }}>
                Aktifkan Automatic Payment Gateway (Midtrans / Xendit)
              </label>
            </div>
            <span style={{ fontSize: '10px', background: enablePaymentGateway ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.08)', color: enablePaymentGateway ? '#34d399' : '#71717a', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
              {enablePaymentGateway ? 'ONLINE GATEWAY ON' : 'MANUAL TRANSFER ONLY'}
            </span>
          </div>

          {enablePaymentGateway && (
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Pilih Provider Payment Gateway</label>
                <select
                  className="input-text"
                  value={paymentGatewayProvider}
                  onChange={e => setPaymentGatewayProvider(e.target.value)}
                  style={{ background: 'rgba(0,0,0,0.3)' }}
                >
                  <option value="midtrans">Midtrans Snap API (QRIS, VA, GoPay, Card)</option>
                  <option value="xendit">Xendit Invoice API (QRIS, E-Wallet, VA)</option>
                  <option value="tripay">Tripay Payment API (QRIS, VA, Alfamart/Indomaret)</option>
                  <option value="duitku">Duitku Pop-Up API (QRIS, VA, E-Wallet)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>
                    {paymentGatewayProvider === 'tripay' || paymentGatewayProvider === 'duitku' ? 'Merchant Code / Code' : 'Client Key / Public Key'}
                  </label>
                  <input
                    type="text"
                    className="input-text"
                    placeholder={paymentGatewayProvider === 'midtrans' ? 'e.g. SB-Mid-client-...' : 'Masukkan Client/Public Key atau Merchant Code'}
                    value={paymentGatewayClientKey}
                    onChange={e => setPaymentGatewayClientKey(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>
                    {paymentGatewayProvider === 'xendit' ? 'Secret API Key' : 'Server Key / Secret Key / API Key'}
                  </label>
                  <input
                    type="password"
                    className="input-text"
                    placeholder={paymentGatewayProvider === 'midtrans' ? 'e.g. SB-Mid-server-...' : 'Masukkan Server/Secret Key'}
                    value={paymentGatewayServerKey}
                    onChange={e => setPaymentGatewayServerKey(e.target.value)}
                  />
                </div>
              </div>

              {/* Webhook Callback Notification URL Helper */}
              <div style={{ marginTop: '14px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '12px 14px', borderRadius: '8px', fontSize: '12px' }}>
                <div style={{ color: '#818cf8', fontWeight: 'bold', marginBottom: '4px' }}>🔗 URL Notification / Webhook Callback (Otomatis Lunas):</div>
                <code style={{ background: 'rgba(0,0,0,0.4)', padding: '4px 8px', borderRadius: '4px', color: '#34d399', wordBreak: 'break-all', display: 'block' }}>
                  {typeof window !== 'undefined' ? `${window.location.origin}/api/payment/notification` : '/api/payment/notification'}
                </code>
                <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px' }}>
                  * Salin URL di atas dan pasang di Dashboard Provider ({paymentGatewayProvider.toUpperCase()}) pada bagian <em>Notification / Webhook URL</em> agar akun vendor otomatis aktif saat pembayaran lunas.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Support Contacts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Email Support</label>
            <input
              type="email"
              className="input-text"
              required
              placeholder="support@pickyourphoto.com"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              disabled={savingProfile}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">WhatsApp Support (WA)</label>
            <input
              type="text"
              className="input-text"
              required
              placeholder="6281234567890"
              value={contactWhatsapp}
              onChange={e => setContactWhatsapp(e.target.value)}
              disabled={savingProfile}
            />
          </div>
        </div>

        {/* ── MODUL 3: NOTIFIKASI EMAIL OTOMATIS (SMTP GMAIL) ── */}
        <h4 style={{ margin: '24px 0 12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', fontSize: '15px', color: '#38bdf8', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>📧 Modul 3: Notifikasi Email Otomatis (SMTP Gmail)</span>
          <span style={{ fontSize: '10px', background: 'rgba(56,189,248,0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>Background Mailer</span>
        </h4>

        {/* TEST EMAIL ALERT BANNERS */}
        {testEmailStatus.success && (
          <div style={{ background: 'rgba(52, 211, 153, 0.12)', border: '1px solid rgba(52, 211, 153, 0.3)', color: '#34d399', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>✅ {testEmailStatus.success}</span>
            <button type="button" onClick={() => setTestEmailStatus(prev => ({ ...prev, success: '' }))} style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}>✕</button>
          </div>
        )}

        {testEmailStatus.error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>❌ {testEmailStatus.error}</span>
            <button type="button" onClick={() => setTestEmailStatus(prev => ({ ...prev, error: '' }))} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}>✕</button>
          </div>
        )}

        {smtpEmail && smtpPassword && !isEditingSmtp ? (
          <div style={{ background: 'rgba(56, 189, 248, 0.04)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '16px 20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#f4f4f5' }}>{smtpEmail}</span>
                {smtpEnable ? (
                  <span style={{ fontSize: '10px', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                    🟢 Aktif & Otomatis Kirim
                  </span>
                ) : (
                  <span style={{ fontSize: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                    🔴 Nonaktif (Email Mati)
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#a1a1aa' }}>
                Pengirim: <strong>{smtpFromName}</strong> | Host: <strong>{smtpHost}:{smtpPort}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                type="button"
                disabled={testEmailStatus.loading}
                onClick={async (e) => {
                  setTestEmailStatus({ loading: true, success: '', error: '' });
                  try {
                    const res = await fetch('/api/admin/smtp/test', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ targetEmail: smtpEmail })
                    });
                    const data = await res.json();
                    if (res.ok) {
                      const msg = data.message || `Email uji coba BERHASIL dikirim ke ${smtpEmail}! Cek Inbox / Spam.`;
                      setTestEmailStatus({ loading: false, success: msg, error: '' });
                      if (addToast) addToast(msg, 'success');
                    } else {
                      const errMsg = data.message || 'Gagal mengirim email uji coba. Periksa password SMTP Anda.';
                      setTestEmailStatus({ loading: false, success: '', error: errMsg });
                      if (addToast) addToast(errMsg, 'error');
                    }
                  } catch (err) {
                    const errMsg = err.message || 'Terjadi kesalahan koneksi SMTP.';
                    setTestEmailStatus({ loading: false, success: '', error: errMsg });
                    if (addToast) addToast(errMsg, 'error');
                  }
                }}
                style={{ background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: testEmailStatus.loading ? 'wait' : 'pointer' }}
              >
                {testEmailStatus.loading ? '⏳ Mengirim...' : '📧 Tes Kirim Email'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditingSmtp(true)}
                style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                ✏️ Ubah Konfigurasi
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <input
                type="checkbox"
                id="smtp_enable"
                checked={smtpEnable}
                onChange={e => setSmtpEnable(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="smtp_enable" style={{ cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', color: '#f4f4f5' }}>
                Aktifkan Pengiriman Email Persetujuan Otomatis ke Vendor
              </label>
            </div>

            <details style={{ marginBottom: '16px', background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#bae6fd' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', outline: 'none' }}>
                💡 Panduan Membuat Google App Password (16 Karakter)
              </summary>
              <ol style={{ margin: '8px 0 0 16px', padding: 0, lineHeight: '1.6' }}>
                <li>Buka Akun Google Anda &rarr; Menu <strong>Keamanan (Security)</strong> &rarr; Aktifkan <strong>Verifikasi 2 Langkah (2FA)</strong>.</li>
                <li>Cari menu <strong>Sandi Aplikasi (App Passwords)</strong> di kolom pencarian Akun Google.</li>
                <li>Buat sandi baru (misal nama: <em>Pick Your Photo</em>) &rarr; Salin 16 karakter sandi ke kolom <strong>SMTP App Password</strong> di bawah.</li>
              </ol>
            </details>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Email Gmail Pengirim (SMTP User)</label>
                <input
                  type="email"
                  className="input-text"
                  placeholder="admin@pickyourphoto.com"
                  value={smtpEmail}
                  onChange={e => setSmtpEmail(e.target.value)}
                  disabled={savingProfile}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Google App Password (16 Karakter)</label>
                <input
                  type="password"
                  className="input-text"
                  placeholder="•••• •••• •••• ••••"
                  value={smtpPassword}
                  onChange={e => setSmtpPassword(e.target.value)}
                  disabled={savingProfile}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Nama Pengirim (Sender Name)</label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="Pick Your Photo"
                  value={smtpFromName}
                  onChange={e => setSmtpFromName(e.target.value)}
                  disabled={savingProfile}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>SMTP Host</label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="smtp.gmail.com"
                  value={smtpHost}
                  onChange={e => setSmtpHost(e.target.value)}
                  disabled={savingProfile}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>SMTP Port</label>
                <input
                  type="number"
                  className="input-text"
                  placeholder="465"
                  value={smtpPort}
                  onChange={e => setSmtpPort(parseInt(e.target.value) || 465)}
                  disabled={savingProfile}
                />
              </div>
            </div>

            {/* SMTP Save & Test Action Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                {smtpEmail && smtpPassword ? (
                  <span style={{ fontSize: '12px', color: '#34d399', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                    ✓ Form Siap Disimpan
                  </span>
                ) : (
                  <span style={{ fontSize: '11px', color: '#fbbf24' }}>
                    ⚠️ Masukkan Email & App Password lalu simpan.
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {smtpEmail && smtpPassword && (
                  <button
                    type="button"
                    onClick={() => setIsEditingSmtp(false)}
                    className="btn-secondary"
                    style={{ padding: '9px 16px', fontSize: '12px' }}
                  >
                    Batal
                  </button>
                )}
                <button
                  type="button"
                  disabled={testEmailStatus.loading}
                  onClick={async (e) => {
                    if (!smtpEmail || !smtpPassword) {
                      setTestEmailStatus({ loading: false, success: '', error: 'Isi Email & App Password SMTP terlebih dahulu.' });
                      if (addToast) addToast('Isi Email & App Password SMTP terlebih dahulu.', 'error');
                      return;
                    }
                    setTestEmailStatus({ loading: true, success: '', error: '' });
                    if (handleSaveProfile) await handleSaveProfile(e);
                    setIsEditingSmtp(false);
                    
                    try {
                      const res = await fetch('/api/admin/smtp/test', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ targetEmail: smtpEmail })
                      });
                      const data = await res.json();
                      if (res.ok) {
                        const msg = data.message || `Email uji coba BERHASIL dikirim ke ${smtpEmail}! Cek Inbox / Spam.`;
                        setTestEmailStatus({ loading: false, success: msg, error: '' });
                        if (addToast) addToast(msg, 'success');
                      } else {
                        const errMsg = data.message || 'Gagal mengirim email uji coba. Periksa password SMTP Anda.';
                        setTestEmailStatus({ loading: false, success: '', error: errMsg });
                        if (addToast) addToast(errMsg, 'error');
                      }
                    } catch (err) {
                      const errMsg = err.message || 'Terjadi kesalahan koneksi SMTP.';
                      setTestEmailStatus({ loading: false, success: '', error: errMsg });
                      if (addToast) addToast(errMsg, 'error');
                    }
                  }}
                  style={{ background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', padding: '9px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: testEmailStatus.loading ? 'wait' : 'pointer', transition: 'all 0.2s ease' }}
                >
                  {testEmailStatus.loading ? '⏳ Mengirim...' : '📧 Tes Kirim Email'}
                </button>

                <button
                  type="button"
                  onClick={async (e) => {
                    if (handleSaveProfile) await handleSaveProfile(e);
                    setIsEditingSmtp(false);
                  }}
                  disabled={savingProfile}
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#ffffff', padding: '9px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)', transition: 'all 0.2s ease' }}
                >
                  💾 {savingProfile ? 'Menyimpan...' : 'Simpan & Tutup Form'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODUL 4: KONTROL OPERASIONAL SAAS & FREE TRIAL ── */}
        <h4 style={{ margin: '24px 0 12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', fontSize: '15px', color: '#818cf8', fontWeight: 'bold' }}>
          ⚙️ Modul 4: Kontrol Operasional SaaS & Free Trial
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              id="enable_registration"
              checked={sysEnableReg}
              onChange={e => setSysEnableReg(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="enable_registration" style={{ cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>Buka Pendaftaran Vendor Baru</label>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Batas Maksimal Vendor Aktif</label>
            <input
              type="number"
              className="input-text"
              placeholder="Kosongkan untuk tanpa batas"
              value={sysMaxQuota === null ? '' : sysMaxQuota}
              onChange={e => setSysMaxQuota(e.target.value === '' ? null : parseInt(e.target.value))}
            />
          </div>
        </div>

        {/* Password Reset Section */}
        <h4 style={{ margin: '24px 0 12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', fontSize: '15px', color: '#818cf8', fontWeight: 'bold' }}>
          🔒 Superadmin Password
        </h4>
        <div className="form-group" style={{ marginBottom: '28px' }}>
          <label className="form-label">Ganti Password Baru</label>
          <input
            type="password"
            className="input-text"
            placeholder="Masukkan password baru (Kosongkan jika tidak ingin mengganti)"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            disabled={savingProfile}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn-primary" disabled={savingProfile} style={{ padding: '12px 32px' }}>
            {savingProfile ? 'Menyimpan...' : 'Simpan Seluruh Pengaturan DB'}
          </button>
        </div>
      </form>
    </div>
  );
}
