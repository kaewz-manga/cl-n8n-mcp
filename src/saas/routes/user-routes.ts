import { Router, Request, Response } from 'express';
import { usageRepository, plansRepository, usersRepository, connectionsRepository } from '../database/users-repository';
import { jwtAuth } from '../middleware/jwt-auth';
import { getUserApiKeys } from '../services/api-key-service';

const router = Router();

// All routes require authentication
router.use(jwtAuth);

/**
 * GET /api/user/usage
 * Get user's usage statistics
 */
router.get('/usage', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await usersRepository.getById(userId);
    const plan = await plansRepository.getById(user?.plan_id || 'free');

    const monthlyUsage = await usageRepository.getMonthlyUsage(userId);
    const dailyCount = await usageRepository.getDailyRequestCount(userId);
    const connections = await connectionsRepository.countByUserId(userId);
    const apiKeys = await getUserApiKeys(userId);

    res.json({
      success: true,
      data: {
        plan: {
          id: plan?.id || 'free',
          name: plan?.name || 'Free',
          daily_limit: plan?.daily_request_limit || 100,
          rate_limit: plan?.requests_per_minute || 10,
          max_connections: plan?.max_connections || 1
        },
        usage: {
          today: {
            requests: dailyCount,
            remaining: Math.max(0, (plan?.daily_request_limit || 100) - dailyCount)
          },
          month: {
            requests: monthlyUsage?.request_count || 0,
            success: monthlyUsage?.success_count || 0,
            errors: monthlyUsage?.error_count || 0,
            success_rate: monthlyUsage && monthlyUsage.request_count > 0
              ? Math.round((monthlyUsage.success_count / monthlyUsage.request_count) * 100)
              : 100
          }
        },
        resources: {
          connections: {
            used: connections,
            max: plan?.max_connections || 1
          },
          api_keys: apiKeys.length
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get usage' }
    });
  }
});

/**
 * GET /api/user/plans
 * Get available subscription plans
 */
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const plans = await plansRepository.getAll();

    res.json({
      success: true,
      data: plans.map(p => ({
        id: p.id,
        name: p.name,
        daily_request_limit: p.daily_request_limit,
        requests_per_minute: p.requests_per_minute,
        max_connections: p.max_connections,
        price_monthly_cents: p.price_monthly_cents,
        features: JSON.parse(p.features || '[]')
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get plans' }
    });
  }
});

/**
 * GET /api/user/dashboard
 * Get dashboard overview data
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await usersRepository.getById(userId);
    const plan = await plansRepository.getById(user?.plan_id || 'free');

    const monthlyUsage = await usageRepository.getMonthlyUsage(userId);
    const dailyCount = await usageRepository.getDailyRequestCount(userId);
    const connections = await connectionsRepository.getByUserId(userId);
    const apiKeys = await getUserApiKeys(userId);

    res.json({
      success: true,
      data: {
        user: {
          email: user?.email,
          plan: plan?.name || 'Free',
          created_at: user?.created_at
        },
        stats: {
          connections: connections.length,
          api_keys: apiKeys.length,
          requests_today: dailyCount,
          requests_month: monthlyUsage?.request_count || 0
        },
        limits: {
          daily_requests: plan?.daily_request_limit || 100,
          max_connections: plan?.max_connections || 1
        },
        recent_connections: connections.slice(0, 3).map(c => ({
          id: c.id,
          name: c.name,
          status: c.status,
          last_tested_at: c.last_tested_at
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get dashboard data' }
    });
  }
});

export default router;
