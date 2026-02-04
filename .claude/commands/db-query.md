# Database Query

Query SQLite or D1 database.

## Usage
```
/db-query <query>
```

## Examples

```bash
# Local SQLite (node data)
sqlite3 data/nodes.db "SELECT COUNT(*) FROM nodes"

# D1 (SaaS wrapper)
wrangler d1 execute cl-n8n-mcp-db --remote --command "SELECT * FROM users LIMIT 5"
```

---

$ARGUMENTS
