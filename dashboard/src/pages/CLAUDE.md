# Pages Guide

> Page component patterns for cl-n8n-mcp dashboard.

**Pattern**: Same as n8n-management-mcp

---

## Page Types

| Type | Auth | Example |
|------|------|---------|
| **Public** | None | Landing, Login, Register |
| **Protected** | JWT required | Dashboard, Connections |
| **Admin** | JWT + is_admin | Admin panel |

---

## n8n-Specific Pages

### Connections Page (`/connections`)

```tsx
export default function ConnectionsPage() {
  const { data: connections } = useQuery({
    queryKey: ['connections'],
    queryFn: () => api.get('/connections'),
  });

  return (
    <DashboardLayout>
      <h1>n8n Connections</h1>
      <AddConnectionButton />
      <ConnectionList connections={connections} />
    </DashboardLayout>
  );
}
```

### Connection Detail Page (`/connections/:id`)

```tsx
export default function ConnectionDetailPage() {
  const { id } = useParams();
  const { data: connection } = useQuery({
    queryKey: ['connections', id],
    queryFn: () => api.get(`/connections/${id}`),
  });

  return (
    <DashboardLayout>
      <ConnectionHeader connection={connection} />
      <ConnectionStats connection={connection} />
      <ApiKeySection connectionId={id} />
    </DashboardLayout>
  );
}
```

### Workflows Page (`/workflows`)

```tsx
export default function WorkflowsPage() {
  const { selectedConnection } = useConnection();

  if (!selectedConnection) {
    return <SelectConnectionPrompt />;
  }

  return (
    <DashboardLayout>
      <WorkflowList connectionId={selectedConnection.id} />
    </DashboardLayout>
  );
}
```

---

## Common Patterns

### Connection Required

```tsx
if (!selectedConnection) {
  return (
    <DashboardLayout>
      <div className="text-center py-12">
        <Server className="h-12 w-12 text-n2f-text-muted mx-auto mb-4" />
        <p className="text-n2f-text-secondary mb-4">
          Select an n8n connection to continue
        </p>
        <Button onClick={() => navigate('/connections')}>
          Manage Connections
        </Button>
      </div>
    </DashboardLayout>
  );
}
```

### Loading State

```tsx
if (isLoading) {
  return (
    <DashboardLayout>
      <LoadingSpinner />
    </DashboardLayout>
  );
}
```
