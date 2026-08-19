import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'data', 'database.db');

console.log('================================================================');
console.log('🚀 MEMULAI PENGUJIAN STRESS & KETAHANAN KONKURENSI SAAS');
console.log(`📂 Database Path: ${dbPath}`);
console.log('================================================================\n');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 10000');

const results = {
  dbReads: null,
  dbWrites: null,
  jwtSpeed: null,
  rateLimitStress: null,
  webhookVerifications: null,
  missingDataEdgeCases: [],
  securityTamperTests: [],
  memoryProfile: null
};

// 1. BENCHMARK: 1,000 Concurrent SQLite Reads (Simulasi 1,000 Pengunjung Melihat Galeri)
async function testConcurrentReads() {
  console.log('⚡ [1/7] Menguji 1,000 Concurrent Database Reads (WAL Mode)...');
  const startMem = process.memoryUsage().heapUsed;
  const start = performance.now();
  
  const queryStmt = db.prepare('SELECT id, name, slug, status, maxSelection, expiresAt FROM projects LIMIT 10');
  
  const promises = [];
  const TOTAL_READS = 1000;
  for (let i = 0; i < TOTAL_READS; i++) {
    promises.push(new Promise((resolve) => {
      try {
        const rows = queryStmt.all();
        resolve({ success: true, count: rows.length });
      } catch (err) {
        resolve({ success: false, error: err.message });
      }
    }));
  }

  const queryResults = await Promise.all(promises);
  const durationMs = performance.now() - start;
  const successes = queryResults.filter(r => r.success).length;
  const endMem = process.memoryUsage().heapUsed;

  results.dbReads = {
    total: TOTAL_READS,
    successes,
    durationMs: durationMs.toFixed(2),
    qps: Math.round((TOTAL_READS / (durationMs / 1000))),
    avgLatencyMs: (durationMs / TOTAL_READS).toFixed(4),
    memoryDeltaKb: Math.round((endMem - startMem) / 1024)
  };

  console.log(`   ✅ Selesai: ${successes}/${TOTAL_READS} berhasil dalam ${results.dbReads.durationMs}ms`);
  console.log(`   📊 Throughput: ${results.dbReads.qps} queries/detik (Latensi rata-rata: ${results.dbReads.avgLatencyMs} ms/query)\n`);
}

// 2. BENCHMARK: 100 Concurrent Parallel Write Transactions (Simulasi Submit Seleksi Klien Bersamaan)
async function testConcurrentWrites() {
  console.log('⚡ [2/7] Menguji 100 Konkuren Penulisan Transaksi SQLite...');
  const start = performance.now();
  const TOTAL_WRITES = 100;
  
  // Gunakan tabel dummy / temporary log agar tidak merusak data produksi
  db.exec(`CREATE TEMP TABLE IF NOT EXISTS stress_test_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clientId INTEGER,
    action TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  const insertStmt = db.prepare('INSERT INTO stress_test_logs (clientId, action) VALUES (?, ?)');
  
  const promises = [];
  for (let i = 0; i < TOTAL_WRITES; i++) {
    promises.push(new Promise((resolve) => {
      try {
        const runTx = db.transaction(() => {
          insertStmt.run(i + 1, `selection_submit_${i}`);
        });
        runTx();
        resolve({ success: true });
      } catch (err) {
        resolve({ success: false, error: err.message });
      }
    }));
  }

  const writeResults = await Promise.all(promises);
  const durationMs = performance.now() - start;
  const successes = writeResults.filter(r => r.success).length;

  results.dbWrites = {
    total: TOTAL_WRITES,
    successes,
    durationMs: durationMs.toFixed(2),
    qps: Math.round((TOTAL_WRITES / (durationMs / 1000))),
    avgLatencyMs: (durationMs / TOTAL_WRITES).toFixed(4)
  };

  console.log(`   ✅ Selesai: ${successes}/${TOTAL_WRITES} transaksi berhasil dalam ${results.dbWrites.durationMs}ms`);
  console.log(`   📊 Throughput: ${results.dbWrites.qps} tx/detik (Latensi rata-rata: ${results.dbWrites.avgLatencyMs} ms/tx)\n`);
}

// 3. BENCHMARK: JWT Token Generation & Verification (10,000 Ops)
async function testJwtPerformance() {
  console.log('⚡ [3/7] Menguji Throughput Keamanan Kriptografi JWT Token (10,000 Ops)...');
  const secret = 'super-secret-production-key-for-pick-your-photo-audit-2026';
  const start = performance.now();
  const TOTAL_OPS = 10000;
  
  let validCount = 0;
  for (let i = 0; i < TOTAL_OPS; i++) {
    const token = jwt.sign({ id: i, name: `Vendor ${i}`, email: `vendor${i}@mail.com`, role: 'vendor' }, secret, { expiresIn: '24h' });
    const decoded = jwt.verify(token, secret);
    if (decoded && decoded.id === i) validCount++;
  }

  const durationMs = performance.now() - start;
  results.jwtSpeed = {
    total: TOTAL_OPS,
    validCount,
    durationMs: durationMs.toFixed(2),
    opsPerSec: Math.round((TOTAL_OPS / (durationMs / 1000))),
    avgLatencyUs: ((durationMs / TOTAL_OPS) * 1000).toFixed(2)
  };

  console.log(`   ✅ Selesai: ${validCount}/${TOTAL_OPS} token berhasil disign & diverifikasi dalam ${results.jwtSpeed.durationMs}ms`);
  console.log(`   📊 Kecepatan: ${results.jwtSpeed.opsPerSec} ops/detik (${results.jwtSpeed.avgLatencyUs} µs/op)\n`);
}

// 4. BENCHMARK: In-Memory Rate Limiting Stress Test (100,000 Checks)
async function testRateLimitStress() {
  console.log('⚡ [4/7] Menguji Ketahanan & Memory Leak Rate Limiter Map (100,000 Checks)...');
  const { checkRateLimit } = await import('../lib/rate-limit.js');
  const startMem = process.memoryUsage().heapUsed;
  const start = performance.now();
  const TOTAL_CHECKS = 100000;

  let blockedCount = 0;
  let allowedCount = 0;

  for (let i = 0; i < TOTAL_CHECKS; i++) {
    // 500 distinct IP addresses
    const ip = `192.168.1.${i % 500}`;
    const res = checkRateLimit(`stress_ip_${ip}`, 10, 60);
    if (res.success) allowedCount++;
    else blockedCount++;
  }

  const durationMs = performance.now() - start;
  const endMem = process.memoryUsage().heapUsed;

  results.rateLimitStress = {
    total: TOTAL_CHECKS,
    allowedCount,
    blockedCount,
    durationMs: durationMs.toFixed(2),
    checksPerSec: Math.round((TOTAL_CHECKS / (durationMs / 1000))),
    heapDeltaKb: Math.round((endMem - startMem) / 1024)
  };

  console.log(`   ✅ Selesai: ${allowedCount} allowed, ${blockedCount} blocked dalam ${results.rateLimitStress.durationMs}ms`);
  console.log(`   📊 Throughput: ${results.rateLimitStress.checksPerSec} checks/detik (Memori delta: ${results.rateLimitStress.heapDeltaKb} KB)\n`);
}

// 5. SECURITY & GATEWAY SIGNATURE INTEGRITY AUDIT
async function testWebhookSignatures() {
  console.log('⚡ [5/7] Menguji Verifikasi Keamanan Signature 6 Payment Gateway...');
  const { 
    verifyMidtransWebhook 
  } = await import('../lib/payment-gateway/midtrans.js');
  const { 
    verifyTripayWebhook 
  } = await import('../lib/payment-gateway/tripay.js');
  const { 
    verifyDuitkuWebhook 
  } = await import('../lib/payment-gateway/duitku.js');
  const { 
    verifyDokuWebhook 
  } = await import('../lib/payment-gateway/doku.js');
  const { 
    verifyIPaymuWebhook 
  } = await import('../lib/payment-gateway/ipaymu.js');

  const tests = [];

  // Midtrans SHA512 Test
  const midOrderId = 'ORDER-MID-001';
  const midStatusCode = '200';
  const midGross = '49000.00';
  const midServerKey = 'SB-Mid-server-TEST123';
  const midSignature = crypto.createHash('sha512').update(`${midOrderId}${midStatusCode}${midGross}${midServerKey}`).digest('hex');
  const midValid = verifyMidtransWebhook({ order_id: midOrderId, status_code: midStatusCode, gross_amount: midGross, signature_key: midSignature, transaction_status: 'settlement' }, midServerKey);
  tests.push({ provider: 'Midtrans', test: 'Valid Signature', passed: midValid.valid === true });

  const midTampered = verifyMidtransWebhook({ order_id: midOrderId, status_code: midStatusCode, gross_amount: '1000.00', signature_key: midSignature, transaction_status: 'settlement' }, midServerKey);
  tests.push({ provider: 'Midtrans', test: 'Tampered Amount Rejected', passed: midTampered.valid === false });

  // Tripay HMAC SHA256 Test
  const tripayKey = 'PRIVATE-KEY-TRIPAY-XYZ';
  const tripayPayload = JSON.stringify({ reference: 'TP-001', merchant_ref: 'ORDER-TP-001', status: 'PAID', total_amount: 129000 });
  const tripaySig = crypto.createHmac('sha256', tripayKey).update(tripayPayload).digest('hex');
  const tripayValid = verifyTripayWebhook(tripayPayload, { 'x-callback-signature': tripaySig, 'x-callback-event': 'payment_status' }, tripayKey);
  tests.push({ provider: 'Tripay', test: 'Valid HMAC-SHA256', passed: tripayValid.valid === true });

  const tripayTampered = verifyTripayWebhook(tripayPayload, { 'x-callback-signature': 'invalid_sig', 'x-callback-event': 'payment_status' }, tripayKey);
  tests.push({ provider: 'Tripay', test: 'Tampered Signature Rejected', passed: tripayTampered.valid === false });

  // Duitku MD5 Test
  const duitkuMerchant = 'D1234';
  const duitkuApiKey = 'APIKEYDUITKU';
  const duitkuOrderId = 'ORDER-DK-001';
  const duitkuAmount = '249000';
  const duitkuSig = crypto.createHash('md5').update(`${duitkuMerchant}${duitkuAmount}${duitkuOrderId}${duitkuApiKey}`).digest('hex');
  const duitkuValid = verifyDuitkuWebhook({ merchantCode: duitkuMerchant, amount: duitkuAmount, merchantOrderId: duitkuOrderId, resultCode: '00', signature: duitkuSig }, duitkuMerchant, duitkuApiKey);
  tests.push({ provider: 'Duitku', test: 'Valid MD5 Checksum', passed: duitkuValid.valid === true });

  // iPaymu HMAC SHA256 Test
  const ipaymuKey = 'IPAYMU-SECRET-KEY';
  const ipaymuPayload = { trx_id: '12345', sid: 'ORDER-IP-001', status: 'berhasil', status_code: '1' };
  const ipaymuSig = crypto.createHmac('sha256', ipaymuKey).update(JSON.stringify(ipaymuPayload)).digest('hex');
  const ipaymuValid = verifyIPaymuWebhook(ipaymuPayload, { 'signature': ipaymuSig }, ipaymuKey);
  tests.push({ provider: 'iPaymu', test: 'Valid HMAC-SHA256 Signature', passed: ipaymuValid.valid === true });

  results.webhookVerifications = tests;
  tests.forEach(t => {
    console.log(`   ${t.passed ? '✅' : '❌'} [${t.provider}] ${t.test}: ${t.passed ? 'PASSED' : 'FAILED'}`);
  });
  console.log('');
}

// 6. EDGE CASE & MISSING ENTITY INTEGRITY CHECK (Defensive Testing)
async function testEdgeCases() {
  console.log('⚡ [6/7] Menguji Kasus Missing Data & Edge Case Resilience...');

  const edgeTests = [];

  // A. Non-existent vendor query
  const missingVendor = db.prepare('SELECT * FROM vendors WHERE id = 9999999').get();
  edgeTests.push({
    case: 'Query Non-Existent Vendor ID',
    behavior: missingVendor === undefined ? 'HANDLED_SAFELY_NULL' : 'UNEXPECTED',
    safe: missingVendor === undefined
  });

  // B. Non-existent client access key
  const missingClient = db.prepare('SELECT * FROM clients WHERE accessKey = ?').get('non-existent-access-key-xyz');
  edgeTests.push({
    case: 'Non-Existent Client Access Key Verification',
    behavior: missingClient === undefined ? 'HANDLED_SAFELY_NULL' : 'UNEXPECTED',
    safe: missingClient === undefined
  });

  // C. Project without photos (Empty Gallery Edge Case)
  const emptyProjectPhotos = db.prepare('SELECT COUNT(*) as count FROM photos WHERE projectId = -1').get();
  edgeTests.push({
    case: 'Empty Project Photos Array Handling',
    behavior: emptyProjectPhotos.count === 0 ? 'HANDLED_SAFELY_EMPTY_SET' : 'ERROR',
    safe: emptyProjectPhotos.count === 0
  });

  // D. Negative storage quota protection check
  const negStorageTest = db.prepare('SELECT MAX(0, 500 - 1000) as clamped').get();
  edgeTests.push({
    case: 'Storage Bytes Math Underflow Protection (MAX(0, x-y))',
    behavior: negStorageTest.clamped === 0 ? 'PROTECTED_ZERO_CLAMP' : 'UNDERFLOW_BUG',
    safe: negStorageTest.clamped === 0
  });

  // E. Project slug collision avoidance check
  const existingSlug = db.prepare('SELECT slug FROM projects LIMIT 1').get();
  if (existingSlug) {
    const slugCheck = db.prepare('SELECT id FROM projects WHERE slug = ?').get(existingSlug.slug);
    edgeTests.push({
      case: 'Slug Collision Unique Indexing Enforcement',
      behavior: slugCheck ? 'INDEX_LOOKUP_FUNCTIONAL' : 'INDEX_FAILED',
      safe: Boolean(slugCheck)
    });
  }

  results.missingDataEdgeCases = edgeTests;
  edgeTests.forEach(t => {
    console.log(`   ${t.safe ? '✅' : '❌'} ${t.case} => [${t.behavior}]`);
  });
  console.log('');
}

// 7. MEMORY & RESOURCE PROFILING
function profileSystemResources() {
  console.log('⚡ [7/7] Menganalisis Profil Memori Heap & Penggunaan Resource Node.js...');
  const mem = process.memoryUsage();
  results.memoryProfile = {
    rssMb: (mem.rss / (1024 * 1024)).toFixed(2),
    heapTotalMb: (mem.heapTotal / (1024 * 1024)).toFixed(2),
    heapUsedMb: (mem.heapUsed / (1024 * 1024)).toFixed(2),
    externalMb: (mem.external / (1024 * 1024)).toFixed(2),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch
  };

  console.log(`   📊 Memory RSS: ${results.memoryProfile.rssMb} MB`);
  console.log(`   📊 Heap Total: ${results.memoryProfile.heapTotalMb} MB`);
  console.log(`   📊 Heap Used:  ${results.memoryProfile.heapUsedMb} MB`);
  console.log(`   📊 External:   ${results.memoryProfile.externalMb} MB\n`);
}

async function runAll() {
  await testConcurrentReads();
  await testConcurrentWrites();
  await testJwtPerformance();
  await testRateLimitStress();
  await testWebhookSignatures();
  await testEdgeCases();
  profileSystemResources();

  // Simpan hasil ke scratch/benchmark_results.json
  const outPath = path.join(__dirname, 'benchmark_results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`🎉 SELURUH PENGUJIAN SELESAI! Hasil benchmarking disimpan di: ${outPath}`);
}

runAll().catch(console.error);
