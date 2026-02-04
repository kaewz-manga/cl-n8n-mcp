# HANDOFF - cl-n8n-mcp

> สำหรับ Claude ตัวถัดไปที่จะเข้ามาทำงานต่อ

**Date**: 2026-02-05
**Repo**: https://github.com/kaewz-manga/cl-n8n-mcp
**Template**: n8n-management-mcp (same pattern)

---

## Project Overview

**cl-n8n-mcp** เป็น Multi-tenant MCP SaaS Platform สำหรับ n8n workflow automation

- **Source**: Fork จาก https://github.com/nerding-io/n8n-mcp-multi-tenant-n8n
- **Tools**: 31 MCP tools สำหรับ n8n node discovery, validation, workflow management
- **Pattern**: เหมือน n8n-management-mcp ทุกประการ

---

## Current Status: Foundation Complete ✅

### สิ่งที่ทำเสร็จแล้ว

1. **Core MCP Server** (จาก fork) ✅
   - 31 MCP tools ทำงานได้
   - Multi-tenant via headers (x-n8n-url, x-n8n-key)
   - Docker deployment ready
   - Rate limiting

2. **Foundation Structure** (เพิ่มใหม่) ✅
   - 9 CLAUDE.md files (Quick Links pattern)
   - 6 agents (debugger, api-tester, security-auditor, code-reviewer, test-runner, documentation)
   - 6 skills (mcp-protocol, multi-tenant-patterns, api-conventions, dashboard-components, db-migrations, docker-deployment)
   - 8 commands (deploy, logs, test-api, security-audit, db-query, review-code, update-docs, memory-save)
   - .mcp.json (Memory MCP configured)

### สิ่งที่ยังไม่ได้ทำ

1. **SaaS Wrapper** (ต้องสร้างใหม่)
   - [ ] User registration/login system
   - [ ] Dashboard (React SPA)
   - [ ] D1 database for users, connections, api_keys
   - [ ] Stripe billing integration
   - [ ] OAuth (GitHub/Google)
   - [ ] TOTP 2FA

2. **Integration**
   - [ ] Wrap existing MCP server with SaaS layer
   - [ ] API key generation (n2f_xxx format)
   - [ ] Usage tracking per user

---

## Key Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  SaaS Wrapper (TO BE BUILT)                                 │
│  - Dashboard (React)                                        │
│  - Auth (JWT, OAuth, TOTP)                                  │
│  - D1 Database                                              │
│  - Stripe Billing                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Core MCP Server (ALREADY EXISTS)                           │
│  - 31 tools for n8n                                         │
│  - Multi-tenant via headers                                 │
│  - Docker deployment                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
cl-n8n-mcp/
├── CLAUDE.md              # Main guide (Quick Links)
├── HANDOFF.md             # This file
├── src/                   # Core MCP server (from fork)
│   ├── CLAUDE.md
│   ├── mcp/               # MCP tools
│   ├── http-server/       # Express server
│   └── ...
├── dashboard/             # TO BE BUILT
│   ├── CLAUDE.md          # Guide ready
│   └── src/
│       ├── CLAUDE.md
│       ├── pages/CLAUDE.md
│       ├── components/CLAUDE.md
│       └── contexts/CLAUDE.md
├── migrations/CLAUDE.md   # Schema guide ready
├── tests/CLAUDE.md        # Test guide ready
└── .claude/
    ├── agents/            # 6 agents
    ├── skills/            # 6 skills
    └── commands/          # 8 commands
```

---

## Important Notes

1. **Core MCP ทำงานได้แล้ว** — ไม่ต้องแก้ไข, แค่ wrap ด้วย SaaS layer
2. **Pattern ต้องเหมือน n8n-management-mcp** — ดู reference ที่ `n8n-management-mcp` folder
3. **Theme Color**: Orange (#f97316) — ใช้ class `n2f-*`
4. **API Key Prefix**: `n2f_`

---

## Next Steps

1. อ่าน `CLAUDE.md` และ sub CLAUDE.md files ทั้งหมด
2. ดู n8n-management-mcp เป็น reference
3. สร้าง Dashboard (React + Vite + Tailwind)
4. สร้าง Auth system (JWT, OAuth)
5. สร้าง D1 schema และ migrations
6. Integrate กับ Core MCP server

---

## Quick Commands

```bash
# Core MCP (already works)
npm run build
npm run start:http
docker compose up -d

# Test
npm test
curl http://localhost:3011/health
```

---

**Last Updated**: 2026-02-05
**By**: Claude Opus 4.5
