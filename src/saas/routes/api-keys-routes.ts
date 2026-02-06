import { Router, Request, Response } from 'express';
import { createApiKey, getUserApiKeys, revokeApiKey } from '../services/api-key-service';
import { jwtAuth } from '../middleware/jwt-auth';
import { logger } from '../../utils/logger';

const router = Router();

// All routes require authentication
router.use(jwtAuth);

/**
 * GET /api/api-keys
 * List user's API keys
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const keys = await getUserApiKeys(req.user!.id);

    res.json({
      success: true,
      data: keys
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list API keys' }
    });
  }
});

/**
 * POST /api/api-keys
 * Create a new API key
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, connection_id } = req.body;

    if (!name) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Name is required' }
      });
      return;
    }

    const result = await createApiKey(req.user!.id, connection_id || null, name);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: { code: 'CREATE_FAILED', message: result.error }
      });
      return;
    }

    logger.info(`API key created: ${result.apiKey!.key_prefix}... for user ${req.user!.id}`);

    // Return the full key ONLY on creation
    res.status(201).json({
      success: true,
      data: {
        id: result.apiKey!.id,
        name: result.apiKey!.name,
        key_prefix: result.apiKey!.key_prefix,
        connection_id: result.apiKey!.connection_id,
        created_at: result.apiKey!.created_at,
        // IMPORTANT: This is the only time the full key is returned!
        full_key: result.fullKey
      },
      meta: {
        warning: 'Save this API key now. It will not be shown again.'
      }
    });
  } catch (error) {
    logger.error('Failed to create API key', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create API key' }
    });
  }
});

/**
 * DELETE /api/api-keys/:id
 * Revoke an API key
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await revokeApiKey(req.user!.id, req.params.id as string);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: { code: 'REVOKE_FAILED', message: result.error }
      });
      return;
    }

    logger.info(`API key revoked: ${req.params.id as string}`);

    res.json({
      success: true,
      data: { message: 'API key revoked' }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to revoke API key' }
    });
  }
});

export default router;
