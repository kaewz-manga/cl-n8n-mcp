import { createMiddleware } from 'hono/factory';
import type { Env } from '../env';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * KV-based rate limiter for Cloudflare Workers.
 * Uses RATE_LIMITS KV namespace for distributed rate limiting.
 */
export const rateLimiter = createMiddleware<{ Bindings: Env }>(async (c, next): Promise<void | Response> => {
  const kv = c.env.RATE_LIMITS;
  const perMinute = parseInt(c.env.RATE_LIMIT_PER_MINUTE || '50', 10);
  const dailyLimit = parseInt(c.env.DAILY_LIMIT || '100', 10);

  // Identify client by API key header or IP
  const apiKey = c.req.header('x-n8n-key') || 'anonymous';
  const now = Date.now();
  const minuteKey = `rate:${apiKey}:${Math.floor(now / 60000)}`;
  const dayKey = `daily:${apiKey}:${new Date().toISOString().slice(0, 10)}`;

  // Check per-minute rate
  const minuteStr = await kv.get(minuteKey);
  const minuteRaw = minuteStr ? JSON.parse(minuteStr) as RateLimitEntry : null;
  const minuteCount = minuteRaw?.count || 0;

  if (minuteCount >= perMinute) {
    return c.json({
      success: false,
      error: { code: 'RATE_LIMITED', message: `Rate limit exceeded (${perMinute}/min)` }
    }, 429);
  }

  // Check daily limit
  const dayStr = await kv.get(dayKey);
  const dayRaw = dayStr ? JSON.parse(dayStr) as RateLimitEntry : null;
  const dayCount = dayRaw?.count || 0;

  if (dayCount >= dailyLimit) {
    return c.json({
      success: false,
      error: { code: 'DAILY_LIMIT', message: `Daily limit exceeded (${dailyLimit}/day)` }
    }, 429);
  }

  // Increment counts (non-blocking)
  c.executionCtx.waitUntil(
    Promise.all([
      kv.put(minuteKey, JSON.stringify({ count: minuteCount + 1, resetAt: now + 60000 }), { expirationTtl: 120 }),
      kv.put(dayKey, JSON.stringify({ count: dayCount + 1, resetAt: 0 }), { expirationTtl: 86400 }),
    ])
  );

  // Set rate limit headers
  c.header('X-RateLimit-Limit', String(perMinute));
  c.header('X-RateLimit-Remaining', String(Math.max(0, perMinute - minuteCount - 1)));

  await next();
});
