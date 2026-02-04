# Security Audit

Run security audit using security-auditor agent.

## Usage
```
/security-audit [scope]
```

**Scopes**: `all` | `auth` | `api` | `headers`

## Checklist

- [ ] API keys hashed before storage
- [ ] n8n credentials not logged
- [ ] Rate limiting enforced
- [ ] CORS properly configured
- [ ] No hardcoded secrets

---

$ARGUMENTS
