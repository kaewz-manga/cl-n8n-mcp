import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import type { Env } from './env';
import { initServices } from './middleware/init-services';
import api from './routes/index';
import mcp from './mcp-handler';

export type AppType = Hono<{ Bindings: Env }>;

const app = new Hono<{ Bindings: Env }>();

// Security headers
app.use('*', secureHeaders());

// CORS
app.use('*', cors({
  origin: (origin, c) => {
    const allowed = c.env.CORS_ORIGIN || '*';
    if (allowed === '*') return origin;
    return allowed.split(',').includes(origin) ? origin : '';
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'x-n8n-url', 'x-n8n-key', 'x-instance-id', 'x-session-id'],
  exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400,
}));

// Initialize SaaS services from Workers env (D1, JWT, OAuth)
app.use('/api/*', initServices);

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    version: '2.33.2',
    mode: 'cloudflare-workers',
    timestamp: new Date().toISOString(),
  });
});

// Server info
app.get('/', (c) => {
  return c.json({
    name: 'n8n-mcp',
    version: '2.33.2',
    description: 'Multi-tenant MCP SaaS Platform for n8n',
    mode: 'cloudflare-workers',
    endpoints: {
      health: '/health',
      mcp: '/mcp',
      api: '/api',
    },
  });
});

// SaaS API routes
app.route('/api', api);

// MCP endpoint (also needs SaaS services for API key validation)
app.use('/mcp/*', initServices);
app.route('/mcp', mcp);

// SPA fallback — serve index.html for client-side routes
// (static assets like /assets/*.js are handled by the assets layer before reaching the Worker)
app.get('*', async (c) => {
  try {
    const url = new URL(c.req.url);
    url.pathname = '/index.html';
    return c.env.ASSETS.fetch(new Request(url));
  } catch {
    return c.text('Not Found', 404);
  }
});

export default app;
