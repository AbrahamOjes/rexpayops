import crypto from 'crypto';

export const logger = {
  child: () => ({
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
  }),
};

export function encrypt(text: string, key: string, iv: string): string {
  // Ensure key and IV are proper length for AES-256-CBC
  const paddedKey = key.padEnd(32, '0').slice(0, 32);
  const paddedIV = iv.padEnd(16, '0').slice(0, 16);

  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(paddedKey),
    Buffer.from(paddedIV)
  );
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

export function decrypt(text: string, key: string, iv: string): string {
  // Ensure key and IV are proper length for AES-256-CBC
  const paddedKey = key.padEnd(32, '0').slice(0, 32);
  const paddedIV = iv.padEnd(16, '0').slice(0, 16);

  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(paddedKey),
    Buffer.from(paddedIV)
  );
  let decrypted = decipher.update(text, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export { MetricsService } from './MetricsService';
