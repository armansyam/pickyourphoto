/**
 * Xendit Payment Gateway Driver
 * Supports Xendit Invoice API and Callback Token Verification.
 */
export async function createXenditInvoice({ orderId, amount, vendorName, vendorEmail, planName, config }) {
  const secretKey = config.serverKey || config.apiKey || '';
  if (!secretKey) {
    throw new Error('Xendit Secret API Key belum diatur di Admin Panel.');
  }

  const authHeader = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');
  const baseUrl = 'https://api.xendit.co/v2/invoices';

  const payload = {
    external_id: orderId,
    amount: Math.round(amount),
    payer_email: vendorEmail,
    description: `Pembayaran ${planName || 'Paket Berlangganan'} — ${vendorName || 'Vendor'}`,
    currency: 'IDR',
  };

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': authHeader,
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Gagal membuat Invoice Xendit');
  }

  return {
    token: json.id,
    redirectUrl: json.invoice_url,
    raw: json,
  };
}

/**
 * Verify Xendit Webhook Verification Token
 */
export function verifyXenditWebhook(payload, headers, expectedCallbackToken) {
  const callbackToken = headers['x-callback-token'] || headers['X-CALLBACK-TOKEN'];

  if (expectedCallbackToken && callbackToken !== expectedCallbackToken) {
    return { valid: false, message: 'Callback Token Xendit tidak sesuai' };
  }

  const { external_id, status } = payload;
  if (!external_id) {
    return { valid: false, message: 'Payload Xendit tidak memiliki external_id' };
  }

  const isPaid = status === 'PAID' || status === 'SETTLED';
  const isFailed = status === 'EXPIRED';

  return {
    valid: true,
    orderId: external_id,
    isPaid,
    isFailed,
    transactionStatus: status,
  };
}
