# Database Migrations Guide

> Database schema for cl-n8n-mcp SaaS wrapper.

**Pattern**: Same as n8n-management-mcp

---

## Note on Core MCP vs SaaS Wrapper

The **core MCP** (forked code) uses:
- SQLite for node data (`data/nodes.db`)
- In-memory session storage
- No user registration

The **SaaS wrapper** (to be added) uses:
- D1 for user management
- KV for rate limiting
- Full auth system

---

## SaaS Wrapper Schema (7 tables)

| Table | Purpose |
|-------|---------|
| `users` | User accounts |
| `n8n_connections` | n8n instance connections |
| `api_keys` | SaaS API keys (n2f_xxx) |
| `usage_logs` | Per-request usage logs |
| `usage_monthly` | Aggregated monthly usage |
| `plans` | Subscription plans |
| `admin_logs` | Admin action audit trail |

---

## Table Schemas

### users

```sql
CREATE TABLE users (
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
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### n8n_connections

```sql
CREATE TABLE n8n_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  n8n_url TEXT NOT NULL,
  n8n_api_key_encrypted TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  last_tested_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### api_keys

```sql
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connection_id TEXT REFERENCES n8n_connections(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  scopes TEXT DEFAULT '["read","write"]',
  last_used_at TEXT,
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

---

## Commands

```bash
# Create D1 database
wrangler d1 create cl-n8n-mcp-db

# Apply migrations
npx wrangler d1 execute cl-n8n-mcp-db --local --file=./migrations/001_initial.sql

# Query
npx wrangler d1 execute cl-n8n-mcp-db --remote --command "SELECT * FROM users LIMIT 5"
```
