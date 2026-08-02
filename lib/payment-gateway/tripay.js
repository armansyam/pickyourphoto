import crypto from 'crypto';

/**
 * Tripay Payment Gateway Driver
 * Supports Tripay Closed Payment Transaction API and HMAC SHA-256 Webhook Verification.
 */
export async function createTripayTransaction({ orderId, amount, vendorName, vendorEmail, vendorPhone, planName, config }) {
  const apiKey = config.apiKey || config.serverKey || '';
  const privateKey = config.clientKey || config.privateKey || '';
  const merchantCode = config.merchantCode || '';

  if (!apiKey || !privateKey || !merchantCode) {
    throw new Error('Kredensial Tripay (API Key, Private Key, atau Merchant Code) belum diisi di Admin Panel.');
  }

  const isProduction = config.isProduction || false;
  const baseUrl = isProduction 
    ? 'https://tripay.co.id/api/transaction/create'
    : 'https://tripay.co.id/api-sandbox/transaction/create';

  const intAmount = Math.round(amount);

  // Generate signature: HMAC_SHA256(merchant_code + merchant_ref + amount, private_key)
  const signature = crypto
    .createHmac('sha256', privateKey)
    .update(merchantCode + orderId + intAmount)
    .digest('hex');

  const payload = {
    method: 'QRIS', // Default payment channel (can be selected)
    merchant_ref: orderId,
    amount: intAmount,
    customer_name: vendorName || 'Vendor',
    customer_email: vendorEmail,
    customer_phone: vendorPhone || '08123456789',
    order_items: [
      {
        name: `Berlangganan ${planName || 'Paket SaaS'}`,
        price: intAmount,
        quantity: 1,
      },
    ],
    signature: signature,
  };

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.message || 'Gagal membuat transaksi Tripay');
  }

  const data = json.data;
  return {
    token: data.reference,
    redirectUrl: data.checkout_url,
    raw: data,
  };
}

/**
 * Verify Tripay Webhook Signature
 * Signature formula: HMAC_SHA256(json_body, private_key)
 */
export function verifyTripayWebhook(rawBody, headers, privateKey) {
  const callbackSignature = headers['x-callback-signature'] || headers['X-Callback-Signature'];

  if (!callbackSignature || !privateKey) {
    return { valid: false, message: 'Signature atau Private Key Tripay tidak tersedia' };
  }

  const expectedSignature = crypto
    .createHmac('sha256', privateKey)
    .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
    .digest('hex');

  if (expectedSignature !== callbackSignature) {
    return { valid: false, message: 'Signature Tripay tidak valid' };
  }

  const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
  const { merchant_ref, status } = body;

  const isPaid = status === 'PAID';
  const isFailed = status === 'EXPIRED' || status === 'FAILED';

  return {
    valid: true,
    orderId: merchant_ref,
    isPaid,
    isFailed,
    transactionStatus: status,
  };
}
