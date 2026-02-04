# Deploy

Build and deploy cl-n8n-mcp.

## Usage
```
/deploy [target]
```

**Targets**: `all` | `docker` | `dashboard`

## Process

1. Run `npm run build`
2. Run `npm run lint`
3. Build Docker image
4. Deploy container
5. Verify health endpoint

## Commands

```bash
# Build
npm run build

# Docker deploy
docker compose build
docker compose up -d

# Verify
curl http://localhost:3011/health
```

---

$ARGUMENTS
