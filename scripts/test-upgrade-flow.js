const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Path database SQLite
const dbPath = path.join(__dirname, '..', 'data', 'database.db');
const db = new Database(dbPath);

// Helper function to simulate live JOIN for auth user
function getVendorLiveDetails(vendorId) {
    return db.prepare(`
        SELECT 
            v.id, 
            v.name, 
            v.email, 
            v.role, 
            v.status, 
            v.maxProjects, 
            v.planId,
            v.expiresAt,
            v.brandName,
            v.brandLogo,
            v.additionalProjects,
            v.additionalProjectsExpiresAt,
            v.additionalPhotosPerProject,
            v.usedStorageBytes,
            p.name as planName,
            p.price as planPrice,
            p.projectExpireDays,
            p.maxPhotosPerProject,
            p.planType,
            p.maxStorageMB
        FROM vendors v
        LEFT JOIN plans p ON v.planId = p.id
        WHERE v.id = ?
    `).get(vendorId);
}

// Helper to calculate total project count for vendor
function getProjectCount(vendorId) {
    return db.prepare('SELECT COUNT(*) as count FROM projects WHERE vendorId = ?').get(vendorId)?.count || 0;
}

// Helper to simulate project creation check (logic from app/api/projects/route.js)
function simulateCreateProjectCheck(vendorId) {
    const vendor = getVendorLiveDetails(vendorId);
    if (!vendor) {
        return { allowed: false, message: 'Vendor tidak ditemukan.' };
    }

    const planType = vendor.planType || 'limit';

    // 1. Check expiration
    const expired = vendor.expiresAt ? (new Date() > new Date(vendor.expiresAt)) : false;
    if (expired) {
        return { allowed: false, message: 'Masa aktif akun Anda telah berakhir.' };
    }

    // 2. Check limits based on plan type
    if (planType === 'limit') {
        const projectCount = getProjectCount(vendorId);
        if (projectCount >= vendor.maxProjects) {
            return {
                allowed: false,
                message: `Batas jumlah project tercapai. Anda telah menggunakan ${projectCount} dari ${vendor.maxProjects} project aktif.`
            };
        }
    } else if (planType === 'storage') {
        const maxStorageBytes = (vendor.maxStorageMB || 0) * 1024 * 1024;
        if (vendor.usedStorageBytes >= maxStorageBytes) {
            return {
                allowed: false,
                message: `Kapasitas penyimpanan Anda penuh (${(vendor.usedStorageBytes / (1024 * 1024)).toFixed(1)} MB dari ${vendor.maxStorageMB} MB).`
            };
        }
    }

    return { allowed: true, message: 'Diizinkan membuat project baru.' };
}

async function runTests() {
    console.log('==================================================');
    console.log('     MENJALANKAN TEST SUITE UPGRADE / DOWNGRADE   ');
    console.log('==================================================\n');

    let createdVendorIds = [];

    try {
        // Fetch plans details first to get correct IDs
        const planTier1 = db.prepare("SELECT * FROM plans WHERE name = 'Tier 1'").get();
        const planTier2 = db.prepare("SELECT * FROM plans WHERE name = 'Tier 2'").get();
        const planTier3 = db.prepare("SELECT * FROM plans WHERE name = 'Tier 3'").get();
        const planPro = db.prepare("SELECT * FROM plans WHERE name = 'Pro'").get();
        const planTrialLimit = db.prepare("SELECT * FROM plans WHERE name = 'Trial Limit'").get();

        if (!planTier1 || !planTier2 || !planTier3 || !planPro || !planTrialLimit) {
            throw new Error('Beberapa plan default tidak ditemukan di database. Pastikan database sudah ter-seed.');
        }

        // ==================================================
        // SKENARIO A: Upgrade dalam tipe yang sama (Limit-Based)
        // ==================================================
        console.log('--- SKENARIO A: Upgrade Tipe yang Sama (Limit-Based) ---');
        
        // 1. Buat vendor test baru (Tier 1)
        const emailA = 'test-upgrade-a@test.com';
        const resA = db.prepare(`
            INSERT INTO vendors (name, email, password, role, status, planId, maxProjects, usedStorageBytes)
            VALUES ('Vendor Test A', ?, 'dummy_hash', 'vendor', 'active', ?, ?, 0)
        `).run(emailA, planTier1.id, planTier1.maxProjects);
        const vendorAId = resA.lastInsertRowid;
        createdVendorIds.push(vendorAId);
        console.log(`[OK] Vendor A dibuat (Tier 1) dengan ID: ${vendorAId}`);

        // 2. Buat 4 project dummy
        for (let i = 1; i <= 4; i++) {
            db.prepare(`
                INSERT INTO projects (vendorId, name, slug, status)
                VALUES (?, ?, ?, 'pending_selection')
            `).run(vendorAId, `Project A ${i}`, `project-a-${i}-${vendorAId}`);
        }
        console.log('[OK] 4 project dummy berhasil dibuat untuk Vendor A.');

        // 3. Verifikasi apakah masih bisa buat project ke-5
        const checkA1 = simulateCreateProjectCheck(vendorAId);
        console.log(`Verifikasi project ke-5: Allowed = ${checkA1.allowed} (Message: ${checkA1.message})`);
        if (!checkA1.allowed) {
            console.log('❌ FAIL: Vendor A harusnya diizinkan membuat project ke-5!');
        } else {
            console.log('✅ PASS: Vendor A diizinkan membuat project ke-5.');
        }

        // Simulasikan pembuatan project ke-5 agar mencapai batas max (5)
        db.prepare(`
            INSERT INTO projects (vendorId, name, slug, status)
            VALUES (?, ?, ?, 'pending_selection')
        `).run(vendorAId, 'Project A 5', `project-a-5-${vendorAId}`);

        // Cek lagi setelah project ke-5 dibuat (sekarang 5 project, limit Tier 1 adalah 5)
        const checkA2 = simulateCreateProjectCheck(vendorAId);
        console.log(`Verifikasi project ke-6 (melebihi limit Tier 1): Allowed = ${checkA2.allowed} (Message: ${checkA2.message})`);
        if (checkA2.allowed) {
            console.log('❌ FAIL: Vendor A harusnya DITOLAK membuat project ke-6 karena mencapai limit!');
        } else {
            console.log('✅ PASS: Pembuatan project ke-6 ditolak sesuai ekspektasi.');
        }

        // 4. Upgrade ke Tier 3 (update planId & maxProjects)
        console.log('Mengupgrade Vendor A ke Tier 3...');
        db.prepare('UPDATE vendors SET planId = ?, maxProjects = ? WHERE id = ?')
          .run(planTier3.id, planTier3.maxProjects, vendorAId);

        // 5. Query ulang dengan JOIN
        const detailsA = getVendorLiveDetails(vendorAId);
        console.log(`Detail Vendor A setelah upgrade:
          - Plan Name: ${detailsA.planName}
          - maxProjects: ${detailsA.maxProjects}
          - maxPhotosPerProject: ${detailsA.maxPhotosPerProject}
          - maxStorageMB: ${detailsA.maxStorageMB} MB`);

        // 6. Verifikasi nilai sesuai Tier 3
        if (detailsA.planName === 'Tier 3' && detailsA.maxProjects === 35 && detailsA.maxPhotosPerProject === 900) {
            console.log('✅ PASS: Batasan plan baru (Tier 3) langsung aktif di memori secara real-time.\n');
        } else {
            console.log('❌ FAIL: Batasan plan baru tidak ter-reflect dengan benar!\n');
        }


        // ==================================================
        // SKENARIO B: Downgrade yang menyebabkan over-limit
        // ==================================================
        console.log('--- SKENARIO B: Downgrade yang Menyebabkan Over-limit ---');
        
        // 1. Buat vendor test baru (Tier 3)
        const emailB = 'test-upgrade-b@test.com';
        const resB = db.prepare(`
            INSERT INTO vendors (name, email, password, role, status, planId, maxProjects, usedStorageBytes)
            VALUES ('Vendor Test B', ?, 'dummy_hash', 'vendor', 'active', ?, ?, 0)
        `).run(emailB, planTier3.id, planTier3.maxProjects);
        const vendorBId = resB.lastInsertRowid;
        createdVendorIds.push(vendorBId);
        console.log(`[OK] Vendor B dibuat (Tier 3) dengan ID: ${vendorBId}`);

        // 2. Buat 20 project dummy (di dalam batas Tier 3 yaitu 35)
        for (let i = 1; i <= 20; i++) {
            db.prepare(`
                INSERT INTO projects (vendorId, name, slug, status)
                VALUES (?, ?, ?, 'pending_selection')
            `).run(vendorBId, `Project B ${i}`, `project-b-${i}-${vendorBId}`);
        }
        console.log('[OK] 20 project dummy dibuat untuk Vendor B.');

        // 3. Simulasikan downgrade ke Tier 1
        console.log('Mendowngrade Vendor B ke Tier 1...');
        db.prepare('UPDATE vendors SET planId = ?, maxProjects = ? WHERE id = ?')
          .run(planTier1.id, planTier1.maxProjects, vendorBId);

        // 4. Verifikasi status over-limit
        const projectCountB = getProjectCount(vendorBId);
        const detailsB = getVendorLiveDetails(vendorBId);
        console.log(`Kondisi setelah downgrade:
          - Project Terpakai: ${projectCountB}
          - Limit Baru (Tier 1): ${detailsB.maxProjects} project`);
        
        if (projectCountB > detailsB.maxProjects) {
            console.log(`✅ PASS: Vendor B berstatus OVER-LIMIT (${projectCountB} > ${detailsB.maxProjects}).`);
        } else {
            console.log('❌ FAIL: Vendor B tidak terhitung over-limit!');
        }

        // 5. Coba simulasikan pembuatan project baru
        const checkB = simulateCreateProjectCheck(vendorBId);
        console.log(`Simulasi pembuatan project ke-21: Allowed = ${checkB.allowed} (Message: ${checkB.message})`);
        if (!checkB.allowed && checkB.message.includes('Batas jumlah project tercapai')) {
            console.log('✅ PASS: Pembuatan project baru ditolak secara aman dengan pesan error yang tepat.\n');
        } else {
            console.log('❌ FAIL: Sistem membiarkan project baru dibuat saat over-limit atau mengalami crash!\n');
        }


        // ==================================================
        // SKENARIO C: Pindah lintas tipe (Limit -> Storage Based)
        // ==================================================
        console.log('--- SKENARIO C: Pindah Lintas Tipe (Limit-Based -> Storage-Based) ---');

        // 1. Buat vendor test baru (Tier 2 - Limit-Based)
        const emailC = 'test-upgrade-c@test.com';
        const resC = db.prepare(`
            INSERT INTO vendors (name, email, password, role, status, planId, maxProjects, usedStorageBytes)
            VALUES ('Vendor Test C', ?, 'dummy_hash', 'vendor', 'active', ?, ?, 0)
        `).run(emailC, planTier2.id, planTier2.maxProjects);
        const vendorCId = resC.lastInsertRowid;
        createdVendorIds.push(vendorCId);
        console.log(`[OK] Vendor C dibuat (Tier 2) dengan ID: ${vendorCId}`);

        // 2. Buat 10 project dummy (limit Tier 2 adalah 15)
        for (let i = 1; i <= 10; i++) {
            db.prepare(`
                INSERT INTO projects (vendorId, name, slug, status)
                VALUES (?, ?, ?, 'pending_selection')
            `).run(vendorCId, `Project C ${i}`, `project-c-${i}-${vendorCId}`);
        }
        console.log('[OK] 10 project dummy dibuat untuk Vendor C.');

        // 3. Simulasikan upgrade ke 'Pro' (Storage-Based)
        console.log("Mengupgrade Vendor C ke paket Storage-Based 'Pro'...");
        db.prepare('UPDATE vendors SET planId = ?, maxProjects = ? WHERE id = ?')
          .run(planPro.id, planPro.maxProjects, vendorCId);

        // 4. Cetak dan verifikasi tipe plan beralih ke storage
        const detailsC = getVendorLiveDetails(vendorCId);
        console.log(`Detail Vendor C setelah upgrade ke Pro:
          - Plan Name: ${detailsC.planName}
          - Plan Type: ${detailsC.planType}
          - Limit Storage: ${detailsC.maxStorageMB} MB`);

        if (detailsC.planType === 'storage') {
            console.log('✅ PASS: Validasi sistem berhasil beralih ke basis Storage.');
        } else {
            console.log('❌ FAIL: Tipe plan tidak berubah menjadi storage!');
        }

        // 5. Verifikasi 10 project lama masih ada di database
        const projectCountC = getProjectCount(vendorCId);
        console.log(`Verifikasi project lama: Terbaca ${projectCountC} project di database.`);
        if (projectCountC === 10) {
            console.log('✅ PASS: Semua project lama tetap utuh setelah migrasi tipe paket.\n');
        } else {
            console.log('❌ FAIL: Terjadi kehilangan data project lama!\n');
        }


        // ==================================================
        // SKENARIO D: Trial ke berbayar
        // ==================================================
        console.log('--- SKENARIO D: Trial ke Berbayar ---');

        // 1. Buat vendor test baru (Trial Limit)
        const emailD = 'test-upgrade-d@test.com';
        const resD = db.prepare(`
            INSERT INTO vendors (name, email, password, role, status, planId, maxProjects, usedStorageBytes)
            VALUES ('Vendor Test D', ?, 'dummy_hash', 'vendor', 'active', ?, ?, 0)
        `).run(emailD, planTrialLimit.id, planTrialLimit.maxProjects);
        const vendorDId = resD.lastInsertRowid;
        createdVendorIds.push(vendorDId);
        console.log(`[OK] Vendor D dibuat (Trial Limit) dengan ID: ${vendorDId}`);

        // 2. Simulasikan persetujuan upgrade ke Tier 1 (mengikuti logika persetujuan admin)
        console.log('Menyetujui permohonan upgrade Vendor D ke Tier 1...');
        const newPeriodDays = planTier1.activePeriodDays || 30;
        let baseDate = new Date();
        baseDate.setDate(baseDate.getDate() + newPeriodDays);
        const newExpiresAt = baseDate.toISOString();

        db.prepare('UPDATE vendors SET planId = ?, expiresAt = ?, maxProjects = ? WHERE id = ?')
          .run(planTier1.id, newExpiresAt, planTier1.maxProjects, vendorDId);

        const detailsD = getVendorLiveDetails(vendorDId);
        console.log(`Detail Vendor D setelah upgrade:
          - Plan Name: ${detailsD.planName}
          - Masa Berlaku (expiresAt): ${detailsD.expiresAt}`);

        // Verifikasi expiresAt
        const expiresDate = new Date(detailsD.expiresAt);
        const today = new Date();
        const diffTime = Math.abs(expiresDate - today);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        console.log(`Selisih hari masa aktif baru dengan hari ini: ${diffDays} hari`);
        if (diffDays === 30) {
            console.log('✅ PASS: Masa berlaku berhasil di-set 30 hari ke depan secara akurat.\n');
        } else {
            console.log('❌ FAIL: Masa berlaku tidak terset ke 30 hari ke depan!\n');
        }

    } catch (err) {
        console.error('Terjadi error saat menjalankan skenario test:', err);
    } finally {
        // ==================================================
        // PEMBERSIHAN DATA TEST (CLEANUP)
        // ==================================================
        console.log('==================================================');
        console.log('         MEMBERSIHKAN DATA TEST (CLEANUP)        ');
        console.log('==================================================');

        if (createdVendorIds.length > 0) {
            // Hapus project dan vendors test dari database
            const placeholders = createdVendorIds.map(() => '?').join(',');
            
            const deleteProjects = db.prepare(`DELETE FROM projects WHERE vendorId IN (${placeholders})`);
            const deleteVendors = db.prepare(`DELETE FROM vendors WHERE id IN (${placeholders})`);
            
            const runCleanupTx = db.transaction(() => {
                deleteProjects.run(...createdVendorIds);
                deleteVendors.run(...createdVendorIds);
            });

            runCleanupTx();
            console.log(`[OK] Berhasil membersihkan ${createdVendorIds.length} vendor test dan seluruh project-nya.`);
        } else {
            console.log('Tidak ada data test yang perlu dibersihkan.');
        }
        console.log('\nUji coba selesai secara aman!');
    }
}

runTests();
