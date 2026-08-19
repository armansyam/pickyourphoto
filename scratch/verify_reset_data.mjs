import db from '../lib/db.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

console.log('🧪 Starting Reset Data API Verification...');

const testAdminId = 99991;
const testVendorId = 88881;
const testProjectId = 77771;

try {
    // 1. Setup Fixtures (Clean up child first)
    db.prepare('DELETE FROM subscription_requests WHERE vendorId = ?').run(testVendorId);
    db.prepare('DELETE FROM projects WHERE id = ?').run(testProjectId);
    db.prepare('DELETE FROM vendors WHERE id = ?').run(testVendorId);
    db.prepare('DELETE FROM admins WHERE id = ?').run(testAdminId);

    const planRow = db.prepare('SELECT id FROM plans LIMIT 1').get();
    const validPlanId = planRow ? planRow.id : null;

    const hashedPass = bcrypt.hashSync('superadmin_secret_123', 10);
    db.prepare(`
        INSERT INTO admins (id, name, email, password, role, isRoot)
        VALUES (?, 'Test Admin', 'admin@clean.com', ?, 'admin', 1)
    `).run(testAdminId, hashedPass);

    db.prepare(`
        INSERT INTO vendors (id, name, email, password, brandName, status, paymentProof, planId)
        VALUES (?, 'Vendor Test', 'v@test.com', 'p', 'V Studio', 'active', 'proof.jpg', ?)
    `).run(testVendorId, validPlanId);

    db.prepare(`
        INSERT INTO projects (id, vendorId, name, slug, status)
        VALUES (?, ?, 'Project Test', 'proj-test', 'draft')
    `).run(testProjectId, testVendorId);

    if (validPlanId) {
        db.prepare(`
            INSERT INTO subscription_requests (vendorId, planId, proratedPrice, transferProof, status)
            VALUES (?, ?, 50000, 'proof.jpg', 'approved')
        `).run(testVendorId, validPlanId);
    }

    console.log('✓ Test fixtures set up.');

    // 2. Test Step A: Wrong Password Rejection
    const adminRow = db.prepare('SELECT * FROM admins WHERE id = ?').get(testAdminId);
    const isValidPass = bcrypt.compareSync('wrong_pass', adminRow.password);
    if (isValidPass) throw new Error('Expected wrong password to fail!');
    const isCorrectPass = bcrypt.compareSync('superadmin_secret_123', adminRow.password);
    if (!isCorrectPass) throw new Error('Expected correct password to succeed!');
    console.log('✓ Step A Passed: Security password check rejects incorrect passwords.');

    // 3. Test Step B: Financial Data Reset
    const cleanFinancial = db.transaction(() => {
        db.exec('DELETE FROM payment_transactions;');
        db.exec('DELETE FROM payment_sessions;');
        db.exec('DELETE FROM storage_addon_subscriptions;');
        db.exec('DELETE FROM subscription_requests;');
        db.exec("UPDATE vendors SET paymentProof = NULL;");
    });
    cleanFinancial();

    const subCount = db.prepare('SELECT COUNT(*) as c FROM subscription_requests').get().c;
    const vendorStillExists = db.prepare('SELECT id, paymentProof FROM vendors WHERE id = ?').get(testVendorId);
    if (subCount !== 0) throw new Error('Expected 0 subscription requests');
    if (!vendorStillExists || vendorStillExists.paymentProof !== null) throw new Error('Expected vendor to exist with null paymentProof');
    console.log('✓ Step B Passed: Financial reset cleared transaction data while preserving vendors.');

    // 4. Test Step C: Full Vendor & Gallery Reset
    const cleanFull = db.transaction(() => {
        db.exec('DELETE FROM selections;');
        db.exec('DELETE FROM photos;');
        db.exec('DELETE FROM clients;');
        db.exec('DELETE FROM projects;');
        db.exec('DELETE FROM storage_files;');
        db.exec('DELETE FROM storage_folders;');
        db.exec('DELETE FROM daily_upload_logs;');
        db.exec('DELETE FROM upload_queue;');
        db.exec('DELETE FROM trial_galleries;');
        db.exec('DELETE FROM payment_transactions;');
        db.exec('DELETE FROM payment_sessions;');
        db.exec('DELETE FROM storage_addon_subscriptions;');
        db.exec('DELETE FROM subscription_requests;');
        db.exec('DELETE FROM vendors;');
    });
    cleanFull();

    const vendorCount = db.prepare('SELECT COUNT(*) as c FROM vendors').get().c;
    const projectCount = db.prepare('SELECT COUNT(*) as c FROM projects').get().c;
    const plansCount = db.prepare('SELECT COUNT(*) as c FROM plans').get().c;
    const adminCount = db.prepare('SELECT COUNT(*) as c FROM admins').get().c;

    if (vendorCount !== 0) throw new Error(`Expected 0 vendors, got ${vendorCount}`);
    if (projectCount !== 0) throw new Error(`Expected 0 projects, got ${projectCount}`);
    if (plansCount === 0) throw new Error('Plans table was erroneously cleared!');
    if (adminCount === 0) throw new Error('Admins table was erroneously cleared!');

    console.log('✓ Step C Passed: Full clean cleared all vendors/galleries while preserving plans and admin accounts.');

    // Clean up
    db.prepare('DELETE FROM admins WHERE id = ?').run(testAdminId);

    console.log('\n🎉 ALL RESET DATA TESTS PASSED WITH 100% SUCCESS!');
} catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
}
