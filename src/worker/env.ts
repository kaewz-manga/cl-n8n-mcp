export interface Env {
  // Cloudflare Bindings
  USERS_DB: D1Database;
  RATE_LIMITS: KVNamespace;
  ASSETS: { fetch: (request: Request) => Promise<Response> };

  // Auth
  AUTH_TOKEN: string;
  JWT_SECRET: string;
  SAAS_ENCRYPTION_KEY: string;

  // Multi-tenant
  ENABLE_MULTI_TENANT: string;

  // CORS
  CORS_ORIGIN: string;

  // OAuth (optional)
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GITHUB_CALLBACK_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_CALLBACK_URL?: string;
  FRONTEND_URL?: string;

  // Rate limiting
  RATE_LIMIT_PER_MINUTE?: string;
  DAILY_LIMIT?: string;

  // Logging
  LOG_LEVEL?: string;
}
