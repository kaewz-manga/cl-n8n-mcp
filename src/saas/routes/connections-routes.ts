import { Router, Request, Response } from 'express';
import { connectionsRepository, plansRepository, usersRepository } from '../database/users-repository';
import { encrypt, decrypt } from '../services/encryption-service';
import { jwtAuth } from '../middleware/jwt-auth';
import { logger } from '../../utils/logger';

const router = Router();

// All routes require authentication
router.use(jwtAuth);

/**
 * GET /api/connections
 * List user's n8n connections
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const connections = connectionsRepository.getByUserId(req.user!.id);

    // Don't expose encrypted API keys
    const sanitized = connections.map(c => ({
      id: c.id,
      name: c.name,
      n8n_url: c.n8n_url,
      status: c.status,
      last_tested_at: c.last_tested_at,
      created_at: c.created_at
    }));

    res.json({
      success: true,
      data: sanitized
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list connections' }
    });
  }
});

/**
 * POST /api/connections
 * Create a new n8n connection
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, n8n_url, n8n_api_key } = req.body;

    if (!name || !n8n_url || !n8n_api_key) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Name, n8n_url, and n8n_api_key are required' }
      });
      return;
    }

    // Check connection limit based on plan
    const user = usersRepository.getById(req.user!.id);
    const plan = plansRepository.getById(user?.plan_id || 'free');
    const maxConnections = plan?.max_connections || 1;
    const currentCount = connectionsRepository.countByUserId(req.user!.id);

    if (currentCount >= maxConnections) {
      res.status(403).json({
        success: false,
        error: {
          code: 'CONNECTION_LIMIT_REACHED',
          message: `You can only have ${maxConnections} connection(s) on your plan`
        }
      });
      return;
    }

    // Validate URL format
    try {
      new URL(n8n_url);
    } catch {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_URL', message: 'Invalid n8n URL format' }
      });
      return;
    }

    // Encrypt the API key
    const encryptedKey = encrypt(n8n_api_key);

    const connection = connectionsRepository.create(
      req.user!.id,
      name,
      n8n_url,
      encryptedKey
    );

    logger.info(`Connection created: ${connection.id} for user ${req.user!.id}`);

    res.status(201).json({
      success: true,
      data: {
        id: connection.id,
        name: connection.name,
        n8n_url: connection.n8n_url,
        status: connection.status,
        created_at: connection.created_at
      }
    });
  } catch (error) {
    logger.error('Failed to create connection', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create connection' }
    });
  }
});

/**
 * GET /api/connections/:id
 * Get a specific connection
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const connection = connectionsRepository.getById(req.params.id as string);

    if (!connection || connection.user_id !== req.user!.id) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Connection not found' }
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: connection.id,
        name: connection.name,
        n8n_url: connection.n8n_url,
        status: connection.status,
        last_tested_at: connection.last_tested_at,
        created_at: connection.created_at
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get connection' }
    });
  }
});

/**
 * PATCH /api/connections/:id
 * Update a connection
 */
router.patch('/:id', (req: Request, res: Response) => {
  try {
    const connection = connectionsRepository.getById(req.params.id as string);

    if (!connection || connection.user_id !== req.user!.id) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Connection not found' }
      });
      return;
    }

    const { name, n8n_url, n8n_api_key } = req.body;
    const updates: any = {};

    if (name) updates.name = name;
    if (n8n_url) {
      try {
        new URL(n8n_url);
        updates.n8n_url = n8n_url;
      } catch {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_URL', message: 'Invalid n8n URL format' }
        });
        return;
      }
    }
    if (n8n_api_key) {
      updates.n8n_api_key_encrypted = encrypt(n8n_api_key);
    }

    if (Object.keys(updates).length > 0) {
      connectionsRepository.update(req.params.id as string, updates);
    }

    const updated = connectionsRepository.getById(req.params.id as string)!;

    res.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        n8n_url: updated.n8n_url,
        status: updated.status,
        created_at: updated.created_at
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update connection' }
    });
  }
});

/**
 * DELETE /api/connections/:id
 * Delete a connection
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const connection = connectionsRepository.getById(req.params.id as string);

    if (!connection || connection.user_id !== req.user!.id) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Connection not found' }
      });
      return;
    }

    connectionsRepository.delete(req.params.id as string);
    logger.info(`Connection deleted: ${req.params.id as string}`);

    res.json({
      success: true,
      data: { message: 'Connection deleted' }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete connection' }
    });
  }
});

/**
 * POST /api/connections/:id/test
 * Test a connection to n8n
 */
router.post('/:id/test', async (req: Request, res: Response) => {
  try {
    const connection = connectionsRepository.getById(req.params.id as string);

    if (!connection || connection.user_id !== req.user!.id) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Connection not found' }
      });
      return;
    }

    // Decrypt the API key
    const apiKey = decrypt(connection.n8n_api_key_encrypted);

    // Test connection by calling n8n API
    try {
      const response = await fetch(`${connection.n8n_url}/api/v1/workflows`, {
        headers: {
          'X-N8N-API-KEY': apiKey
        }
      });

      if (response.ok) {
        connectionsRepository.update(req.params.id as string, { status: 'active' });
        connectionsRepository.updateLastTested(req.params.id as string);

        res.json({
          success: true,
          data: { message: 'Connection test successful', status: 'active' }
        });
      } else {
        connectionsRepository.update(req.params.id as string, { status: 'error' });

        res.json({
          success: false,
          error: {
            code: 'CONNECTION_FAILED',
            message: `n8n returned status ${response.status}`
          }
        });
      }
    } catch (fetchError) {
      connectionsRepository.update(req.params.id as string, { status: 'error' });

      res.json({
        success: false,
        error: {
          code: 'CONNECTION_ERROR',
          message: 'Could not connect to n8n instance'
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to test connection' }
    });
  }
});

export default router;
