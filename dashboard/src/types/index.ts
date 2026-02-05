export interface User {
  id: string;
  email: string;
  plan_id: string;
  is_admin: number;
  totp_enabled?: number;
  created_at: string;
}

export interface Plan {
  id: string;
  name: string;
  daily_request_limit: number;
  requests_per_minute: number;
  max_connections: number;
}

export interface Connection {
  id: string;
  name: string;
  n8n_url: string;
  status: string;
  last_tested_at: string | null;
  created_at: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  connection_id: string | null;
  status: string;
  last_used_at: string | null;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    warning?: string;
  };
}

export interface Usage {
  plan: Plan;
  usage: {
    today: {
      requests: number;
      remaining: number;
    };
    month: {
      requests: number;
      success: number;
      errors: number;
      success_rate: number;
    };
  };
  resources: {
    connections: {
      used: number;
      max: number;
    };
    api_keys: number;
  };
}

export interface DashboardData {
  user: {
    email: string;
    plan: string;
    created_at: string;
  };
  stats: {
    connections: number;
    api_keys: number;
    requests_today: number;
    requests_month: number;
  };
  limits: {
    daily_requests: number;
    max_connections: number;
  };
  recent_connections: Connection[];
}
