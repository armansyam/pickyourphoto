'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NativeQrisDisplay from '@/components/NativeQrisDisplay.jsx';
import {
  FolderIcon,
  FolderPlusIcon,
  UploadCloudIcon,
  UploadFolderIcon,
  GoogleDriveIcon,
  CloudServerIcon,
  SearchIcon,
  GridIcon,
  ListIcon,
  SyncIcon,
  DisconnectIcon,
  TrashIcon,
  PhotoIcon,
  VideoIcon,
  FileDocumentIcon,
  RocketLaunchIcon,
  GalleryViewIcon,
  SettingsManageIcon,
  CopyLinkIcon,
  ExternalLinkIcon,
  TransferDriveIcon,
  PinLocationIcon,
  SparklesUpgradeIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  TimerClockIcon,
  SpeedBoltIcon,
  DiskStorageIcon,
  CloudConnectedIcon,
  InfoLightIcon
} from '@/components/StorageIcons.jsx';

// Kamus Format Media Fotografi & Videografi Lengkap (Semua Merk Kamera Dunia)
const ALLOWED_MEDIA_EXTENSIONS = /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif|tiff?|svg|psd|psb|ai|cr2|cr3|crw|arw|srf|sr2|nef|nrw|raf|rw2|raw|orf|dng|rwl|3fr|fff|iiq|pef|ptx|mp4|mov|avi|mkv|m4v|webm|mts|m2ts|flv|wmv|3gp)$/i;
const FORBIDDEN_CODE_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs|json|map|css|scss|html|htm|py|php|rb|go|java|c|cpp|h|sh|bat|cmd|exe|dll|so|dylib|bin|zip|rar|7z|tar|gz|sql|env|lock|yml|yaml|md|txt)$/i;

const isSupportedMediaFile = (file) => {
  const name = file.name || '';
  if (name.startsWith('.') || name.startsWith('._') || name === 'Thumbs.db' || name === 'desktop.ini') {
    return false;
  }
  const relPath = file.webkitRelativePath || '';
  if (relPath.includes('node_modules/') || relPath.includes('/.git/') || relPath.includes('.next/') || relPath.includes('dist/')) {
    return false;
  }
  if (FORBIDDEN_CODE_EXTENSIONS.test(name)) {
    return false;
  }
  if (file.type && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
    return true;
  }
  return ALLOWED_MEDIA_EXTENSIONS.test(name);
};

export default function VendorStorageManagerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [vendorData, setVendorData] = useState(null);
  const [addonPlans, setAddonPlans] = useState([]);
  const [remainingGlobalGb, setRemainingGlobalGb] = useState(500);
  const [customStorageGb, setCustomStorageGb] = useState(60);
  const [customStoragePricePerGb, setCustomStoragePricePerGb] = useState(1250);
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  // Drive Navigation & Explorer States
  const [currentFolderId, setCurrentFolderId] = useState('root');
  const [rootFolderId, setRootFolderId] = useState(null);
  const [folderStack, setFolderStack] = useState([{ id: 'root', name: 'My Cloud Storage' }]);
  const [files, setFiles] = useState([]);
  const [subFolders, setSubFolders] = useState([]);
  const [externalProjects, setExternalProjects] = useState([]);

  // Modals
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploadMinimized, setIsUploadMinimized] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);

  // Payment states
  const [paymentModalData, setPaymentModalData] = useState(null);
  const [paymentMethodTab, setPaymentMethodTab] = useState('gateway');
  const [paymentProofFile, setPaymentProofFile] = useState(null);
  const [saasBankInfo, setSaasBankInfo] = useState(null);

  useEffect(() => {
    fetchStorageFiles(currentFolderId);
    fetchAddonPlans();
  }, [currentFolderId]);

  // Poll payment status if payment modal is open
  useEffect(() => {
    if (!paymentModalData?.orderId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/status?orderId=${paymentModalData.orderId}`);
        const data = await res.json();
        if (data.status === 'paid' || data.status === 'completed' || data.paid) {
          showToast('Pembayaran Add-On Storage Berhasil! Kuota storage telah diaktifkan.', 'success');
          setPaymentModalData(null);
          setTimeout(() => {
            window.location.reload();
          }, 800);
        }
      } catch (e) {}
    }, 3000);
    return () => clearInterval(interval);
  }, [paymentModalData, currentFolderId]);

  const [viewMode, setViewMode] = useState('grid'); // 'grid' atau 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [fileDisplayLimit, setFileDisplayLimit] = useState(25); // Lazy load 25 file per chunk
  const [maxConcurrency, setMaxConcurrency] = useState(4);
  const [activeWorkerCount, setActiveWorkerCount] = useState(1);

  // Turbo Upload high-speed states
  const [isTurboSupported, setIsTurboSupported] = useState(false);
  const [isTurboModeActive, setIsTurboModeActive] = useState(false);
  const [dismissedTurboPrompt, setDismissedTurboPrompt] = useState(false);
  const [batchConfirmData, setBatchConfirmData] = useState(null);
  const [folderPrepStatus, setFolderPrepStatus] = useState(null); // null atau { current: 0, total: 0, text: '' }
  const [adaptiveConcurrency, setAdaptiveConcurrency] = useState(null);
  const fileListEndRef = useRef(null);

  // Auto Infinite Scroll untuk Berkas File (Lazy Rendering DOM)
  useEffect(() => {
    if (!fileListEndRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setFileDisplayLimit(prev => prev + 25);
      }
    }, { rootMargin: '200px' });

    observer.observe(fileListEndRef.current);
    return () => observer.disconnect();
  }, [files.length, fileDisplayLimit, searchQuery]);
  const [isOverpowerPc, setIsOverpowerPc] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cores = navigator.hardwareConcurrency || 4;
      const memory = navigator.deviceMemory || 4;
      
      if (cores >= 12 || memory >= 16) {
        // PC Overpower Workstation (Studio High-End 12+ Core / RAM 16GB+): Turbo 10 Thread!
        setIsTurboSupported(true);
        setIsOverpowerPc(true);
      } else if (cores >= 8 || memory >= 8) {
        // High-end laptop studio: Aktifkan penawaran Turbo Upload 8 Thread
        setIsTurboSupported(true);
        setIsOverpowerPc(false);
      } else if (cores <= 2 || memory <= 2) {
        // Entry-level laptop: Penyesuaian senyap 2 thread di latar belakang (TANPA BANNER)
        setAdaptiveConcurrency(2);
      } else if (cores <= 4) {
        // Standard office laptop: Penyesuaian senyap 3 thread di latar belakang (TANPA BANNER)
        setAdaptiveConcurrency(3);
      }
    }
  }, []);

  // Quick Create Project Modal states from Storage Page
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [targetFolderForProject, setTargetFolderForProject] = useState(null);
  const [projectNameInput, setProjectNameInput] = useState('');
  const [maxSelectionInput, setMaxSelectionInput] = useState(0);
  const [clientPhoneInput, setClientPhoneInput] = useState('');
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);

  // Storage Media Gallery Viewer Modal (Pure Viewer without Selector)
  const [showStorageGalleryModal, setShowStorageGalleryModal] = useState(false);
  const [galleryModalFolder, setGalleryModalFolder] = useState(null);
  const [galleryModalFiles, setGalleryModalFiles] = useState([]);
  const [loadingGalleryModal, setLoadingGalleryModal] = useState(false);
  const [activePreviewIndex, setActivePreviewIndex] = useState(null);
  const [previewSourceFiles, setPreviewSourceFiles] = useState([]);
  // BYOS (External Google Drive Vendor) State & Handlers
  const [byosState, setByosState] = useState({ connected: false, email: '', quota: null });
  const [activeStorageMode, setActiveStorageMode] = useState('byos');
  const [dismissedByosBar, setDismissedByosBar] = useState(false);
  const [hasByosUpdates, setHasByosUpdates] = useState(false);

  const handleToggleStorageMode = async (mode, silent = true) => {
    try {
      const res = await fetch('/api/storage/toggle-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      const data = await res.json();
      if (data.success) {
        setActiveStorageMode(mode);
        if (!silent) {
          showToast(data.message, 'success');
        }
      } else if (!silent) {
        showToast(data.error || 'Gagal mengubah target storage.', 'error');
      }
    } catch {
      if (!silent) {
        showToast('Terjadi kesalahan saat mengubah target storage.', 'error');
      }
    }
  };

  const checkByosUpdates = async () => {
    try {
      const res = await fetch('/api/storage/external/check-updates');
      const data = await res.json();
      if (data.success && data.hasUpdates) {
        setHasByosUpdates(true);
      } else {
        setHasByosUpdates(false);
      }
    } catch (e) {
      console.error('BYOS check updates error:', e);
    }
  };

  const fetchByosData = async () => {
    try {
      const res = await fetch('/api/storage/external/quota');
      const data = await res.json();
      if (data.success) {
        setByosState({
          connected: Boolean(data.connected),
          email: data.email || '',
          quota: data.quota || null
        });
        if (data.activeStorageMode) {
          setActiveStorageMode(data.activeStorageMode);
        } else {
          setActiveStorageMode(data.connected ? 'byos' : 'system');
        }
        if (data.connected) {
          checkByosUpdates();
        }
      }
    } catch (e) {
      console.error('BYOS fetch error:', e);
    }
  };

  const handleConnectByosDrive = async () => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch(`/api/storage/external/connect?origin=${encodeURIComponent(origin)}`);
      const data = await res.json();
      if (data.success && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        showToast(data.error || 'Gagal memulai koneksi Google Drive.', 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan saat koneksi Google Drive.', 'error');
    }
  };

  const handleDisconnectByosDrive = async () => {
    const isConfirmed = confirm(
      '⚠️ PERINGATAN PENGGANTIAN/PELEPASAN AKUN GOOGLE DRIVE:\n\n' +
      'Mengganti atau melelepas akun Google Drive akan mengalihkan pusat penyedia storage & upload proyek baru Anda ke Drive yang baru.\n\n' +
      'Akses manajemen berkas pada Drive lama Anda akan dilepas dari konsol ini (berkas fisik di GDrive lama Anda tetap 100% aman tersimpan di akun Google Anda).\n\n' +
      'Apakah Anda yakin ingin melanjutkan pelepas/penggantian akun?'
    );
    if (!isConfirmed) return;

    try {
      const res = await fetch('/api/storage/external/disconnect', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('Koneksi Google Drive Eksternal berhasil dilepas.', 'success');
        setByosState({ connected: false, email: '', quota: null });
        fetchStorageFiles(currentFolderId);
      }
    } catch (e) {
      showToast('Gagal melepas koneksi Drive.', 'error');
    }
  };

  const handleSwitchTab = (newMode) => {
    setActiveStorageMode(newMode);
    const tabName = newMode === 'byos' ? 'Google Drive Pribadi' : 'Dedicated Cloud Storage';
    setFolderStack([{ id: 'root', name: tabName }]);
    setCurrentFolderId('root');
    fetchStorageFiles('root', newMode);
    handleToggleStorageMode(newMode);
  };

  const handleSyncByosFolders = async () => {
    try {
      showToast('Sedang menyinkronkan folder dari Google Drive Anda...', 'info');
      const res = await fetch('/api/storage/external/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Folder berhasil disinkronkan!', 'success');
        setHasByosUpdates(false);
        fetchStorageFiles('root', 'byos');
      } else {
        showToast(data.error || 'Gagal menyinkronkan folder.', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan saat menyinkronkan folder.', 'error');
    }
  };

  useEffect(() => {
    fetchByosData();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (activePreviewIndex === null || !previewSourceFiles.length) return;
      if (e.key === 'ArrowLeft') {
        setActivePreviewIndex(prev => (prev > 0 ? prev - 1 : previewSourceFiles.length - 1));
      } else if (e.key === 'ArrowRight') {
        setActivePreviewIndex(prev => (prev < previewSourceFiles.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'Escape') {
        setActivePreviewIndex(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePreviewIndex, previewSourceFiles]);

  const handleOpenStorageGalleryModal = async (sf) => {
    setGalleryModalFolder(sf);
    setShowStorageGalleryModal(true);
    setLoadingGalleryModal(true);
    setGalleryModalFiles([]);
    try {
      const res = await fetch(`/api/storage/files?folderId=${sf.driveFolderId || sf.id}`);
      const data = await res.json();
      if (data.success) {
        setGalleryModalFiles(data.files || []);
      } else {
        showToast(data.message || 'Gagal memuat berkas galeri storage.', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan saat memuat galeri storage.', 'error');
    } finally {
      setLoadingGalleryModal(false);
    }
  };

  const handleMigrateFolderToByos = async (sf) => {
    const isConfirmed = confirm(`🚚 Pindahkan Folder "${sf.name}" ke Google Drive Anda?\n\nFolder beserta berkas foto di dalamnya akan dipindahkan ke Root Google Drive milik Anda (${byosState.email}). Proyek foto tetap aktif berjalan tanpa hambatan.`);
    if (!isConfirmed) return;

    try {
      showToast(`Sedang memindahkan folder "${sf.name}" ke Google Drive Anda...`, 'info');
      const res = await fetch('/api/storage/migrate-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: sf.driveFolderId || sf.id })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Folder berhasil dipindahkan ke Google Drive Anda!', 'success');
        fetchStorageFiles(currentFolderId);
      } else {
        showToast(data.error || 'Gagal memindahkan folder.', 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan saat memindahkan folder.', 'error');
    }
  };

  const handleOpenCreateProjectModal = (sf) => {
    setTargetFolderForProject(sf);
    setProjectNameInput(sf.name);
    setMaxSelectionInput(0);
    setClientPhoneInput('');
    setShowCreateProjectModal(true);
  };

  const handleCreateProjectSubmit = async (e) => {
    e.preventDefault();
    if (!targetFolderForProject) return;

    try {
      setIsSubmittingProject(true);
      const driveUrl = targetFolderForProject.webViewLink || `https://drive.google.com/drive/folders/${targetFolderForProject.driveFolderId || targetFolderForProject.id}`;
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectNameInput,
          folderUrl: driveUrl,
          maxSelection: maxSelectionInput,
          clientPhone: clientPhoneInput
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Project "${projectNameInput}" berhasil dibuat! Memulai impor foto...`, 'success');
        setShowCreateProjectModal(false);
        router.push('/dashboard');
      } else {
        showToast(data.message || 'Gagal membuat project.', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan saat membuat project.', 'error');
    } finally {
      setIsSubmittingProject(false);
    }
  };

  const fetchStorageFiles = async (folderId = 'root', mode = activeStorageMode) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/storage/files?folderId=${folderId}&mode=${mode}`);
      const data = await res.json();
      if (data.success) {
        setVendorData(data.vendor);
        setFiles(data.files || []);
        setSubFolders(data.subFolders || []);
        setExternalProjects(data.externalProjects || []);
        if (data.activeWorkerCount) setActiveWorkerCount(data.activeWorkerCount);
        if (data.maxConcurrency) setMaxConcurrency(data.maxConcurrency);
        if (data.rootFolderId) setRootFolderId(data.rootFolderId);
        if (folderId === 'root') {
          if (mode === 'system' && data.rootFolderId) {
            setCurrentFolderId(data.rootFolderId);
          } else {
            setCurrentFolderId('root');
          }
        }
      } else {
        showToast(data.error || 'Gagal memuat berkas Cloud Storage.', 'error');
      }
    } catch {
      showToast('Gagal terhubung ke server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAddonPlans = async () => {
    try {
      const res = await fetch('/api/addon-plans');
      const data = await res.json();
      if (data.success) {
        setAddonPlans(data.plans || []);
        if (data.remainingGlobalGb !== undefined) {
          setRemainingGlobalGb(data.remainingGlobalGb);
        }
        if (data.customStoragePricePerGb) {
          setCustomStoragePricePerGb(data.customStoragePricePerGb);
        }
        // Mulai dalam posisi KOSONG (tanpa pre-selection hardcode)
        setSelectedPlanId(null);
      }
    } catch (e) {
      console.error('Failed to fetch addon plans:', e);
    }
  };

  const showToast = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000);
  };

  // 1. BUAT SUB-FOLDER BARU
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      setActionLoading(true);
      const res = await fetch('/api/storage/folders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderName: newFolderName.trim(),
          parentFolderId: currentFolderId,
          storageMode: activeStorageMode
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        setNewFolderName('');
        setShowNewFolderModal(false);
        fetchStorageFiles(currentFolderId, activeStorageMode);
      } else {
        showToast(data.error || 'Gagal membuat folder baru.', 'error');
      }
    } catch {
      showToast('Gagal menghubungi server.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const [lastSelectedFilesMap, setLastSelectedFilesMap] = useState({});
  const [uploadStats, setUploadStats] = useState({
    speedFormatted: '',
    etaFormatted: ''
  });

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (uploadProgress.some(i => i.status === 'uploading')) {
        e.preventDefault();
        e.returnValue = 'Proses unggah sedang berlangsung! Yakin ingin keluar?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [uploadProgress]);

  const handleCloseUploadWidget = () => {
    const isUploading = uploadProgress.some(item => item.status === 'uploading');
    if (isUploading) {
      if (confirm('⚠️ Unggahan sedang berlangsung!\n\nApakah Anda yakin ingin membatalkan dan menutup widget unggah? Berkas yang belum selesai akan dibatalkan.')) {
        setShowUploadModal(false);
        showToast('Proses unggah telah dibatalkan.', 'info');
      }
    } else {
      setShowUploadModal(false);
    }
  };

  const processUploadBatch = async (indicesToProcess, initialProgressList, fileObjectsMap, overrideTargetFolderId = null) => {
    const isByosMode = activeStorageMode === 'byos';
    // BYOS: 3 parallel streams (Aman dari 429 rate limit, 3x lebih cepat)
    // SaaS Dedicated: 6–10 parallel stream workers (Turbo Upload Multi-Thread Maksimal)
    const targetTurboThreads = isOverpowerPc ? 10 : 8;
    const CONCURRENCY = isByosMode ? 3 : Math.max(6, isTurboModeActive ? targetTurboThreads : 6);
    let queuePointer = 0;
    const progressList = [...initialProgressList];
    const targetFolderId = overrideTargetFolderId || currentFolderId;

    let totalBytes = 0;
    Object.values(fileObjectsMap).forEach(f => { totalBytes += (f?.size || 0); });
    const startTime = Date.now();
    const fileLoadedBytesMap = {};

    const uploadSingleFile = (fileItemIndex) => {
      const file = fileObjectsMap[fileItemIndex];
      if (!file) return Promise.resolve();

      return new Promise((resolve) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('parentFolderId', file.overrideFolderId || targetFolderId);
        formData.append('storageMode', activeStorageMode);
        formData.append('isExternalDrive', activeStorageMode === 'byos' ? 'true' : 'false');

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/storage/upload/direct', true);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            progressList[fileItemIndex].percent = percentComplete;
            fileLoadedBytesMap[fileItemIndex] = event.loaded;

            let currentTotalLoaded = 0;
            Object.values(fileLoadedBytesMap).forEach(b => { currentTotalLoaded += b; });

            const elapsedSecs = (Date.now() - startTime) / 1000;
            if (elapsedSecs > 0.5 && currentTotalLoaded > 0) {
              const bytesPerSec = currentTotalLoaded / elapsedSecs;
              const remainingBytes = Math.max(0, totalBytes - currentTotalLoaded);
              const remainingSecs = Math.ceil(remainingBytes / Math.max(1, bytesPerSec));

              const speedText = formatBytes(bytesPerSec) + '/s';

              let etaText = '';
              if (remainingSecs > 3600) {
                const hrs = Math.floor(remainingSecs / 3600);
                const mins = Math.floor((remainingSecs % 3600) / 60);
                etaText = `~ ${hrs}j ${mins}m tersisa`;
              } else if (remainingSecs >= 60) {
                const mins = Math.floor(remainingSecs / 60);
                const secs = remainingSecs % 60;
                etaText = `~ ${mins}m ${secs}s tersisa`;
              } else {
                etaText = `~ ${remainingSecs}s tersisa`;
              }

              setUploadStats({
                speedFormatted: speedText,
                etaFormatted: etaText
              });
            }

            setUploadProgress([...progressList]);
          }
        };

        xhr.onload = () => {
          fileLoadedBytesMap[fileItemIndex] = file.size || 0;
          if (xhr.status === 200) {
            try {
              const resJson = JSON.parse(xhr.responseText || '{}');
              if (resJson.success) {
                progressList[fileItemIndex].status = 'completed';
                progressList[fileItemIndex].percent = 100;
                progressList[fileItemIndex].error = '';
              } else {
                progressList[fileItemIndex].status = 'error';
                progressList[fileItemIndex].error = resJson.error || 'Ditolak sistem.';
              }
            } catch (e) {
              progressList[fileItemIndex].status = 'error';
              progressList[fileItemIndex].error = 'Respons tidak valid.';
            }
          } else {
            try {
              const resJson = JSON.parse(xhr.responseText || '{}');
              progressList[fileItemIndex].status = 'error';
              progressList[fileItemIndex].error = resJson.error || `HTTP ${xhr.status}`;
            } catch (e) {
              progressList[fileItemIndex].status = 'error';
              progressList[fileItemIndex].error = `HTTP ${xhr.status}`;
            }
          }
          setUploadProgress([...progressList]);
          resolve();
        };

        xhr.onerror = () => {
          progressList[fileItemIndex].status = 'error';
          progressList[fileItemIndex].error = 'Gagal koneksi ke server.';
          setUploadProgress([...progressList]);
          resolve();
        };

        xhr.send(formData);
      });
    };

    let activeThrottleStep = 0;
    let activeWorkersCount = 0;
    let lastTickTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    const governorInterval = setInterval(() => {
      if (typeof performance === 'undefined') return;
      const now = performance.now();
      const elapsed = now - lastTickTime;
      lastTickTime = now;

      const lag = elapsed - 1500;
      if (lag > 250) {
        // Beban CPU tinggi / aplikasi lain sedang berjalan -> Turunkan thread secara bertahap
        activeThrottleStep = Math.min(activeThrottleStep + 1, 3);
      } else if (lag < 50) {
        // Performa santai / kembali normal -> Naikkan thread kembali ke kecepatan puncak
        activeThrottleStep = Math.max(activeThrottleStep - 1, 0);
      }
    }, 1500);

    const workerQueue = async () => {
      while (queuePointer < indicesToProcess.length) {
        if (activeThrottleStep > 0) {
          const targetActiveThreads = Math.max(2, CONCURRENCY - (activeThrottleStep * 2));
          if (activeWorkersCount > targetActiveThreads) {
            await new Promise(r => setTimeout(r, 400));
          }
        }
        const idxToRun = indicesToProcess[queuePointer];
        queuePointer++;
        activeWorkersCount++;
        await uploadSingleFile(idxToRun);
        activeWorkersCount--;
      }
    };

    const workerThreads = [];
    const threadCount = Math.min(CONCURRENCY, indicesToProcess.length);
    for (let t = 0; t < threadCount; t++) {
      workerThreads.push(workerQueue());
    }

    await Promise.all(workerThreads);
    clearInterval(governorInterval);
    fetchStorageFiles(currentFolderId);
  };

  const handleFilesSelectAndUpload = async (e) => {
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0) return;

    const selectedFiles = rawFiles.filter(isSupportedMediaFile);
    const ignoredCount = rawFiles.length - selectedFiles.length;

    if (selectedFiles.length === 0) {
      showToast('Berkas yang dipilih bukan format foto/video yang didukung.', 'error');
      e.target.value = '';
      return;
    }

    if (ignoredCount > 0) {
      showToast(`${ignoredCount} berkas non-media otomatis diabaikan. Mengunggah ${selectedFiles.length} foto/video valid.`, 'info');
    }

    setShowUploadModal(true);
    setIsUploadMinimized(false);

    const progressList = selectedFiles.map(f => ({ name: f.name, size: f.size, percent: 0, status: 'uploading', error: '' }));
    setUploadProgress([...progressList]);

    const fileMap = {};
    selectedFiles.forEach((file, idx) => { fileMap[idx] = file; });
    setLastSelectedFilesMap(fileMap);

    const indicesToProcess = selectedFiles.map((_, idx) => idx);
    await processUploadBatch(indicesToProcess, progressList, fileMap);
  };

  // 1. PRA-PEMROSESAN SELEKSI FOLDER (Analisis Statistik File & Sub-Folder untuk Modal Konfirmasi Kustom)
  const handleFolderSelectAndUpload = (e) => {
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0) return;

    const validFiles = rawFiles.filter(isSupportedMediaFile);
    const ignoredCount = rawFiles.length - validFiles.length;

    if (validFiles.length === 0) {
      showToast('Tidak ditemukan berkas foto/video yang didukung di dalam folder ini. Berkas sistem/coding diabaikan.', 'error');
      e.target.value = '';
      return;
    }

    const firstFile = validFiles[0];
    const relPath = firstFile.webkitRelativePath || '';
    const topFolderName = relPath ? relPath.split('/')[0] : 'Folder Baru';

    let totalSizeBytes = 0;
    const folderMap = {}; // path -> { count, sizeBytes }

    validFiles.forEach(f => {
      totalSizeBytes += (f.size || 0);
      const path = f.webkitRelativePath || '';
      if (path) {
        const folderPath = path.split('/').slice(0, -1).join('/');
        if (folderPath) {
          if (!folderMap[folderPath]) {
            folderMap[folderPath] = { count: 0, sizeBytes: 0 };
          }
          folderMap[folderPath].count += 1;
          folderMap[folderPath].sizeBytes += (f.size || 0);
        }
      }
    });

    const subFolderBreakdown = Object.keys(folderMap).map(p => ({
      path: p,
      count: folderMap[p].count,
      sizeBytes: folderMap[p].sizeBytes
    }));

    const distinctFoldersCount = Math.max(1, Object.keys(folderMap).length);

    setBatchConfirmData({
      topFolderName,
      totalFiles: validFiles.length,
      ignoredFilesCount: ignoredCount,
      totalFolders: distinctFoldersCount,
      totalSizeBytes,
      subFolderBreakdown,
      selectedFiles: validFiles,
      rawFiles
    });
  };

  // 2. EKSEKUSI PENGUNGGAHAN BATCH FOLDER SETELAH DIKONFIRMASI VENDOR DI MODAL KUSTOM
  const handleConfirmBatchUploadExecute = async () => {
    if (!batchConfirmData) return;
    const { selectedFiles, rawFiles, topFolderName } = batchConfirmData;
    setBatchConfirmData(null);

    // Langsung munculkan widget upload seketika
    setShowUploadModal(true);
    setIsUploadMinimized(false);

    const progressList = selectedFiles.map(f => ({ 
      name: f.webkitRelativePath || f.name, 
      size: f.size, 
      percent: 0, 
      status: 'uploading', 
      error: '' 
    }));
    setUploadProgress([...progressList]);

    const fileMap = {};
    selectedFiles.forEach((file, idx) => { fileMap[idx] = file; });
    setLastSelectedFilesMap(fileMap);

    try {
      setActionLoading(true);

      const createdFolderMap = {};

      // 1. Kumpulkan semua jalur sub-folder unik secara terstruktur
      const uniquePathsSet = new Set();
      for (const file of selectedFiles) {
        const relPath = file.webkitRelativePath || '';
        if (relPath) {
          const parts = relPath.split('/').slice(0, -1);
          let currentAcc = '';
          for (const part of parts) {
            currentAcc = currentAcc ? `${currentAcc}/${part}` : part;
            uniquePathsSet.add(currentAcc);
          }
        }
      }

      const sortedFolderPaths = Array.from(uniquePathsSet).sort((a, b) => a.split('/').length - b.split('/').length);
      const totalFoldersToCreate = sortedFolderPaths.length;

      if (totalFoldersToCreate > 0) {
        setFolderPrepStatus({
          current: 0,
          total: totalFoldersToCreate,
          text: `Menyiapkan struktur ${totalFoldersToCreate} sub-folder di Cloud Server...`
        });

        // PANGGIL 1 KALI API BATCH TREE SERVER-SIDE (MULTI-THREAD CEPAT)
        const res = await fetch('/api/storage/folders/batch-tree', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folderPaths: sortedFolderPaths,
            parentFolderId: currentFolderId,
            storageMode: activeStorageMode
          })
        });

        const data = await res.json();
        if (data.success && data.createdFolderMap) {
          Object.assign(createdFolderMap, data.createdFolderMap);
        } else {
          showToast(data.error || 'Sebagian struktur direktori gagal disiapkan.', 'error');
        }
      }

      setFolderPrepStatus(null);

      // 2. Petakan target overrideFolderId ke semua berkas dalam 1ms di memori
      for (const file of selectedFiles) {
        const relPath = file.webkitRelativePath || '';
        if (relPath) {
          const folderPath = relPath.split('/').slice(0, -1).join('/');
          if (folderPath && createdFolderMap[folderPath]) {
            file.overrideFolderId = createdFolderMap[folderPath];
          }
        }
      }

      const topFolderId = createdFolderMap[topFolderName] || currentFolderId;
      const indicesToProcess = selectedFiles.map((_, idx) => idx);
      await processUploadBatch(indicesToProcess, progressList, fileMap, topFolderId);
    } catch (err) {
      console.error('[Folder Upload Error]:', err);
      showToast('Gagal memproses unggah folder.', 'error');
      setFolderPrepStatus(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryFailedUploads = async () => {
    const failedIndices = [];
    const updatedProgress = uploadProgress.map((item, idx) => {
      if (item.status === 'error') {
        failedIndices.push(idx);
        return { ...item, status: 'uploading', percent: 0, error: '' };
      }
      return item;
    });

    if (failedIndices.length === 0) return;

    setUploadProgress([...updatedProgress]);
    await processUploadBatch(failedIndices, updatedProgress, lastSelectedFilesMap);
  };

  // 3. HAPUS FILE SPESIFIK & REFUND KUOTA
  const handleDeleteFile = async (fileId, fileName) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus berkas "${fileName}"?\n\nFile akan dihapus secara permanen dari Cloud Storage dan kuota Anda akan dikembalikan.`)) {
      return;
    }

    // INSTANT OPTIMISTIC UI REMOVAL
    const targetFile = files.find(f => f.id === fileId);
    setFiles(prev => prev.filter(f => f.id !== fileId));

    try {
      setActionLoading(true);
      const res = await fetch(`/api/storage/files?id=${fileId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        if (data.refundedBytes) {
          setVendorData(prev => prev ? { ...prev, usedStorageBytes: Math.max(0, (prev.usedStorageBytes || 0) - data.refundedBytes) } : prev);
        }
        fetchStorageFiles(currentFolderId);
      } else {
        if (targetFile) setFiles(prev => [...prev, targetFile]);
        showToast(data.error || 'Gagal menghapus berkas.', 'error');
      }
    } catch {
      if (targetFile) setFiles(prev => [...prev, targetFile]);
      showToast('Gagal memproses penghapusan berkas.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. HAPUS FOLDER & REFUND KUOTA STORAGE
  const handleDeleteFolder = async (folderId, folderName) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus folder "${folderName}"?\n\nPERHATIAN: Seluruh berkas file dan sub-folder di dalamnya akan dihapus secara permanen, dan kuota storage Anda akan dikembalikan.`)) {
      return;
    }

    // INSTANT OPTIMISTIC UI REMOVAL
    const targetFolder = subFolders.find(sf => sf.id === folderId || sf.driveFolderId === folderId);
    setSubFolders(prev => prev.filter(sf => sf.id !== folderId && sf.driveFolderId !== folderId));

    try {
      setActionLoading(true);
      const res = await fetch(`/api/storage/folders?folderId=${folderId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        fetchStorageFiles(currentFolderId);
      } else {
        if (targetFolder) setSubFolders(prev => [...prev, targetFolder]);
        showToast(data.error || 'Gagal menghapus folder.', 'error');
      }
    } catch {
      if (targetFolder) setSubFolders(prev => [...prev, targetFolder]);
      showToast('Gagal memproses penghapusan folder.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // NAVIGASI BREADCRUMB
  const navigateToFolder = (folderId, folderName) => {
    setFileDisplayLimit(25);
    const existingIndex = folderStack.findIndex(f => f.id === folderId);
    if (existingIndex !== -1) {
      setFolderStack(folderStack.slice(0, existingIndex + 1));
    } else {
      setFolderStack([...folderStack, { id: folderId, name: folderName }]);
    }
    setCurrentFolderId(folderId);
  };

  const handleNavigateBack = () => {
    if (folderStack.length > 1) {
      const parentFolder = folderStack[folderStack.length - 2];
      navigateToFolder(parentFolder.id, parentFolder.name);
    }
  };

  const handleSubscribeAddon = async (planId) => {
    try {
      setActionLoading(true);
      if (paymentMethodTab === 'manual') {
        if (!paymentProofFile) {
          showToast('Silakan pilih foto bukti transfer terlebih dahulu.', 'error');
          setActionLoading(false);
          return;
        }

        const formData = new FormData();
        formData.append('addonPlanId', planId);
        formData.append('paymentMethod', 'manual');
        formData.append('paymentProof', paymentProofFile);
        if (planId === 'custom') {
          formData.append('customQuotaGb', customStorageGb);
        }

        const res = await fetch('/api/payment/addon/create', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success) {
          showToast(data.message || 'Permintaan Add-On Storage berhasil diajukan! Menunggu verifikasi Admin.', 'success');
          setShowAddonModal(false);
          setPaymentProofFile(null);
          fetchStorageFiles(currentFolderId);
        } else {
          showToast(data.error || 'Gagal mengajukan permohonan Add-On Storage.', 'error');
        }
      } else {
        const payload = { addonPlanId: planId, paymentMethod: 'gateway' };
        if (planId === 'custom') {
          payload.customQuotaGb = customStorageGb;
        }

        const res = await fetch('/api/payment/addon/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          if (data.isPaymentRequired) {
            setShowAddonModal(false);
            setPaymentModalData(data);
            showToast('Invoice pembayaran berhasil dibuat. Silakan selesaikan pembayaran.', 'success');
          } else {
            showToast(data.message, 'success');
            setShowAddonModal(false);
            fetchStorageFiles(currentFolderId);
          }
        } else {
          showToast(data.error || 'Gagal mengaktifkan paket Add-On Storage.', 'error');
        }
      }
    } catch {
      showToast('Gagal menghubungi server transaksi.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenAddonModal = async () => {
    try {
      setActionLoading(true);
      const res = await fetch('/api/payment/addon/pending');
      const data = await res.json();
      if (data.success && data.hasPending && data.pendingOrder) {
        setPaymentModalData(data.pendingOrder);
        return;
      }
    } catch (e) {
      console.error('Failed to check pending addon payment:', e);
    } finally {
      setActionLoading(false);
    }

    setSelectedPlanId(null);
    setShowAddonModal(true);
  };

  const handleClosePaymentModal = async () => {
    setPaymentModalData(null);
  };

  const handleCancelPendingPayment = async () => {
    if (paymentModalData?.orderId) {
      try {
        await fetch('/api/payment/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: paymentModalData.orderId })
        });
      } catch (e) {}
    }
    setPaymentModalData(null);
    setSelectedPlanId(null);
    if (vendorData?.addonStorageQuotaBytes && vendorData?.addonStorageQuotaBytes > 0) {
      const currentQuotaGb = Math.round(vendorData.addonStorageQuotaBytes / (1024 * 1024 * 1024));
      if (currentQuotaGb >= 50) {
        setCustomStorageGb(currentQuotaGb);
      }
    }
    setShowAddonModal(true);
  };

  const formatIDR = (amount) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const usedBytes = vendorData?.usedStorageBytes || 0;
  const quotaBytes = vendorData?.addonStorageQuotaBytes || 0;
  const vendorQuotaGb = quotaBytes > 0 ? Math.round(quotaBytes / (1024 * 1024 * 1024)) : 25;
  const usagePercent = quotaBytes > 0 ? Math.min(100, Math.round((usedBytes / quotaBytes) * 100)) : (usedBytes > 0 ? 100 : 0);
  const daysRemaining = vendorData?.expiresAt 
    ? Math.max(1, Math.min(30, Math.ceil((new Date(vendorData.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))))
    : 30;

  const getProratedPrice = (price) => {
    if (!price) return 0;
    return Math.max(10000, Math.round((price / 30) * daysRemaining));
  };

  const hasAddon = vendorData?.hasStorageAddon || quotaBytes > 0;

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#f4f4f5', padding: '24px', fontFamily: "'Inter', sans-serif" }}>
      {/* Toast Notification */}
      {notification.show && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: '12px',
          backdropFilter: 'blur(16px)',
          border: notification.type === 'error' ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(52,211,153,0.4)',
          background: notification.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(52,211,153,0.15)',
          color: notification.type === 'error' ? '#f87171' : '#34d399',
          fontSize: '13px',
          fontWeight: '600',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          {notification.message}
        </div>
      )}

      {/* Main Container */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <Link href="/dashboard" style={{ fontSize: '12px', color: '#818cf8', textDecoration: 'none', fontWeight: '500' }}>
              &larr; Kembali ke Dashboard Utama
            </Link>
            <h1 style={{ margin: '4px 0 2px 0', fontSize: '24px', fontWeight: '800', background: 'linear-gradient(135deg, #818cf8, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderIcon size={24} color="#818cf8" />
              <span>Cloud Storage Manager</span>
            </h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#a1a1aa' }}>
              Kelola kapasitas penyimpanan cloud dedicated studio, buat folder, & unggah berkas media.
            </p>
          </div>
        </div>

        {/* 🗂️ 2-TAB NAVIGATION BAR: GOOGLE DRIVE PRIBADI (BYOS) vs DEDICATED STORAGE SAAS */}
        <div style={{
          display: 'flex',
          gap: '8px',
          background: 'rgba(15, 23, 42, 0.6)',
          padding: '4px',
          borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <button
            type="button"
            onClick={() => handleSwitchTab('byos')}
            style={{
              flex: 1,
              padding: '12px 18px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              border: activeStorageMode === 'byos' ? '1px solid rgba(52,211,153,0.4)' : 'none',
              background: activeStorageMode === 'byos' ? 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.15) 100%)' : 'transparent',
              color: activeStorageMode === 'byos' ? '#34d399' : '#9ca3af',
              boxShadow: activeStorageMode === 'byos' ? '0 2px 10px rgba(16,185,129,0.2)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <GoogleDriveIcon size={18} />
            <span>Google Drive Pribadi (BYOS)</span>
            {byosState.connected ? (
              <span style={{ fontSize: '10px', background: 'rgba(52,211,153,0.2)', color: '#34d399', padding: '2px 8px', borderRadius: '10px', fontWeight: '800', border: '1px solid rgba(52,211,153,0.3)' }}>
                ✓ {byosState.email || 'Terhubung'}
              </span>
            ) : (
              <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.06)', color: '#a1a1aa', padding: '2px 8px', borderRadius: '10px' }}>
                Belum Terhubung
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSwitchTab('system')}
            style={{
              flex: 1,
              padding: '12px 18px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              border: activeStorageMode === 'system' ? '1px solid rgba(99,102,241,0.5)' : 'none',
              background: activeStorageMode === 'system' ? 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(79,70,229,0.15) 100%)' : 'transparent',
              color: activeStorageMode === 'system' ? '#818cf8' : '#9ca3af',
              boxShadow: activeStorageMode === 'system' ? '0 2px 10px rgba(99,102,241,0.2)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <CloudServerIcon size={18} color={activeStorageMode === 'system' ? '#818cf8' : '#9ca3af'} />
            <span>Dedicated Cloud Storage</span>
            <span style={{ fontSize: '10px', background: hasAddon ? 'rgba(99,102,241,0.2)' : 'rgba(251,191,36,0.15)', color: hasAddon ? '#818cf8' : '#fbbf24', padding: '2px 8px', borderRadius: '10px', fontWeight: '800', border: hasAddon ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(251,191,36,0.3)' }}>
              {hasAddon ? `${vendorQuotaGb} GB Aktif` : 'Sewa Tambahan'}
            </span>
          </button>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#a1a1aa', fontSize: '14px' }}>
            Memuat data Cloud Storage Manager...
          </div>
        )}

        {/* TAB 1: GOOGLE DRIVE PRIBADI (BYOS) */}
        {!loading && activeStorageMode === 'byos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {byosState.connected ? (
              <div style={{
                background: 'rgba(52,211,153,0.06)',
                border: '1px solid rgba(52,211,153,0.4)',
                borderRadius: '14px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', background: 'rgba(52,211,153,0.2)', color: '#34d399', padding: '3px 8px', borderRadius: '10px', border: '1px solid rgba(52,211,153,0.4)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CloudConnectedIcon size={12} color="#34d399" /> GOOGLE DRIVE TERHUBUNG
                    </span>
                    <span style={{ fontSize: '11px', color: '#a1a1aa', fontFamily: 'monospace' }}>{byosState.email}</span>
                  </div>
                  {byosState.quota && (
                    <div style={{ marginTop: '6px', fontSize: '12px', color: '#a1a1aa' }}>
                      Kapasitas Drive: <strong style={{ color: '#34d399' }}>{formatBytes(byosState.quota.usedBytes)}</strong> / {byosState.quota.limitBytes > 0 ? formatBytes(byosState.quota.limitBytes) : 'Unlimited'} Terpakai
                      {byosState.quota.freeBytes !== null && (
                        <span style={{ marginLeft: '10px', color: '#fbbf24' }}>
                          (Sisa {formatBytes(byosState.quota.freeBytes)} Kosong)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={handleSyncByosFolders}
                    style={{ padding: '8px 16px', background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.35)', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    title="Tarik & Tampilkan Folder dari Root Google Drive Anda ke Konsol Ini"
                  >
                    <SyncIcon size={14} color="#38bdf8" />
                    <span>Sync GDrive</span>
                    {hasByosUpdates && (
                      <span style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '800' }}>
                        Ada Update Baru
                      </span>
                    )}
                  </button>
                  <button
                    onClick={handleDisconnectByosDrive}
                    style={{ padding: '8px 14px', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <DisconnectIcon size={14} color="#f87171" />
                    <span>Putus Akses</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                background: 'rgba(52,211,153,0.06)',
                border: '1px solid rgba(52,211,153,0.3)',
                borderRadius: '16px',
                padding: '28px 24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '14px'
              }}>
                <GoogleDriveIcon size={44} />
                <div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '800', color: '#ffffff' }}>
                    Hubungkan Google Drive Studio Anda (BYOS)
                  </h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#a1a1aa', maxWidth: '500px', lineHeight: '1.5' }}>
                    Gunakan penyimpanan Google Drive pribadi studio foto Anda sendiri secara gratis tanpa memotong kuota platform.
                  </p>
                </div>
                <button
                  onClick={handleConnectByosDrive}
                  style={{
                    padding: '10px 22px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <GoogleDriveIcon size={16} />
                  <span>Hubungkan Google Drive Sekarang</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DEDICATED CLOUD STORAGE SAAS */}
        {!loading && activeStorageMode === 'system' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {hasAddon ? (
              <div style={{
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.4)',
                borderRadius: '14px',
                padding: '16px 20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.4)', padding: '2px 8px', borderRadius: '10px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CloudServerIcon size={12} color="#818cf8" /> DEDICATED CLOUD STORAGE
                      </span>
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#ffffff', marginTop: '4px' }}>
                      {formatBytes(usedBytes)} <span style={{ fontSize: '13px', color: '#71717a', fontWeight: '400' }}>/ {formatBytes(quotaBytes)}</span>
                      <span style={{ fontSize: '12px', color: usagePercent >= 90 ? '#f87171' : usagePercent >= 70 ? '#fbbf24' : '#34d399', marginLeft: '8px', fontWeight: '700' }}>
                        ({usagePercent}% Terpakai)
                      </span>
                    </div>
                  </div>

                  {addonPlans && addonPlans.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={handleOpenAddonModal}
                        style={{
                          padding: '8px 16px',
                          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          boxShadow: '0 2px 10px rgba(99,102,241,0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <SparklesUpgradeIcon size={14} color="#ffffff" />
                        <span>Upgrade Kuota Storage</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                <div style={{ width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', height: '6px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    borderRadius: '8px',
                    width: `${usagePercent}%`,
                    background: usagePercent >= 90 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #6366f1, #34d399)',
                    transition: 'all 0.4s ease'
                  }} />
                </div>
              </div>
            ) : (addonPlans && addonPlans.length > 0) ? (
              <div style={{
                background: 'rgba(99,102,241,0.06)',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: '16px',
                padding: '28px 24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '14px'
              }}>
                <CloudServerIcon size={44} color="#818cf8" />
                <div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '800', color: '#ffffff' }}>
                    Dedicated Cloud Storage Belum Aktif
                  </h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#a1a1aa', maxWidth: '500px', lineHeight: '1.5' }}>
                    Sewa ruang penyimpanan super cepat berbasis cloud storage tanpa perlu menghubungkan akun Google pribadi Anda.
                  </p>
                </div>
                <button
                  onClick={() => handleOpenAddonModal()}
                  style={{
                    padding: '10px 22px',
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <SparklesUpgradeIcon size={16} color="#ffffff" />
                  <span>Beli Paket Add-On Storage Sekarang</span>
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* DASHBOARD CLOUD STORAGE EXPLORER */}
        {!loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Breadcrumb Navigation Bar with Back Button */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              fontSize: '13px',
              color: '#a1a1aa'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {folderStack.length > 1 && (
                  <button
                    type="button"
                    onClick={handleNavigateBack}
                    style={{
                      padding: '5px 12px',
                      background: activeStorageMode === 'byos' ? 'rgba(52,211,153,0.15)' : 'rgba(99,102,241,0.15)',
                      color: activeStorageMode === 'byos' ? '#34d399' : '#818cf8',
                      border: activeStorageMode === 'byos' ? '1px solid rgba(52,211,153,0.35)' : '1px solid rgba(99,102,241,0.35)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                      transition: 'all 0.15s ease'
                    }}
                    title={`Kembali ke: ${folderStack[folderStack.length - 2]?.name || 'Folder Sebelumnya'}`}
                  >
                    <span style={{ fontSize: '13px', fontWeight: '900' }}>←</span>
                    <span>Kembali</span>
                  </button>
                )}

                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#71717a' }}>
                  <PinLocationIcon size={14} color={activeStorageMode === 'byos' ? '#34d399' : '#818cf8'} />
                  <span style={{ fontWeight: '600' }}>Lokasi:</span>
                </span>

                {folderStack.map((f, idx) => (
                  <span key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {idx > 0 && <span style={{ color: '#52525b' }}>/</span>}
                    <button
                      type="button"
                      onClick={() => navigateToFolder(f.id, f.name)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: idx === folderStack.length - 1 ? '#34d399' : '#818cf8',
                        fontWeight: idx === folderStack.length - 1 ? '700' : '500',
                        cursor: 'pointer',
                        fontSize: '13px',
                        padding: '2px 4px',
                        borderRadius: '4px'
                      }}
                    >
                      {f.name}
                    </button>
                  </span>
                ))}
              </div>

              {folderStack.length > 1 && (
                <span style={{ fontSize: '11px', color: '#71717a' }}>
                  Tingkat {folderStack.length - 1}
                </span>
              )}
            </div>

            {/* Toolbar Controls: Action Buttons, Search Bar & View Mode Switch */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* Action Buttons for active tab */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(true)}
                  style={{
                    padding: '9px 16px',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#e4e4e7',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <FolderPlusIcon size={14} color="#e4e4e7" />
                  <span>Folder Baru</span>
                </button>

                <label
                  style={{
                    padding: '9px 16px',
                    background: activeStorageMode === 'byos' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: '#ffffff',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: activeStorageMode === 'byos' ? '0 4px 14px rgba(16,185,129,0.3)' : '0 4px 14px rgba(99,102,241,0.3)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <UploadCloudIcon size={14} color="#ffffff" />
                  <span>Upload File / Foto</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFilesSelectAndUpload}
                    style={{ display: 'none' }}
                  />
                </label>

                <label
                  style={{
                    padding: '9px 16px',
                    background: activeStorageMode === 'byos' ? 'rgba(52,211,153,0.12)' : 'rgba(99,102,241,0.12)',
                    color: activeStorageMode === 'byos' ? '#34d399' : '#818cf8',
                    border: activeStorageMode === 'byos' ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(99,102,241,0.3)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                  title="Pilih dan unggah seluruh folder fisik dari komputer Anda sekaligus"
                >
                  <UploadFolderIcon size={14} color={activeStorageMode === 'byos' ? '#34d399' : '#818cf8'} />
                  <span>Upload Folder</span>
                  <input
                    type="file"
                    webkitdirectory="true"
                    directory="true"
                    multiple
                    onChange={handleFolderSelectAndUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {/* Search & View Mode Switch */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, justifyContent: 'flex-end', minWidth: '280px' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
                  <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                    <SearchIcon size={14} color="#71717a" />
                  </div>
                  <input
                    type="text"
                    placeholder="Cari folder / berkas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 14px 9px 34px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px',
                      color: '#ffffff',
                      fontSize: '12px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '3px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: viewMode === 'grid' ? (activeStorageMode === 'byos' ? '#10b981' : '#6366f1') : 'transparent',
                      color: viewMode === 'grid' ? '#ffffff' : '#a1a1aa',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <GridIcon size={13} color="currentColor" />
                    <span>Grid</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: viewMode === 'list' ? (activeStorageMode === 'byos' ? '#10b981' : '#6366f1') : 'transparent',
                      color: viewMode === 'list' ? '#ffffff' : '#a1a1aa',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <ListIcon size={13} color="currentColor" />
                    <span>Tabel</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 1. DAFTAR FOLDER PROYEK KLIEN & SUB-FOLDER SESI */}
            {(subFolders.length > 0 || folderStack.length === 1) && (
              <div>
                {subFolders.filter(sf => sf.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '16px', padding: '36px 20px', textAlign: 'center', color: '#71717a', fontSize: '13px' }}>
                    {searchQuery ? `Tidak ada folder yang cocok dengan pencarian "${searchQuery}".` : 'Belum ada folder proyek di Cloud Storage ini.'}<br/>
                    {!searchQuery && (
                      <button
                        onClick={() => setShowNewFolderModal(true)}
                        style={{ marginTop: '12px', padding: '8px 16px', background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <FolderPlusIcon size={14} color="#818cf8" />
                        <span>Buat Folder Proyek Baru</span>
                      </button>
                    )}
                  </div>
                ) : viewMode === 'grid' ? (
                  /* MODE GRID KARTU RINGKAS */
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                    {subFolders.filter(sf => sf.name.toLowerCase().includes(searchQuery.toLowerCase())).map((sf) => {
                      const driveUrl = sf.webViewLink || `https://drive.google.com/drive/folders/${sf.driveFolderId}`;
                      return (
                        <div
                          key={sf.id}
                          onClick={() => navigateToFolder(sf.driveFolderId || sf.id, sf.name)}
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '14px',
                            padding: '14px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <FolderIcon size={30} color={activeStorageMode === 'byos' ? '#34d399' : '#818cf8'} />
                            <div style={{ overflow: 'hidden', flex: 1 }}>
                              <div style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{sf.name}</span>
                                {sf.linkedProjectId && (
                                  <span style={{ fontSize: '9px', background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)', padding: '1px 6px', borderRadius: '6px', fontWeight: '700' }}>
                                    ✓ Project Aktif
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '11px', color: '#a1a1aa', marginTop: '3px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <PhotoIcon size={12} color="#a1a1aa" />
                                  <span>{sf.fileCount || 0} File</span>
                                </span>
                                <span>&bull;</span>
                                <span style={{ color: '#34d399', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <DiskStorageIcon size={12} color="#34d399" />
                                  <span>{formatBytes(sf.totalSizeBytes || 0)}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Primary & Secondary Action Buttons */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                            {sf.linkedProjectId ? (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(`/storage/gallery/${sf.driveFolderId || sf.id}`, '_blank');
                                  }}
                                  style={{
                                    padding: '8px 10px',
                                    background: 'rgba(16, 185, 129, 0.14)',
                                    color: '#34d399',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '5px'
                                  }}
                                  title="Buka Halaman Galeri Folder (Tampilan Media Standalone dengan Branding Logo Studio)"
                                >
                                  <GalleryViewIcon size={13} color="#34d399" />
                                  <span>Galeri Folder</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/dashboard?openProjectId=${sf.linkedProjectId}`);
                                  }}
                                  style={{
                                    padding: '8px 10px',
                                    background: 'rgba(99, 102, 241, 0.15)',
                                    color: '#818cf8',
                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '5px'
                                  }}
                                  title="Kelola Project Seleksi Foto Klien Ini di Dashboard Utama"
                                >
                                  <SettingsManageIcon size={13} color="#818cf8" />
                                  <span>Kelola Project</span>
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(`/storage/gallery/${sf.driveFolderId || sf.id}`, '_blank');
                                  }}
                                  style={{
                                    padding: '8px 10px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    color: '#e4e4e7',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '5px'
                                  }}
                                  title="Buka Halaman Galeri Folder (Tampilan Media Standalone)"
                                >
                                  <GalleryViewIcon size={13} color="#e4e4e7" />
                                  <span>Galeri Folder</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenCreateProjectModal(sf);
                                  }}
                                  style={{
                                    padding: '8px 10px',
                                    background: 'rgba(16, 185, 129, 0.14)',
                                    color: '#34d399',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '5px'
                                  }}
                                  title="Jadikan Folder Ini Sebagai Project Galeri Klien Baru"
                                >
                                  <RocketLaunchIcon size={13} color="#34d399" />
                                  <span>Jadikan Project</span>
                                </button>
                              </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                              <a
                                href={driveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  padding: '6px 8px',
                                  background: 'rgba(99,102,241,0.12)',
                                  color: '#818cf8',
                                  border: '1px solid rgba(99,102,241,0.25)',
                                  borderRadius: '8px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  textDecoration: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px'
                                }}
                                title="Buka Folder di Google Drive"
                              >
                                <GoogleDriveIcon size={12} />
                                <span>Drive</span>
                              </a>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(driveUrl);
                                  showToast('Link Share Google Drive berhasil disalin!', 'success');
                                }}
                                style={{
                                  padding: '6px 8px',
                                  background: 'rgba(255,255,255,0.05)',
                                  color: '#e4e4e7',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: '8px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px'
                                }}
                                title="Salin Link Share Folder"
                              >
                                <CopyLinkIcon size={12} color="#e4e4e7" />
                                <span>Salin</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFolder(sf.driveFolderId || sf.id, sf.name);
                                }}
                                style={{
                                  padding: '6px 8px',
                                  background: 'rgba(239,68,68,0.12)',
                                  color: '#f87171',
                                  border: '1px solid rgba(239,68,68,0.25)',
                                  borderRadius: '8px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px'
                                }}
                                title="Hapus Folder Beserta Seluruh Berkas Di Dalamnya"
                              >
                                <TrashIcon size={12} color="#f87171" />
                                <span>Hapus</span>
                              </button>
                            </div>

                            {byosState.connected && !sf.isExternalDrive && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMigrateFolderToByos(sf);
                                }}
                                style={{
                                  marginTop: '8px',
                                  width: '100%',
                                  padding: '7px 10px',
                                  background: 'rgba(99,102,241,0.12)',
                                  color: '#818cf8',
                                  border: '1px solid rgba(99,102,241,0.3)',
                                  borderRadius: '8px',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '5px'
                                }}
                                title="Pindahkan Folder Asli ke Google Drive Anda"
                              >
                                <TransferDriveIcon size={13} color="#818cf8" />
                                <span>Pindahkan ke Drive Saya</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* MODE TABEL DAFTAR KIKIS (LIST VIEW) */
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#a1a1aa' }}>
                          <th style={{ padding: '10px 14px' }}>NAMA FOLDER PROYEK</th>
                          <th style={{ padding: '10px 14px' }}>SUB-FOLDER</th>
                          <th style={{ padding: '10px 14px' }}>JUMLAH FILE</th>
                          <th style={{ padding: '10px 14px' }}>UKURAN STORAGE</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' }}>AKSI LINK</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subFolders.filter(sf => sf.name.toLowerCase().includes(searchQuery.toLowerCase())).map((sf) => {
                          const driveUrl = sf.webViewLink || `https://drive.google.com/drive/folders/${sf.driveFolderId}`;
                          return (
                            <tr key={sf.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td style={{ padding: '10px 14px', fontWeight: '700', color: '#ffffff', cursor: 'pointer' }} onClick={() => navigateToFolder(sf.driveFolderId || sf.id, sf.name)}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  <FolderIcon size={15} color="#818cf8" />
                                  <span>{sf.name}</span>
                                </span>
                              </td>
                              <td style={{ padding: '10px 14px', color: '#a1a1aa' }}>{sf.subFolderCount || 0} Sub-folder</td>
                              <td style={{ padding: '10px 14px', color: '#a1a1aa' }}>{sf.fileCount || 0} Berkas</td>
                              <td style={{ padding: '10px 14px', color: '#34d399', fontWeight: '700' }}>{formatBytes(sf.totalSizeBytes || 0)}</td>
                              <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                  <button
                                    onClick={() => router.push(`/dashboard?createProjectFolderId=${sf.driveFolderId || sf.id}&createProjectName=${encodeURIComponent(sf.name)}`)}
                                    style={{ padding: '4px 10px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    title="Jadikan Folder Ini Sebagai Project Galeri Klien Baru"
                                  >
                                    <RocketLaunchIcon size={12} color="#ffffff" />
                                    <span>Jadikan Project</span>
                                  </button>
                                  <a href={driveUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '4px 8px', background: 'rgba(99,102,241,0.15)', color: '#818cf8', borderRadius: '6px', fontSize: '11px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <GoogleDriveIcon size={11} />
                                    <span>Drive</span>
                                  </a>
                                  <button onClick={() => { navigator.clipboard.writeText(driveUrl); showToast('Link berhasil disalin!', 'success'); }} style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.06)', color: '#e4e4e7', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <CopyLinkIcon size={11} color="#e4e4e7" />
                                    <span>Salin</span>
                                  </button>
                                  <button onClick={() => handleDeleteFolder(sf.driveFolderId || sf.id, sf.name)} style={{ padding: '4px 8px', background: 'rgba(239,68,68,0.15)', color: '#f87171', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <TrashIcon size={11} color="#f87171" />
                                    <span>Hapus</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 2. BERKAS FILE INSIDE FOLDER (HANYA DITAMPILKAN KETIKA DALAM FOLDER ATAU BILA ADA FILE) */}
            {(folderStack.length > 1 || files.length > 0) && (() => {
              const filteredFiles = files.filter(f => f.fileName.toLowerCase().includes(searchQuery.toLowerCase()));
              const displayedFiles = filteredFiles.slice(0, fileDisplayLimit);
              return (
                <div>
                  <h4 style={{ margin: '8px 0 8px 0', fontSize: '13px', fontWeight: '700', color: '#e4e4e7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <FileDocumentIcon size={16} color="#818cf8" />
                      <span>Berkas File ({filteredFiles.length})</span>
                    </span>
                    {filteredFiles.length > 0 && (
                      <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: '400' }}>
                        Menampilkan {displayedFiles.length} dari {filteredFiles.length} berkas
                      </span>
                    )}
                  </h4>

                  {filteredFiles.length === 0 ? (
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '16px', padding: '40px 20px', textAlign: 'center', color: '#71717a', fontSize: '13px' }}>
                      {searchQuery ? `Tidak ada berkas file yang cocok dengan "${searchQuery}".` : 'Belum ada berkas file di dalam folder ini.'}<br/>
                      {!searchQuery && (
                        <span style={{ fontSize: '11px', color: '#52525b', marginTop: '6px', display: 'block' }}>Klik tombol <strong>"Upload File / Foto"</strong> di kanan atas untuk mengunggah berkas foto/video fisik Anda.</span>
                      )}
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#a1a1aa' }}>
                            <th style={{ padding: '12px 16px' }}>NAMA BERKAS</th>
                            <th style={{ padding: '12px 16px' }}>FORMAT</th>
                            <th style={{ padding: '12px 16px' }}>UKURAN FILE</th>
                            <th style={{ padding: '12px 16px' }}>TANGGAL UPLOAD</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right' }}>AKSI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedFiles.map((file, idx) => {
                            const isVideo = file.mimeType?.includes('video') || file.fileName?.match(/\.(mp4|mov|avi)$/i);
                            return (
                              <tr
                                key={file.id}
                                onClick={() => {
                                  setPreviewSourceFiles(displayedFiles);
                                  setActivePreviewIndex(idx);
                                }}
                                style={{
                                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                                  cursor: 'pointer',
                                  transition: 'background 0.15s ease'
                                }}
                              >
                                <td style={{ padding: '12px 16px', fontWeight: '600', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {isVideo ? <VideoIcon size={16} color="#f43f5e" /> : <PhotoIcon size={16} color="#38bdf8" />}
                                  <span style={{ maxWidth: '320px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.fileName}</span>
                                </td>
                                <td style={{ padding: '12px 16px', color: '#a1a1aa' }}>{file.mimeType || 'Media'}</td>
                                <td style={{ padding: '12px 16px', color: '#34d399', fontWeight: '700' }}>{formatBytes(file.fileSizeBytes)}</td>
                                <td style={{ padding: '12px 16px', color: '#71717a' }}>{file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : '-'}</td>
                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteFile(file.id, file.fileName);
                                    }}
                                    style={{
                                      padding: '4px 8px',
                                      background: 'rgba(239,68,68,0.1)',
                                      color: '#f87171',
                                      border: 'none',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                    title="Hapus Berkas Ini"
                                  >
                                    <TrashIcon size={12} color="#f87171" />
                                    <span>Hapus</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Auto Infinite Scroll Sentinel Element */}
                      <div ref={fileListEndRef} style={{ height: '4px', width: '100%' }} />

                      {/* Lazy Load / Load More Controller Bar */}
                      {filteredFiles.length > displayedFiles.length && (
                        <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                          <span style={{ fontSize: '12px', color: '#a1a1aa' }}>
                            Menampilkan <strong style={{ color: '#ffffff' }}>{displayedFiles.length}</strong> dari <strong style={{ color: '#ffffff' }}>{filteredFiles.length}</strong> berkas file (Auto Infinite Scroll aktif)
                          </span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => setFileDisplayLimit(prev => prev + 25)}
                              style={{ padding: '6px 14px', background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.4)', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                            >
                              Muat Lebih Banyak (+25 File)
                            </button>
                            <button
                              type="button"
                              onClick={() => setFileDisplayLimit(filteredFiles.length)}
                              style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.06)', color: '#e4e4e7', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                            >
                              Tampilkan Semua ({filteredFiles.length})
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}


          </div>
        )}
      </div>

      {/* Modal 1: Buat Sub-Folder Baru */}
      {showNewFolderModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowNewFolderModal(false)}>
          <div style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', maxWidth: '420px', width: '100%', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderPlusIcon size={20} color="#34d399" />
              <span>Buat Folder Baru</span>
            </h3>
            <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: activeStorageMode === 'byos' ? '#34d399' : '#818cf8' }}>
              Target: <strong>{activeStorageMode === 'byos' ? 'Google Drive Pribadi (BYOS)' : 'Dedicated Cloud Storage'}</strong>
            </p>
            <form onSubmit={handleCreateFolder}>
              <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '6px' }}>Nama Folder:</label>
              <input
                type="text"
                placeholder="Contoh: Prewedding Sandra & Budi"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#ffffff', fontSize: '13px', marginBottom: '16px' }}
                autoFocus
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setShowNewFolderModal(false)} style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.06)', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={actionLoading} style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                  {actionLoading ? 'Membuat...' : 'Buat Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Google Drive Style Upload Progress Widget (Bottom Right with Minimize/Expand) */}
      {showUploadModal && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 99999,
          width: isUploadMinimized ? '340px' : '480px',
          background: '#18181b',
          border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: '16px',
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          {/* Header Bar dengan Minimize & Close */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: isUploadMinimized ? 'none' : '1px solid rgba(255,255,255,0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>
              <UploadCloudIcon size={16} color="#818cf8" />
              <span>
                {folderPrepStatus 
                  ? `Menyiapkan Folder (${folderPrepStatus.current}/${folderPrepStatus.total})...`
                  : uploadProgress.every(f => f.status === 'completed')
                    ? 'Pengunggahan Selesai'
                    : `Mengunggah ${uploadProgress.filter(f => f.status === 'uploading').length || uploadProgress.length} Berkas...`}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setIsUploadMinimized(!isUploadMinimized)}
                title={isUploadMinimized ? 'Perluas Tampilan Upload' : 'Minimize ke Pojok Bawah'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#a1a1aa',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {isUploadMinimized ? '▲' : '▼'}
              </button>

              <button
                type="button"
                onClick={handleCloseUploadWidget}
                title="Tutup Widget Upload"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#a1a1aa',
                  fontSize: '14px',
                  cursor: 'pointer',
                  padding: '2px 6px'
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Expanded Single Stream Queue UI */}
          {!isUploadMinimized && (
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* Folder Preparation Banner if active */}
              {folderPrepStatus && (
                <div style={{
                  background: 'rgba(99,102,241,0.12)',
                  border: '1px solid rgba(99,102,241,0.35)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: '700', color: '#818cf8' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <FolderIcon size={14} color="#818cf8" />
                      <span>Menyiapkan Struktur Direktori</span>
                    </span>
                    <span>{folderPrepStatus.current} / {folderPrepStatus.total} Folder</span>
                  </div>
                  <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.round((folderPrepStatus.current / Math.max(1, folderPrepStatus.total)) * 100)}%`,
                      background: 'linear-gradient(90deg, #6366f1, #34d399)',
                      transition: 'width 0.2s ease'
                    }} />
                  </div>
                  <span style={{ fontSize: '11px', color: '#a1a1aa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {folderPrepStatus.text}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#ffffff', fontWeight: '700' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <UploadCloudIcon size={14} color="#34d399" />
                    <span>Batch Unggahan ({uploadProgress.filter(i => i.status === 'completed').length} / {uploadProgress.length} Berkas Selesai)</span>
                  </span>
                  {isTurboModeActive && (
                    <span style={{ fontSize: '10px', color: '#34d399', fontWeight: '800', background: 'rgba(52,211,153,0.15)', padding: '2px 6px', borderRadius: '6px', border: '1px solid rgba(52,211,153,0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <SpeedBoltIcon size={11} color="#34d399" />
                      <span>Turbo Upload</span>
                    </span>
                  )}
                </div>
                <span style={{ color: '#34d399', fontWeight: '800', fontSize: '14px' }}>
                  {Math.round((uploadProgress.filter(i => i.status === 'completed').length / Math.max(1, uploadProgress.length)) * 100)}%
                </span>
              </div>

              {/* Single Main Stream Progress Bar */}
              <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', height: '10px', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.round((uploadProgress.filter(i => i.status === 'completed').length / Math.max(1, uploadProgress.length)) * 100)}%`,
                  background: 'linear-gradient(90deg, #6366f1, #34d399)',
                  transition: 'width 0.3s ease'
                }} />
              </div>

              {/* Clean Estimasi Waktu & Speed Row (No Technical Jargon) */}
              <div style={{ fontSize: '12px', color: '#e4e4e7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TimerClockIcon size={14} color="#a1a1aa" />
                  <span style={{ fontWeight: '700', color: '#ffffff' }}>
                    {uploadProgress.every(i => i.status === 'completed')
                      ? 'Unggahan Selesai 100%'
                      : uploadStats.etaFormatted
                      ? `Estimasi: ${uploadStats.etaFormatted}`
                      : 'Menghitung estimasi waktu...'}
                  </span>
                </div>
                {uploadStats.speedFormatted && !uploadProgress.every(i => i.status === 'completed') && (
                  <span style={{ fontSize: '11px', color: '#34d399', fontWeight: '800', background: 'rgba(52,211,153,0.15)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(52,211,153,0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <SpeedBoltIcon size={11} color="#34d399" />
                    <span>{uploadStats.speedFormatted}</span>
                  </span>
                )}
              </div>

              {/* Google Drive Style Scrollable File List */}
              <div style={{
                maxHeight: '190px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                paddingRight: '4px',
                background: 'rgba(0,0,0,0.25)',
                padding: '8px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.04)'
              }}>
                {uploadProgress.map((item, idx) => {
                  const isImage = /\.(jpg|jpeg|png|webp|raw|cr2|nef|arw|dng)$/i.test(item.name);
                  const isVideo = /\.(mp4|mov|avi|mkv|webm)$/i.test(item.name);

                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        background: item.status === 'uploading' ? (activeStorageMode === 'byos' ? 'rgba(52,211,153,0.1)' : 'rgba(99,102,241,0.1)') : 'rgba(255,255,255,0.02)',
                        border: item.status === 'uploading' ? (activeStorageMode === 'byos' ? '1px solid rgba(52,211,153,0.25)' : '1px solid rgba(99,102,241,0.25)') : '1px solid rgba(255,255,255,0.03)',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', minWidth: 0, flex: 1 }}>
                        {isVideo ? <VideoIcon size={15} color="#f43f5e" /> : isImage ? <PhotoIcon size={15} color="#38bdf8" /> : <FileDocumentIcon size={15} color="#a1a1aa" />}
                        <div style={{ overflow: 'hidden', minWidth: 0 }}>
                          <div style={{ color: '#ffffff', fontWeight: item.status === 'uploading' ? '700' : '400', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '11.5px' }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: '10px', color: '#71717a' }}>
                            {formatBytes(item.size)}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '10px', flexShrink: 0 }}>
                        {item.status === 'completed' && (
                          <CheckCircleIcon size={15} color="#34d399" />
                        )}
                        {item.status === 'uploading' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: activeStorageMode === 'byos' ? '#34d399' : '#818cf8', fontWeight: '700' }}>{item.percent}%</span>
                            <div style={{ width: '32px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${item.percent}%`, height: '100%', background: activeStorageMode === 'byos' ? '#10b981' : '#818cf8' }} />
                            </div>
                          </div>
                        )}
                        {item.status === 'error' && (
                          <span style={{ color: '#f87171', fontSize: '11px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '3px' }} title={item.error || 'Gagal'}>
                            <AlertCircleIcon size={13} color="#f87171" />
                            <span>Gagal</span>
                          </span>
                        )}
                        {item.status !== 'completed' && item.status !== 'uploading' && item.status !== 'error' && (
                          <span style={{ color: '#71717a', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <TimerClockIcon size={11} color="#71717a" />
                            <span>Antre</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Auto Retry Button for Failed Uploads */}
              {uploadProgress.some(item => item.status === 'error') && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ color: '#f87171', fontWeight: '700', fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertCircleIcon size={14} color="#f87171" />
                    <span>Ada {uploadProgress.filter(i => i.status === 'error').length} berkas yang gagal diunggah:</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRetryFailedUploads}
                    style={{
                      width: '100%',
                      marginTop: '6px',
                      padding: '8px',
                      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <SyncIcon size={13} color="#ffffff" />
                    <span>Coba Lagi ({uploadProgress.filter(i => i.status === 'error').length} Berkas Gagal)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal 3: Add-On Subscription */}
      {showAddonModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowAddonModal(false)}>
          <div style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', maxWidth: '640px', width: '100%', padding: '28px', position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowAddonModal(false)} style={{ position: 'absolute', top: '18px', right: '18px', background: 'transparent', border: 'none', color: '#a1a1aa', fontSize: '18px', cursor: 'pointer' }}>✕</button>

            <h3 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CloudServerIcon size={20} color="#818cf8" />
              <span>Pilih Paket Add-On Cloud Storage</span>
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: '#a1a1aa' }}>Pilih kapasitas storage dedicated studio Anda. Pembayaran disesuaikan secara prorata.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              {addonPlans.map((plan) => {
                const quotaGbNumber = plan.quotaBytes ? Math.round(plan.quotaBytes / (1024 * 1024 * 1024)) : 0;
                const vendorQuotaGbNumber = vendorData?.addonStorageQuotaBytes ? Math.round(vendorData.addonStorageQuotaBytes / (1024 * 1024 * 1024)) : 0;

                // Cek status paket aktif saat ini
                const isCurrentActive = vendorData?.hasStorageAddon && (
                  vendorData?.addonPlanId === plan.id || 
                  (quotaGbNumber > 0 && quotaGbNumber === vendorQuotaGbNumber)
                );

                const isUpgrade = vendorData?.hasStorageAddon && !isCurrentActive && quotaGbNumber > vendorQuotaGbNumber;
                const isDowngrade = vendorData?.hasStorageAddon && !isCurrentActive && quotaGbNumber < vendorQuotaGbNumber;

                // Kalkulasi potongan prorata sisa masa aktif langganan
                const activePlanPrice = vendorData?.activeAddonPlan?.price || 47000;
                const now = new Date();
                const exp = vendorData?.expiresAt ? new Date(vendorData.expiresAt) : null;
                let remainingDays = 30;
                if (exp && exp > now) {
                  remainingDays = Math.max(1, Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                }

                const rawDiscount = (activePlanPrice / 30) * remainingDays;
                const proratedPrice = Math.max(0, Math.round(plan.price - rawDiscount));
                const isSelected = selectedPlanId === plan.id;

                return (
                  <div
                    key={plan.id}
                    onClick={() => {
                      if (!isCurrentActive && !isDowngrade) {
                        setSelectedPlanId(plan.id);
                      }
                    }}
                    style={{
                      padding: '16px 18px',
                      borderRadius: '14px',
                      background: isCurrentActive
                        ? 'rgba(52,211,153,0.08)'
                        : isSelected
                        ? 'rgba(99,102,241,0.15)'
                        : 'rgba(255,255,255,0.02)',
                      border: `1.5px solid ${
                        isCurrentActive
                          ? '#34d399'
                          : isSelected
                          ? '#6366f1'
                          : 'rgba(255,255,255,0.08)'
                      }`,
                      cursor: isCurrentActive || isDowngrade ? 'not-allowed' : 'pointer',
                      opacity: isDowngrade ? 0.5 : 1,
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#ffffff' }}>{plan.name}</h4>
                      {isCurrentActive && (
                        <span style={{ background: 'rgba(52,211,153,0.2)', color: '#34d399', border: '1px solid rgba(52,211,153,0.4)', padding: '2px 8px', borderRadius: '10px', fontWeight: '800', fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <CheckCircleIcon size={11} color="#34d399" />
                          <span>Paket Aktif</span>
                        </span>
                      )}
                      {isUpgrade && !isSelected && (
                        <span style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.4)', padding: '2px 8px', borderRadius: '10px', fontWeight: '800', fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <SparklesUpgradeIcon size={11} color="#818cf8" />
                          <span>Upgrade</span>
                        </span>
                      )}
                      {isSelected && !isCurrentActive && (
                        <span style={{ color: '#818cf8', fontWeight: '800', fontSize: '12px' }}>✓ Terpilih</span>
                      )}
                    </div>

                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#34d399', margin: '8px 0 2px 0' }}>
                      {quotaGbNumber || (plan.quotaBytes / (1024 * 1024 * 1024)).toFixed(0)} GB
                    </div>

                    {isCurrentActive ? (
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#34d399' }}>
                        {formatIDR(plan.price)} <span style={{ fontSize: '10px', color: '#a1a1aa', fontWeight: '400' }}>/ bln (Sedang Digunakan)</span>
                      </div>
                    ) : isUpgrade ? (
                      <div>
                        <div style={{ fontSize: '11px', color: '#71717a', textDecoration: 'line-through' }}>
                          {formatIDR(plan.price)} / bln
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: '#fbbf24' }}>
                          {formatIDR(proratedPrice)} <span style={{ fontSize: '10px', color: '#34d399', fontWeight: '700' }}>(Prorata Sisa {remainingDays} Hari)</span>
                        </div>
                      </div>
                    ) : isDowngrade ? (
                      <div style={{ fontSize: '11px', color: '#f87171', fontWeight: '600' }}>
                        Hubungi WA Admin untuk Downgrade
                      </div>
                    ) : (
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#fbbf24' }}>
                        {formatIDR(plan.price)} <span style={{ fontSize: '10px', color: '#71717a', fontWeight: '400' }}>/ bln</span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Card 4: Custom Storage Request Card */}
              {(() => {
                const isSelected = selectedPlanId === 'custom';

                const vendorCurrentGb = vendorData?.addonStorageQuotaBytes
                  ? Math.round(vendorData.addonStorageQuotaBytes / (1024 * 1024 * 1024))
                  : 0;

                const isAbsoluteMaxTier = vendorCurrentGb >= 200;

                // Batas minimal slider: jika vendor sudah punya 120 GB, maka min slider = 120 GB
                const minCustomBound = vendorCurrentGb >= 50 ? vendorCurrentGb : 60;
                const maxCustomBound = Math.min(200, Math.max(minCustomBound, remainingGlobalGb !== undefined ? remainingGlobalGb : 200));

                const effectiveCustomGb = Math.max(minCustomBound, Math.min(customStorageGb, maxCustomBound));

                // Diskon Bertingkat Profesional (Tiered Incentive Rate)
                const baseRate = customStoragePricePerGb || 1250;
                let ratePerGb = baseRate;
                let tierDiscountBadge = null;

                const addedGb = effectiveCustomGb - (vendorCurrentGb >= 50 ? vendorCurrentGb : 50);
                if (addedGb >= 80) {
                  ratePerGb = Math.round(baseRate * 0.95); // Insentif 5% per GB
                  tierDiscountBadge = 'Enterprise Tier (Insentif 5%)';
                } else if (addedGb >= 40) {
                  ratePerGb = Math.round(baseRate * 0.97); // Insentif 3% per GB
                  tierDiscountBadge = 'Volume Tier (Insentif 3%)';
                }

                const now = new Date();
                const exp = vendorData?.expiresAt ? new Date(vendorData.expiresAt) : null;
                let remainingDays = 30;
                if (exp && exp > now) {
                  remainingDays = Math.max(1, Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                }

                // Hitung selisih kuota tambahan (GB) jika vendor sudah memiliki paket aktif
                const isExistingUser = vendorCurrentGb > 0;
                const extraGb = isExistingUser ? Math.max(0, effectiveCustomGb - vendorCurrentGb) : effectiveCustomGb;

                let proratedCustomPrice = 0;
                if (!isExistingUser) {
                  const customMonthlyPrice = effectiveCustomGb * ratePerGb;
                  const activePlanPrice = vendorData?.activeAddonPlan?.price || 47000;
                  const rawDiscount = (activePlanPrice / 30) * remainingDays;
                  proratedCustomPrice = Math.max(0, Math.round(customMonthlyPrice - rawDiscount));
                } else if (extraGb > 0) {
                  const extraMonthlyPrice = extraGb * ratePerGb;
                  proratedCustomPrice = Math.max(10000, Math.round((extraMonthlyPrice / 30) * remainingDays));
                }
                const isGlobalCapped = remainingGlobalGb !== undefined && remainingGlobalGb < 200;

                return (
                  <div
                    onClick={() => {
                      setSelectedPlanId('custom');
                      if (customStorageGb < minCustomBound) {
                        setCustomStorageGb(minCustomBound);
                      }
                    }}
                    style={{
                      padding: '16px 18px',
                      borderRadius: '14px',
                      background: isSelected ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.02)',
                      border: `1.5px solid ${isSelected ? '#fbbf24' : 'rgba(255,255,255,0.08)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      gridColumn: '1 / -1'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: isAbsoluteMaxTier ? '#10b981' : '#fbbf24' }}>
                        {isAbsoluteMaxTier 
                          ? 'Custom Dedicated Storage Enterprise (200 GB)' 
                          : `Custom Storage Enterprise (${minCustomBound} GB - 200 GB)`}
                      </h4>
                      {isSelected ? (
                        <span style={{ color: isAbsoluteMaxTier ? '#10b981' : '#fbbf24', fontWeight: '800', fontSize: '12px' }}>✓ Terpilih</span>
                      ) : (
                        <span style={{ color: '#a1a1aa', fontSize: '11px' }}>Kebutuhan Khusus</span>
                      )}
                    </div>

                    <p style={{ margin: '4px 0 10px 0', fontSize: '11px', color: '#a1a1aa' }}>
                      {isAbsoluteMaxTier
                        ? 'Studio Anda saat ini telah menggunakan alokasi kapasitas penyimpanan instan maksimal (200 GB).'
                        : `Atur alokasi kapasitas penyimpanan dedicated studio Anda dari ${minCustomBound} GB hingga 200 GB. Pembayaran disesuaikan secara prorata.`}
                    </p>

                    {isSelected && (
                      <div style={{ marginTop: '12px', background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '12px', border: `1px solid ${isAbsoluteMaxTier ? 'rgba(16,185,129,0.3)' : 'rgba(251,191,36,0.2)'}` }}>
                        {isAbsoluteMaxTier ? (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontSize: '12px', color: '#ffffff', fontWeight: '700' }}>Status Alokasi Storage:</span>
                              <span style={{ fontSize: '12px', fontWeight: '800', color: '#34d399', background: 'rgba(52,211,153,0.15)', padding: '2px 8px', borderRadius: '8px', border: '1px solid rgba(52,211,153,0.3)' }}>
                                Kapasitas Maksimal Aktif (200 GB)
                              </span>
                            </div>
                            <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#a1a1aa', lineHeight: '1.5' }}>
                              Studio Anda telah mencapai batas alokasi instan (200 GB). Untuk penambahan alokasi server dedicated khusus di atas 200 GB, silakan hubungi Tim Support Admin.
                            </p>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '12px', color: '#ffffff', fontWeight: '700' }}>Kapasitas Disesuaikan:</span>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '18px', color: '#34d399', fontWeight: '900' }}>{effectiveCustomGb} GB</span>
                                {tierDiscountBadge && (
                                  <div style={{ fontSize: '10px', color: '#fbbf24', fontWeight: '700' }}>
                                    {tierDiscountBadge}
                                  </div>
                                )}
                              </div>
                            </div>

                            <input
                              type="range"
                              min={minCustomBound}
                              max={maxCustomBound}
                              step="10"
                              value={effectiveCustomGb}
                              onChange={(e) => setCustomStorageGb(parseInt(e.target.value, 10))}
                              style={{ width: '100%', cursor: 'pointer', accentColor: '#fbbf24' }}
                            />

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#71717a', marginTop: '4px' }}>
                              <span>Minimal: {minCustomBound} GB</span>
                              <span>Maksimal Instan: {maxCustomBound} GB</span>
                            </div>

                            {isGlobalCapped && (
                              <div style={{ fontSize: '11px', color: '#fbbf24', marginTop: '8px', background: 'rgba(251,191,36,0.08)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <InfoLightIcon size={13} color="#fbbf24" />
                                <span>Kapasitas instan server saat ini tersisa {maxCustomBound} GB. Hubungi Admin jika membutuhkan alokasi lebih besar.</span>
                              </div>
                            )}

                            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px' }}>
                              <span style={{ fontSize: '11px', color: '#a1a1aa' }}>
                                {isExistingUser && extraGb === 0 
                                  ? 'Status Paket Saat Ini:' 
                                  : `Biaya Tambahan (+${extraGb} GB) Prorata:`}
                              </span>
                              {isExistingUser && extraGb === 0 ? (
                                <span style={{ fontSize: '12px', fontWeight: '800', color: '#34d399', background: 'rgba(52,211,153,0.15)', padding: '2px 8px', borderRadius: '8px', border: '1px solid rgba(52,211,153,0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <CheckCircleIcon size={12} color="#34d399" />
                                  <span>Paket Aktif ({vendorCurrentGb} GB)</span>
                                </span>
                              ) : (
                                <span style={{ fontSize: '14px', fontWeight: '800', color: '#fbbf24' }}>
                                  {formatIDR(proratedCustomPrice)} <span style={{ fontSize: '10px', color: '#34d399' }}>(Sisa {remainingDays} Hari)</span>
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Payment Method Selector Tabs */}
            <div style={{ margin: '18px 0 14px 0' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>Pilih Metode Pembayaran:</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setPaymentMethodTab('gateway')} style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: `1.5px solid ${paymentMethodTab === 'gateway' ? '#34d399' : 'rgba(255,255,255,0.08)'}`, background: paymentMethodTab === 'gateway' ? 'rgba(52,211,153,0.15)' : 'rgba(0,0,0,0.3)', color: paymentMethodTab === 'gateway' ? '#34d399' : '#a1a1aa', fontWeight: '700', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <SpeedBoltIcon size={13} color="currentColor" />
                  <span>Otomatis (QRIS / VA / Gateway)</span>
                </button>
                <button type="button" onClick={() => setPaymentMethodTab('manual')} style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: `1.5px solid ${paymentMethodTab === 'manual' ? '#fbbf24' : 'rgba(255,255,255,0.08)'}`, background: paymentMethodTab === 'manual' ? 'rgba(251,191,36,0.15)' : 'rgba(0,0,0,0.3)', color: paymentMethodTab === 'manual' ? '#fbbf24' : '#a1a1aa', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                  Transfer Bank Manual
                </button>
              </div>
            </div>

            {paymentMethodTab === 'manual' && (
              <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '14px', padding: '16px', marginBottom: '20px', fontSize: '12px' }}>
                <div style={{ color: '#fbbf24', fontWeight: '700', marginBottom: '8px' }}>Rekening Pembayaran Manual Admin Platform:</div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '8px', color: '#ffffff', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                  <div>Bank: <strong>{saasBankInfo?.bankName || 'Belum dikonfigurasi Admin'}</strong></div>
                  <div>No. Rekening: <strong style={{ color: '#fbbf24', fontFamily: 'monospace', fontSize: '14px' }}>{saasBankInfo?.accountNumber || '-'}</strong></div>
                  <div>Atas Nama: <strong>{saasBankInfo?.accountName || '-'}</strong></div>
                </div>
                <label style={{ display: 'block', color: '#e4e4e7', fontWeight: '600', marginBottom: '6px' }}>Upload Bukti Transfer Bank (Format Gambar):</label>
                <input type="file" accept="image/*" onChange={e => setPaymentProofFile(e.target.files[0] || null)} style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#a1a1aa', fontSize: '11px' }} />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
              <button onClick={() => setShowAddonModal(false)} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.06)', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>Batal</button>
              {(() => {
                const vendorCurrentGb = vendorData?.addonStorageQuotaBytes
                  ? Math.round(vendorData.addonStorageQuotaBytes / (1024 * 1024 * 1024))
                  : 0;
                const isSelectedCustomMax = selectedPlanId === 'custom' && vendorCurrentGb >= 200;

                return (
                  <button
                    onClick={() => {
                      if (isSelectedCustomMax) return;
                      selectedPlanId && handleSubscribeAddon(selectedPlanId);
                    }}
                    disabled={!selectedPlanId || actionLoading || isSelectedCustomMax}
                    style={{
                      padding: '8px 20px',
                      background: isSelectedCustomMax
                        ? 'rgba(16,185,129,0.15)'
                        : !selectedPlanId 
                          ? 'rgba(255,255,255,0.08)' 
                          : (paymentMethodTab === 'manual' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #10b981, #059669)'),
                      color: isSelectedCustomMax ? '#34d399' : (!selectedPlanId ? '#71717a' : '#ffffff'),
                      border: isSelectedCustomMax ? '1px solid rgba(52,211,153,0.3)' : (!selectedPlanId ? '1px solid rgba(255,255,255,0.1)' : 'none'),
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: !selectedPlanId || actionLoading || isSelectedCustomMax ? 'not-allowed' : 'pointer',
                      opacity: !selectedPlanId ? 0.6 : 1,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {actionLoading 
                      ? 'Memproses...' 
                      : isSelectedCustomMax 
                        ? 'Kapasitas Maksimal Aktif (200 GB)'
                        : !selectedPlanId 
                          ? 'Pilih Paket Terlebih Dahulu' 
                          : (paymentMethodTab === 'manual' ? 'Kirim Bukti Transfer' : 'Aktifkan Paket Terpilih')}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Native QRIS & Payment Gateway Display */}
      {paymentModalData && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={handleClosePaymentModal}>
          <div style={{ background: '#18181b', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '24px', maxWidth: '520px', width: '100%', padding: '24px', position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,0.7)', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <button onClick={handleClosePaymentModal} style={{ position: 'absolute', top: '18px', right: '18px', background: 'transparent', border: 'none', color: '#a1a1aa', fontSize: '18px', cursor: 'pointer', zIndex: 10 }}>✕</button>
            <NativeQrisDisplay
              pendingOrder={paymentModalData}
              onCancel={handleCancelPendingPayment}
            />
          </div>
        </div>
      )}

      {/* QUICK SETUP PROJECT MODAL FROM STORAGE PAGE */}
      {showCreateProjectModal && targetFolderForProject && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => { if (!isSubmittingProject) setShowCreateProjectModal(false); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#121215',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '20px',
              padding: '28px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.7)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <RocketLaunchIcon size={24} color="#34d399" />
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#ffffff' }}>
                Buat Project Baru
              </h3>
            </div>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#a1a1aa', lineHeight: '1.5' }}>
              Jadikan folder <strong style={{ color: '#34d399' }}>"{targetFolderForProject.name}"</strong> sebagai galeri seleksi foto klien baru.
            </p>

            <form onSubmit={handleCreateProjectSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#e4e4e7', marginBottom: '6px' }}>
                  Nama Project
                </label>
                <input
                  type="text"
                  required
                  value={projectNameInput}
                  onChange={(e) => setProjectNameInput(e.target.value)}
                  disabled={isSubmittingProject}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#e4e4e7', marginBottom: '6px' }}>
                  Limit Jumlah Pilihan Foto Klien
                </label>
                <input
                  type="number"
                  min="0"
                  value={maxSelectionInput || ''}
                  onChange={(e) => setMaxSelectionInput(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="Contoh: 50 (Isi 0 jika Bebas / Tanpa Batas)"
                  disabled={isSubmittingProject}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#71717a', marginTop: '4px', display: 'block' }}>
                  Isi 0 jika klien bebas memilih berapa saja foto.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#e4e4e7', marginBottom: '6px' }}>
                  No. WhatsApp Klien <span style={{ fontWeight: '400', color: '#71717a' }}>(Opsional)</span>
                </label>
                <input
                  type="tel"
                  value={clientPhoneInput}
                  onChange={(e) => setClientPhoneInput(e.target.value)}
                  placeholder="Contoh: 6281234567890"
                  disabled={isSubmittingProject}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateProjectModal(false)}
                  disabled={isSubmittingProject}
                  style={{
                    padding: '10px 18px',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#a1a1aa',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProject}
                  style={{
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16,185,129,0.3)'
                  }}
                >
                  {isSubmittingProject ? 'Memproses...' : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <RocketLaunchIcon size={14} color="#ffffff" />
                      <span>Impor & Buat Project</span>
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STORAGE MEDIA SHOWCASE GALLERY MODAL (Viewer Murni Tanpa Selector) */}
      {showStorageGalleryModal && galleryModalFolder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowStorageGalleryModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#121215',
              border: '1px solid rgba(52,211,153,0.3)',
              borderRadius: '24px',
              padding: '28px',
              maxWidth: '900px',
              maxHeight: '85vh',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 70px rgba(0,0,0,0.8)',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', background: 'rgba(52,211,153,0.15)', color: '#34d399', padding: '4px 10px', borderRadius: '10px', border: '1px solid rgba(52,211,153,0.3)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <GalleryViewIcon size={12} color="#34d399" />
                  <span>Galeri Folder (Media Viewer Murni)</span>
                </span>
                <h3 style={{ margin: '8px 0 2px 0', fontSize: '22px', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FolderIcon size={22} color="#818cf8" />
                  <span>{galleryModalFolder.name}</span>
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#a1a1aa' }}>
                  Tampilan foto & media Dedicated Cloud Storage &bull; <strong style={{ color: '#fbbf24' }}>Murni Hanya Menampilkan (Tanpa Ada Selected / Selector)</strong>
                </p>
              </div>

              <button
                onClick={() => setShowStorageGalleryModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#e4e4e7',
                  borderRadius: '10px',
                  width: '36px',
                  height: '36px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '6px' }}>
              {loadingGalleryModal ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#a1a1aa' }}>
                  <div className="dev-watermark-dot" style={{ margin: '0 auto 12px auto', width: '10px', height: '10px' }} />
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: '600' }}>Memuat media galeri storage...</p>
                </div>
              ) : galleryModalFiles.length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#71717a' }}>
                  <div style={{ margin: '0 auto 10px auto', display: 'flex', justifyContent: 'center' }}>
                    <PhotoIcon size={40} color="#71717a" />
                  </div>
                  <p style={{ margin: 0, fontSize: '14px', color: '#a1a1aa', fontWeight: '600' }}>Belum ada foto/media di dalam folder ini.</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>Gunakan tombol Upload di Halaman Storage untuk menambahkan file.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
                  {galleryModalFiles.map((file, idx) => {
                    const isImg = file.mimeType?.startsWith('image/') || file.name?.match(/\.(jpg|jpeg|png|webp|gif)$/i);
                    const thumbUrl = file.driveFileId ? `https://lh3.googleusercontent.com/d/${file.driveFileId}=w400` : `/api/proxy/thumb/${file.driveFileId}/${encodeURIComponent(file.name)}?sz=w400`;
                    return (
                      <div
                        key={file.id}
                        onClick={() => {
                          setPreviewSourceFiles(galleryModalFiles);
                          setActivePreviewIndex(idx);
                        }}
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '14px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          position: 'relative',
                          aspectRatio: '4/3',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {isImg ? (
                          <img
                            src={thumbUrl}
                            alt={file.name}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              if (!e.target.dataset.fallback && file.driveFileId) {
                                e.target.dataset.fallback = '1';
                                e.target.src = `/api/proxy/thumb/${file.driveFileId}/${encodeURIComponent(file.name)}?sz=w400`;
                              } else {
                                e.target.style.display = 'none';
                              }
                            }}
                          />
                        ) : (
                          <div style={{ textAlign: 'center', color: '#a1a1aa', padding: '10px' }}>
                            <div style={{ margin: '0 auto 4px auto', display: 'flex', justifyContent: 'center' }}>
                              <FileDocumentIcon size={28} color="#71717a" />
                            </div>
                            <span style={{ fontSize: '11px', display: 'block', wordBreak: 'break-all' }}>{file.name}</span>
                          </div>
                        )}
                        <div style={{ position: 'absolute', bottom: 0, inset: 'auto 0 0 0', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', padding: '8px', fontSize: '10px', color: '#ffffff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {file.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LIGHTWEIGHT IN-APP PHOTO PREVIEW LIGHTBOX MODAL WITH FULL PREV/NEXT NAVIGATION */}
      {activePreviewIndex !== null && previewSourceFiles[activePreviewIndex] && (() => {
        const currentFile = previewSourceFiles[activePreviewIndex];
        const cleanName = currentFile.fileName || currentFile.name || '';
        const isImg = currentFile.mimeType?.startsWith('image/') || cleanName?.match(/\.(jpg|jpeg|png|webp|gif)$/i);
        const fullUrl = isImg && currentFile.driveFileId ? `https://lh3.googleusercontent.com/d/${currentFile.driveFileId}=w1600` : (isImg && currentFile.driveFileId ? `/api/proxy/thumb/${currentFile.driveFileId}/${encodeURIComponent(cleanName)}?sz=w1600` : null);

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999999,
              background: 'rgba(0,0,0,0.95)',
              backdropFilter: 'blur(20px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px'
            }}
            onClick={() => setActivePreviewIndex(null)}
          >
            {/* FLOATING CLOSE BUTTON IN TOP RIGHT OF SCREEN */}
            <button
              onClick={() => setActivePreviewIndex(null)}
              style={{
                position: 'fixed',
                top: '24px',
                right: '24px',
                zIndex: 1000001,
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.25)',
                color: '#ffffff',
                borderRadius: '50%',
                width: '44px',
                height: '44px',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                transition: 'all 0.2s ease'
              }}
              title="Tutup (Esc)"
            >
              ✕
            </button>

            {/* FLOATING PREVIOUS BUTTON ON LEFT OF SCREEN BACKDROP */}
            {previewSourceFiles.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePreviewIndex(prev => (prev > 0 ? prev - 1 : previewSourceFiles.length - 1));
                }}
                style={{
                  position: 'fixed',
                  left: '24px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 1000001,
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#ffffff',
                  borderRadius: '50%',
                  width: '52px',
                  height: '52px',
                  fontSize: '24px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  transition: 'all 0.2s ease'
                }}
                title="Foto Sebelumnya (Panah Kiri)"
              >
                ❮
              </button>
            )}

            {/* FLOATING NEXT BUTTON ON RIGHT OF SCREEN BACKDROP */}
            {previewSourceFiles.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePreviewIndex(prev => (prev < previewSourceFiles.length - 1 ? prev + 1 : 0));
                }}
                style={{
                  position: 'fixed',
                  right: '24px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 1000001,
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#ffffff',
                  borderRadius: '50%',
                  width: '52px',
                  height: '52px',
                  fontSize: '24px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  transition: 'all 0.2s ease'
                }}
                title="Foto Selanjutnya (Panah Kanan)"
              >
                ❯
              </button>
            )}

            {/* NATURAL CANVAS IMAGE DISPLAY */}
            <div
              style={{
                position: 'relative',
                maxWidth: '85vw',
                maxHeight: '82vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 30px 90px rgba(0,0,0,0.9)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {fullUrl ? (
                <img
                  src={fullUrl}
                  alt={cleanName}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    if (!e.target.dataset.fallback && currentFile.driveFileId) {
                      e.target.dataset.fallback = '1';
                      e.target.src = `/api/proxy/thumb/${currentFile.driveFileId}/${encodeURIComponent(cleanName)}?sz=w1600`;
                    }
                  }}
                  style={{
                    maxWidth: '85vw',
                    maxHeight: '82vh',
                    objectFit: 'contain',
                    borderRadius: '16px',
                    display: 'block'
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#ffffff', padding: '40px' }}>
                  <div style={{ margin: '0 auto 12px auto', display: 'flex', justifyContent: 'center' }}>
                    <FileDocumentIcon size={48} color="#71717a" />
                  </div>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '700' }}>{cleanName}</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}
      {/* MODAL KONFIRMASI PENGUNGGAHAN BATCH FOLDER KUSTOM (SUPER PRO & ELEGANT) */}
      {batchConfirmData && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(10px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#18181b',
            border: '1.5px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '24px',
            padding: '28px',
            maxWidth: '640px',
            width: '100%',
            boxShadow: '0 25px 70px rgba(0,0,0,0.9), 0 0 40px rgba(16,185,129,0.15)',
            animation: 'fadeIn 0.25s ease-out'
          }}>
            {/* Header Modal */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '22px' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.3))',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FolderIcon size={26} color="#34d399" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.3px' }}>
                  Konfirmasi Pengunggahan Batch Folder
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#a1a1aa' }}>
                  Periksa rincian analisis struktur folder & berkas media sebelum diunggah ke Cloud Storage.
                </p>
                {batchConfirmData.ignoredFilesCount > 0 && (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#fbbf24', background: 'rgba(251,191,36,0.1)', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(251,191,36,0.25)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <InfoLightIcon size={12} color="#fbbf24" />
                    <span>{batchConfirmData.ignoredFilesCount.toLocaleString('id-ID')} berkas sistem/coding non-media otomatis diabaikan.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Grid 4 Ringkasan Statistik */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px' }}>
                <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', textTransform: 'uppercase' }}>
                  <FolderIcon size={12} color="#38bdf8" />
                  <span>Folder Utama</span>
                </span>
                <strong style={{ fontSize: '15px', color: '#38bdf8', wordBreak: 'break-all', display: 'block' }}>
                  {batchConfirmData.topFolderName}
                </strong>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px' }}>
                <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', textTransform: 'uppercase' }}>
                  <PhotoIcon size={12} color="#34d399" />
                  <span>Total Berkas File</span>
                </span>
                <strong style={{ fontSize: '17px', color: '#34d399', display: 'block' }}>
                  {batchConfirmData.totalFiles.toLocaleString('id-ID')} Berkas
                </strong>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px' }}>
                <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', textTransform: 'uppercase' }}>
                  <FolderIcon size={12} color="#fbbf24" />
                  <span>Total Sub-Folder</span>
                </span>
                <strong style={{ fontSize: '17px', color: '#fbbf24', display: 'block' }}>
                  {batchConfirmData.totalFolders} Sub-Folder
                </strong>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px' }}>
                <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', textTransform: 'uppercase' }}>
                  <DiskStorageIcon size={12} color="#a78bfa" />
                  <span>Total Estimasi Ukuran</span>
                </span>
                <strong style={{ fontSize: '17px', color: '#a78bfa', display: 'block' }}>
                  {formatBytes(batchConfirmData.totalSizeBytes)}
                </strong>
              </div>
            </div>

            {/* Sub-Folder Breakdown Tree */}
            {batchConfirmData.subFolderBreakdown && batchConfirmData.subFolderBreakdown.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#e4e4e7', display: 'block', marginBottom: '8px' }}>
                  Rincian Struktur Sub-Folder Terdeteksi:
                </span>
                <div style={{ maxHeight: '160px', overflowY: 'auto', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '12px 16px' }}>
                  {batchConfirmData.subFolderBreakdown.map((sf, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: idx === batchConfirmData.subFolderBreakdown.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)', fontSize: '12px' }}>
                      <span style={{ color: '#e4e4e7', fontFamily: 'monospace', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <FolderIcon size={12} color="#818cf8" />
                        <span>{sf.path}</span>
                      </span>
                      <span style={{ color: '#34d399', fontWeight: '700' }}>{sf.count.toLocaleString('id-ID')} File ({formatBytes(sf.sizeBytes)})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tombol Aksi Modal */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setBatchConfirmData(null)}
                style={{
                  padding: '11px 20px',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#a1a1aa',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Batalkan
              </button>

              <button
                type="button"
                onClick={handleConfirmBatchUploadExecute}
                style={{
                  padding: '11px 24px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <RocketLaunchIcon size={15} color="#ffffff" />
                <span>Mulai Unggah {batchConfirmData.totalFiles.toLocaleString('id-ID')} Berkas</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
