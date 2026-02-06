/**
 * D1 Database Adapter for Cloudflare Workers
 *
 * Wraps D1Database with an async interface matching the repository query patterns.
 * Also provides a sync-to-async wrapper for the legacy DatabaseAdapter (Express/Docker mode).
 */

// D1Database type - provided by Cloudflare Workers runtime
// Full types available via @cloudflare/workers-types
declare global {
  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    exec(query: string): Promise<D1ExecResult>;
  }
  interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
    run(): Promise<D1Result>;
    first(column?: string): Promise<unknown>;
    all(): Promise<D1Result>;
  }
  interface D1Result {
    results: unknown[];
    meta: { changes?: number; last_row_id?: number };
  }
  interface D1ExecResult {
    count: number;
  }
  interface KVNamespace {
    get(key: string, options?: { type?: string }): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
    delete(key: string): Promise<void>;
    list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ keys: { name: string }[]; list_complete: boolean; cursor?: string }>;
  }
}

export interface AsyncPreparedStatement {
  run(...params: unknown[]): Promise<{ changes: number; lastInsertRowid: number | bigint }>;
  get(...params: unknown[]): Promise<unknown>;
  all(...params: unknown[]): Promise<unknown[]>;
}

export interface AsyncDatabase {
  prepare(sql: string): AsyncPreparedStatement;
  exec(sql: string): Promise<void>;
}

/**
 * Wraps Cloudflare D1Database to match our AsyncDatabase interface
 */
export class D1Adapter implements AsyncDatabase {
  constructor(private db: D1Database) {}

  prepare(sql: string): AsyncPreparedStatement {
    const d1 = this.db;
    return {
      async run(...params: unknown[]) {
        const result = await d1.prepare(sql).bind(...params).run();
        return {
          changes: result.meta.changes ?? 0,
          lastInsertRowid: result.meta.last_row_id ?? 0,
        };
      },
      async get(...params: unknown[]) {
        return await d1.prepare(sql).bind(...params).first();
      },
      async all(...params: unknown[]) {
        const result = await d1.prepare(sql).bind(...params).all();
        return result.results;
      },
    };
  }

  async exec(sql: string): Promise<void> {
    await this.db.exec(sql);
  }
}

/**
 * Wraps the legacy sync DatabaseAdapter to match AsyncDatabase interface.
 * Used in Express/Docker mode to keep backward compatibility.
 */
export class SyncToAsyncAdapter implements AsyncDatabase {
  constructor(private db: { prepare(sql: string): { run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint }; get(...params: unknown[]): unknown; all(...params: unknown[]): unknown[] }; exec(sql: string): void }) {}

  prepare(sql: string): AsyncPreparedStatement {
    const stmt = this.db.prepare(sql);
    return {
      async run(...params: unknown[]) {
        return stmt.run(...params);
      },
      async get(...params: unknown[]) {
        return stmt.get(...params);
      },
      async all(...params: unknown[]) {
        return stmt.all(...params);
      },
    };
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }
}
