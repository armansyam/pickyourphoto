import db from '../db.js';
import { createMidtransTransaction, verifyMidtransWebhook } from './midtrans.js';
import { createXenditInvoice, verifyXenditWebhook } from './xendit.js';
import { createTripayTransaction, verifyTripayWebhook } from './tripay.js';
import { createDuitkuTransaction, verifyDuitkuWebhook } from './duitku.js';

/**
 * Get active payment gateway configuration from saas_settings
 */
export function getPaymentGatewayConfig() {
  try {
    const rows = db.prepare("SELECT key, value FROM saas_settings WHERE key LIKE 'payment_gateway_%' OR key = 'enable_payment_gateway'").all() || [];
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });

    return {
      enabled: settings.enable_payment_gateway === '1' || settings.enable_payment_gateway === 'true',
      provider: (settings.payment_gateway_provider || 'midtrans').toLowerCase(),
      clientKey: settings.payment_gateway_client_key || '',
      serverKey: settings.payment_gateway_server_key || '',
      apiKey: settings.payment_gateway_api_key || settings.payment_gateway_server_key || '',
      merchantCode: settings.payment_gateway_merchant_code || '',
      isProduction: settings.payment_gateway_is_production === '1',
    };
  } catch (err) {
    console.error('[Payment Gateway Config Error]:', err);
    return { enabled: false, provider: 'midtrans' };
  }
}

/**
 * Unified Payment Dispatcher: Create Checkout / Invoice / Snap Token
 */
export async function createPayment({ orderId, amount, vendorName, vendorEmail, vendorPhone, planName }) {
  const config = getPaymentGatewayConfig();
  if (!config.enabled) {
    throw new Error('Fitur Payment Gateway saat ini sedang dinonaktifkan oleh Admin.');
  }

  const payload = { orderId, amount, vendorName, vendorEmail, vendorPhone, planName, config };

  switch (config.provider) {
    case 'midtrans':
      return await createMidtransTransaction(payload);
    case 'xendit':
      return await createXenditInvoice(payload);
    case 'tripay':
      return await createTripayTransaction(payload);
    case 'duitku':
      return await createDuitkuTransaction(payload);
    default:
      return await createMidtransTransaction(payload);
  }
}

/**
 * Unified Webhook Verifier & Parser
 */
export function verifyPaymentWebhook(payload, headers = {}, rawBody = '') {
  const config = getPaymentGatewayConfig();

  switch (config.provider) {
    case 'midtrans':
      return verifyMidtransWebhook(payload, config.serverKey);
    case 'xendit':
      return verifyXenditWebhook(payload, headers, config.serverKey || config.clientKey);
    case 'tripay':
      return verifyTripayWebhook(rawBody || payload, headers, config.clientKey);
    case 'duitku':
      return verifyDuitkuWebhook(payload, config.merchantCode, config.apiKey || config.serverKey);
    default:
      return verifyMidtransWebhook(payload, config.serverKey);
  }
}
