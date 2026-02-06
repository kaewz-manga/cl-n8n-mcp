# HANDOFF - cl-n8n-mcp

> สำหรับ Claude ตัวถัดไปที่จะเข้ามาทำงานต่อ

**Date**: 2026-02-06
**Repo**: https://github.com/kaewz-manga/cl-n8n-mcp
**Live**: https://cl-n8n-mcp.suphakitm99.workers.dev

---

## Project Overview

**cl-n8n-mcp** เป็น Multi-tenant MCP SaaS Platform สำหรับ n8n workflow automation

- **Source**: Fork จาก https://github.com/nerding-io/n8n-mcp-multi-tenant-n8n
- **Tools**: 20 MCP tools (7 documentation + 13 management)
- **Runtime**: Cloudflare Workers (Hono framework)
- **Dashboard**: React SPA served via Workers ASSETS binding

---

## Current Status: Deployed on Cloudflare Workers ✅

### สิ่งที่ทำเสร็จแล้ว

1. **Cloudflare Workers Migration** ✅
   - Hono HTTP framework แทน Express
   - D1 database สำหรับ SaaS user data
   - KV namespace สำหรับ rate limiting
   - ASSETS binding สำหรับ dashboard + nodes.db
   - sql.js asm.js สำหรับ read-only nodes.db (ไม่ใช้ WASM — Workers บล็อก)
   - Deployed + verified ทุก endpoint

2. **SaaS Layer** ✅
   - User registration/login (JWT via jose)
   - OAuth (GitHub/Google) — ต้อง set client ID/secret ใน secrets
   - Dashboard (React SPA)
   - n8n connection CRUD + encrypted API key storage
   - API key generation (n2f_ prefix)
   - Usage tracking per user
   - Rate limiting (KV-based, 50/min, 100/day)

3. **MCP Server** ✅
   - 20 tools ทำงานครบ (search, get_node, validate, workflow management)
   - 803 nodes ใน nodes.db
   - Stateless JSON-RPC handler
   - Auth via SaaS API key (n2f_) หรือ AUTH_TOKEN

4. **Infrastructure** ✅
   - D1: `cl-n8n-mcp-users` (99c4054a-6a3f-47f8-8fbb-4af51a3de14a)
   - KV: `RATE_LIMITS` (1aa94926dddc47ad917a6cc0f392ac4d)
   - Secrets: AUTH_TOKEN, JWT_SECRET, SAAS_ENCRYPTION_KEY
   - Docker files ลบแล้ว (ไม่ใช้ Docker อีกต่อไป)

### สิ่งที่ยังไม่ได้ทำ

1. **Billing** — Stripe integration ยังไม่มี
2. **2FA** — TOTP ยังไม่ implement
3. **Custom domain** — ยังใช้ workers.dev subdomain
4. **CI/CD** — ยังไม่มี automated deploy pipeline

---

## Architecture

```
Cloudflare Workers
├── Hono App (src/worker/hono-app.ts)
│   ├── /health              → Health check
│   ├── /api/*               → SaaS routes (auth, connections, api-keys, user)
│   ├── /mcp                 → MCP JSON-RPC endpoint
│   └── /*                   → Dashboard SPA fallback
├── D1 Database              → Users, connections, API keys
├── KV Namespace             → Rate limiting
└── ASSETS                   → Dashboard (React) + nodes.db
```

---

## File Structure

```
cl-n8n-mcp/
├── CLAUDE.md              # Main guide
├── HANDOFF.md             # This file
├── wrangler.toml          # Workers config (D1, KV, ASSETS bindings)
├── .dev.vars              # Local secrets (gitignored)
├── src/
│   ├── worker.ts          # Workers entry point
│   ├── worker/
│   │   ├── hono-app.ts    # Hono app: CORS, routes, SPA
│   │   ├── mcp-handler.ts # Stateless MCP handler
│   │   ├── nodes-db-loader.ts  # sql.js asm.js loader
│   │   ├── env.ts         # Env type bindings
│   │   ├── middleware/     # init-services, jwt-auth, rate-limiter
│   │   └── routes/        # auth, oauth, connections, api-keys, user
│   ├── mcp/               # MCP tools + handlers
│   ├── saas/              # Database + services (D1/jose/OAuth)
│   └── database/          # nodes.db schema + repository
├── dashboard/             # React SPA (Vite + Tailwind)
├── migrations/            # D1 SQL migrations
├── public/                # Built dashboard + nodes.db static assets
└── .claude/
    ├── agents/            # 6 agents
    ├── skills/            # 6 skills
    └── commands/          # 8 commands
```

---

## Important Notes

1. **sql.js WASM ใช้ใน Workers ไม่ได้** — ต้องใช้ `sql-asm.js` (pure JS)
2. **`__dirname` polyfill** — ต้อง set `globalThis.__dirname = '/'` ก่อน import sql.js
3. **ASSETS.fetch()** — ต้องใช้แทน self-fetch เพื่อหลีกเลี่ยง SPA catch-all
4. **FTS5 ไม่รองรับใน sql.js** — search ใช้ LIKE fallback (ทำงานได้ปกติ)
5. **better-sqlite3 ไม่ได้ install** — Windows ไม่มี build tools, rebuild ใช้ sql.js
6. **Theme Color**: Orange (#f97316) — ใช้ class `n2f-*`
7. **API Key Prefix**: `n2f_`

---

## Quick Commands

```bash
# Development
wrangler dev --port 8787           # Local dev server
npm run build                      # TypeScript build
npm run lint                       # Type check

# Database
npm run rebuild                    # Rebuild nodes.db (sql.js, no FTS5)
cp data/nodes.db public/data/      # Copy to static assets
cd dashboard && npm run build      # Build React SPA to ./public/

# D1 Migrations
wrangler d1 execute cl-n8n-mcp-users --local --file=./migrations/001_initial.sql
wrangler d1 execute cl-n8n-mcp-users --remote --file=./migrations/001_initial.sql

# Deploy
wrangler deploy                    # Deploy to Cloudflare Workers

# Secrets
wrangler secret put AUTH_TOKEN
wrangler secret put JWT_SECRET
wrangler secret put SAAS_ENCRYPTION_KEY
```

---

**Last Updated**: 2026-02-06
**By**: Claude Opus 4.6
