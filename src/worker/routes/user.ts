import { Hono } from 'hono';
import { jwtAuth, type AuthEnv } from '../middleware/jwt-auth';
import { usageRepository, plansRepository, usersRepository, connectionsRepository } from '../../saas/database/users-repository';
import { getUserApiKeys } from '../../saas/services/api-key-service';

const user = new Hono<AuthEnv>();

// All routes require authentication
user.use('*', jwtAuth);

/** GET /api/user/usage */
user.get('/usage', async (c) => {
  try {
    const authUser = c.get('user');
    const dbUser = await usersRepository.getById(authUser.id);
    const plan = await plansRepository.getById(dbUser?.plan_id || 'free');

    const monthlyUsage = await usageRepository.getMonthlyUsage(authUser.id);
    const dailyCount = await usageRepository.getDailyRequestCount(authUser.id);
    const connectionCount = await connectionsRepository.countByUserId(authUser.id);
    const apiKeysList = await getUserApiKeys(authUser.id);

    return c.json({
      success: true,
      data: {
        plan: {
          id: plan?.id || 'free',
          name: plan?.name || 'Free',
          daily_limit: plan?.daily_request_limit || 100,
          rate_limit: plan?.requests_per_minute || 10,
          max_connections: plan?.max_connections || 1,
        },
        usage: {
          today: {
            requests: dailyCount,
            remaining: Math.max(0, (plan?.daily_request_limit || 100) - dailyCount),
          },
          month: {
            requests: monthlyUsage?.request_count || 0,
            success: monthlyUsage?.success_count || 0,
            errors: monthlyUsage?.error_count || 0,
            success_rate: monthlyUsage && monthlyUsage.request_count > 0
              ? Math.round((monthlyUsage.success_count / monthlyUsage.request_count) * 100)
              : 100,
          },
        },
        resources: {
          connections: {
            used: connectionCount,
            max: plan?.max_connections || 1,
          },
          api_keys: apiKeysList.length,
        },
      }
    });
  } catch {
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get usage' }
    }, 500);
  }
});

/** GET /api/user/plans */
user.get('/plans', async (c) => {
  try {
    const plans = await plansRepository.getAll();

    return c.json({
      success: true,
      data: plans.map(p => ({
        id: p.id,
        name: p.name,
        daily_request_limit: p.daily_request_limit,
        requests_per_minute: p.requests_per_minute,
        max_connections: p.max_connections,
        price_monthly_cents: p.price_monthly_cents,
        features: JSON.parse(p.features || '[]'),
      }))
    });
  } catch {
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get plans' }
    }, 500);
  }
});

/** GET /api/user/dashboard */
user.get('/dashboard', async (c) => {
  try {
    const authUser = c.get('user');
    const dbUser = await usersRepository.getById(authUser.id);
    const plan = await plansRepository.getById(dbUser?.plan_id || 'free');

    const monthlyUsage = await usageRepository.getMonthlyUsage(authUser.id);
    const dailyCount = await usageRepository.getDailyRequestCount(authUser.id);
    const connectionsList = await connectionsRepository.getByUserId(authUser.id);
    const apiKeysList = await getUserApiKeys(authUser.id);

    return c.json({
      success: true,
      data: {
        user: {
          email: dbUser?.email,
          plan: plan?.name || 'Free',
          created_at: dbUser?.created_at,
        },
        stats: {
          connections: connectionsList.length,
          api_keys: apiKeysList.length,
          requests_today: dailyCount,
          requests_month: monthlyUsage?.request_count || 0,
        },
        limits: {
          daily_requests: plan?.daily_request_limit || 100,
          max_connections: plan?.max_connections || 1,
        },
        recent_connections: connectionsList.slice(0, 3).map(conn => ({
          id: conn.id,
          name: conn.name,
          status: conn.status,
          last_tested_at: conn.last_tested_at,
        })),
      }
    });
  } catch {
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get dashboard data' }
    }, 500);
  }
});

export default user;
