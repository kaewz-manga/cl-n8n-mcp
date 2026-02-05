import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { userApi } from '../api/client';
import type { DashboardData } from '../types';
import { Link2, Key, Activity, TrendingUp, ArrowRight, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      const response = await userApi.dashboard();
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error?.message || 'Failed to load dashboard');
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-n2f-accent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="error-message">
        {error || 'Failed to load dashboard'}
      </div>
    );
  }

  const usagePercent = Math.round((data.stats.requests_today / data.limits.daily_requests) * 100);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-n2f-text">Dashboard</h1>
        <p className="text-n2f-text-secondary mt-1">
          Welcome back, {data.user.email}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-n2f-accent/10 rounded-lg">
              <Link2 className="h-5 w-5 text-n2f-accent" />
            </div>
            <div>
              <div className="stat-value">{data.stats.connections}</div>
              <div className="stat-label">Connections</div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-n2f-accent/10 rounded-lg">
              <Key className="h-5 w-5 text-n2f-accent" />
            </div>
            <div>
              <div className="stat-value">{data.stats.api_keys}</div>
              <div className="stat-label">API Keys</div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-n2f-accent/10 rounded-lg">
              <Activity className="h-5 w-5 text-n2f-accent" />
            </div>
            <div>
              <div className="stat-value">{data.stats.requests_today}</div>
              <div className="stat-label">Requests Today</div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-n2f-accent/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-n2f-accent" />
            </div>
            <div>
              <div className="stat-value">{data.stats.requests_month}</div>
              <div className="stat-label">This Month</div>
            </div>
          </div>
        </div>
      </div>

      {/* Usage progress */}
      <div className="card">
        <h2 className="text-lg font-semibold text-n2f-text mb-4">Daily Usage</h2>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-n2f-text-secondary">
            {data.stats.requests_today} / {data.limits.daily_requests} requests
          </span>
          <span className="text-sm font-medium text-n2f-accent">{usagePercent}%</span>
        </div>
        <div className="h-2 bg-n2f-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-n2f-accent rounded-full transition-all duration-500"
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>
        <p className="text-xs text-n2f-text-muted mt-2">
          Plan: {data.user.plan} ({data.limits.daily_requests} requests/day)
        </p>
      </div>

      {/* Recent connections */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-n2f-text">Recent Connections</h2>
          <Link to="/connections" className="link text-sm flex items-center gap-1">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {data.recent_connections.length === 0 ? (
          <p className="text-n2f-text-muted text-sm">No connections yet</p>
        ) : (
          <div className="space-y-3">
            {data.recent_connections.map((conn) => (
              <div
                key={conn.id}
                className="flex items-center justify-between p-3 bg-n2f-elevated rounded-lg"
              >
                <div>
                  <p className="text-n2f-text font-medium">{conn.name}</p>
                  <p className="text-xs text-n2f-text-muted">{conn.status}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    conn.status === 'active'
                      ? 'bg-green-900/30 text-green-400'
                      : 'bg-red-900/30 text-red-400'
                  }`}
                >
                  {conn.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
