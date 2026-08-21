import crypto from 'crypto';

/**
 * IPaymu Payment Gateway Driver (v2 API)
 * Direct QRIS Mode (Native QR image & string without iframe)
 */

function generateTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth() + 1);
  const date = pad(d.getUTCDate());
  const hours = pad(d.getUTCHours());
  const minutes = pad(d.getUTCMinutes());
  const seconds = pad(d.getUTCSeconds());
  return `${year}${month}${date}${hours}${minutes}${seconds}`;
}

export function generateIPaymuSignature(method, va, bodyObj, apiKey) {
  const bodyString = typeof bodyObj === 'string' ? bodyObj : JSON.stringify(bodyObj || {});
  const bodyHash = crypto.createHash('sha256').update(bodyString).digest('hex').toLowerCase();
  const stringToSign = `${method.toUpperCase()}:${va}:${bodyHash}:${apiKey}`;
  return crypto.createHmac('sha256', apiKey).update(stringToSign).digest('hex');
}

/**
 * Create Direct QRIS Transaction via IPaymu v2 API
 */
export async function createIPaymuTransaction({ orderId, amount, vendorName, vendorEmail, vendorPhone, planName, config }) {
  const isProduction = config.isProduction || false;
  const baseUrl = isProduction
    ? 'https://my.ipaymu.com/api/v2/payment/direct'
    : 'https://sandbox.ipaymu.com/api/v2/payment/direct';

  const va = (config.merchantCode || config.clientKey || '').trim();
  const apiKey = (config.apiKey || config.serverKey || '').trim();

  if (!va) throw new Error('IPaymu Virtual Account (VA) Number belum diatur di Admin Panel.');
  if (!apiKey) throw new Error('IPaymu API Key belum diatur di Admin Panel.');

  // Expiration in hours (IPaymu expects hours integer, min 1)
  const expiryHours = config.qrisExpirationMinutes && config.qrisExpirationMinutes > 0
    ? Math.max(1, Math.ceil(config.qrisExpirationMinutes / 60))
    : 24;

  const notifyUrl = config.notifyUrl || `${process.env.NEXT_PUBLIC_BASE_URL || 'https://photota.id'}/api/payment/notification`;
  const returnUrl = config.returnUrl || `${process.env.NEXT_PUBLIC_BASE_URL || 'https://photota.id'}/dashboard`;
  const cancelUrl = config.cancelUrl || `${process.env.NEXT_PUBLIC_BASE_URL || 'https://photota.id'}/register`;

  const payload = {
    name: vendorName || 'Vendor',
    phone: vendorPhone || '08123456789',
    email: vendorEmail || 'vendor@pickyourphoto.id',
    amount: Math.round(amount),
    comments: `Berlangganan ${planName || 'Paket SaaS'}`.substring(0, 100),
    referenceId: orderId,
    notifyUrl: notifyUrl,
    returnUrl: returnUrl,
    cancelUrl: cancelUrl,
    paymentMethod: 'qris',
    paymentChannel: 'mpm',
    expired: expiryHours,
  };

  const timestamp = generateTimestamp();
  const signature = generateIPaymuSignature('POST', va, payload, apiKey);

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'va': va,
      'signature': signature,
      'timestamp': timestamp,
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok || (json.Status && json.Status !== 200)) {
    const errorMsg = json.Message || json.message || (json.error ? JSON.stringify(json.error) : 'Gagal membuat transaksi Direct QRIS IPaymu');
    throw new Error(errorMsg);
  }

  const data = json.Data || {};
  const qrImage = data.QrImage || data.qrImage || '';
  const qrString = data.QrString || data.qrString || '';
  const qrUrl = qrImage || qrString || '';

  return {
    token: data.SessionId || String(data.TransactionId) || orderId,
    qrUrl: qrUrl,
    qrImage: qrImage,
    qrString: qrString,
    redirectUrl: qrImage || '',
    raw: json,
  };
}

/**
 * Verify IPaymu Webhook Notification
 * IPaymu sends POST notification to notifyUrl with parameters:
 * trx_id, sid, reference_id, status, status_code, amount, etc.
 */
export function verifyIPaymuWebhook(payload, headers = {}, apiKey = '') {
  const orderId = payload.reference_id || payload.referenceId || payload.order_id || payload.orderId || payload.sid || payload.trx_id || payload.transaction_id;
  const statusCode = String(payload.status_code ?? payload.statusCode ?? '');
  const statusStr = String(payload.status || '').toLowerCase();

  if (!orderId) {
    return { valid: false, message: 'Payload webhook IPaymu tidak memiliki reference_id/orderId/sid.' };
  }

  // status_code: '1' is success (berhasil), '0' is pending, '-1' or '2' is failed/expired/cancelled
  const isPaid = statusCode === '1' || statusStr === 'berhasil' || statusStr === 'paid' || statusStr === 'settlement';
  const isFailed = statusCode === '-1' || statusCode === '2' || statusStr === 'gagal' || statusStr === 'expired' || statusStr === 'batal' || statusStr === 'cancel';

  return {
    valid: true,
    orderId,
    isPaid,
    isFailed,
    transactionStatus: isPaid ? 'settlement' : isFailed ? 'failed' : 'pending',
    raw: payload,
  };
}

/**
 * Check live status of an IPaymu transaction via API
 */
export async function checkIPaymuTransactionStatus({ transactionId, config }) {
  if (!transactionId) return { valid: false };

  const isProduction = config.isProduction || false;
  const baseUrl = isProduction
    ? 'https://my.ipaymu.com/api/v2/transaction'
    : 'https://sandbox.ipaymu.com/api/v2/transaction';

  const va = (config.merchantCode || config.clientKey || '').trim();
  const apiKey = (config.apiKey || config.serverKey || '').trim();
  if (!va || !apiKey) return { valid: false };

  const payload = { transactionId: parseInt(transactionId, 10) || transactionId };
  const timestamp = generateTimestamp();
  const signature = generateIPaymuSignature('POST', va, payload, apiKey);

  try {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'va': va,
        'signature': signature,
        'timestamp': timestamp,
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));
    if (res.ok && json.Status === 200) {
      const data = json.Data || {};
      const statusVal = data.Status ?? data.status;
      const statusStr = String(data.StatusName || data.statusName || '').toLowerCase();
      const isPaid = String(statusVal) === '1' || statusStr.includes('berhasil') || statusStr.includes('settlement') || statusStr.includes('paid');
      const isFailed = String(statusVal) === '-1' || String(statusVal) === '2' || statusStr.includes('gagal') || statusStr.includes('expired') || statusStr.includes('batal');

      return {
        valid: true,
        isPaid,
        isFailed,
        status: statusVal,
        data,
      };
    }
    return { valid: false, message: json.Message || 'Status query failed' };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

