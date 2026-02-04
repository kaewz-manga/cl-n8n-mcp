# Source Code Guide

> MCP server source code for cl-n8n-mcp.

**Pattern**: Same as n8n-management-mcp

---

## File Structure

```
src/
├── loaders/
│   └── node-loader.ts              # NPM package loader
├── parsers/
│   ├── node-parser.ts              # Node metadata parser
│   └── property-extractor.ts       # Property/operation extraction
├── mappers/
│   └── docs-mapper.ts              # Documentation mapping
├── database/
│   ├── schema.sql                  # SQLite schema
│   ├── node-repository.ts          # Data access layer
│   └── database-adapter.ts         # Universal DB adapter
├── services/
│   ├── property-filter.ts          # AI-friendly property filtering
│   ├── example-generator.ts        # Working example generation
│   ├── task-templates.ts           # Pre-configured node settings
│   ├── config-validator.ts         # Configuration validation
│   ├── enhanced-config-validator.ts
│   ├── node-specific-validators.ts
│   ├── property-dependencies.ts
│   ├── type-structure-service.ts
│   ├── expression-validator.ts
│   └── workflow-validator.ts
├── mcp/
│   ├── server.ts                   # MCP server with tools
│   ├── tools.ts                    # Tool definitions (31 tools)
│   ├── tools-documentation.ts      # Tool documentation
│   └── index.ts                    # Entry point
├── http-server/
│   ├── index.ts                    # Express server + rate limiting
│   ├── session-manager.ts          # Session lifecycle
│   ├── request-handler.ts          # MCP request handling
│   ├── session-persistence.ts      # Export/restore API
│   └── sse-middleware.ts           # SSE to JSON conversion
├── utils/
│   ├── console-manager.ts
│   └── logger.ts
└── index.ts                        # Library exports
```

---

## MCP Tools (31 total)

### Discovery Tools
- `search_nodes` — Search n8n nodes by name/category
- `get_node_info` — Get full node details
- `get_node_essentials` — Get minimal node info (faster)
- `list_categories` — List node categories

### Configuration Tools
- `get_node_properties` — Get node properties
- `get_operation_details` — Get operation-specific details
- `get_examples` — Get working examples
- `get_task_template` — Get pre-configured templates

### Validation Tools
- `validate_config` — Validate node configuration
- `validate_expression` — Validate n8n expressions
- `validate_workflow` — Validate complete workflow

### Workflow Management Tools
- `create_workflow` — Create new workflow
- `update_workflow` — Update existing workflow
- `get_workflow` — Get workflow details
- `list_workflows` — List all workflows
- `activate_workflow` — Activate workflow
- `deactivate_workflow` — Deactivate workflow

---

## Multi-Tenant Headers

```
x-n8n-url: https://n8n.example.com
x-n8n-key: n8n_api_key_here
x-instance-id: optional-instance-id
x-session-id: optional-session-id
```

---

## Auth Pattern

Stateless multi-tenant via request headers (no user registration in core MCP).

For SaaS wrapper:
- JWT for Dashboard users
- API Key (`n2f_xxx`) for MCP clients
- OAuth for GitHub/Google login

---

## Rate Limiting

| Limit | Default | Env Variable |
|-------|---------|-------------|
| Per minute | 50 | `RATE_LIMIT_PER_MINUTE` |
| Per day | 100 | `DAILY_LIMIT` |
| Auth failures | 20/15min | `AUTH_RATE_LIMIT_MAX` |

---

## Key Patterns

### SSE-to-JSON Middleware

Converts SSE responses to JSON for n8n client compatibility:

```typescript
// src/http-server/sse-middleware.ts
export function sseToJsonMiddleware(req, res, next) {
  // Inject SSE headers for MCP SDK validation
  // Convert SSE responses to JSON for n8n
}
```

### Session Persistence

```typescript
// Export sessions for zero-downtime deployments
const state = await exportSessionState();

// Restore after deployment
await restoreSessionState(state);
```
