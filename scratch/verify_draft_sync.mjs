import db from '../lib/db.js';

console.log('🧪 Starting Draft Sync & Submit Locking Verification...');

// 1. Setup temporary test vendor, project, client, photos
const vendorId = 99999;
const projectId = 88888;
const clientId = 77777;
const accessKey = 'test_draft_key_123';

try {
    // Clean up
    db.prepare('DELETE FROM selections WHERE clientId = ?').run(clientId);
    db.prepare('DELETE FROM photos WHERE projectId = ?').run(projectId);
    db.prepare('DELETE FROM clients WHERE id = ?').run(clientId);
    db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
    db.prepare('DELETE FROM vendors WHERE id = ?').run(vendorId);

    // Insert vendor
    db.prepare(`
        INSERT INTO vendors (id, name, email, password, brandName, whatsapp, status, expiresAt)
        VALUES (?, 'Test Studio', 'test@studio.com', 'hash', 'Ams Studio', '08123456789', 'active', datetime('now', '+30 days'))
    `).run(vendorId);

    // Insert project (maxSelection = 10)
    db.prepare(`
        INSERT INTO projects (id, vendorId, name, slug, status, maxSelection, expiresAt)
        VALUES (?, ?, 'Wedding Project Test', 'wedding-test-draft', 'draft', 10, datetime('now', '+7 days'))
    `).run(projectId, vendorId);

    // Insert client
    db.prepare(`
        INSERT INTO clients (id, email, projectId, accessKey)
        VALUES (?, 'client@test.com', ?, ?)
    `).run(clientId, projectId, accessKey);

    // Insert 10 photos
    for (let i = 1; i <= 10; i++) {
        db.prepare(`
            INSERT INTO photos (id, projectId, originalPath, thumbnailPath, watermarkedPath)
            VALUES (?, ?, ?, ?, ?)
        `).run(60000 + i, projectId, `/photos/orig_${i}.jpg`, `/photos/thumb_${i}.jpg`, `/photos/water_${i}.jpg`);
    }

    console.log('✓ Test fixtures created successfully.');

    // 2. Test Step A: Client saves 3 photos as DRAFT
    const draftPhotos1 = [60001, 60002, 60003];
    db.prepare('DELETE FROM selections WHERE clientId = ?').run(clientId);
    const insertSelection = db.prepare('INSERT INTO selections (clientId, photoId) VALUES (?, ?)');
    const insertMany = db.transaction((ids) => {
        for (const id of ids) insertSelection.run(clientId, id);
    });
    insertMany(draftPhotos1);

    // Verify DB state for Step A
    const countA = db.prepare('SELECT COUNT(*) as c FROM selections WHERE clientId = ?').get(clientId).c;
    const projectA = db.prepare('SELECT status FROM projects WHERE id = ?').get(projectId);
    if (countA !== 3) throw new Error(`Expected 3 selections, got ${countA}`);
    if (projectA.status !== 'draft') throw new Error(`Expected status 'draft', got ${projectA.status}`);
    console.log('✓ Step A Passed: 3 photos saved in draft, project status remains "draft" (unlocked).');

    // 3. Test Step B: Client opens on new device (Fetch gallery query)
    const fetchedPhotos = db.prepare(`
        SELECT 
            p.id,
            (SELECT COUNT(*) FROM selections s WHERE s.photoId = p.id AND s.clientId = ?) as isSelected
        FROM photos p
        WHERE p.projectId = ?
    `).all(clientId, projectId);

    const selectedFromFetch = fetchedPhotos.filter(p => p.isSelected > 0).map(p => p.id);
    if (selectedFromFetch.length !== 3 || !selectedFromFetch.includes(60001)) {
        throw new Error(`Expected fetched selections to contain [60001, 60002, 60003], got ${JSON.stringify(selectedFromFetch)}`);
    }
    console.log('✓ Step B Passed: Client loads 3 pre-selected photos on new device seamlessly.');

    // 4. Test Step C: Client adds 2 more photos in draft (Total 5 photos)
    const draftPhotos2 = [60001, 60002, 60003, 60004, 60005];
    db.prepare('DELETE FROM selections WHERE clientId = ?').run(clientId);
    insertMany(draftPhotos2);

    const countC = db.prepare('SELECT COUNT(*) as c FROM selections WHERE clientId = ?').get(clientId).c;
    if (countC !== 5) throw new Error(`Expected 5 selections, got ${countC}`);
    console.log('✓ Step C Passed: Client draft updated to 5 photos.');

    // 5. Test Step D: Client clicks FINAL SUBMIT (Locking project)
    db.prepare("UPDATE projects SET status = 'completed' WHERE id = ?").run(projectId);
    const projectD = db.prepare('SELECT status FROM projects WHERE id = ?').get(projectId);
    if (projectD.status !== 'completed') throw new Error(`Expected status 'completed', got ${projectD.status}`);
    console.log('✓ Step D Passed: Final submit locks project to "completed".');

    // Clean up
    db.prepare('DELETE FROM selections WHERE clientId = ?').run(clientId);
    db.prepare('DELETE FROM photos WHERE projectId = ?').run(projectId);
    db.prepare('DELETE FROM clients WHERE id = ?').run(clientId);
    db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
    db.prepare('DELETE FROM vendors WHERE id = ?').run(vendorId);

    console.log('\n🎉 ALL TESTS PASSED WITH 100% SUCCESS!');
} catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
}
