import crypto from 'crypto';

/**
 * Midtrans Payment Gateway Driver
 * Supports Midtrans Snap API and SHA-512 webhook signature verification.
 */
export async function createMidtransTransaction({ orderId, amount, vendorName, vendorEmail, vendorPhone, planName, config }) {
  const isProduction = config.isProduction || false;
  const baseUrl = isProduction 
    ? 'https://app.midtrans.com/snap/v1/transactions' 
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

  const serverKey = config.serverKey || '';
  if (!serverKey) {
    throw new Error('Midtrans Server Key belum diatur di Admin Panel.');
  }

  const authHeader = 'Basic ' + Buffer.from(serverKey + ':').toString('base64');

  const payload = {
    transaction_details: {
      order_id: orderId,
      gross_amount: Math.round(amount),
    },
    customer_details: {
      first_name: vendorName || 'Vendor',
      email: vendorEmail,
      phone: vendorPhone || '',
    },
    item_details: [
      {
        id: orderId,
        price: Math.round(amount),
        quantity: 1,
        name: `Berlangganan ${planName || 'Paket SaaS'}`,
      },
    ],
  };

  // Lock payments to 100% QRIS ONLY for universal clean checkout
  payload.enabled_payments = ['qris', 'gopay'];



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
    throw new Error(json.error_messages ? json.error_messages.join(', ') : 'Gagal membuat transaksi Midtrans');
  }

  return {
    token: json.token,
    redirectUrl: json.redirect_url,
    raw: json,
  };
}

/**
 * Verify Midtrans Webhook Signature
 * Signature formula: SHA512(order_id + status_code + gross_amount + ServerKey)
 */
export function verifyMidtransWebhook(payload, serverKey) {
  const { order_id, status_code, gross_amount, signature_key, transaction_status } = payload;

  if (!order_id || !status_code || !gross_amount || !signature_key) {
    return { valid: false, message: 'Payload webhook Midtrans tidak lengkap' };
  }

  const expectedSignature = crypto
    .createHash('sha512')
    .update(order_id + status_code + gross_amount + serverKey)
    .digest('hex');

  if (expectedSignature !== signature_key) {
    return { valid: false, message: 'Signature Midtrans tidak valid' };
  }

  const isPaid = transaction_status === 'settlement' || transaction_status === 'capture';
  const isFailed = transaction_status === 'deny' || transaction_status === 'cancel' || transaction_status === 'expire';

  return {
    valid: true,
    orderId: order_id,
    isPaid,
    isFailed,
    transactionStatus: transaction_status,
  };
}
