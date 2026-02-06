import crypto from 'crypto';
import { apiKeysRepository, ApiKey, usersRepository, connectionsRepository, plansRepository, usageRepository } from '../database/users-repository';
import { hashApiKey } from './encryption-service';
import { logger } from '../../utils/logger';

const API_KEY_PREFIX = 'n2f_';
const API_KEY_LENGTH = 32; // 32 random bytes = 64 hex chars

export interface ApiKeyCreateResult {
  success: boolean;
  apiKey?: ApiKey;
  fullKey?: string; // Only returned on creation
  error?: string;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  apiKey?: ApiKey;
  userId?: string;
  connectionId?: string;
  error?: string;
}

/**
 * Generate a new API key
 */
export function generateApiKey(): { fullKey: string; prefix: string; hash: string } {
  const randomPart = crypto.randomBytes(API_KEY_LENGTH).toString('hex');
  const fullKey = `${API_KEY_PREFIX}${randomPart}`;
  const prefix = `${API_KEY_PREFIX}${randomPart.substring(0, 12)}`;
  const hash = hashApiKey(fullKey);

  return { fullKey, prefix, hash };
}

/**
 * Create a new API key for a user
 */
export async function createApiKey(userId: string, connectionId: string | null, name: string): Promise<ApiKeyCreateResult> {
  try {
    const user = await usersRepository.getById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (connectionId) {
      const connection = await connectionsRepository.getById(connectionId);
      if (!connection || connection.user_id !== userId) {
        return { success: false, error: 'Connection not found or does not belong to user' };
      }
    }

    const { fullKey, prefix, hash } = generateApiKey();
    const apiKey = await apiKeysRepository.create(userId, connectionId, name, hash, prefix);

    logger.info(`API key created for user ${userId}: ${prefix}...`);

    return {
      success: true,
      apiKey,
      fullKey
    };
  } catch (error) {
    logger.error('Failed to create API key', error);
    return { success: false, error: 'Failed to create API key' };
  }
}

/**
 * Validate an API key and return associated data
 */
export async function validateApiKey(fullKey: string): Promise<ApiKeyValidationResult> {
  try {
    if (!fullKey.startsWith(API_KEY_PREFIX)) {
      return { valid: false, error: 'Invalid API key format' };
    }

    const hash = hashApiKey(fullKey);
    const prefix = fullKey.substring(0, API_KEY_PREFIX.length + 12);

    const apiKey = await apiKeysRepository.getByPrefix(prefix);
    if (!apiKey) {
      return { valid: false, error: 'API key not found' };
    }

    if (apiKey.key_hash !== hash) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (apiKey.expires_at) {
      const expiresAt = new Date(apiKey.expires_at);
      if (expiresAt < new Date()) {
        return { valid: false, error: 'API key has expired' };
      }
    }

    await apiKeysRepository.updateLastUsed(apiKey.id);

    return {
      valid: true,
      apiKey,
      userId: apiKey.user_id,
      connectionId: apiKey.connection_id || undefined
    };
  } catch (error) {
    logger.error('Failed to validate API key', error);
    return { valid: false, error: 'Validation failed' };
  }
}

/**
 * Check rate limits for a user
 */
export async function checkRateLimits(userId: string): Promise<{ allowed: boolean; error?: string; remaining?: number }> {
  try {
    const user = await usersRepository.getById(userId);
    if (!user) {
      return { allowed: false, error: 'User not found' };
    }

    const plan = await plansRepository.getById(user.plan_id);
    const dailyLimit = plan?.daily_request_limit || 100;

    const dailyCount = await usageRepository.getDailyRequestCount(userId);

    if (dailyCount >= dailyLimit) {
      return {
        allowed: false,
        error: `Daily rate limit exceeded (${dailyLimit} requests/day)`,
        remaining: 0
      };
    }

    return {
      allowed: true,
      remaining: dailyLimit - dailyCount
    };
  } catch (error) {
    logger.error('Failed to check rate limits', error);
    return { allowed: false, error: 'Rate limit check failed' };
  }
}

/**
 * Get all API keys for a user (without hashes)
 */
export async function getUserApiKeys(userId: string): Promise<Omit<ApiKey, 'key_hash'>[]> {
  const keys = await apiKeysRepository.getByUserId(userId);
  return keys.map(({ key_hash, ...rest }) => rest);
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(userId: string, keyId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const apiKey = await apiKeysRepository.getById(keyId);
    if (!apiKey) {
      return { success: false, error: 'API key not found' };
    }

    if (apiKey.user_id !== userId) {
      return { success: false, error: 'API key does not belong to user' };
    }

    await apiKeysRepository.revoke(keyId);
    logger.info(`API key revoked: ${apiKey.key_prefix}...`);

    return { success: true };
  } catch (error) {
    logger.error('Failed to revoke API key', error);
    return { success: false, error: 'Failed to revoke API key' };
  }
}

/**
 * Log API usage
 */
export async function logApiUsage(
  userId: string,
  apiKeyId: string | null,
  connectionId: string | null,
  toolName: string,
  status: 'success' | 'error',
  responseTimeMs: number,
  errorMessage?: string
): Promise<void> {
  try {
    await usageRepository.logRequest(userId, apiKeyId, connectionId, toolName, status, responseTimeMs, errorMessage);
    await usageRepository.incrementMonthly(userId, status === 'success');
  } catch (error) {
    logger.error('Failed to log API usage', error);
  }
}
