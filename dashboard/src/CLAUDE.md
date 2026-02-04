# React Patterns Guide

> Component and state patterns for cl-n8n-mcp dashboard.

**Pattern**: Same as n8n-management-mcp

---

## Import Order

```typescript
// 1. React
import { useState, useEffect } from 'react';

// 2. Third-party
import { useQuery, useMutation } from '@tanstack/react-query';

// 3. Local components
import { Button, Input, Card } from '@/components/ui';

// 4. Hooks & contexts
import { useAuth, useSudo } from '@/contexts';

// 5. Types
import type { Connection, ApiKey } from '@/types';
```

---

## Component Pattern

```tsx
interface ConnectionCardProps {
  connection: Connection;
  onDelete: () => void;
}

export function ConnectionCard({ connection, onDelete }: ConnectionCardProps) {
  const { withSudo } = useSudo();

  const handleDelete = async () => {
    await withSudo(async () => {
      await api.delete(`/connections/${connection.id}`);
      onDelete();
    });
  };

  return (
    <Card className="bg-n2f-surface border-n2f-border">
      {/* ... */}
    </Card>
  );
}
```

---

## State Management

### TanStack Query for Server State

```typescript
// Fetch
const { data, isLoading } = useQuery({
  queryKey: ['connections'],
  queryFn: () => api.get('/connections'),
});

// Mutate
const mutation = useMutation({
  mutationFn: (data) => api.post('/connections', data),
  onSuccess: () => queryClient.invalidateQueries(['connections']),
});
```

### useState for Local State

```typescript
const [isOpen, setIsOpen] = useState(false);
const [search, setSearch] = useState('');
```

---

## API Pattern

```typescript
// api/client.ts
const api = {
  get: async (path: string) => {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return res.json();
  },
  post: async (path: string, data: unknown) => {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },
};
```

---

## Protected Actions (Sudo Mode)

```typescript
const { withSudo } = useSudo();

const handleSensitiveAction = async () => {
  await withSudo(async () => {
    // TOTP verification happens automatically
    await api.delete(`/connections/${id}`);
  });
};
```
