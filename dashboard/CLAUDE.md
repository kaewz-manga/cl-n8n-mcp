# Dashboard Guide

> React SaaS Dashboard for cl-n8n-mcp.

**Pattern**: Same as n8n-management-mcp dashboard

---

## Tech Stack

- **React 19** with TypeScript
- **Vite** for bundling
- **TanStack Query** for data fetching
- **Tailwind CSS** for styling
- **React Router** for navigation

---

## Theme Colors (Orange Accent)

```typescript
// tailwind.config.ts
colors: {
  'n2f-bg': '#0a0a0f',
  'n2f-surface': '#12121a',
  'n2f-elevated': '#1a1a24',
  'n2f-border': '#2a2a3a',
  'n2f-text': '#f0f0f5',
  'n2f-text-secondary': '#a0a0b0',
  'n2f-text-muted': '#606070',
  'n2f-accent': '#f97316',        // Orange
  'n2f-accent-hover': '#ea580c',
}
```

---

## File Structure

```
dashboard/
├── src/
│   ├── main.tsx           # Entry point
│   ├── App.tsx            # Router + providers
│   ├── api/               # API client
│   ├── components/        # Reusable components
│   ├── contexts/          # Auth, Sudo, Connection
│   ├── hooks/             # Custom hooks
│   ├── pages/             # Route pages
│   └── types/             # TypeScript types
├── public/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

---

## Route Structure

| Route | Auth | Component |
|-------|------|-----------|
| `/` | Public | Landing |
| `/login` | Public | Login |
| `/register` | Public | Register |
| `/dashboard` | JWT | Dashboard |
| `/connections` | JWT | ConnectionList |
| `/connections/:id` | JWT | ConnectionDetail |
| `/api-keys` | JWT | ApiKeyList |
| `/settings` | JWT | Settings |
| `/admin/*` | JWT + Admin | AdminPanel |

---

## Context Providers

```tsx
<QueryClientProvider client={queryClient}>
  <AuthProvider>
    <SudoProvider>
      <ConnectionProvider>
        <RouterProvider router={router} />
      </ConnectionProvider>
    </SudoProvider>
  </AuthProvider>
</QueryClientProvider>
```

---

## Build Commands

```bash
cd dashboard
npm install
npm run dev        # Development (port 5173)
npm run build      # Production build
npm run preview    # Preview production
```
