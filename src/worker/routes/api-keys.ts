import { Hono } from 'hono';
import { jwtAuth, type AuthEnv } from '../middleware/jwt-auth';
import { createApiKey, getUserApiKeys, revokeApiKey } from '../../saas/services/api-key-service';
import { logger } from '../../utils/logger';

const apiKeys = new Hono<AuthEnv>();

// All routes require authentication
apiKeys.use('*', jwtAuth);

/** GET /api/api-keys */
apiKeys.get('/', async (c) => {
  try {
    const user = c.get('user');
    const keys = await getUserApiKeys(user.id);

    return c.json({ success: true, data: keys });
  } catch {
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list API keys' }
    }, 500);
  }
});

/** POST /api/api-keys */
apiKeys.post('/', async (c) => {
  try {
    const user = c.get('user');
    const { name, connection_id } = await c.req.json();

    if (!name) {
      return c.json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Name is required' }
      }, 400);
    }

    const result = await createApiKey(user.id, connection_id || null, name);

    if (!result.success) {
      return c.json({
        success: false,
        error: { code: 'CREATE_FAILED', message: result.error }
      }, 400);
    }

    logger.info(`API key created: ${result.apiKey!.key_prefix}... for user ${user.id}`);

    return c.json({
      success: true,
      data: {
        id: result.apiKey!.id,
        name: result.apiKey!.name,
        key_prefix: result.apiKey!.key_prefix,
        connection_id: result.apiKey!.connection_id,
        created_at: result.apiKey!.created_at,
        full_key: result.fullKey,
      },
      meta: {
        warning: 'Save this API key now. It will not be shown again.'
      }
    }, 201);
  } catch {
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create API key' }
    }, 500);
  }
});

/** DELETE /api/api-keys/:id */
apiKeys.delete('/:id', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const result = await revokeApiKey(user.id, id);

    if (!result.success) {
      return c.json({
        success: false,
        error: { code: 'REVOKE_FAILED', message: result.error }
      }, 400);
    }

    logger.info(`API key revoked: ${id}`);

    return c.json({
      success: true,
      data: { message: 'API key revoked' }
    });
  } catch {
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to revoke API key' }
    }, 500);
  }
});

export default apiKeys;
