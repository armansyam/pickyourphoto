import crypto from 'crypto';

/**
 * Duitku Payment Gateway Driver
 * Supports Duitku Passport API and MD5 Webhook Verification.
 */
export async function createDuitkuTransaction({ orderId, amount, vendorName, vendorEmail, vendorPhone, planName, config }) {
  const merchantCode = config.merchantCode || '';
  const apiKey = config.apiKey || config.serverKey || '';

  if (!merchantCode || !apiKey) {
    throw new Error('Duitku Merchant Code & API Key belum diisi di Admin Panel.');
  }

  const isProduction = config.isProduction || false;
  const baseUrl = isProduction 
    ? 'https://passport.duitku.com/webapi/api/merchant/v2/inquiry.php'
    : 'https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry.php';

  const intAmount = Math.round(amount);

  // Signature formula: MD5(merchantCode + orderId + amount + apiKey)
  const signature = crypto
    .createHash('md5')
    .update(merchantCode + orderId + intAmount + apiKey)
    .digest('hex');

  const payload = {
    merchantCode: merchantCode,
    paymentAmount: intAmount,
    paymentMethod: 'VC', // Default Virtual Account / Pop-up
    merchantOrderId: orderId,
    productDetails: `Berlangganan ${planName || 'Paket SaaS'}`,
    email: vendorEmail,
    phoneNumber: vendorPhone || '08123456789',
    customerVaName: vendorName || 'Vendor',
    signature: signature,
    expiryPeriod: 1440, // 24 jam
  };

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json();
  if (!response.ok || json.statusCode !== '00') {
    throw new Error(json.statusMessage || 'Gagal membuat transaksi Duitku');
  }

  return {
    token: json.reference,
    redirectUrl: json.paymentUrl,
    raw: json,
  };
}

/**
 * Verify Duitku Webhook MD5 Signature
 * Formula (resmi Duitku): MD5(merchantCode + merchantOrderId + amount + apiKey)
 */
export function verifyDuitkuWebhook(payload, merchantCode, apiKey) {
  const { merchantOrderId, amount, resultCode, signature } = payload;

  if (!merchantOrderId || !amount || !signature) {
    return { valid: false, message: 'Payload Duitku tidak lengkap' };
  }

  // Signature formula (sesuai dokumen resmi Duitku callback):
  // MD5(merchantCode + amount + merchantOrderId + apiKey)
  const expectedSignature = crypto
    .createHash('md5')
    .update(String(merchantCode || '') + String(amount || '') + String(merchantOrderId || '') + String(apiKey || ''))
    .digest('hex');

  // Fallback variant for legacy integration
  const fallbackSignature = crypto
    .createHash('md5')
    .update(String(merchantCode || '') + String(merchantOrderId || '') + String(amount || '') + String(apiKey || ''))
    .digest('hex');

  const isValid = (expectedSignature.toLowerCase() === signature.toLowerCase()) || 
                  (fallbackSignature.toLowerCase() === signature.toLowerCase());

  if (!isValid) {
    return { valid: false, message: 'Signature Duitku tidak valid' };
  }

  const isPaid = resultCode === '00';
  const isFailed = resultCode === '01' || resultCode === '02';

  return {
    valid: true,
    orderId: merchantOrderId,
    isPaid,
    isFailed,
    transactionStatus: resultCode,
  };
}
