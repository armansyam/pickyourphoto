import crypto from 'crypto';

function getMasterKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === '') {
    throw new Error('CRITICAL: JWT_SECRET environment variable is required for encryption.');
  }
  return secret;
}

/**
 * Encrypt sensitive plain-text string (e.g. OAuth refresh tokens) using AES-256-CBC
 * Prefix output with "enc:" to support seamless migration and backward compatibility
 */
export function encryptSecret(plainText) {
  if (!plainText || typeof plainText !== 'string') return plainText;
  if (plainText.startsWith('enc:')) return plainText; // already encrypted

  try {
    const key = crypto.createHash('sha256').update(getMasterKey()).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `enc:${iv.toString('hex')}:${encrypted}`;
  } catch (err) {
    console.error('[CryptoVault Encrypt Error]:', err.message);
    return plainText;
  }
}

/**
 * Decrypt cipher-text string prefixed with "enc:"
 * Returns plain-text as-is if legacy unencrypted string
 */
export function decryptSecret(cipherText) {
  if (!cipherText || typeof cipherText !== 'string') return cipherText;
  if (!cipherText.startsWith('enc:')) return cipherText; // legacy plain-text fallback

  const parts = cipherText.split(':');
  if (parts.length !== 3) return cipherText;

  try {
    const key = crypto.createHash('sha256').update(getMasterKey()).digest();
    const iv = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(parts[2], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[CryptoVault Decrypt Error]:', err.message);
    return cipherText;
  }
}
