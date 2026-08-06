import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'pick-your-photo-secret-key-2026';

function verifyVendorSession() {
  const token = cookies().get('token')?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'vendor' && decoded.role !== 'admin') return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function GET() {
  const session = verifyVendorSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Otentikasi dibutuhkan. Harap login kembali.' }, { status: 401 });
  }

  try {
    const vendor = db.prepare(`
      SELECT id, email, name, status, expiresAt, usedStorageBytes, hasStorageAddon, addonStorageQuotaBytes, addonPlanId
      FROM vendors WHERE id = ?
    `).get(session.id);

    if (!vendor) {
      return NextResponse.json({ success: false, error: 'Data vendor tidak ditemukan.' }, { status: 404 });
    }

    // Ambil daftar proyek (folder) milik vendor beserta hitung total foto & estimasi ukuran
    const projects = db.prepare(`
      SELECT 
        p.id, p.name, p.slug, p.status, p.createdAt, p.folderUrl,
        COUNT(ph.id) as photoCount,
        COALESCE(SUM(ph.fileSizeBytes), 0) as totalSizeBytes
      FROM projects p
      LEFT JOIN photos ph ON ph.projectId = p.id
      WHERE p.vendorId = ?
      GROUP BY p.id
      ORDER BY p.createdAt DESC
    `).all(vendor.id);

    // Ambil detail paket addon aktif jika ada
    let activeAddon = null;
    if (vendor.addonPlanId) {
      activeAddon = db.prepare('SELECT * FROM addon_plans WHERE id = ?').get(vendor.addonPlanId);
    }

    const quotaLimitBytes = vendor.addonStorageQuotaBytes || 0;
    const usedBytes = vendor.usedStorageBytes || 0;
    const isOverQuota = quotaLimitBytes > 0 ? (usedBytes > quotaLimitBytes) : (usedBytes > 0 && !vendor.hasStorageAddon);

    return NextResponse.json({
      success: true,
      vendor: {
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        expiresAt: vendor.expiresAt,
        status: vendor.status,
        usedStorageBytes: usedBytes,
        addonStorageQuotaBytes: quotaLimitBytes,
        hasStorageAddon: Boolean(vendor.hasStorageAddon),
        isOverQuota,
        activeAddon
      },
      projects
    });
  } catch (error) {
    console.error('[Storage Folders GET Error]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  const session = verifyVendorSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Otentikasi dibutuhkan.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'ID proyek/folder tidak diberikan.' }, { status: 400 });
    }

    // Pastikan proyek tersebut milik vendor
    const project = db.prepare('SELECT id, name, vendorId FROM projects WHERE id = ? AND vendorId = ?').get(projectId, session.id);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Proyek tidak ditemukan atau akses ditolak.' }, { status: 404 });
    }

    // Hitung total fileSizeBytes foto dalam proyek ini untuk dikembalikan (refund)
    const photoStats = db.prepare('SELECT COALESCE(SUM(fileSizeBytes), 0) as totalBytes FROM photos WHERE projectId = ?').get(projectId);
    const freedBytes = photoStats ? photoStats.totalBytes : 0;

    // Hapus seleksi, foto, dan proyek secara atomic transaction
    const deleteTx = db.transaction(() => {
      // 1. Hapus seleksi klien yang terhubung ke foto proyek ini
      db.prepare(`
        DELETE FROM selections 
        WHERE photoId IN (SELECT id FROM photos WHERE projectId = ?)
      `).run(projectId);

      // 2. Hapus foto-foto proyek
      db.prepare('DELETE FROM photos WHERE projectId = ?').run(projectId);

      // 3. Hapus klien proyek jika ada
      db.prepare('DELETE FROM clients WHERE projectId = ?').run(projectId);

      // 4. Hapus proyek
      db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);

      // 5. Refund usedStorageBytes di vendor
      if (freedBytes > 0) {
        db.prepare(`
          UPDATE vendors 
          SET usedStorageBytes = MAX(0, usedStorageBytes - ?) 
          WHERE id = ?
        `).run(freedBytes, session.id);
      }
    });

    deleteTx();

    return NextResponse.json({
      success: true,
      message: `Folder proyek "${project.name}" berhasil dihapus. Kuota storage sebesar ${formatBytes(freedBytes)} telah dikembalikan.`
    });
  } catch (error) {
    console.error('[Storage Folders DELETE Error]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
