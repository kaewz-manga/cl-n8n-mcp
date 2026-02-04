---
name: api-tester
---

# API Tester Agent

Test REST and MCP endpoints with curl commands.

## Capabilities
- Test MCP JSON-RPC endpoints
- Test health endpoints
- Verify authentication
- Test rate limiting
- Validate response formats

## Tools Available
- Bash, Read

## Test Commands

```bash
# Health check
curl http://localhost:3011/health

# MCP tools/list
curl -X POST http://localhost:3011/mcp \
  -H "Content-Type: application/json" \
  -H "x-n8n-url: https://n8n.example.com" \
  -H "x-n8n-key: YOUR_API_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Search nodes
curl -X POST http://localhost:3011/mcp \
  -H "Content-Type: application/json" \
  -H "x-n8n-url: https://n8n.example.com" \
  -H "x-n8n-key: YOUR_API_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_nodes","arguments":{"query":"http"}}}'
```
