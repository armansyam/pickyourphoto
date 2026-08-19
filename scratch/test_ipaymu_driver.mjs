import assert from 'assert';
import crypto from 'crypto';
import { generateIPaymuSignature, verifyIPaymuWebhook } from '../lib/payment-gateway/ipaymu.js';
import { getPaymentGatewayConfig, verifyPaymentWebhook } from '../lib/payment-gateway/index.js';
import db from '../lib/db.js';

console.log('🧪 Starting IPaymu Driver & Gateway Dispatcher Tests...\n');

// Test 1: Signature Generation
{
  console.log('Test 1: Verify HMAC-SHA256 Signature calculation formula...');
  const va = '0000001234567890';
  const apiKey = 'SANDBOX-SECRET-KEY-12345';
  const body = { amount: 150000, referenceId: 'ORDER-123' };

  const sig = generateIPaymuSignature('POST', va, body, apiKey);
  assert(typeof sig === 'string' && sig.length === 64, 'Signature should be 64-char hex string');

  // Manual verify expected hash
  const bodyString = JSON.stringify(body);
  const bodyHash = crypto.createHash('sha256').update(bodyString).digest('hex').toLowerCase();
  const expectedStringToSign = `POST:${va}:${bodyHash}:${apiKey}`;
  const expectedSig = crypto.createHmac('sha256', apiKey).update(expectedStringToSign).digest('hex');

  assert.strictEqual(sig, expectedSig, 'Signature must match expected HMAC-SHA256 output');
  console.log('  ✅ Signature generation matches IPaymu v2 specification.');
}

// Test 2: Webhook parsing - Success scenario
{
  console.log('\nTest 2: Verify IPaymu Webhook parser on successful payment...');
  const successPayload = {
    trx_id: 98765432,
    sid: 'SESSION-XYZ',
    reference_id: 'ORDER-20260818-V123',
    status: 'berhasil',
    status_code: '1',
    amount: '150000',
    via: 'qris',
    channel: 'mpm'
  };

  const result = verifyIPaymuWebhook(successPayload, {}, 'API-KEY');
  assert.strictEqual(result.valid, true, 'Webhook must be valid');
  assert.strictEqual(result.orderId, 'ORDER-20260818-V123', 'OrderId must match reference_id');
  assert.strictEqual(result.isPaid, true, 'isPaid must be true on status_code 1');
  assert.strictEqual(result.isFailed, false, 'isFailed must be false');
  console.log('  ✅ Success webhook verified correctly (isPaid: true).');
}

// Test 3: Webhook parsing - Expired scenario
{
  console.log('\nTest 3: Verify IPaymu Webhook parser on expired/failed payment...');
  const expiredPayload = {
    trx_id: 98765433,
    reference_id: 'ORDER-20260818-V124',
    status: 'expired',
    status_code: '-1',
  };

  const result = verifyIPaymuWebhook(expiredPayload, {}, 'API-KEY');
  assert.strictEqual(result.valid, true, 'Webhook must be valid');
  assert.strictEqual(result.orderId, 'ORDER-20260818-V124', 'OrderId must match reference_id');
  assert.strictEqual(result.isPaid, false, 'isPaid must be false');
  assert.strictEqual(result.isFailed, true, 'isFailed must be true on status_code -1');
  console.log('  ✅ Expired webhook verified correctly (isFailed: true).');
}

// Test 4: Dispatcher Configuration Lookup
{
  console.log('\nTest 4: Verify saas_settings configuration reader...');
  const config = getPaymentGatewayConfig();
  assert(typeof config === 'object', 'Config should return an object');
  assert('provider' in config, 'Config should have provider');
  console.log(`  ✅ Config successfully read. Current active provider: "${config.provider}", enabled: ${config.enabled}`);
}

console.log('\n🎉 ALL 4 TESTS PASSED SUCCESSFULLY!\n');
