# Test API

Test MCP and REST endpoints.

## Usage
```
/test-api [endpoint]
```

## Endpoints

```bash
# Health
curl http://localhost:3011/health

# Server info
curl http://localhost:3011/

# MCP tools/list
curl -X POST http://localhost:3011/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Search nodes
curl -X POST http://localhost:3011/mcp \
  -H "Content-Type: application/json" \
  -H "x-n8n-url: https://n8n.example.com" \
  -H "x-n8n-key: YOUR_API_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_nodes","arguments":{"query":"http"}}}'
```

---

$ARGUMENTS
