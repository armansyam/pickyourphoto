import { NextResponse } from 'next/server';
import db from '../../../../lib/db.js';
import { getAuthVendor } from '../../../../lib/auth.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Tidak memiliki akses admin' }, { status: 403 });
        }

        const rows = db.prepare(`
            SELECT id, email, role, status, totalLimitBytes, usedStorageBytes, createdAt 
            FROM master_drive_accounts 
            ORDER BY (totalLimitBytes - usedStorageBytes) DESC, id ASC
        `).all() || [];

        const masterIndex = rows.find(r => r.role === 'master_index') || null;
        const workers = rows.filter(r => r.role === 'worker');

        const maxConcurrencyRow = db.prepare("SELECT value FROM saas_settings WHERE key = 'max_upload_concurrency_threads'").get();
        const maxConcurrency = maxConcurrencyRow ? parseInt(maxConcurrencyRow.value, 10) : 4;

        const clusterIdRow = db.prepare("SELECT value FROM saas_settings WHERE key = 'current_master_cluster_id'").get();
        const clusterNameRow = db.prepare("SELECT value FROM saas_settings WHERE key = 'master_cluster_name'").get();
        const parentFolderIdRow = db.prepare("SELECT value FROM saas_settings WHERE key = 'master_parent_folder_id'").get();
        const vendorTemplateRow = db.prepare("SELECT value FROM saas_settings WHERE key = 'vendor_folder_naming_template'").get();

        const clusterId = clusterIdRow ? clusterIdRow.value : null;
        const clusterName = clusterNameRow ? clusterNameRow.value : '[PICK-YOUR-PHOTO] Platform Master Storage Cluster A';
        const parentFolderId = parentFolderIdRow ? parentFolderIdRow.value : 'root';
        const vendorTemplate = vendorTemplateRow ? vendorTemplateRow.value : '📁 [STORAGE DEDICATED] {vendor_name} ({vendor_email})';

        return NextResponse.json({
            success: true,
            masterIndex,
            workers,
            maxConcurrency,
            masterClusterInfo: {
                clusterId,
                clusterName,
                parentFolderId,
                vendorTemplate,
                driveWebUrl: clusterId ? `https://drive.google.com/drive/folders/${clusterId}` : null,
                parentDriveWebUrl: (parentFolderId && parentFolderId !== 'root') ? `https://drive.google.com/drive/folders/${parentFolderId}` : null
            },
            totalWorkers: workers.length,
            totalPoolCapacityBytes: workers.reduce((acc, curr) => acc + (curr.totalLimitBytes || 0), 0),
            totalPoolUsedBytes: workers.reduce((acc, curr) => acc + (curr.usedStorageBytes || 0), 0)
        });
    } catch (error) {
        console.error('Error fetching drive pool:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PATCH(request) {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Tidak memiliki akses admin' }, { status: 403 });
        }

        const body = await request.json();
        const { workerId, toggleStatus, maxConcurrency, updateClusterName, updateVendorTemplate, updateParentFolderId } = body;

        // 1. Pemindahan Lokasi Folder Parent Master Cluster di Google Drive & DB
        if (updateParentFolderId !== undefined) {
            const newParentId = updateParentFolderId.trim() || 'root';
            
            db.prepare(`
                INSERT INTO saas_settings (key, value) VALUES ('master_parent_folder_id', ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
            `).run(newParentId);

            // Pemindahan Lokasi Live di Google Drive API jika cluster ID ada
            const clusterIdRow = db.prepare("SELECT value FROM saas_settings WHERE key = 'current_master_cluster_id'").get();
            if (clusterIdRow && clusterIdRow.value && newParentId && newParentId !== 'root') {
                try {
                    const { getMasterDriveClient } = await import('../../../../lib/google-master-drive.js');
                    const drive = getMasterDriveClient();
                    if (drive) {
                        const fileMeta = await drive.files.get({ fileId: clusterIdRow.value, fields: 'parents' });
                        const currentParents = fileMeta.data.parents ? fileMeta.data.parents.join(',') : '';

                        await drive.files.update({
                            fileId: clusterIdRow.value,
                            addParents: newParentId,
                            removeParents: currentParents,
                            fields: 'id, parents'
                        });
                    }
                } catch (moveErr) {
                    console.warn('[GDrive Move Cluster Warning]:', moveErr.message);
                }
            }

            return NextResponse.json({
                success: true,
                message: `Lokasi Folder Induk Master berhasil diubah ke ${newParentId === 'root' ? 'Root My Drive' : `Folder ID (${newParentId})`} dan dipindahkan di Google Drive Web!`,
                newParentId
            });
        }

        // 2. Rename Master Cluster Live di Google Drive & DB
        if (updateClusterName) {
            const newName = updateClusterName.trim();
            if (!newName) {
                return NextResponse.json({ success: false, error: 'Nama cluster master tidak boleh kosong' }, { status: 400 });
            }

            db.prepare(`
                INSERT INTO saas_settings (key, value) VALUES ('master_cluster_name', ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
            `).run(newName);

            // Rename live di Google Drive API jika cluster ID ada
            const clusterIdRow = db.prepare("SELECT value FROM saas_settings WHERE key = 'current_master_cluster_id'").get();
            if (clusterIdRow && clusterIdRow.value) {
                try {
                    const { getMasterDriveClient } = await import('../../../../lib/google-master-drive.js');
                    const drive = getMasterDriveClient();
                    if (drive) {
                        await drive.files.update({
                            fileId: clusterIdRow.value,
                            resource: { name: newName }
                        });
                    }
                } catch (driveErr) {
                    console.warn('[GDrive Master Cluster Rename Warning]:', driveErr.message);
                }
            }

            return NextResponse.json({
                success: true,
                message: `Nama Master Cluster berhasil diubah ke "${newName}" dan diperbarui di Google Drive Web!`,
                newName
            });
        }

        // 3. Update Template Penamaan Folder Vendor
        if (updateVendorTemplate !== undefined) {
            const template = updateVendorTemplate.trim() || '📁 [STORAGE DEDICATED] {vendor_name} ({vendor_email})';
            db.prepare(`
                INSERT INTO saas_settings (key, value) VALUES ('vendor_folder_naming_template', ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
            `).run(template);

            return NextResponse.json({
                success: true,
                message: `Format penamaan folder vendor berhasil diperbarui ke "${template}"!`,
                template
            });
        }

        if (workerId && toggleStatus) {
            const worker = db.prepare("SELECT id, email, status FROM master_drive_accounts WHERE id = ?").get(workerId);
            if (!worker) {
                return NextResponse.json({ success: false, error: 'Akun worker tidak ditemukan' }, { status: 404 });
            }

            const newStatus = worker.status === 'active' ? 'disabled' : 'active';
            db.prepare("UPDATE master_drive_accounts SET status = ? WHERE id = ?").run(newStatus, workerId);

            return NextResponse.json({
                success: true,
                message: `Status akun worker "${worker.email}" berhasil diubah ke ${newStatus === 'active' ? 'AKTIF (ON)' : 'NONAKTIF (OFF)'}!`,
                workerId: worker.id,
                newStatus
            });
        }

        if (maxConcurrency !== undefined) {
            const val = String(Math.max(1, parseInt(maxConcurrency) || 4));
            db.prepare(`
                INSERT INTO saas_settings (key, value) VALUES ('max_upload_concurrency_threads', ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
            `).run(val);

            return NextResponse.json({
                success: true,
                message: `Batas thread upload serentak berhasil diubah ke ${val} thread!`,
                maxConcurrency: parseInt(val, 10)
            });
        }

        return NextResponse.json({ success: false, error: 'Payload request tidak valid' }, { status: 400 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const currentUser = getAuthVendor();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Tidak memiliki akses admin' }, { status: 403 });
        }

        const body = await request.json();
        const { email, refreshToken, role = 'worker', totalLimitBytes = 16106127360 } = body;

        if (!email || !refreshToken) {
            return NextResponse.json({ success: false, error: 'Email dan refreshToken wajib diisi' }, { status: 400 });
        }

        const stmt = db.prepare(`
            INSERT INTO master_drive_accounts (email, role, refreshToken, totalLimitBytes, status)
            VALUES (?, ?, ?, ?, 'active')
            ON CONFLICT(email) DO UPDATE SET
                refreshToken = excluded.refreshToken,
                role = excluded.role,
                totalLimitBytes = excluded.totalLimitBytes,
                status = 'active'
        `);

        stmt.run(email, role, refreshToken, totalLimitBytes);

        return NextResponse.json({
            success: true,
            message: `Akun ${email} (${role}) berhasil ditambahkan ke Storage Pool`
        });
    } catch (error) {
        console.error('Error adding drive account:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
