import crypto from 'crypto';

/**
 * Doku / Jokul Payment Gateway Driver
 * Uses Jokul Checkout API (legacy simplified — no RSA required).
 *
 * Credential mapping dari unified config:
 *   config.clientKey  → Doku Client ID
 *   config.serverKey  → Doku Shared Key
 *   config.merchantCode → (opsional) Merchant ID
 *
 * Docs: https://jokul.doku.com/docs/
 */

const SANDBOX_URL  = 'https://sandbox.jokul.doku.com/checkout/v1/payment';
const PROD_URL     = 'https://jokul.doku.com/checkout/v1/payment';

/**
 * Helper: generate ISO-8601 timestamp format Doku (UTC+0)
 * Format: YYYY-MM-DDTHH:mm:ssZ
 */
function dokuTimestamp() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Helper: Doku request signature
 * Formula resmi: SHA256(clientId + "|" + requestId + "|" + timestamp + "|" + sharedKey)
 */
function generateDokuSignature(clientId, requestId, timestamp, sharedKey) {
  return crypto
    .createHash('sha256')
    .update(`${clientId}|${requestId}|${timestamp}|${sharedKey}`)
    .digest('hex');
}

/**
 * Create Doku Jokul Checkout Session
 */
export async function createDokuCheckout({ orderId, amount, vendorName, vendorEmail, vendorPhone, planName, config }) {
  const clientId  = config.clientKey || '';
  const sharedKey = config.serverKey || '';

  if (!clientId || !sharedKey) {
    throw new Error('Doku Client ID dan Shared Key belum diatur di Admin Panel.');
  }

  const isProduction = config.isProduction || false;
  const baseUrl = isProduction ? PROD_URL : SANDBOX_URL;

  const intAmount = Math.round(amount);
  const timestamp = dokuTimestamp();
  const requestId = orderId; // gunakan orderId sebagai requestId (unik per transaksi)

  const signature = generateDokuSignature(clientId, requestId, timestamp, sharedKey);

  const payload = {
    client: {
      id: clientId,
    },
    order: {
      invoice_number: orderId,
      line_items: [
        {
          name: `Berlangganan ${planName || 'Paket SaaS'}`.substring(0, 50),
          price: intAmount,
          quantity: 1,
        },
      ],
      amount: intAmount,
    },
    payment: {
      // Doku minimum expiry 60 menit; gunakan setting admin atau fallback ke 60
      payment_due_date: Math.max(60, config.qrisExpirationMinutes || 60),
    },
    customer: {
      name:  vendorName  || 'Vendor',
      email: vendorEmail || '',
      phone: vendorPhone || '08123456789',
    },
  };

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Accept':              'application/json',
      'Content-Type':        'application/json',
      'Client-Id':           clientId,
      'Request-Id':          requestId,
      'Request-Timestamp':   timestamp,
      'Signature':           signature,
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json();

  if (!response.ok || (json.response && json.response.code !== '0000')) {
    const errMsg = json.response?.message || json.message || 'Gagal membuat transaksi Doku';
    throw new Error(errMsg);
  }

  // Doku returns a payment_url to redirect the user
  const paymentUrl  = json.payment?.url  || '';
  const dokuOrderId = json.order?.invoice_number || orderId;

  return {
    token:       dokuOrderId,
    redirectUrl: paymentUrl,
    qrUrl:       null, // Doku tidak expose QRIS URL langsung — user diarahkan ke halaman payment Doku
    raw:         json,
  };
}

/**
 * Verify Doku Webhook / Payment Notification
 *
 * Doku mengirim signature di header 'Signature'
 * Formula: SHA256(clientId + "|" + requestId + "|" + timestamp + "|" + sharedKey)
 *
 * Headers yang dikirim Doku:
 *   Client-Id, Request-Id, Request-Timestamp, Signature
 */
export function verifyDokuWebhook(payload, headers, sharedKey) {
  // Case-insensitive header lookup
  const h = {};
  Object.keys(headers).forEach(k => { h[k.toLowerCase()] = headers[k]; });

  const clientId  = h['client-id']         || '';
  const requestId = h['request-id']        || '';
  const timestamp = h['request-timestamp'] || '';
  const signature = h['signature']         || '';

  if (!clientId || !requestId || !timestamp || !signature) {
    return { valid: false, message: 'Header webhook Doku tidak lengkap (Client-Id / Request-Id / Request-Timestamp / Signature)' };
  }

  if (!sharedKey) {
    return { valid: false, message: 'Doku Shared Key tidak tersedia untuk verifikasi webhook' };
  }

  const expectedSignature = generateDokuSignature(clientId, requestId, timestamp, sharedKey);

  if (expectedSignature.toLowerCase() !== signature.toLowerCase()) {
    return { valid: false, message: 'Signature Doku tidak valid' };
  }

  // Parse payment status dari Doku notification body
  const invoiceNumber = payload?.order?.invoice_number || payload?.invoice_number || '';
  const status        = payload?.payment?.status        || payload?.status         || '';

  const isPaid   = status === 'SUCCESS' || status === 'SETTLED';
  const isFailed = status === 'FAILED'  || status === 'EXPIRED'  || status === 'CANCELED';

  return {
    valid:             true,
    orderId:           invoiceNumber,
    isPaid,
    isFailed,
    transactionStatus: status,
  };
}
