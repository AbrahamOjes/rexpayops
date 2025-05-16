// Simple encryption/decryption helper functions
import * as crypto from 'crypto';

/**
 * Encrypt the given text using AES-256-CBC
 * @param text Text to encrypt
 * @param key Encryption key
 * @param iv Initialization vector
 * @returns Encrypted string
 */
export function encrypt(text: string, key: string, iv: string): string {
  try {
    // Ensure key and IV are properly sized
    const formattedKey = crypto
      .createHash('sha256')
      .update(key)
      .digest('hex')
      .substring(0, 32);
    
    const formattedIV = Buffer.from(iv.padEnd(16, '0').substring(0, 16));
    
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(formattedKey),
      formattedIV
    );
    
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt the given encrypted text using AES-256-CBC
 * @param encrypted Encrypted text to decrypt
 * @param key Encryption key
 * @param iv Initialization vector
 * @returns Decrypted string
 */
export function decrypt(encrypted: string, key: string, iv: string): string {
  try {
    // Ensure key and IV are properly sized
    const formattedKey = crypto
      .createHash('sha256')
      .update(key)
      .digest('hex')
      .substring(0, 32);
    
    const formattedIV = Buffer.from(iv.padEnd(16, '0').substring(0, 16));
    
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(formattedKey),
      formattedIV
    );
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}
