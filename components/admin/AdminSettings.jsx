'use client';

import React, { useState } from 'react';
import styles from './AdminSettings.module.css';
import { SettingsIcon, StoragePoolIcon, MoneyIcon } from '@/components/AdminIcons';
import { WhatsAppIcon, GoogleDriveIcon, SpeedBoltIcon, SettingsManageIcon, CheckIcon, CloseIcon, RefreshCwIcon, TrashIcon, FolderIcon } from '@/components/StorageIcons';

export default function AdminSettings({
  googleClientId, setGoogleClientId,
  googleClientSecret, setGoogleClientSecret,
  googleMasterFolderId, setGoogleMasterFolderId,
  googleRefreshToken,
  googleMasterAccountEmail,
  maxUploadConcurrencyThreads = 4, setMaxUploadConcurrencyThreads,

  saasName = 'Pick Your Photo', setSaasName,
  saasDomain = '', setSaasDomain,
  saasTagline = '', setSaasTagline,
  saasDescription = '', setSaasDescription,
  saasLogoUrl = '/logo.png', setSaasLogoUrl,
  companyAddress = '', setCompanyAddress,
  operationalHours = 'Senin – Sabtu: 08:00 – 17:00 WIB', setOperationalHours,

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
  sysEnableTrial = true, setSysEnableTrial,
  sysMaxQuota, setSysMaxQuota,
  sysTrialExpirationMinutes = 15, setSysTrialExpirationMinutes,
  trialMaxPhotos = 50, setTrialMaxPhotos,
  trialMaxSelection = 10, setTrialMaxSelection,
  trialPreviewPhotos = 12, setTrialPreviewPhotos,
  sysEnableBackup, setSysEnableBackup,
  sysBackupInterval, setSysBackupInterval,
  lastBackupTime = 'Belum pernah',
  lastBackupFileName = null,
  lastBackupSizeFormatted = null,
  customStoragePricePerGb = 1250, setCustomStoragePricePerGb,
  workerStorageWarningThresholdGb = 10, setWorkerStorageWarningThresholdGb,
  gracePeriodDays = 7, setGracePeriodDays,
  sysEnableAutoPurge = true, setSysEnableAutoPurge,
  lastHardPurgeFormatted = 'Belum pernah', setLastHardPurgeFormatted,
  fetchSystemSettings,
  savingProfile,
  profileSuccessMsg,
  setProfileSuccessMsg,
  profileErrorMsg,
  handleSaveProfile
}) {
  const [activeSubTab, setActiveSubTab] = useState('identity'); // 'identity' | 'integrations' | 'payments' | 'system'
  const [isEditingIdentity, setIsEditingIdentity] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isEditingGoogleCredentials, setIsEditingGoogleCredentials] = useState(false);
  const [isEditingPaymentGateway, setIsEditingPaymentGateway] = useState(false);
  const [isEditingSmtp, setIsEditingSmtp] = useState(false);
  const [isEditingBankDetails, setIsEditingBankDetails] = useState(false);
  const [isEditingSystem, setIsEditingSystem] = useState(false);
  const [savingSection, setSavingSection] = useState(''); // 'identity' | 'google' | 'smtp' | 'bank' | 'gateway' | 'system' | 'password'

  const [savedIdentityState, setSavedIdentityState] = useState({
    saasName,
    saasDomain,
    saasTagline,
    saasDescription,
    contactEmail,
    contactWhatsapp,
    operationalHours,
    companyAddress
  });

  const identityStateInitialized = React.useRef(false);
  React.useEffect(() => {
    if (!identityStateInitialized.current && (saasName || saasDomain || contactEmail)) {
      setSavedIdentityState({
        saasName,
        saasDomain,
        saasTagline,
        saasDescription,
        contactEmail,
        contactWhatsapp,
        operationalHours,
        companyAddress
      });
      identityStateInitialized.current = true;
    }
  }, [saasName, saasDomain, saasTagline, saasDescription, contactEmail, contactWhatsapp, operationalHours, companyAddress]);

  const handleCancelIdentity = () => {
    setSaasName(savedIdentityState.saasName);
    setSaasDomain(savedIdentityState.saasDomain);
    setSaasTagline(savedIdentityState.saasTagline);
    setSaasDescription(savedIdentityState.saasDescription);
    setContactEmail(savedIdentityState.contactEmail);
    setContactWhatsapp(savedIdentityState.contactWhatsapp);
    setOperationalHours(savedIdentityState.operationalHours);
    setCompanyAddress(savedIdentityState.companyAddress);
    setIsEditingIdentity(false);
  };

  const [savedSystemState, setSavedSystemState] = useState({
    sysEnableReg,
    sysEnableTrial,
    sysMaxQuota,
    sysTrialExpirationMinutes,
    trialMaxPhotos,
    trialMaxSelection,
    trialPreviewPhotos,
    customStoragePricePerGb,
    workerStorageWarningThresholdGb,
    gracePeriodDays
  });

  const systemStateInitialized = React.useRef(false);
  React.useEffect(() => {
    if (!systemStateInitialized.current && (sysEnableReg !== undefined || sysMaxQuota !== undefined)) {
      setSavedSystemState({
        sysEnableReg,
        sysEnableTrial,
        sysMaxQuota,
        sysTrialExpirationMinutes,
        trialMaxPhotos,
        trialMaxSelection,
        trialPreviewPhotos,
        customStoragePricePerGb,
        workerStorageWarningThresholdGb,
        gracePeriodDays
      });
      systemStateInitialized.current = true;
    }
  }, [sysEnableReg, sysMaxQuota, customStoragePricePerGb, workerStorageWarningThresholdGb, gracePeriodDays]);

  const isSystemDirty = 
    Boolean(sysEnableReg) !== Boolean(savedSystemState.sysEnableReg) ||
    (sysMaxQuota ?? null) !== (savedSystemState.sysMaxQuota ?? null) ||
    Number(customStoragePricePerGb || 1250) !== Number(savedSystemState.customStoragePricePerGb || 1250) ||
    Number(workerStorageWarningThresholdGb || 10) !== Number(savedSystemState.workerStorageWarningThresholdGb || 10) ||
    Number(gracePeriodDays || 7) !== Number(savedSystemState.gracePeriodDays || 7);

  const handleCancelSystem = () => {
    setSysEnableReg(savedSystemState.sysEnableReg);
    setSysMaxQuota(savedSystemState.sysMaxQuota);
    setCustomStoragePricePerGb(savedSystemState.customStoragePricePerGb);
    setWorkerStorageWarningThresholdGb(savedSystemState.workerStorageWarningThresholdGb);
    setGracePeriodDays(savedSystemState.gracePeriodDays);
    setIsEditingSystem(false);
  };

  const handleSaveIdentity = async () => {
    setSavingSection('identity');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saasSettings: {
            saas_name: saasName || 'Pick Your Photo',
            saas_domain: saasDomain,
            saas_tagline: saasTagline || '',
            saas_description: saasDescription || '',
            contact_email: contactEmail,
            saas_support_email: contactEmail,
            contact_whatsapp: contactWhatsapp,
            company_address: companyAddress,
            operational_hours: operationalHours
          }
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (addToast) addToast('Identitas platform & kontak resmi berhasil disimpan!', 'success');
        setSavedIdentityState({
          saasName,
          saasDomain,
          saasTagline,
          saasDescription,
          contactEmail,
          contactWhatsapp,
          operationalHours,
          companyAddress
        });
        setIsEditingIdentity(false);
        if (fetchSystemSettings) fetchSystemSettings();
      } else {
        if (addToast) addToast(data.message || 'Gagal menyimpan identitas platform.', 'error');
      }
    } catch (err) {
      if (addToast) addToast(err.message, 'error');
    } finally {
      setSavingSection('');
    }
  };

  const handleUploadLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      if (addToast) addToast('Ukuran berkas logo terlalu besar. Maksimal 5MB.', 'error');
      return;
    }

    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('logoFile', file);

    try {
      const res = await fetch('/api/admin/upload-logo', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (setSaasLogoUrl) setSaasLogoUrl(data.logoUrl);
        if (addToast) addToast('✅ ' + data.message, 'success');
        if (fetchSystemSettings) fetchSystemSettings();
      } else {
        if (addToast) addToast('❌ ' + (data.message || 'Gagal mengunggah logo.'), 'error');
      }
    } catch (err) {
      if (addToast) addToast('❌ ' + err.message, 'error');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleResetLogo = async () => {
    if (!confirm('Kembalikan logo dan favicon platform ke default?')) return;
    setUploadingLogo(true);
    try {
      const res = await fetch('/api/admin/upload-logo', { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        if (setSaasLogoUrl) setSaasLogoUrl('/logo.png');
        if (addToast) addToast('✅ Logo berhasil di-reset ke default.', 'info');
        if (fetchSystemSettings) fetchSystemSettings();
      }
    } catch (err) {
      if (addToast) addToast('❌ ' + err.message, 'error');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveGoogle = async () => {
    setSavingSection('google');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saasSettings: {
            google_client_id: googleClientId,
            google_client_secret: googleClientSecret,
            max_upload_concurrency_threads: String(maxUploadConcurrencyThreads || 4)
          }
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (addToast) addToast('Kredensial Google OAuth 2.0 berhasil disimpan!', 'success');
        setIsEditingGoogleCredentials(false);
      } else {
        if (addToast) addToast(data.message || 'Gagal menyimpan kredensial Google.', 'error');
      }
    } catch (err) {
      if (addToast) addToast(err.message, 'error');
    } finally {
      setSavingSection('');
    }
  };

  const handleSaveSmtp = async () => {
    setSavingSection('smtp');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saasSettings: {
            smtp_enable: smtpEnable ? '1' : '0',
            smtp_host: smtpHost,
            smtp_port: smtpPort ? String(smtpPort) : '465',
            smtp_email: smtpEmail,
            smtp_password: smtpPassword,
            smtp_from_name: smtpFromName
          }
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (addToast) addToast('Kredensial Server Email SMTP berhasil disimpan!', 'success');
        setIsEditingSmtp(false);
      } else {
        if (addToast) addToast(data.message || 'Gagal menyimpan pengaturan SMTP.', 'error');
      }
    } catch (err) {
      if (addToast) addToast(err.message, 'error');
    } finally {
      setSavingSection('');
    }
  };

  const handleSaveBank = async () => {
    setSavingSection('bank');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saasSettings: {
            bank_name: bankName,
            bank_account_number: bankAccountNumber,
            bank_account_name: bankAccountName
          }
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (addToast) addToast('Tujuan Rekening Bank Manual berhasil disimpan!', 'success');
        setIsEditingBankDetails(false);
      } else {
        if (addToast) addToast(data.message || 'Gagal menyimpan rekening bank.', 'error');
      }
    } catch (err) {
      if (addToast) addToast(err.message, 'error');
    } finally {
      setSavingSection('');
    }
  };

  const handleSaveGateway = async () => {
    setSavingSection('gateway');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saasSettings: {
            enable_payment_gateway: enablePaymentGateway ? '1' : '0',
            payment_gateway_provider: paymentGatewayProvider,
            payment_gateway_client_key: paymentGatewayClientKey,
            payment_gateway_server_key: paymentGatewayServerKey,
            qris_expiration_minutes: String(qrisExpirationMinutes || 15)
          }
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (addToast) addToast('Konfigurasi Payment Gateway & QRIS berhasil disimpan!', 'success');
        setIsEditingPaymentGateway(false);
      } else {
        if (addToast) addToast(data.message || 'Gagal menyimpan konfigurasi payment gateway.', 'error');
      }
    } catch (err) {
      if (addToast) addToast(err.message, 'error');
    } finally {
      setSavingSection('');
    }
  };

  const handleSaveSystem = async () => {
    if (!isSystemDirty) return;
    setSavingSection('system');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enable_registration: sysEnableReg,
          max_vendor_quota: sysMaxQuota,
          saasSettings: {
            custom_storage_price_per_gb: String(customStoragePricePerGb || 1250),
            worker_storage_warning_threshold_gb: String(workerStorageWarningThresholdGb || 10),
            grace_period_days: String(gracePeriodDays || 7)
          }
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (addToast) addToast('Pengaturan Akses Sistem & Kuota Storage berhasil disimpan!', 'success');
        setSavedSystemState({
          sysEnableReg,
          sysMaxQuota,
          customStoragePricePerGb,
          workerStorageWarningThresholdGb,
          gracePeriodDays
        });
        setIsEditingSystem(false);
      } else {
        if (addToast) addToast(data.message || 'Gagal menyimpan pengaturan sistem.', 'error');
      }
    } catch (err) {
      if (addToast) addToast(err.message, 'error');
    } finally {
      setSavingSection('');
    }
  };

  const handleSavePasswordOnly = async (e) => {
    if (e) e.preventDefault();
    if (!newPassword || newPassword.trim() === '') {
      if (addToast) addToast('Harap masukkan password baru!', 'error');
      return;
    }
    if (newPassword.length < 6) {
      if (addToast) addToast('Password baru minimal 6 karakter!', 'error');
      return;
    }
    setSavingSection('password');
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        if (addToast) addToast('Password Master Superadmin BERHASIL diperbarui!', 'success');
        setNewPassword('');
      } else {
        if (addToast) addToast(data.message || 'Gagal mengubah password superadmin.', 'error');
      }
    } catch (err) {
      if (addToast) addToast(err.message, 'error');
    } finally {
      setSavingSection('');
    }
  };

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
      let data = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        throw new Error(`Server mengembalikan respon (${res.status}): Harap periksa sesi login admin.`);
      }

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

      let data = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        if (res.status === 413) {
          throw new Error('Ukuran file .db terlalu besar untuk Nginx (413 Payload Too Large). Tambahkan "client_max_body_size 100M;" di Nginx VPS.');
        }
        if (res.status === 401 || res.status === 403) {
          throw new Error('Sesi login admin telah berakhir. Silakan refresh halaman dan login kembali.');
        }
        throw new Error(`Server mengembalikan respon (${res.status}): Harap periksa koneksi atau izin file di server.`);
      }

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
      let data = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        throw new Error(`Server mengembalikan respon (${res.status}): Harap periksa sesi login admin.`);
      }

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

  // Hard Purge State & Handlers
  const [purgingExpired, setPurgingExpired] = useState(false);
  const [purgeConfirmModal, setPurgeConfirmModal] = useState(false);

  // Reset Data Uji Coba State & Handlers
  const [cleanDataModal, setCleanDataModal] = useState(null); // { type: 'financial' | 'vendors', title: string, desc: string }
  const [cleanDataPassword, setCleanDataPassword] = useState('');
  const [cleanDataConfirmText, setCleanDataConfirmText] = useState('');
  const [isCleaningData, setIsCleaningData] = useState(false);

  const handleExecuteCleanData = async () => {
    if (cleanDataConfirmText.trim().toUpperCase() !== 'BERSIHKAN') {
      if (addToast) addToast('Ketik kata BERSIHKAN dengan tepat untuk melanjutkan.', 'warning');
      return;
    }
    if (!cleanDataPassword) {
      if (addToast) addToast('Password Superadmin wajib diisi untuk konfirmasi keamanan.', 'warning');
      return;
    }

    setIsCleaningData(true);
    try {
      const res = await fetch('/api/admin/reset-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: cleanDataModal.type,
          adminPassword: cleanDataPassword
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal membersihkan data.');

      if (addToast) addToast(`✅ ${data.message}`, 'success', 6000);
      setCleanDataModal(null);
      setCleanDataPassword('');
      setCleanDataConfirmText('');

      // Auto reload system settings/backups
      if (fetchSystemSettings) fetchSystemSettings();
      fetchBackupsList();
    } catch (err) {
      if (addToast) addToast(`❌ ${err.message}`, 'error', 5000);
    } finally {
      setIsCleaningData(false);
    }
  };

  const handleRunHardPurge = async () => {
    setPurgingExpired(true);
    try {
      const res = await fetch('/api/cron/purge-expired', {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (addToast) addToast(data.message || 'Hard purge berhasil dijalankan.', 'success');
        if (data.purgedVendorsCount > 0) {
          if (addToast) addToast(`${data.purgedVendorsCount} vendor di-suspend & ${data.totalFilesDeletedFromDrive} berkas dihapus dari Google Drive.`, 'info');
        }
        if (setLastHardPurgeFormatted) {
          const now = new Date();
          const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
          const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          setLastHardPurgeFormatted(`${dateStr}, ${timeStr} WIB`);
        }
        if (fetchSystemSettings) fetchSystemSettings();
      } else {
        if (addToast) addToast(data.error || data.message || 'Gagal mengeksekusi hard purge.', 'error');
      }
    } catch (err) {
      if (addToast) addToast(err.message || 'Terjadi kesalahan saat memproses hard purge.', 'error');
    } finally {
      setPurgingExpired(false);
      setPurgeConfirmModal(false);
    }
  };

  const handleToggleAutoPurge = async (nextVal) => {
    setSysEnableAutoPurge(nextVal);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable_auto_purge: nextVal })
      });
      if (res.ok) {
        if (addToast) addToast(nextVal ? 'Auto-Purge otomatis (tiap 24 jam) diaktifkan.' : 'Auto-Purge otomatis dinonaktifkan.', 'info');
      }
    } catch (err) {
      console.error('Failed to update auto purge setting:', err);
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
      <div className={styles.subTabsGrid}>
        <button
          type="button"
          onClick={() => setActiveSubTab('identity')}
          className={`${styles.subTabBtn} ${activeSubTab === 'identity' ? styles.subTabBtnActiveIdentity : styles.subTabBtnInactive}`}
        >
          <FolderIcon size={13} color={activeSubTab === 'identity' ? '#38bdf8' : '#94a3b8'} />
          <span>Identitas &amp; Kontak</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('integrations')}
          className={`${styles.subTabBtn} ${activeSubTab === 'integrations' ? styles.subTabBtnActiveIntegrations : styles.subTabBtnInactive}`}
        >
          <GoogleDriveIcon size={13} color={activeSubTab === 'integrations' ? '#818cf8' : '#94a3b8'} />
          <span>Google &amp; Mailer</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('payments')}
          className={`${styles.subTabBtn} ${activeSubTab === 'payments' ? styles.subTabBtnActivePayments : styles.subTabBtnInactive}`}
        >
          <MoneyIcon size={13} color={activeSubTab === 'payments' ? '#10b981' : '#94a3b8'} />
          <span>Payment Gateway</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('system')}
          className={`${styles.subTabBtn} ${activeSubTab === 'system' ? styles.subTabBtnActiveSystem : styles.subTabBtnInactive}`}
        >
          <SettingsIcon size={13} color={activeSubTab === 'system' ? '#f59e0b' : '#94a3b8'} />
          <span>Sistem &amp; Keamanan</span>
        </button>
      </div>

      <div>
        {/* ════════════════════════════════════════════════════════════════ */}
        {/* SUB-TAB 0: IDENTITAS PLATFORM & KONTAK RESMI                     */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'identity' && (
          <div className="fade-in">
            {/* Header Box */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '24px', marginBottom: '24px' }}>
              <div style={{ marginBottom: '18px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '14px' }}>
                <h4 style={{ margin: 0, fontSize: '16px', color: '#38bdf8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🏢 Identitas Brand &amp; Saluran Kontak Resmi Platform
                </h4>
                <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#94a3b8' }}>
                  Informasi ini ditampilkan secara dinamis di halaman publik <strong>/contact</strong>, <strong>/about</strong>, footer sistem, dan syarat &amp; ketentuan aplikasi.
                </p>
              </div>

              {!isEditingIdentity ? (
                /* ── MODE 1: READ-ONLY SUMMARY CARDS (CLEAN TEXT DISPLAY) ── */
                <div>
                  {/* Hero Brand Identity Card */}
                  <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '12px', padding: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '6px',
                        overflow: 'hidden'
                      }}>
                        <img
                          src={saasLogoUrl || '/logo.png'}
                          alt="Logo Platform"
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                          onError={(e) => { e.target.src = '/logo.png'; }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '2px' }}>
                          BRAND UTAMA PLATFORM
                        </div>
                        <h3 style={{ margin: 0, fontSize: '20px', color: '#ffffff', fontWeight: '800' }}>
                          {saasName || 'Pick Your Photo'}
                        </h3>
                        <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                          {saasDomain ? saasDomain : 'Domain belum diatur'}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '4px 12px', borderRadius: '20px', fontWeight: '700' }}>
                      Identitas Resmi Aktif
                    </span>
                  </div>

                  {/* Key-Value Summary Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ color: '#94a3b8', display: 'block', fontSize: '11.5px', marginBottom: '4px' }}>✉️ Email Resmi Dukungan (CS):</span>
                      <strong style={{ color: '#f4f4f5', fontSize: '13.5px', wordBreak: 'break-all' }}>
                        {contactEmail || <span style={{ color: '#71717a', fontStyle: 'italic' }}>Belum diatur</span>}
                      </strong>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ color: '#94a3b8', display: 'block', fontSize: '11.5px', marginBottom: '4px' }}>📱 WhatsApp Resmi CS:</span>
                      <strong style={{ color: '#34d399', fontSize: '13.5px' }}>
                        {contactWhatsapp || <span style={{ color: '#71717a', fontStyle: 'italic' }}>Belum diatur</span>}
                      </strong>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ color: '#94a3b8', display: 'block', fontSize: '11.5px', marginBottom: '4px' }}>⏰ Jam Operasional Respon:</span>
                      <strong style={{ color: '#f4f4f5', fontSize: '13.5px' }}>
                        {operationalHours || <span style={{ color: '#71717a', fontStyle: 'italic' }}>Belum diatur</span>}
                      </strong>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)', gridColumn: '1 / -1' }}>
                      <span style={{ color: '#94a3b8', display: 'block', fontSize: '11.5px', marginBottom: '4px' }}>✨ Slogan Singkat Platform (Tagline):</span>
                      <strong style={{ color: '#fbbf24', fontSize: '13.5px' }}>
                        {saasTagline || <span style={{ color: '#71717a', fontStyle: 'italic' }}>Belum diatur</span>}
                      </strong>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)', gridColumn: '1 / -1' }}>
                      <span style={{ color: '#94a3b8', display: 'block', fontSize: '11.5px', marginBottom: '4px' }}>🔗 Deskripsi Pratinjau Share Link (WhatsApp &amp; Medsos Open Graph):</span>
                      <p style={{ color: '#e4e4e7', fontSize: '13px', margin: 0, lineHeight: '1.5' }}>
                        {saasDescription || <span style={{ color: '#71717a', fontStyle: 'italic' }}>Belum diatur (menggunakan ringkasan default platform)</span>}
                      </p>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)', gridColumn: '1 / -1' }}>
                      <span style={{ color: '#94a3b8', display: 'block', fontSize: '11.5px', marginBottom: '4px' }}>📍 Alamat Kantor / Domisili Legal Perusahaan:</span>
                      <strong style={{ color: '#f4f4f5', fontSize: '13.5px' }}>
                        {companyAddress || <span style={{ color: '#71717a', fontStyle: 'italic' }}>Belum diatur</span>}
                      </strong>
                    </div>
                  </div>

                  {/* Bottom Action Bar */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <button
                      type="button"
                      onClick={() => setIsEditingIdentity(true)}
                      style={{
                        background: 'rgba(56, 189, 248, 0.15)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        color: '#38bdf8',
                        padding: '9px 20px',
                        borderRadius: '8px',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(56, 189, 248, 0.25)'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)'; e.currentTarget.style.color = '#38bdf8'; }}
                    >
                      <span>✏️</span>
                      <span>Edit Identitas &amp; Logo</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* ── MODE 2: ACTIVE EDITABLE FORM MODE ── */
                <div>
                  {/* Logo & Favicon Management Card (With Upload & Reset Buttons) */}
                  <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {/* Live Preview Box */}
                        <div style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '12px',
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '6px',
                          overflow: 'hidden'
                        }}>
                          <img
                            src={saasLogoUrl || '/logo.png'}
                            alt="Logo Platform"
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                            onError={(e) => { e.target.src = '/logo.png'; }}
                          />
                        </div>
                        <div>
                          <h5 style={{ margin: '0 0 4px', fontSize: '14px', color: '#ffffff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            🖼️ Logo &amp; Favicon Platform
                          </h5>
                          <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>
                            Logo ini digunakan sebagai favicon tab browser dan identitas utama pada seluruh halaman publik.
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <label
                          style={{
                            background: 'linear-gradient(135deg, #38bdf8, #0284c7)',
                            color: '#000000',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: uploadingLogo ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 12px rgba(56, 189, 248, 0.25)'
                          }}
                        >
                          {uploadingLogo ? '⏳ Mengunggah...' : '📤 Unggah Logo Baru'}
                          <input
                            type="file"
                            accept=".png,.jpg,.jpeg,.svg,.ico,.webp"
                            onChange={handleUploadLogo}
                            disabled={uploadingLogo}
                            style={{ display: 'none' }}
                          />
                        </label>

                        {saasLogoUrl && saasLogoUrl !== '/logo.png' && (
                          <button
                            type="button"
                            onClick={handleResetLogo}
                            disabled={uploadingLogo}
                            style={{
                              background: 'rgba(244,63,94,0.15)',
                              border: '1px solid rgba(244,63,94,0.3)',
                              color: '#fb7185',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            🗑️ Reset Default
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Form Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>🏷️ Nama Layanan / Brand Aplikasi</label>
                      <input
                        type="text"
                        className="input-text"
                        placeholder="Contoh: Pick Your Photo / Photota"
                        value={saasName}
                        onChange={e => setSaasName(e.target.value)}
                        disabled={savingSection === 'identity'}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>🌐 Nama Domain / URL Resmi Platform</label>
                      <input
                        type="text"
                        className="input-text"
                        placeholder="Contoh: photota.my.id atau https://photota.my.id"
                        value={saasDomain}
                        onChange={e => setSaasDomain(e.target.value)}
                        disabled={savingSection === 'identity'}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>✉️ Email Resmi Dukungan Pelanggan (CS)</label>
                      <input
                        type="email"
                        className="input-text"
                        placeholder="Contoh: support@photota.my.id"
                        value={contactEmail}
                        onChange={e => setContactEmail(e.target.value)}
                        disabled={savingSection === 'identity'}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>📱 Nomor WhatsApp Resmi Helpdesk / CS</label>
                      <input
                        type="text"
                        className="input-text"
                        placeholder="Contoh: 081234567890 (Mendukung link WA otomatis)"
                        value={contactWhatsapp}
                        onChange={e => setContactWhatsapp(e.target.value)}
                        disabled={savingSection === 'identity'}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>⏰ Jam Operasional Layanan Respon</label>
                      <input
                        type="text"
                        className="input-text"
                        placeholder="Contoh: Senin – Sabtu: 08:00 – 17:00 WIB"
                        value={operationalHours}
                        onChange={e => setOperationalHours(e.target.value)}
                        disabled={savingSection === 'identity'}
                      />
                    </div>

                    <div className="form-group" style={{ gridColumn: '1 / -1', margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>✨ Slogan Singkat Platform (Tagline)</label>
                      <input
                        type="text"
                        className="input-text"
                        placeholder="Contoh: Meja Kerja Seleksi Foto Cepat untuk Studio & Fotografer Profesional"
                        value={saasTagline}
                        onChange={e => setSaasTagline(e.target.value)}
                        disabled={savingSection === 'identity'}
                      />
                    </div>

                    <div className="form-group" style={{ gridColumn: '1 / -1', margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>🔗 Deskripsi Pratinjau Share Link (WhatsApp &amp; Medsos Open Graph)</label>
                      <textarea
                        className="input-text"
                        rows="2"
                        placeholder="Contoh: Platform meja kerja seleksi foto interaktif yang cepat dan elegan untuk klien Anda."
                        value={saasDescription}
                        onChange={e => setSaasDescription(e.target.value)}
                        disabled={savingSection === 'identity'}
                        style={{ resize: 'vertical' }}
                      />
                      <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0 0' }}>
                        Deskripsi ini akan muncul di kartu pratinjau saat link platform atau uji coba dibagikan ke WhatsApp, Telegram, atau media sosial.
                      </p>
                    </div>

                    <div className="form-group" style={{ gridColumn: '1 / -1', margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>📍 Alamat Kantor / Domisili Legal Perusahaan</label>
                      <input
                        type="text"
                        className="input-text"
                        placeholder="Contoh: Jakarta, Indonesia / Makassar, Sulawesi Selatan"
                        value={companyAddress}
                        onChange={e => setCompanyAddress(e.target.value)}
                        disabled={savingSection === 'identity'}
                      />
                    </div>
                  </div>

                  {/* Form Action Bar at Bottom */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <button
                      type="button"
                      onClick={handleCancelIdentity}
                      disabled={savingSection === 'identity'}
                      style={{
                        padding: '9px 18px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        color: '#a1a1aa',
                        fontSize: '12.5px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveIdentity}
                      disabled={savingSection === 'identity'}
                      style={{
                        padding: '9px 22px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {savingSection === 'identity' ? '⏳ Menyimpan...' : '💾 Simpan Perubahan'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '12px', marginBottom: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                      <span style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Max Parallel Worker Threads:</span>
                      <strong style={{ color: '#818cf8' }}>{maxUploadConcurrencyThreads || 4} Thread Simultan</strong>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Status Sinkronisasi:</span>
                      <strong style={{ color: '#34d399' }}>Terkoneksi Google Cloud API</strong>
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
                      ✏️ Edit Kredensial Google
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
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>Maksimal Thread Worker Upload Serentak (Parallel Concurrency):</label>
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
                        Thread paralel simultan (Default: <strong>4</strong>). Maksimal dibatasi hingga jumlah Akun Worker aktif.
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    {googleClientId && googleClientSecret && (
                      <button 
                        type="button" 
                        onClick={() => setIsEditingGoogleCredentials(false)} 
                        className="btn-secondary" 
                        style={{ padding: '8px 16px', fontSize: '12px' }}
                      >
                        Batal
                      </button>
                    )}
                    <button 
                      type="button" 
                      disabled={savingSection === 'google'} 
                      onClick={handleSaveGoogle}
                      style={{ 
                        background: 'linear-gradient(135deg, #10b981, #059669)', 
                        color: '#ffffff', 
                        border: 'none', 
                        padding: '8px 20px', 
                        borderRadius: '8px', 
                        fontSize: '12px', 
                        fontWeight: 'bold', 
                        cursor: 'pointer',
                        boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      {savingSection === 'google' ? '⏳ Menyimpan...' : '💾 Simpan Kredensial Google'}
                    </button>
                  </div>
                </div>
              )}
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

            {(!smtpEnable || !smtpEmail || !smtpPassword) && !isEditingSmtp && (
              <div style={{ background: 'rgba(251, 191, 36, 0.12)', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>⚠️</span>
                <div>
                  <strong>Server SMTP Email Belum Dikonfigurasi!</strong>
                  <div style={{ fontSize: '11px', color: '#d4d4d8', marginTop: '2px' }}>
                    Email notifikasi persetujuan vendor dan peringatan tenggang storage akan ditangguhkan sampai SMTP dikonfigurasi.
                  </div>
                </div>
              </div>
            )}

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
              {!isEditingSmtp && smtpEmail && smtpPassword ? (
                <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '18px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '12px', marginBottom: '16px' }}>
                    <div>
                      <span style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Email Pengirim (Sender):</span>
                      <strong style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{smtpEmail}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Server Host & Port:</span>
                      <strong style={{ color: '#ffffff' }}>{smtpHost}:{smtpPort} (SSL)</strong>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '12px', marginBottom: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                      <span style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Nama Pengirim (From Name):</span>
                      <strong style={{ color: '#ffffff' }}>{smtpFromName || 'Pick Your Photo'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>App Password Gmail:</span>
                      <strong style={{ color: '#34d399', letterSpacing: '2px' }}>••••••••••••••••</strong>
                    </div>
                  </div>

                  <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      disabled={testEmailStatus.loading || !smtpEmail || !smtpPassword}
                      onClick={async () => {
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

                    <button 
                      type="button" 
                      onClick={() => setIsEditingSmtp(true)} 
                      className="btn-secondary" 
                      style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '8px' }}
                    >
                      ✏️ Edit Kredensial SMTP
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>SMTP Host</label>
                      <input type="text" className="input-text" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>SMTP Port</label>
                      <input type="number" className="input-text" value={smtpPort} onChange={e => setSmtpPort(parseInt(e.target.value) || 465)} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>Email Pengirim (Sender Email)</label>
                      <input type="email" className="input-text" value={smtpEmail} onChange={e => setSmtpEmail(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>Password / App Password</label>
                      <input type="password" className="input-text" value={smtpPassword} onChange={e => setSmtpPassword(e.target.value)} />
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>Nama Pengirim Email (Sender Name)</label>
                    <input type="text" className="input-text" value={smtpFromName} onChange={e => setSmtpFromName(e.target.value)} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', marginTop: '10px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <button
                      type="button"
                      disabled={testEmailStatus.loading || !smtpEmail || !smtpPassword}
                      onClick={async () => {
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

                    {smtpEmail && smtpPassword && (
                      <button 
                        type="button" 
                        onClick={() => setIsEditingSmtp(false)} 
                        className="btn-secondary" 
                        style={{ padding: '8px 16px', fontSize: '12px' }}
                      >
                        Batal
                      </button>
                    )}

                    <button 
                      type="button" 
                      disabled={savingSection === 'smtp'} 
                      onClick={handleSaveSmtp}
                      style={{ 
                        background: 'linear-gradient(135deg, #10b981, #059669)', 
                        color: '#ffffff', 
                        border: 'none', 
                        padding: '8px 20px', 
                        borderRadius: '8px', 
                        fontSize: '12px', 
                        fontWeight: 'bold', 
                        cursor: 'pointer',
                        boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      {savingSection === 'smtp' ? '⏳ Menyimpan...' : '💾 Simpan Pengaturan SMTP'}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* SUB-TAB 2: PAYMENT GATEWAY & QRIS                                */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'payments' && (
          <div className="fade-in-up">
            
            {/* REKENING MANUAL */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '15px', color: '#818cf8', fontWeight: 'bold' }}>
                🏦 Tujuan Rekening Transfer Manual Vendor
              </h4>
              <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '12px', background: (bankName && bankAccountNumber) ? 'rgba(52,211,153,0.15)' : 'rgba(251,191,36,0.15)', color: (bankName && bankAccountNumber) ? '#34d399' : '#fbbf24', border: (bankName && bankAccountNumber) ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(251,191,36,0.3)' }}>
                {(bankName && bankAccountNumber) ? '🟢 REKENING AKTIF' : '⚠️ BELUM DIISI'}
              </span>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px', marginBottom: '28px' }}>
              {!isEditingBankDetails && bankName && bankAccountNumber ? (
                <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '18px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '12px', marginBottom: '14px' }}>
                    <div>
                      <span style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Nama Bank:</span>
                      <strong style={{ color: '#ffffff' }}>{bankName}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Nomor Rekening:</span>
                      <strong style={{ color: '#38bdf8', fontFamily: 'monospace', fontSize: '14px' }}>{bankAccountNumber}</strong>
                    </div>
                  </div>

                  <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <span style={{ color: '#94a3b8', fontSize: '11px', display: 'block' }}>Atas Nama Rekening:</span>
                      <strong style={{ color: '#ffffff', fontSize: '13px' }}>{bankAccountName || 'PT Pick Your Photo'}</strong>
                    </div>

                    <button 
                      type="button" 
                      onClick={() => setIsEditingBankDetails(true)} 
                      className="btn-secondary" 
                      style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '8px' }}
                    >
                      ✏️ Ubah Rekening Bank
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>Nama Bank</label>
                      <input type="text" className="input-text" placeholder="Contoh: BCA (Bank Central Asia)" value={bankName} onChange={e => setBankName(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>Nomor Rekening</label>
                      <input type="text" className="input-text" placeholder="Contoh: 1234567890" value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>Atas Nama Rekening</label>
                    <input type="text" className="input-text" placeholder="Contoh: PT Pick Your Photo" value={bankAccountName} onChange={e => setBankAccountName(e.target.value)} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    {bankName && bankAccountNumber && (
                      <button 
                        type="button" 
                        onClick={() => setIsEditingBankDetails(false)} 
                        className="btn-secondary" 
                        style={{ padding: '8px 16px', fontSize: '12px' }}
                      >
                        Batal
                      </button>
                    )}
                    <button 
                      type="button" 
                      disabled={savingSection === 'bank'} 
                      onClick={handleSaveBank}
                      style={{ 
                        background: 'linear-gradient(135deg, #10b981, #059669)', 
                        color: '#ffffff', 
                        border: 'none', 
                        padding: '8px 20px', 
                        borderRadius: '8px', 
                        fontSize: '12px', 
                        fontWeight: 'bold', 
                        cursor: 'pointer',
                        boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      {savingSection === 'bank' ? '⏳ Menyimpan...' : '💾 Simpan Rekening Bank'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* AUTOMATIC PAYMENT GATEWAY MODULE */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '15px', color: '#818cf8', fontWeight: 'bold' }}>
                💳 Automatic Payment Gateway (Midtrans, Xendit, Tripay, Duitku, IPaymu)
              </h4>
              <span style={{ fontSize: '11px', background: enablePaymentGateway ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: enablePaymentGateway ? '#34d399' : '#f87171', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
                {enablePaymentGateway ? '🟢 GATEWAY AKTIF' : '🔴 NONAKTIF'}
              </span>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
              {!isEditingPaymentGateway && enablePaymentGateway && paymentGatewayClientKey && paymentGatewayServerKey ? (
                <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '18px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '12px', marginBottom: '16px' }}>
                    <div>
                      <span style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Provider Aktif:</span>
                      <strong style={{ color: '#38bdf8', textTransform: 'uppercase' }}>{paymentGatewayProvider}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Batas Expired QRIS:</span>
                      <strong style={{ color: '#fbbf24' }}>{qrisExpirationMinutes || 15} Menit</strong>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '12px', marginBottom: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                      <span style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Client / Public Key:</span>
                      <strong style={{ color: '#ffffff', fontFamily: 'monospace' }}>{paymentGatewayClientKey.substring(0, 16)}...</strong>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Server / Secret Key:</span>
                      <strong style={{ color: '#34d399', letterSpacing: '2px' }}>••••••••••••••••</strong>
                    </div>
                  </div>

                  {/* WEBHOOK URL INFO */}
                  <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '10px 14px', borderRadius: '8px', fontSize: '11px', marginBottom: '16px' }}>
                    <div style={{ color: '#818cf8', fontWeight: 'bold', marginBottom: '4px' }}>🔗 URL Notification / Webhook Callback:</div>
                    <code style={{ background: 'rgba(0,0,0,0.4)', padding: '4px 8px', borderRadius: '4px', color: '#34d399', wordBreak: 'break-all', display: 'block' }}>
                      {typeof window !== 'undefined' ? `${window.location.origin}/api/payment/notification` : '/api/payment/notification'}
                    </code>
                  </div>

                  <div style={{ paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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

                    <button 
                      type="button" 
                      onClick={() => setIsEditingPaymentGateway(true)} 
                      className="btn-secondary" 
                      style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '8px' }}
                    >
                      ✏️ Edit Kredensial Gateway
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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

                  <div className="form-group" style={{ margin: 0 }}>
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
                  <div className="form-group" style={{ background: 'rgba(251, 191, 36, 0.05)', border: '1px solid rgba(251, 191, 36, 0.2)', padding: '14px', borderRadius: '10px', margin: 0 }}>
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
                        Menit (Default: <strong>15 Menit</strong>). Mengatur batas hitung mundur expired QRIS Gateway.
                      </span>
                    </div>
                  </div>

                  {/* WEBHOOK URL INFO */}
                  <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '12px 14px', borderRadius: '8px', fontSize: '12px' }}>
                    <div style={{ color: '#818cf8', fontWeight: 'bold', marginBottom: '4px' }}>🔗 URL Notification / Webhook Callback:</div>
                    <code style={{ background: 'rgba(0,0,0,0.4)', padding: '4px 8px', borderRadius: '4px', color: '#34d399', wordBreak: 'break-all', display: 'block' }}>
                      {typeof window !== 'undefined' ? `${window.location.origin}/api/payment/notification` : '/api/payment/notification'}
                    </code>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', marginTop: '10px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
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
                      {paymentTestStatus.loading ? '⏳ Memeriksa...' : '🔍 Tes Gateway'}
                    </button>

                    {enablePaymentGateway && paymentGatewayClientKey && paymentGatewayServerKey && (
                      <button 
                        type="button" 
                        onClick={() => setIsEditingPaymentGateway(false)} 
                        className="btn-secondary" 
                        style={{ padding: '8px 16px', fontSize: '12px' }}
                      >
                        Batal
                      </button>
                    )}

                    <button 
                      type="button" 
                      disabled={savingSection === 'gateway'} 
                      onClick={handleSaveGateway}
                      style={{ 
                        background: 'linear-gradient(135deg, #10b981, #059669)', 
                        color: '#ffffff', 
                        border: 'none', 
                        padding: '8px 20px', 
                        borderRadius: '8px', 
                        fontSize: '12px', 
                        fontWeight: 'bold', 
                        cursor: 'pointer',
                        boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      {savingSection === 'gateway' ? '⏳ Menyimpan...' : '💾 Simpan Konfigurasi Gateway'}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* SUB-TAB 3: SISTEM & KEAMANAN SUPERADMIN                          */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'system' && (
          <div className="fade-in-up">
            
            {/* OPERATIONAL REGISTRATION CONTROL */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '15px', color: '#818cf8', fontWeight: 'bold' }}>
                ⚙️ Kontrol Akses & Registration System
              </h4>
              <span style={{ fontSize: '11px', background: sysEnableReg ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: sysEnableReg ? '#34d399' : '#f87171', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
                {sysEnableReg ? '🟢 REGISTRASI DIBUKA' : '🔴 REGISTRASI DITUTUP'}
              </span>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px', marginBottom: '28px' }}>
              {!isEditingSystem ? (
                /* ── TAMPILAN TERKUNCI / COLLAPSED KETIKA SUDAH TERSIMPAN ── */
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', fontSize: '12px', marginBottom: '18px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', marginBottom: '4px' }}>Status Registrasi Publik:</span>
                      <strong style={{ color: sysEnableReg ? '#34d399' : '#f87171', fontSize: '13px' }}>
                        {sysEnableReg ? '🟢 Dibuka (Public Registration)' : '🔴 Ditutup Sementara'}
                      </strong>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', marginBottom: '4px' }}>Batas Quota Vendor Aktif:</span>
                      <strong style={{ color: '#f4f4f5', fontSize: '13px' }}>
                        {sysMaxQuota ? `${sysMaxQuota} Vendor` : 'Unlimited (Tanpa Batas)'}
                      </strong>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', marginBottom: '4px' }}>Tarif Custom Storage:</span>
                      <strong style={{ color: '#818cf8', fontSize: '13px' }}>
                        Rp {(customStoragePricePerGb || 1250).toLocaleString('id-ID')} / GB / bln
                      </strong>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', marginBottom: '4px' }}>Warning Worker Storage:</span>
                      <strong style={{ color: '#fbbf24', fontSize: '13px' }}>
                        &le; {workerStorageWarningThresholdGb || 10} GB
                      </strong>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', marginBottom: '4px' }}>Masa Tenggang (Grace Period):</span>
                      <strong style={{ color: '#38bdf8', fontSize: '13px' }}>
                        {gracePeriodDays || 7} Hari
                      </strong>
                    </div>
                    <div style={{ background: 'rgba(99,102,241,0.08)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.25)' }}>
                      <span style={{ color: '#a5b4fc', display: 'block', fontSize: '11px', marginBottom: '4px' }}>Pusat Kendali Trial:</span>
                      <strong style={{ color: '#818cf8', fontSize: '13px' }}>
                        🎯 Terpusat di Tab Trial
                      </strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <button
                      type="button"
                      onClick={() => setIsEditingSystem(true)}
                      style={{
                        background: 'rgba(99, 102, 241, 0.15)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        color: '#a5b4fc',
                        padding: '8px 18px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.25)'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)'; e.currentTarget.style.color = '#a5b4fc'; }}
                    >
                      <span>✏️</span>
                      <span>Buka & Ubah Pengaturan</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* ── FORM PENGATURAN TERBUKA UNTUK DIUBAH ── */
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
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

                  {/* ── CENTRALIZED TRIAL SETTINGS NOTICE ── */}
                  <div style={{
                    marginTop: '24px',
                    padding: '16px 20px',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.08))',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '24px' }}>🎯</span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#818cf8' }}>
                          Pusat Kendali Pengaturan Trial (Trial Command Center)
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
                          Seluruh kendali durasi, limit kuota foto, RAW Sorter, preset, dan Flash Sale Promo kini terpusat penuh pada Tab <strong>Trial</strong> di bilah navigasi utama.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <button
                      type="button"
                      onClick={handleCancelSystem}
                      disabled={savingSection === 'system'}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#94a3b8',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8'; }}
                    >
                      Tutup / Batal
                    </button>
                    <button 
                      type="button" 
                      disabled={savingSection === 'system' || !isSystemDirty} 
                      onClick={handleSaveSystem}
                      style={{ 
                        background: isSystemDirty ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.04)', 
                        color: isSystemDirty ? '#ffffff' : '#64748b', 
                        border: isSystemDirty ? 'none' : '1px solid rgba(255,255,255,0.06)', 
                        padding: '8px 20px', 
                        borderRadius: '8px', 
                        fontSize: '12px', 
                        fontWeight: 'bold', 
                        cursor: isSystemDirty ? 'pointer' : 'not-allowed',
                        boxShadow: isSystemDirty ? '0 2px 10px rgba(16, 185, 129, 0.3)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {savingSection === 'system' ? '⏳ Menyimpan...' : '💾 Simpan Pengaturan Sistem'}
                    </button>
                  </div>
                </div>
              )}
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
                  placeholder="Masukkan password baru (Minimal 6 karakter)"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  disabled={savingSection === 'password'}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <button 
                  type="button" 
                  disabled={savingSection === 'password' || !newPassword} 
                  onClick={handleSavePasswordOnly}
                  style={{ 
                    background: newPassword ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255,255,255,0.05)', 
                    color: newPassword ? '#ffffff' : '#71717a', 
                    border: 'none', 
                    padding: '8px 20px', 
                    borderRadius: '8px', 
                    fontSize: '12px', 
                    fontWeight: 'bold', 
                    cursor: newPassword ? 'pointer' : 'not-allowed',
                    boxShadow: newPassword ? '0 2px 10px rgba(99, 102, 241, 0.3)' : 'none'
                  }}
                >
                  {savingSection === 'password' ? '⏳ Menyimpan...' : '🔒 Update Password Superadmin'}
                </button>
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
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#e4e4e7', fontWeight: 'bold' }}>
                            {item.fileName}
                          </td>

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

                          <td style={{ padding: '10px 12px', color: '#a1a1aa' }}>
                            {item.dateFormatted}, {item.timeFormatted}
                          </td>

                          <td style={{ padding: '10px 12px', color: '#fbbf24', fontWeight: 'bold' }}>
                            {item.sizeFormatted}
                          </td>

                          {/* Tombol Aksi */}
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => setRestoreModal({
                                  open: true,
                                  fileName: item.fileName,
                                  date: `${item.dateFormatted}, ${item.timeFormatted}`,
                                  size: item.sizeFormatted
                                })}
                                style={{
                                  background: 'rgba(251,191,36,0.15)',
                                  border: '1px solid rgba(251,191,36,0.3)',
                                  color: '#fbbf24',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer'
                                }}
                              >
                                🔄 Pulihkan
                              </button>
                              <a
                                href={`/api/admin/backups/${encodeURIComponent(item.fileName)}`}
                                download
                                style={{
                                  background: 'rgba(99,102,241,0.15)',
                                  border: '1px solid rgba(99,102,241,0.3)',
                                  color: '#818cf8',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center'
                                }}
                                title="Unduh file cadangan"
                              >
                                ⬇️
                              </a>
                              <button
                                type="button"
                                onClick={() => handleDeleteBackup(item.fileName)}
                                style={{
                                  background: 'rgba(248,113,113,0.15)',
                                  border: '1px solid rgba(248,113,113,0.3)',
                                  color: '#f87171',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer'
                                }}
                                title="Hapus file cadangan ini"
                              >
                                🗑️
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

            {/* ── 3.5 PEMBERSIHAN & HARD PURGE BERKAS KEDALUWARSA ── */}
            <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '15px', color: '#f43f5e', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
                Pembersihan & Hard Purge Berkas Kedaluwarsa
              </h4>
              <span style={{ fontSize: '11px', background: sysEnableAutoPurge ? 'rgba(244,63,94,0.15)' : 'rgba(148,163,184,0.1)', color: sysEnableAutoPurge ? '#fb7185' : '#94a3b8', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
                {sysEnableAutoPurge ? '🟢 AUTO-PURGE AKTIF (24 JAM)' : '⚪ AUTO-PURGE NONAKTIF'}
              </span>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
              {/* 1. Toggle Auto-Purge Periodik */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="enable_auto_purge"
                    checked={!!sysEnableAutoPurge}
                    onChange={e => handleToggleAutoPurge(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <div>
                    <label htmlFor="enable_auto_purge" style={{ cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', color: sysEnableAutoPurge ? '#fb7185' : '#94a3b8' }}>
                      Aktifkan Hard Purge Otomatis (Setiap 24 Jam)
                    </label>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>
                      Server otomatis memindai vendor yang telah melewati masa tenggang ({gracePeriodDays || 7} hari) dan membersihkan data serta berkas fisiknya.
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Info Status & Tombol Eksekusi Manual */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '16px' }}>
                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', marginBottom: '4px' }}>Masa Tenggang (Grace Period):</span>
                  <strong style={{ color: '#38bdf8', fontSize: '13px' }}>
                    {gracePeriodDays || 7} Hari
                  </strong>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', marginBottom: '4px' }}>Jadwal Siklus Pembersihan:</span>
                  <strong style={{ color: sysEnableAutoPurge ? '#34d399' : '#94a3b8', fontSize: '13px' }}>
                    {sysEnableAutoPurge ? 'Tiap 24 Jam (Otomatis)' : 'Manual Only'}
                  </strong>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', marginBottom: '4px' }}>Terakhir Dijalankan:</span>
                  <strong style={{ color: '#fbbf24', fontSize: '13px' }}>
                    {lastHardPurgeFormatted || 'Belum pernah'}
                  </strong>
                </div>
              </div>

              {/* Action Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', maxWidth: '500px', lineHeight: '1.5' }}>
                  ℹ️ Eksekusi manual akan langsung memindai vendor kedaluwarsa &gt; {gracePeriodDays || 7} hari dan menghapus berkas foto fisik dari Google Drive Worker tanpa menunggu jadwal harian.
                </p>

                <button
                  type="button"
                  disabled={purgingExpired}
                  onClick={() => setPurgeConfirmModal(true)}
                  style={{
                    background: 'linear-gradient(135deg, rgba(244,63,94,0.2), rgba(225,29,72,0.3))',
                    border: '1px solid rgba(244,63,94,0.4)',
                    color: '#fb7185',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: purgingExpired ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(244,63,94,0.15)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => { if (!purgingExpired) e.currentTarget.style.background = 'linear-gradient(135deg, rgba(244,63,94,0.35), rgba(225,29,72,0.5))'; }}
                  onMouseLeave={e => { if (!purgingExpired) e.currentTarget.style.background = 'linear-gradient(135deg, rgba(244,63,94,0.2), rgba(225,29,72,0.3))'; }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  {purgingExpired ? '⏳ Memproses Pembersihan...' : '🚀 Jalankan Hard Purge Sekarang'}
                </button>
              </div>
            </div>

            {/* ── MODAL KONFIRMASI HARD PURGE MANUAL ── */}
            {purgeConfirmModal && (
              <div className="modal-overlay" onClick={() => { if (!purgingExpired) setPurgeConfirmModal(false); }}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '90%', borderRadius: '16px' }}>
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(244,63,94,0.15)', color: '#fb7185', marginBottom: '14px' }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 8px' }}>
                      Konfirmasi Eksekusi Hard Purge
                    </h3>
                    <p style={{ color: '#a1a1aa', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>
                      Sistem akan memindai vendor yang telah melewati masa tenggang (<strong>{gracePeriodDays || 7} hari</strong>) setelah expired, lalu menghapus foto fisiknya dari Google Drive Worker SaaS dan membersihkan data database terkait.
                    </p>
                  </div>

                  <div style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: '10px', padding: '12px 14px', fontSize: '12px', color: '#fda4af', lineHeight: '1.5', marginBottom: '18px' }}>
                    ⚠️ Tindakan ini permanen untuk vendor yang masa tenggangnya telah lewat. Vendor aktif atau vendor yang masih dalam masa tenggang tidak akan terdampak.
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                      type="button"
                      disabled={purgingExpired}
                      onClick={() => setPurgeConfirmModal(false)}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#e4e4e7',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={purgingExpired}
                      onClick={handleRunHardPurge}
                      style={{
                        background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
                        border: 'none',
                        color: '#ffffff',
                        padding: '8px 20px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: purgingExpired ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 14px rgba(244,63,94,0.4)'
                      }}
                    >
                      {purgingExpired ? '⏳ Memproses...' : '✓ Ya, Eksekusi Hard Purge'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── 3.6 PEMBERSIHAN & RESET DATA UJI COBA (PRODUCTION CLEAN START) ── */}
            <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '15px', color: '#f59e0b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
                Pembersihan Data Uji Coba (Production Clean Start)
              </h4>
              <span style={{ fontSize: '11px', background: 'rgba(245,158,11,0.15)', color: '#fbbf24', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
                🛡️ PENGATURAN & KREDENSIAL TETAP AMAN
              </span>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
              <p style={{ margin: '0 0 16px 0', fontSize: '12.5px', color: '#a1a1aa', lineHeight: '1.5' }}>
                Gunakan opsi di bawah ini saat sistem selesai diuji coba dan siap diluncurkan untuk fotografer asli. <strong>Seluruh pengaturan akun Superadmin, Kredensial Google Drive, Konfigurasi Bank/Payment Gateway, dan Paket Berlangganan dijamin 100% tetap utuh.</strong>
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {/* Option 1: Reset Keuangan */}
                <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '18px' }}>💳</span>
                      <h5 style={{ margin: 0, fontSize: '14px', color: '#fbbf24', fontWeight: 'bold' }}>Reset Data Keuangan Saja</h5>
                    </div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '11.5px', color: '#94a3b8', lineHeight: '1.5' }}>
                      Menghapus seluruh riwayat transfer, invoice langganan, dan sesi transaksi uji coba. Grafik omset & pendapatan Superadmin akan kembali bersih ke <strong>Rp 0</strong>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCleanDataModal({
                      type: 'financial',
                      title: 'Reset Data Keuangan & Transaksi',
                      desc: 'Menghapus riwayat transaksi, invoice, dan bukti transfer uji coba. Grafik omset akan kembali ke Rp 0. Akun vendor dan project tetap ada.'
                    })}
                    style={{
                      background: 'rgba(251,191,36,0.15)',
                      border: '1px solid rgba(251,191,36,0.35)',
                      color: '#fbbf24',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    🧹 Bersihkan Data Keuangan
                  </button>
                </div>

                {/* Option 2: Fresh Start Total */}
                <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '18px' }}>💥</span>
                      <h5 style={{ margin: 0, fontSize: '14px', color: '#fb7185', fontWeight: 'bold' }}>Fresh Start (Reset Vendor & Galeri)</h5>
                    </div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '11.5px', color: '#94a3b8', lineHeight: '1.5' }}>
                      Mengosongkan seluruh akun vendor uji coba, klien, proyek galeri, foto, dan transaksi. Database kembali bersih seperti baru rilis tanpa menghapus kredensial/setting.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCleanDataModal({
                      type: 'vendors',
                      title: 'Fresh Start Database (Reset Vendor & Galeri)',
                      desc: 'Mengosongkan seluruh akun vendor, proyek galeri, foto, dan transaksi uji coba. Pengaturan Superadmin, Google Drive, Payment Gateway, dan Paket SaaS TETAP AMAN.'
                    })}
                    style={{
                      background: 'linear-gradient(135deg, rgba(244,63,94,0.2), rgba(225,29,72,0.3))',
                      border: '1px solid rgba(244,63,94,0.4)',
                      color: '#fb7185',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    🚀 Fresh Start Database
                  </button>
                </div>
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

      {/* ── MODAL KONFIRMASI RESET DATA UJI COBA ── */}
      {cleanDataModal && (
        <div className="modal-overlay" onClick={() => { if (!isCleaningData) setCleanDataModal(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '90%', borderRadius: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: cleanDataModal.type === 'financial' ? 'rgba(251,191,36,0.15)' : 'rgba(244,63,94,0.15)', color: cleanDataModal.type === 'financial' ? '#fbbf24' : '#fb7185', marginBottom: '14px', fontSize: '24px' }}>
                {cleanDataModal.type === 'financial' ? '💳' : '⚠️'}
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 8px' }}>
                {cleanDataModal.title}
              </h3>
              <p style={{ color: '#a1a1aa', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>
                {cleanDataModal.desc}
              </p>
            </div>

            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '10px', padding: '12px 14px', fontSize: '11.5px', color: '#34d399', lineHeight: '1.5', marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ fontSize: '14px' }}>🛡️</span>
              <div>
                <strong>Garansi Perlindungan:</strong> Snapshot darurat database akan otomatis dibuat sebelum pembersihan dijalankan. Seluruh Kredensial Google Drive, Akun Superadmin, dan Setting SaaS tetap aman.
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleExecuteCleanData(); }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>
                  Ketik kata <strong style={{ color: '#f43f5e' }}>BERSIHKAN</strong> untuk konfirmasi:
                </label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="BERSIHKAN"
                  value={cleanDataConfirmText}
                  onChange={e => setCleanDataConfirmText(e.target.value)}
                  required
                  disabled={isCleaningData}
                  style={{ textAlign: 'center', fontWeight: 'bold', letterSpacing: '1px' }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Password Superadmin:</label>
                <input
                  type="password"
                  className="input-text"
                  placeholder="Masukkan password Superadmin Anda"
                  value={cleanDataPassword}
                  onChange={e => setCleanDataPassword(e.target.value)}
                  required
                  disabled={isCleaningData}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  disabled={isCleaningData}
                  onClick={() => {
                    setCleanDataModal(null);
                    setCleanDataPassword('');
                    setCleanDataConfirmText('');
                  }}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e4e4e7', padding: '10px 16px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCleaningData || cleanDataConfirmText.trim().toUpperCase() !== 'BERSIHKAN' || !cleanDataPassword}
                  style={{
                    background: cleanDataModal.type === 'financial' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #f43f5e, #e11d48)',
                    border: 'none',
                    color: cleanDataModal.type === 'financial' ? '#000000' : '#ffffff',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: (isCleaningData || cleanDataConfirmText.trim().toUpperCase() !== 'BERSIHKAN' || !cleanDataPassword) ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                    opacity: (cleanDataConfirmText.trim().toUpperCase() !== 'BERSIHKAN' || !cleanDataPassword) ? 0.6 : 1
                  }}
                >
                  {isCleaningData ? '⏳ Membersihkan Data...' : '✓ Konfirmasi & Bersihkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      </div>

    </div>
  );
}
