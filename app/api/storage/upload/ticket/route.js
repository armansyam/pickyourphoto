import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthVendor } from '@/lib/auth';
import { createResumableUploadTicket, createVendorRootFolder } from '@/lib/google-master-drive';

export const dynamic = 'force-dynamic';

const MAX_DAILY_PLATFORM_BYTES = 720 * 1024 * 1024 * 1024; // 720 GB Cap per hari untuk keamanan platform

const ALLOWED_EXTENSIONS = /\.(jpe?g|png|webp|gif|bmp|heic|heif|mp4|mov|avi|mkv|cr2|cr3|arw|nef|dng|raw|orf|rw2)$/i;
const FORBIDDEN_EXTENSIONS = /\.(zip|rar|7z|tar|gz|exe|bat|sh|php|js|html|py)$/i;

/**
 * POST /api/storage/upload/ticket
 * Menerbitkan Session Upload URL (Tiket Upload Resumable) Google Drive API v3
 * Memungkinkan Direct Upload dari Browser ke Google Cloud (0 Byte Load pada server Next.js)
 */
export async function POST(req) {
  const session = getAuthVendor();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Otentikasi dibutuhkan.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { fileName, fileSizeBytes, mimeType, parentFolderId } = body;

    if (!fileName || !fileSizeBytes) {
      return NextResponse.json({ success: false, error: 'Nama file dan ukuran file wajib diisi.' }, { status: 400 });
    }

    // 1. FILTER KEAMANAN EKSTENSI FILE (Cegah zip/rar/exe yang bisa membanned akun Google Admin)
    if (FORBIDDEN_EXTENSIONS.test(fileName)) {
      return NextResponse.json({
        success: false,
        error: 'Format file terlarang (.zip, .rar, .exe). Demi keamanan cloud, hanya berkas foto dan video asli yang diizinkan.'
      }, { status: 400 });
    }

    if (!ALLOWED_EXTENSIONS.test(fileName)) {
      return NextResponse.json({
        success: false,
        error: 'Format file tidak didukung. Harap unggah foto (.jpg, .png, .raw) atau video (.mp4, .mov).'
      }, { status: 400 });
    }

    const vendor = db.prepare('SELECT id, name, email, driveRootFolderId, hasStorageAddon, addonStorageQuotaBytes, usedStorageBytes, externalDriveConnected, externalDriveEmail, externalDriveRefreshToken, externalDriveFolderId, activeStorageMode FROM vendors WHERE id = ?').get(session.id);
    if (!vendor) {
      return NextResponse.json({ success: false, error: 'Vendor tidak ditemukan.' }, { status: 404 });
    }

    const sizeBytes = parseInt(fileSizeBytes, 10) || 0;
    const targetMode = body.storageMode || (body.isExternalDrive ? 'byos' : (vendor.activeStorageMode || (vendor.externalDriveConnected ? 'byos' : 'system')));

    // 2. STORAGE ROUTER: BYOS (Google Drive Vendor Sendiri) vs SaaS Dedicated Internal Storage
    if (targetMode === 'byos') {
      if (!vendor.externalDriveConnected || !vendor.externalDriveRefreshToken) {
        return NextResponse.json({
          success: false,
          error: 'Akun Google Drive pribadi Anda belum terhubung. Silakan hubungkan Google Drive terlebih dahulu.'
        }, { status: 400 });
      }

      // Buka jalur upload direct ke Google Drive milik Vendor
      const { createVendorExternalResumableUploadTicket } = await import('@/lib/google-master-drive');
      const ticket = await createVendorExternalResumableUploadTicket(vendor.id, parentFolderId, fileName, mimeType || 'image/jpeg', sizeBytes);
      return NextResponse.json({
        success: true,
        uploadUrl: ticket.uploadUrl,
        accessToken: ticket.accessToken,
        targetFolderId: ticket.targetFolderId,
        isExternalDrive: true,
        driveEmail: vendor.externalDriveEmail
      });
    }

    // 3. JIKA TARGET SISTEM SAAS DEDICATED STORAGE, PERIKSA ADDON STORAGE
    const hasAddon = Boolean(vendor.hasStorageAddon || (vendor.addonStorageQuotaBytes && vendor.addonStorageQuotaBytes > 0));

    if (vendor.addonStorageQuotaBytes > 0 && !vendor.hasStorageAddon) {
      try {
        db.prepare('UPDATE vendors SET hasStorageAddon = 1 WHERE id = ?').run(vendor.id);
        vendor.hasStorageAddon = 1;
      } catch (_) {}
    }

    if (!hasAddon) {
      return NextResponse.json({
        success: false,
        error: 'Anda belum memiliki Paket Add-On Storage aktif atau belum menghubungkan Google Drive pribadi. Harap hubungkan GDrive Anda atau aktifkan paket storage.'
      }, { status: 403 });
    }

    // 4. VALIDASI KUOTA PERSONAL VENDOR (Real-time Single Source of Truth dari storage_files)
    const actualStorageBytesRow = db.prepare('SELECT COALESCE(SUM(fileSizeBytes), 0) as totalBytes FROM storage_files WHERE vendorId = ? AND (isExternalDrive IS NULL OR isExternalDrive = 0)').get(vendor.id);
    const usedBytes = actualStorageBytesRow ? actualStorageBytesRow.totalBytes : (vendor.usedStorageBytes || 0);
    if (vendor.usedStorageBytes !== usedBytes) {
      try {
        db.prepare('UPDATE vendors SET usedStorageBytes = ? WHERE id = ?').run(usedBytes, vendor.id);
        vendor.usedStorageBytes = usedBytes;
      } catch (_) {}
    }
    const totalQuotaBytes = vendor.addonStorageQuotaBytes || 0;

    if (usedBytes + sizeBytes > totalQuotaBytes) {
      const remainingBytes = Math.max(0, totalQuotaBytes - usedBytes);
      return NextResponse.json({
        success: false,
        error: `Kapasitas Cloud Storage Anda tidak mencukupi. Sisa kuota: ${formatBytes(remainingBytes)}, Ukuran file: ${formatBytes(sizeBytes)}. Harap hubungkan Google Drive Anda atau tambah paket Add-On Storage.`
      }, { status: 400 });
    }

    // 5. VALIDASI CAP UNGGULAN HARIAN PLATFORM (Dinamis dari saas_settings)
    const capRow = db.prepare("SELECT value FROM saas_settings WHERE key = 'daily_upload_cap_gb'").get();
    const capGb = capRow && parseInt(capRow.value, 10) > 0 ? parseInt(capRow.value, 10) : 720;
    const maxDailyPlatformBytes = capGb * 1024 * 1024 * 1024;

    const today = new Date().toISOString().split('T')[0];
    const dailyLog = db.prepare('SELECT totalBytesUploaded FROM daily_upload_logs WHERE logDate = ?').get(today);
    const currentDailyBytes = dailyLog ? dailyLog.totalBytesUploaded : 0;

    if (currentDailyBytes + sizeBytes > maxDailyPlatformBytes) {
      return NextResponse.json({
        success: false,
        error: `Batas lalu lintas unggahan harian platform (${capGb} GB/hari) sedang penuh. Harap coba beberapa saat lagi.`
      }, { status: 429 });
    }

    // 6. PASTIKAN ROOT FOLDER VENDOR TERSEDIA PADA WORKER ADMIN
    let rootFolderId = vendor.driveRootFolderId;
    if (!rootFolderId) {
      const root = await createVendorRootFolder(vendor.email, vendor.name);
      rootFolderId = root.folderId;
      db.prepare('UPDATE vendors SET driveRootFolderId = ? WHERE id = ?').run(rootFolderId, vendor.id);
    }

    const targetFolderId = parentFolderId && parentFolderId !== 'root' ? parentFolderId : rootFolderId;

    // 7. TERBITKAN TIKET RESUMABLE UPLOAD VIA GOOGLE DRIVE API v3 WORKER ADMIN
    const ticket = await createResumableUploadTicket(targetFolderId, fileName, mimeType || 'image/jpeg', sizeBytes);

    return NextResponse.json({
      success: true,
      uploadUrl: ticket.uploadUrl,
      accessToken: ticket.accessToken,
      targetFolderId,
      isExternalDrive: false
    });
  } catch (error) {
    console.error('[Resumable Upload Ticket Error]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}
