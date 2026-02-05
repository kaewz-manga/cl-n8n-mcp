import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Get encryption key from environment or generate a default one
 * WARNING: In production, always set SAAS_ENCRYPTION_KEY environment variable
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.SAAS_ENCRYPTION_KEY;

  if (envKey) {
    // Use provided key (should be 32 bytes / 64 hex chars)
    if (envKey.length === 64) {
      return Buffer.from(envKey, 'hex');
    }
    // Hash the key if it's not exactly 32 bytes
    return crypto.createHash('sha256').update(envKey).digest();
  }

  // Development fallback - NOT secure for production
  console.warn('WARNING: SAAS_ENCRYPTION_KEY not set. Using development key. DO NOT use in production!');
  return crypto.createHash('sha256').update('development-key-do-not-use-in-production').digest();
}

/**
 * Encrypt sensitive data (like n8n API keys)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  // Format: iv:tag:encrypted
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive data
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const tag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Hash a password using bcrypt-like approach with crypto
 * Using scrypt for secure password hashing
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(SALT_LENGTH);

    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(`${salt.toString('hex')}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const parts = hash.split(':');
    if (parts.length !== 2) {
      resolve(false);
      return;
    }

    const salt = Buffer.from(parts[0], 'hex');
    const storedKey = parts[1];

    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(derivedKey.toString('hex') === storedKey);
    });
  });
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash an API key for storage (one-way hash)
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}
