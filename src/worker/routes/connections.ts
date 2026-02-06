import { Hono } from 'hono';
import { jwtAuth, type AuthEnv } from '../middleware/jwt-auth';
import { connectionsRepository, plansRepository, usersRepository } from '../../saas/database/users-repository';
import { encrypt, decrypt } from '../../saas/services/encryption-service';
import { logger } from '../../utils/logger';

const connections = new Hono<AuthEnv>();

// All routes require authentication
connections.use('*', jwtAuth);

/** GET /api/connections */
connections.get('/', async (c) => {
  try {
    const user = c.get('user');
    const list = await connectionsRepository.getByUserId(user.id);

    const sanitized = list.map(conn => ({
      id: conn.id,
      name: conn.name,
      n8n_url: conn.n8n_url,
      status: conn.status,
      last_tested_at: conn.last_tested_at,
      created_at: conn.created_at,
    }));

    return c.json({ success: true, data: sanitized });
  } catch {
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list connections' }
    }, 500);
  }
});

/** POST /api/connections */
connections.post('/', async (c) => {
  try {
    const user = c.get('user');
    const { name, n8n_url, n8n_api_key } = await c.req.json();

    if (!name || !n8n_url || !n8n_api_key) {
      return c.json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Name, n8n_url, and n8n_api_key are required' }
      }, 400);
    }

    // Check connection limit
    const dbUser = await usersRepository.getById(user.id);
    const plan = await plansRepository.getById(dbUser?.plan_id || 'free');
    const maxConnections = plan?.max_connections || 1;
    const currentCount = await connectionsRepository.countByUserId(user.id);

    if (currentCount >= maxConnections) {
      return c.json({
        success: false,
        error: {
          code: 'CONNECTION_LIMIT_REACHED',
          message: `You can only have ${maxConnections} connection(s) on your plan`
        }
      }, 403);
    }

    // Validate URL
    try {
      new URL(n8n_url);
    } catch {
      return c.json({
        success: false,
        error: { code: 'INVALID_URL', message: 'Invalid n8n URL format' }
      }, 400);
    }

    const encryptedKey = encrypt(n8n_api_key);
    const connection = await connectionsRepository.create(user.id, name, n8n_url, encryptedKey);

    logger.info(`Connection created: ${connection.id} for user ${user.id}`);

    return c.json({
      success: true,
      data: {
        id: connection.id,
        name: connection.name,
        n8n_url: connection.n8n_url,
        status: connection.status,
        created_at: connection.created_at,
      }
    }, 201);
  } catch {
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create connection' }
    }, 500);
  }
});

/** GET /api/connections/:id */
connections.get('/:id', async (c) => {
  try {
    const user = c.get('user');
    const connection = await connectionsRepository.getById(c.req.param('id'));

    if (!connection || connection.user_id !== user.id) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Connection not found' }
      }, 404);
    }

    return c.json({
      success: true,
      data: {
        id: connection.id,
        name: connection.name,
        n8n_url: connection.n8n_url,
        status: connection.status,
        last_tested_at: connection.last_tested_at,
        created_at: connection.created_at,
      }
    });
  } catch {
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get connection' }
    }, 500);
  }
});

/** PATCH /api/connections/:id */
connections.patch('/:id', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const connection = await connectionsRepository.getById(id);

    if (!connection || connection.user_id !== user.id) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Connection not found' }
      }, 404);
    }

    const { name, n8n_url, n8n_api_key } = await c.req.json();
    const updates: Record<string, string> = {};

    if (name) updates.name = name;
    if (n8n_url) {
      try {
        new URL(n8n_url);
        updates.n8n_url = n8n_url;
      } catch {
        return c.json({
          success: false,
          error: { code: 'INVALID_URL', message: 'Invalid n8n URL format' }
        }, 400);
      }
    }
    if (n8n_api_key) {
      updates.n8n_api_key_encrypted = encrypt(n8n_api_key);
    }

    if (Object.keys(updates).length > 0) {
      await connectionsRepository.update(id, updates);
    }

    const updated = (await connectionsRepository.getById(id))!;

    return c.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        n8n_url: updated.n8n_url,
        status: updated.status,
        created_at: updated.created_at,
      }
    });
  } catch {
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update connection' }
    }, 500);
  }
});

/** DELETE /api/connections/:id */
connections.delete('/:id', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const connection = await connectionsRepository.getById(id);

    if (!connection || connection.user_id !== user.id) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Connection not found' }
      }, 404);
    }

    await connectionsRepository.delete(id);
    logger.info(`Connection deleted: ${id}`);

    return c.json({
      success: true,
      data: { message: 'Connection deleted' }
    });
  } catch {
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete connection' }
    }, 500);
  }
});

/** POST /api/connections/:id/test */
connections.post('/:id/test', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const connection = await connectionsRepository.getById(id);

    if (!connection || connection.user_id !== user.id) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Connection not found' }
      }, 404);
    }

    const apiKey = decrypt(connection.n8n_api_key_encrypted);

    try {
      const response = await fetch(`${connection.n8n_url}/api/v1/workflows`, {
        headers: { 'X-N8N-API-KEY': apiKey },
      });

      if (response.ok) {
        await connectionsRepository.update(id, { status: 'active' });
        await connectionsRepository.updateLastTested(id);

        return c.json({
          success: true,
          data: { message: 'Connection test successful', status: 'active' }
        });
      } else {
        await connectionsRepository.update(id, { status: 'error' });

        return c.json({
          success: false,
          error: { code: 'CONNECTION_FAILED', message: `n8n returned status ${response.status}` }
        });
      }
    } catch {
      await connectionsRepository.update(id, { status: 'error' });

      return c.json({
        success: false,
        error: { code: 'CONNECTION_ERROR', message: 'Could not connect to n8n instance' }
      });
    }
  } catch {
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to test connection' }
    }, 500);
  }
});

export default connections;
