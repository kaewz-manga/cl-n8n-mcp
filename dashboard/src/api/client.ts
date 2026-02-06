import type { ApiResponse, User, Connection, ApiKey, Usage, DashboardData, Plan } from '../types';

const API_BASE = '/api';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('n2f_token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    // Handle 401 - clear token and redirect
    if (response.status === 401) {
      localStorage.removeItem('n2f_token');
      window.location.href = '/login';
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Session expired' } };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network error',
      },
    };
  }
}

// Auth API
export const authApi = {
  register: (email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ token: string; requires_totp: boolean; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<{ user: User; plan: Plan }>('/auth/me'),

  changePassword: (current_password: string, new_password: string) =>
    request<{ message: string }>('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ current_password, new_password }),
    }),

  deleteAccount: () =>
    request<{ message: string }>('/auth/account', {
      method: 'DELETE',
    }),
};

// Connections API
export const connectionsApi = {
  list: () => request<Connection[]>('/connections'),

  create: (name: string, n8n_url: string, n8n_api_key: string) =>
    request<Connection>('/connections', {
      method: 'POST',
      body: JSON.stringify({ name, n8n_url, n8n_api_key }),
    }),

  get: (id: string) => request<Connection>(`/connections/${id}`),

  update: (id: string, data: Partial<{ name: string; n8n_url: string; n8n_api_key: string }>) =>
    request<Connection>(`/connections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/connections/${id}`, {
      method: 'DELETE',
    }),

  test: (id: string) =>
    request<{ message: string; status: string }>(`/connections/${id}/test`, {
      method: 'POST',
    }),
};

// API Keys API
export const apiKeysApi = {
  list: () => request<ApiKey[]>('/api-keys'),

  create: (name: string, connection_id?: string) =>
    request<ApiKey & { full_key: string }>('/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name, connection_id }),
    }),

  revoke: (id: string) =>
    request<{ message: string }>(`/api-keys/${id}`, {
      method: 'DELETE',
    }),
};

// TOTP API
export const totpApi = {
  setup: () =>
    request<{ secret: string; uri: string }>('/auth/totp/setup', {
      method: 'POST',
    }),

  enable: (secret: string, code: string) =>
    request<{ message: string }>('/auth/totp/enable', {
      method: 'POST',
      body: JSON.stringify({ secret, code }),
    }),

  verifyLogin: (token: string, code: string) =>
    request<{ token: string; user: User }>('/auth/totp/verify-login', {
      method: 'POST',
      body: JSON.stringify({ token, code }),
    }),

  disable: (password: string, code: string) =>
    request<{ message: string }>('/auth/totp', {
      method: 'DELETE',
      body: JSON.stringify({ password, code }),
    }),
};

// User API
export const userApi = {
  usage: () => request<Usage>('/user/usage'),

  plans: () => request<Plan[]>('/user/plans'),

  dashboard: () => request<DashboardData>('/user/dashboard'),
};
