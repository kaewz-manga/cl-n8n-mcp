import { v4 as uuidv4 } from 'uuid';
import type { AsyncDatabase } from './d1-adapter';

// Types
export interface User {
  id: string;
  email: string;
  password_hash: string | null;
  oauth_provider: string | null;
  oauth_id: string | null;
  plan_id: string;
  stripe_customer_id: string | null;
  is_admin: number;
  totp_secret: string | null;
  totp_enabled: number;
  session_duration_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface N8nConnection {
  id: string;
  user_id: string;
  name: string;
  n8n_url: string;
  n8n_api_key_encrypted: string;
  status: string;
  last_tested_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  connection_id: string | null;
  name: string;
  key_hash: string;
  key_prefix: string;
  scopes: string;
  status: string;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface Plan {
  id: string;
  name: string;
  daily_request_limit: number;
  requests_per_minute: number;
  max_connections: number;
  price_monthly_cents: number;
  features: string;
  created_at: string;
}

// Database getter - set at init time
let _getDb: (() => AsyncDatabase) | null = null;

export function setDatabaseGetter(getter: () => AsyncDatabase): void {
  _getDb = getter;
}

function getDb(): AsyncDatabase {
  if (!_getDb) {
    throw new Error('Database not initialized. Call setDatabaseGetter() first.');
  }
  return _getDb();
}

// User Repository
export const usersRepository = {
  async create(email: string, passwordHash: string): Promise<User> {
    const db = getDb();
    const id = uuidv4();

    await db.prepare(`
      INSERT INTO users (id, email, password_hash)
      VALUES (?, ?, ?)
    `).run(id, email, passwordHash);

    return (await this.getById(id))!;
  },

  async createOAuth(email: string, provider: string, oauthId: string): Promise<User> {
    const db = getDb();
    const id = uuidv4();

    await db.prepare(`
      INSERT INTO users (id, email, oauth_provider, oauth_id)
      VALUES (?, ?, ?, ?)
    `).run(id, email, provider, oauthId);

    return (await this.getById(id))!;
  },

  async getById(id: string): Promise<User | undefined> {
    const db = getDb();
    return await db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
  },

  async getByEmail(email: string): Promise<User | undefined> {
    const db = getDb();
    return await db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
  },

  async getByOAuth(provider: string, oauthId: string): Promise<User | undefined> {
    const db = getDb();
    return await db.prepare('SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?').get(provider, oauthId) as User | undefined;
  },

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    const db = getDb();
    await db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(passwordHash, id);
  },

  async updatePlan(id: string, planId: string): Promise<void> {
    const db = getDb();
    await db.prepare(`
      UPDATE users SET plan_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(planId, id);
  },

  async enableTotp(id: string, secret: string): Promise<void> {
    const db = getDb();
    await db.prepare(`
      UPDATE users SET totp_secret = ?, totp_enabled = 1, updated_at = datetime('now')
      WHERE id = ?
    `).run(secret, id);
  },

  async disableTotp(id: string): Promise<void> {
    const db = getDb();
    await db.prepare(`
      UPDATE users SET totp_secret = NULL, totp_enabled = 0, updated_at = datetime('now')
      WHERE id = ?
    `).run(id);
  },

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.prepare('DELETE FROM users WHERE id = ?').run(id);
  },

  async list(limit = 100, offset = 0): Promise<User[]> {
    const db = getDb();
    return await db.prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset) as User[];
  },

  async count(): Promise<number> {
    const db = getDb();
    const result = await db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    return result.count;
  }
};

// Connections Repository
export const connectionsRepository = {
  async create(userId: string, name: string, n8nUrl: string, n8nApiKeyEncrypted: string): Promise<N8nConnection> {
    const db = getDb();
    const id = uuidv4();

    await db.prepare(`
      INSERT INTO n8n_connections (id, user_id, name, n8n_url, n8n_api_key_encrypted)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, userId, name, n8nUrl, n8nApiKeyEncrypted);

    return (await this.getById(id))!;
  },

  async getById(id: string): Promise<N8nConnection | undefined> {
    const db = getDb();
    return await db.prepare('SELECT * FROM n8n_connections WHERE id = ?').get(id) as N8nConnection | undefined;
  },

  async getByUserId(userId: string): Promise<N8nConnection[]> {
    const db = getDb();
    return await db.prepare('SELECT * FROM n8n_connections WHERE user_id = ? ORDER BY created_at DESC').all(userId) as N8nConnection[];
  },

  async update(id: string, data: Partial<Pick<N8nConnection, 'name' | 'n8n_url' | 'n8n_api_key_encrypted' | 'status'>>): Promise<void> {
    const db = getDb();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.n8n_url !== undefined) {
      fields.push('n8n_url = ?');
      values.push(data.n8n_url);
    }
    if (data.n8n_api_key_encrypted !== undefined) {
      fields.push('n8n_api_key_encrypted = ?');
      values.push(data.n8n_api_key_encrypted);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }

    if (fields.length === 0) return;

    fields.push("updated_at = datetime('now')");
    values.push(id);

    await db.prepare(`UPDATE n8n_connections SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  },

  async updateLastTested(id: string): Promise<void> {
    const db = getDb();
    await db.prepare(`
      UPDATE n8n_connections SET last_tested_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(id);
  },

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.prepare('DELETE FROM n8n_connections WHERE id = ?').run(id);
  },

  async countByUserId(userId: string): Promise<number> {
    const db = getDb();
    const result = await db.prepare('SELECT COUNT(*) as count FROM n8n_connections WHERE user_id = ?').get(userId) as { count: number };
    return result.count;
  }
};

// API Keys Repository
export const apiKeysRepository = {
  async create(userId: string, connectionId: string | null, name: string, keyHash: string, keyPrefix: string): Promise<ApiKey> {
    const db = getDb();
    const id = uuidv4();

    await db.prepare(`
      INSERT INTO api_keys (id, user_id, connection_id, name, key_hash, key_prefix)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId, connectionId, name, keyHash, keyPrefix);

    return (await this.getById(id))!;
  },

  async getById(id: string): Promise<ApiKey | undefined> {
    const db = getDb();
    return await db.prepare('SELECT * FROM api_keys WHERE id = ?').get(id) as ApiKey | undefined;
  },

  async getByPrefix(prefix: string): Promise<ApiKey | undefined> {
    const db = getDb();
    return await db.prepare('SELECT * FROM api_keys WHERE key_prefix = ? AND status = ?').get(prefix, 'active') as ApiKey | undefined;
  },

  async getByUserId(userId: string): Promise<ApiKey[]> {
    const db = getDb();
    return await db.prepare('SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at DESC').all(userId) as ApiKey[];
  },

  async updateLastUsed(id: string): Promise<void> {
    const db = getDb();
    await db.prepare("UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?").run(id);
  },

  async revoke(id: string): Promise<void> {
    const db = getDb();
    await db.prepare("UPDATE api_keys SET status = 'revoked' WHERE id = ?").run(id);
  },

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.prepare('DELETE FROM api_keys WHERE id = ?').run(id);
  }
};

// Plans Repository
export const plansRepository = {
  async getById(id: string): Promise<Plan | undefined> {
    const db = getDb();
    return await db.prepare('SELECT * FROM plans WHERE id = ?').get(id) as Plan | undefined;
  },

  async getAll(): Promise<Plan[]> {
    const db = getDb();
    return await db.prepare('SELECT * FROM plans ORDER BY price_monthly_cents ASC').all() as Plan[];
  }
};

// Usage Repository
export const usageRepository = {
  async logRequest(userId: string | null, apiKeyId: string | null, connectionId: string | null, toolName: string, status: string, responseTimeMs: number, errorMessage?: string): Promise<void> {
    const db = getDb();
    await db.prepare(`
      INSERT INTO usage_logs (user_id, api_key_id, connection_id, tool_name, status, response_time_ms, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, apiKeyId, connectionId, toolName, status, responseTimeMs, errorMessage || null);
  },

  async incrementMonthly(userId: string, isSuccess: boolean): Promise<void> {
    const db = getDb();
    const yearMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    const existing = await db.prepare('SELECT id FROM usage_monthly WHERE user_id = ? AND year_month = ?').get(userId, yearMonth);

    if (existing) {
      if (isSuccess) {
        await db.prepare('UPDATE usage_monthly SET request_count = request_count + 1, success_count = success_count + 1 WHERE user_id = ? AND year_month = ?').run(userId, yearMonth);
      } else {
        await db.prepare('UPDATE usage_monthly SET request_count = request_count + 1, error_count = error_count + 1 WHERE user_id = ? AND year_month = ?').run(userId, yearMonth);
      }
    } else {
      await db.prepare(`
        INSERT INTO usage_monthly (user_id, year_month, request_count, success_count, error_count)
        VALUES (?, ?, 1, ?, ?)
      `).run(userId, yearMonth, isSuccess ? 1 : 0, isSuccess ? 0 : 1);
    }
  },

  async getMonthlyUsage(userId: string): Promise<{ request_count: number; success_count: number; error_count: number } | undefined> {
    const db = getDb();
    const yearMonth = new Date().toISOString().slice(0, 7);
    return await db.prepare('SELECT request_count, success_count, error_count FROM usage_monthly WHERE user_id = ? AND year_month = ?').get(userId, yearMonth) as { request_count: number; success_count: number; error_count: number } | undefined;
  },

  async getDailyRequestCount(userId: string): Promise<number> {
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const result = await db.prepare(`
      SELECT COUNT(*) as count FROM usage_logs
      WHERE user_id = ? AND date(request_at) = ?
    `).get(userId, today) as { count: number };
    return result.count;
  }
};
