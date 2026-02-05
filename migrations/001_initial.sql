-- cl-n8n-mcp SaaS Wrapper Database Schema
-- Version: 1.0.0
-- Created: 2026-02-05

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  oauth_provider TEXT,
  oauth_id TEXT,
  plan_id TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  is_admin INTEGER DEFAULT 0,
  totp_secret TEXT,
  totp_enabled INTEGER DEFAULT 0,
  session_duration_seconds INTEGER DEFAULT 1800,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- n8n connections (one user can have multiple n8n instances)
CREATE TABLE IF NOT EXISTS n8n_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  n8n_url TEXT NOT NULL,
  n8n_api_key_encrypted TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  last_tested_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- API keys (n2f_xxx format)
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  connection_id TEXT,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  scopes TEXT DEFAULT '["read","write"]',
  status TEXT DEFAULT 'active',
  last_used_at TEXT,
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (connection_id) REFERENCES n8n_connections(id) ON DELETE SET NULL
);

-- Usage logs (per-request tracking)
CREATE TABLE IF NOT EXISTS usage_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  api_key_id TEXT,
  connection_id TEXT,
  tool_name TEXT NOT NULL,
  status TEXT NOT NULL,
  response_time_ms INTEGER,
  error_message TEXT,
  request_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL,
  FOREIGN KEY (connection_id) REFERENCES n8n_connections(id) ON DELETE SET NULL
);

-- Monthly usage aggregation
CREATE TABLE IF NOT EXISTS usage_monthly (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  year_month TEXT NOT NULL,
  request_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  UNIQUE(user_id, year_month),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Plans table
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  daily_request_limit INTEGER NOT NULL,
  requests_per_minute INTEGER NOT NULL,
  max_connections INTEGER NOT NULL,
  price_monthly_cents INTEGER DEFAULT 0,
  features TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Admin action logs
CREATE TABLE IF NOT EXISTS admin_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_user_id TEXT,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_connections_user ON n8n_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_date ON usage_logs(request_at);
CREATE INDEX IF NOT EXISTS idx_usage_monthly_user ON usage_monthly(user_id);

-- Seed default plans
INSERT OR IGNORE INTO plans (id, name, daily_request_limit, requests_per_minute, max_connections, price_monthly_cents, features)
VALUES
  ('free', 'Free', 100, 10, 1, 0, '["Basic MCP tools","1 n8n connection","Community support"]'),
  ('pro', 'Pro', 5000, 50, 5, 1900, '["All MCP tools","5 n8n connections","Priority support","Usage analytics"]'),
  ('enterprise', 'Enterprise', 100000, 200, 50, 9900, '["Unlimited tools","50 n8n connections","24/7 support","Custom integrations","SLA guarantee"]');
