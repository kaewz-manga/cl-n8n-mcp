# Testing Guide

> Test patterns for cl-n8n-mcp.

**Pattern**: Same as n8n-management-mcp

---

## Test Framework

- **Vitest** — Test runner
- **better-sqlite3 / sql.js** — Database testing

---

## Run Tests

```bash
npm test                    # All tests
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests
npm test -- --watch         # Watch mode
npm test -- --coverage      # With coverage

# Single test file
npm test -- tests/unit/services/property-filter.test.ts
```

---

## Test Files

| Directory | Tests |
|-----------|-------|
| `tests/unit/` | Unit tests for services |
| `tests/integration/` | Integration tests |
| `tests/mcp/` | MCP protocol tests |

---

## Testing MCP Tools

```typescript
import { describe, it, expect } from 'vitest';
import { MCPServer } from '../src/mcp/server';

describe('MCP Tools', () => {
  it('should list tools', async () => {
    const server = new MCPServer();
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
    });

    expect(response.result.tools.length).toBeGreaterThan(0);
  });

  it('should search nodes', async () => {
    const server = new MCPServer();
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'search_nodes',
        arguments: { query: 'http' },
      },
    });

    expect(response.result.content[0].text).toContain('HTTP');
  });
});
```

---

## Testing Validation

```typescript
describe('Config Validator', () => {
  it('should validate node config', async () => {
    const result = await validateConfig({
      nodeType: 'n8n-nodes-base.httpRequest',
      config: {
        method: 'GET',
        url: 'https://api.example.com',
      },
    });

    expect(result.valid).toBe(true);
  });

  it('should reject invalid config', async () => {
    const result = await validateConfig({
      nodeType: 'n8n-nodes-base.httpRequest',
      config: {
        method: 'INVALID',
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid method');
  });
});
```

---

## Best Practices

1. **Use test database** — Don't modify production data
2. **Mock external APIs** — Don't call real n8n instances in tests
3. **Test edge cases** — Invalid inputs, missing fields
4. **Run before commit** — `npm test` must pass
