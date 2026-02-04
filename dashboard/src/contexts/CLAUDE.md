# Contexts Guide

> React Context providers for cl-n8n-mcp dashboard.

**Pattern**: Same as n8n-management-mcp

---

## Available Contexts

| Context | Purpose | Key Values |
|---------|---------|------------|
| **AuthContext** | User authentication | user, login, logout |
| **SudoContext** | TOTP verification | withSudo |
| **ConnectionContext** | Selected n8n connection | selectedConnection |

---

## AuthContext

```tsx
interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}
```

### Usage
```tsx
const { user, logout } = useAuth();
```

---

## SudoContext

For protected actions requiring TOTP.

```tsx
interface SudoContextValue {
  withSudo: <T>(action: () => Promise<T>) => Promise<T>;
  isSudoActive: boolean;
}
```

### Usage
```tsx
const { withSudo } = useSudo();

const handleDelete = async () => {
  await withSudo(async () => {
    await api.delete(`/connections/${id}`);
  });
};
```

---

## ConnectionContext

For managing selected n8n connection.

```tsx
interface ConnectionContextValue {
  connections: N8nConnection[];
  selectedConnection: N8nConnection | null;
  setSelectedConnection: (connection: N8nConnection | null) => void;
  refreshConnections: () => Promise<void>;
}
```

### Usage
```tsx
const { selectedConnection, setSelectedConnection } = useConnection();

if (!selectedConnection) {
  return <SelectConnectionPrompt />;
}
```

---

## Provider Setup

```tsx
// App.tsx
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SudoProvider>
          <ConnectionProvider>
            <RouterProvider router={router} />
          </ConnectionProvider>
        </SudoProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
```
