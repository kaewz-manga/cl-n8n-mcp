import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Link2,
  Key,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/connections', icon: Link2, label: 'Connections' },
  { to: '/api-keys', icon: Key, label: 'API Keys' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-n2f-bg flex">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-n2f-surface border-b border-n2f-border z-50 flex items-center px-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-n2f-text-secondary hover:text-n2f-text"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <span className="ml-4 text-lg font-semibold text-n2f-accent">cl-n8n-mcp</span>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-n2f-surface border-r border-n2f-border
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          pt-16 lg:pt-0
        `}
      >
        <div className="p-6">
          <h1 className="text-xl font-bold text-n2f-accent">cl-n8n-mcp</h1>
          <p className="text-sm text-n2f-text-muted mt-1">Dashboard</p>
        </div>

        <nav className="px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-n2f-accent/10 text-n2f-accent'
                    : 'text-n2f-text-secondary hover:text-n2f-text hover:bg-n2f-elevated'
                }`
              }
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-n2f-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-n2f-accent/20 flex items-center justify-center">
              <span className="text-n2f-accent text-sm font-medium">
                {user?.email.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-n2f-text truncate">{user?.email}</p>
              <p className="text-xs text-n2f-text-muted capitalize">{user?.plan_id} plan</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-n2f-text-secondary hover:text-n2f-error rounded-lg hover:bg-n2f-elevated transition-colors"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 min-h-screen pt-16 lg:pt-0">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
