# cl-n8n-mcp

> Multi-tenant MCP SaaS Platform for n8n — 20 tools for workflow automation

**Source Repo**: https://github.com/kaewz-manga/cl-n8n-mcp
**Original**: https://github.com/nerding-io/n8n-mcp-multi-tenant-n8n

---

## Quick Links

| Area | Guide | Key Info |
|------|-------|----------|
| **Worker Code** | [`src/CLAUDE.md`](src/CLAUDE.md) | MCP server, tools, services |
| **Dashboard** | [`dashboard/CLAUDE.md`](dashboard/CLAUDE.md) | React SaaS dashboard |
| **React Patterns** | [`dashboard/src/CLAUDE.md`](dashboard/src/CLAUDE.md) | Components, hooks |
| **Pages** | [`dashboard/src/pages/CLAUDE.md`](dashboard/src/pages/CLAUDE.md) | Page patterns |
| **Components** | [`dashboard/src/components/CLAUDE.md`](dashboard/src/components/CLAUDE.md) | UI components |
| **Contexts** | [`dashboard/src/contexts/CLAUDE.md`](dashboard/src/contexts/CLAUDE.md) | Auth, Sudo, Connection |
| **Migrations** | [`migrations/CLAUDE.md`](migrations/CLAUDE.md) | D1 schema |
| **Tests** | [`tests/CLAUDE.md`](tests/CLAUDE.md) | Vitest patterns |

---

## Project Overview

n8n-mcp (v2.33.2) is a multi-tenant MCP server running on **Cloudflare Workers**. It provides AI assistants with access to n8n node information through the Model Context Protocol.

- **Runtime**: Cloudflare Workers (Hono framework)
- **Local Dev**: `wrangler dev --port 8787`
- **Dashboard**: SPA served via Workers ASSETS binding

## Architecture

```
src/
├── worker.ts                        # Workers entry point
├── worker/
│   ├── env.ts                       # Env type (D1, KV, ASSETS bindings)
│   ├── hono-app.ts                  # Hono app: CORS, routes, SPA fallback
│   ├── mcp-handler.ts               # Stateless JSON-RPC MCP handler
│   ├── nodes-db-loader.ts           # sql.js asm.js loader for nodes.db
│   ├── middleware/
│   │   ├── init-services.ts         # D1/JWT/OAuth init per request
│   │   ├── jwt-auth.ts              # JWT auth middleware (jose)
│   │   └── rate-limiter.ts          # KV-based rate limiting
│   └── routes/
│       ├── index.ts                 # Route aggregator (/api)
│       ├── auth.ts                  # Register, login, profile
│       ├── oauth.ts                 # GitHub/Google OAuth
│       ├── connections.ts           # n8n connection CRUD
│       ├── api-keys.ts              # API key CRUD
│       └── user.ts                  # Usage, plans, dashboard
├── mcp/
│   ├── server.ts                    # MCP server (stdio/Express mode)
│   ├── tools.ts                     # 7 documentation tools
│   ├── tools-n8n-manager.ts         # 13 management tools
│   └── handlers/                    # Tool dispatch + handlers
├── saas/
│   ├── database/
│   │   ├── init.ts                  # D1/SQLite init (AsyncDatabase)
│   │   ├── d1-adapter.ts            # D1 → AsyncDatabase adapter
│   │   └── users-repository.ts      # User/connection/API key repos
│   └── services/
│       ├── auth-service.ts          # JWT auth (jose library)
│       ├── oauth-service.ts         # OAuth providers
│       ├── api-key-service.ts       # API key validation
│       └── encryption-service.ts    # Web Crypto encryption
├── database/
│   ├── schema.sql                   # SQLite schema (nodes)
│   ├── node-repository.ts           # Node data access
│   └── database-adapter.ts          # better-sqlite3 / sql.js adapter
├── services/                        # Validation, examples, templates
├── templates/                       # n8n.io template system
└── utils/                           # Logger, console manager
```

## Common Commands

```bash
# Development
wrangler dev --port 8787             # Local dev server
npm run build                        # TypeScript build
npm run lint                         # Type check

# Database
npm run rebuild                      # Rebuild nodes.db from n8n packages
cp data/nodes.db public/data/        # Copy to static assets for Workers

# Dashboard
cd dashboard && npm run build        # Build React SPA to ./public/

# D1 Migrations
wrangler d1 execute cl-n8n-mcp-users --local --file=./migrations/001_initial.sql

# Deploy
wrangler deploy                      # Deploy to Cloudflare Workers

# Test
npm test                             # All tests
npm run test:unit                    # Unit tests only
```

## Cloudflare Workers Bindings

Configured in `wrangler.toml`:

| Binding | Type | Description |
|---------|------|-------------|
| `USERS_DB` | D1 Database | SaaS user data (users, connections, API keys) |
| `RATE_LIMITS` | KV Namespace | Distributed rate limiting |
| `ASSETS` | Static Assets | Dashboard SPA + nodes.db |

## Environment Variables

Set in `wrangler.toml` (public) or `.dev.vars` (secrets):

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_TOKEN` | Yes | MCP auth token (`.dev.vars`) |
| `JWT_SECRET` | Yes | JWT signing secret (`.dev.vars`) |
| `SAAS_ENCRYPTION_KEY` | Yes | Encryption key for stored API keys (`.dev.vars`) |
| `ENABLE_MULTI_TENANT` | Yes | `true` — enables all 20 tools |
| `CORS_ORIGIN` | No | CORS origin (default: `*`) |
| `FRONTEND_URL` | No | OAuth callback base URL |
| `GITHUB_CLIENT_ID/SECRET` | No | GitHub OAuth (`.dev.vars`) |
| `GOOGLE_CLIENT_ID/SECRET` | No | Google OAuth (`.dev.vars`) |

## HTTP Endpoints

### SaaS API (`/api`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Register user |
| POST | `/api/auth/login` | No | Login → JWT |
| GET | `/api/auth/me` | JWT | User profile |
| PUT | `/api/auth/password` | JWT | Change password |
| DELETE | `/api/auth/account` | JWT | Delete account |
| GET | `/api/auth/oauth/providers` | No | OAuth providers |
| GET | `/api/auth/oauth/redirect/:provider` | No | OAuth redirect |
| POST | `/api/auth/oauth/callback` | No | OAuth callback |
| GET/POST/PUT/DELETE | `/api/connections/*` | JWT | n8n connections CRUD |
| POST | `/api/connections/:id/test` | JWT | Test connection |
| GET/POST/DELETE | `/api/api-keys/*` | JWT | API keys CRUD |
| GET | `/api/user/usage` | JWT | Usage stats |
| GET | `/api/user/plans` | JWT | Available plans |
| GET | `/api/user/dashboard` | JWT | Dashboard data |

### MCP (`/mcp`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/mcp` | API key or AUTH_TOKEN | JSON-RPC 2.0 MCP |

### Other

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Health check |
| GET | `/*` | No | Dashboard SPA (fallback) |

## MCP Tools (20 total)

### Documentation Tools (7) — always available
- `tools_documentation` — Tool usage guide
- `search_nodes` — Search n8n nodes
- `get_node` — Get node details
- `validate_node` — Validate node config
- `get_template` — Get workflow template
- `search_templates` — Search templates
- `validate_workflow` — Validate workflow

### Management Tools (13) — require n8n connection
- `n8n_create_workflow`, `n8n_get_workflow`, `n8n_update_full_workflow`
- `n8n_update_partial_workflow`, `n8n_delete_workflow`, `n8n_list_workflows`
- `n8n_validate_workflow`, `n8n_autofix_workflow`, `n8n_test_workflow`
- `n8n_executions`, `n8n_health_check`, `n8n_workflow_versions`
- `n8n_deploy_template`

## Rate Limiting

KV-based distributed rate limiting per API key:

| Limit | Default |
|-------|---------|
| Per minute | 50 |
| Per day | 100 |

## Key Design Patterns

- **Hono + Workers**: Typed env bindings, `c.env.USERS_DB`, `c.executionCtx.waitUntil()`
- **Per-request init**: `initServices` middleware sets up D1/JWT/OAuth from env
- **sql.js asm.js**: Pure JS SQLite (no WASM — Workers disallow dynamic `WebAssembly.instantiate()`)
- **ASSETS.fetch()**: Load nodes.db and serve SPA without self-fetch loops
- **Dynamic require**: `require(['better','sqlite3'].join('-'))` prevents esbuild bundling
- **`__dirname` polyfill**: `globalThis.__dirname = '/'` before sql.js dynamic import

## Development Workflow

### Before Making Changes
1. Read all relevant files first
2. Run `npm run build` after every code change
3. Run `npm run lint` to check types

### After Code Changes
1. `npm run build` — compile TypeScript
2. wrangler dev auto-reloads

### Rebuilding nodes.db
1. `npm run rebuild` — generates `data/nodes.db` (uses sql.js, no FTS5)
2. `cp data/nodes.db public/data/` — copy to static assets
3. Restart wrangler dev

## Agent Interaction Guidelines

- Sub-agents must not spawn further sub-agents
- Sub-agents must not commit or push; the main agent handles that
- When tasks can be divided, use parallel sub-agents
- Add to every commit and PR: Conceived by Romuald Czlonkowski - www.aiadvisors.pl/en (not in conversations)

## Important Reminders

- NEVER create files unless absolutely necessary; prefer editing existing files
- Always run typecheck and lint after code changes
- Database rebuilds are slow due to n8n package size
- `nodes.db` must be copied to `public/data/` after rebuild for Workers to serve it
- sql.js WASM doesn't work in Workers — use `sql-asm.js` (pure JS)
- FTS5 not available in sql.js — search uses LIKE fallback
