# Components Guide

> Reusable UI components for cl-n8n-mcp dashboard.

**Pattern**: Same as n8n-management-mcp

---

## Component Categories

| Category | Components |
|----------|------------|
| **Layout** | DashboardLayout, Sidebar |
| **Forms** | Input, Select, Button |
| **Data Display** | Table, Card, Badge |
| **Feedback** | Modal, Toast, Alert |
| **n8n** | ConnectionCard, WorkflowCard, NodeBadge |

---

## n8n-Specific Components

### ConnectionCard

```tsx
interface ConnectionCardProps {
  connection: N8nConnection;
  onDelete: () => void;
}

export function ConnectionCard({ connection, onDelete }: ConnectionCardProps) {
  const statusColors = {
    active: 'bg-green-500/20 text-green-400',
    inactive: 'bg-gray-500/20 text-gray-400',
    error: 'bg-red-500/20 text-red-400',
  };

  return (
    <Card className="bg-n2f-surface border-n2f-border">
      <div className="flex items-center gap-3">
        <Server className="h-8 w-8 text-n2f-accent" />
        <div className="flex-1">
          <p className="font-medium text-n2f-text">{connection.name}</p>
          <p className="text-sm text-n2f-text-secondary">{connection.url}</p>
        </div>
        <span className={`px-2 py-1 rounded text-xs ${statusColors[connection.status]}`}>
          {connection.status}
        </span>
      </div>
    </Card>
  );
}
```

### WorkflowCard

```tsx
interface WorkflowCardProps {
  workflow: Workflow;
  onToggle: () => void;
}

export function WorkflowCard({ workflow, onToggle }: WorkflowCardProps) {
  return (
    <Card className="bg-n2f-surface border-n2f-border">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-n2f-text">{workflow.name}</p>
          <p className="text-sm text-n2f-text-secondary">
            {workflow.nodes.length} nodes
          </p>
        </div>
        <Switch checked={workflow.active} onCheckedChange={onToggle} />
      </div>
    </Card>
  );
}
```

### NodeBadge

```tsx
export function NodeBadge({ nodeType }: { nodeType: string }) {
  const colors: Record<string, string> = {
    trigger: 'bg-purple-500/20 text-purple-400',
    action: 'bg-blue-500/20 text-blue-400',
    transform: 'bg-yellow-500/20 text-yellow-400',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs ${colors[nodeType] || 'bg-gray-500/20'}`}>
      {nodeType}
    </span>
  );
}
```

---

## Theme Classes (Orange Accent)

```tsx
// Background
className="bg-n2f-accent"           // #f97316
className="hover:bg-n2f-accent-hover" // #ea580c

// Text
className="text-n2f-accent"

// Border
className="border-n2f-accent"
className="focus:ring-n2f-accent"
```
