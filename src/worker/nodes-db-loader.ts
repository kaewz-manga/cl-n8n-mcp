/**
 * Nodes database loader for Cloudflare Workers.
 * Loads nodes.db via sql.js (asm.js build) from static assets.
 *
 * Uses sql-asm.js (pure JavaScript, no WASM) because Workers disallow
 * dynamic WebAssembly.instantiate() — the WASM build fails with
 * "Wasm code generation disallowed by embedder".
 */
import { DatabaseAdapter } from '../database/database-adapter';
import { NodeRepository } from '../database/node-repository';
import { SimpleCache } from '../utils/simple-cache';
import { TemplateService } from '../templates/template-service';
import type { ServerContext } from '../mcp/types';

// Module-level cache — persists across requests in the same isolate
let cachedContext: ServerContext | null = null;

/**
 * Create a minimal sql.js-based DatabaseAdapter from an ArrayBuffer.
 * This adapter implements the synchronous DatabaseAdapter interface
 * needed by NodeRepository and tool handlers.
 */
function createSqlJsAdapter(db: any): DatabaseAdapter {
  return {
    prepare(sql: string) {
      const stmt = db.prepare(sql);
      return {
        run(...params: any[]) {
          if (params.length > 0) {
            stmt.bind(params.map((p: unknown) => p === undefined ? null : p));
          }
          stmt.run();
          return { changes: 1, lastInsertRowid: 0 };
        },
        get(...params: any[]) {
          if (params.length > 0) {
            stmt.bind(params.map((p: unknown) => p === undefined ? null : p));
          }
          if (stmt.step()) {
            const result = stmt.getAsObject();
            stmt.reset();
            return convertIntegers(result);
          }
          stmt.reset();
          return undefined;
        },
        all(...params: any[]) {
          if (params.length > 0) {
            stmt.bind(params.map((p: unknown) => p === undefined ? null : p));
          }
          const results: any[] = [];
          while (stmt.step()) {
            results.push(convertIntegers(stmt.getAsObject()));
          }
          stmt.reset();
          return results;
        },
        iterate(...params: any[]) {
          return this.all(...params)[Symbol.iterator]();
        },
        pluck() { return this; },
        expand() { return this; },
        raw() { return this; },
        columns() { return []; },
        bind() { return this; },
      };
    },
    exec(sql: string) { db.exec(sql); },
    close() { db.close(); },
    pragma() { return null; },
    get inTransaction() { return false; },
    transaction<T>(fn: () => T): T {
      db.exec('BEGIN');
      try {
        const result = fn();
        db.exec('COMMIT');
        return result;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
    checkFTS5Support() { return false; },
  };
}

function convertIntegers(row: any): any {
  if (!row) return row;
  const intCols = ['is_ai_tool', 'is_trigger', 'is_webhook', 'is_versioned', 'is_tool_variant', 'has_tool_variant'];
  const out = { ...row };
  for (const col of intCols) {
    if (col in out && typeof out[col] === 'string') {
      out[col] = parseInt(out[col], 10);
    }
  }
  return out;
}

/**
 * Load the ServerContext for MCP tool dispatch.
 * Fetches nodes.db from static assets on first call, caches in isolate memory.
 *
 * @param assets - The ASSETS binding from Cloudflare Workers env
 * @param requestUrl - The Worker URL (used to construct asset request)
 */
export async function getServerContext(
  assets: { fetch: (request: Request) => Promise<Response> },
  requestUrl: string,
): Promise<ServerContext | null> {
  if (cachedContext) return cachedContext;

  try {
    // Polyfill __dirname — Emscripten's compiled sql.js detects process.versions.node
    // (which Workers polyfill) and tries to use __dirname for file paths.
    // Value doesn't matter since we load the database from an ArrayBuffer.
    if (typeof (globalThis as any).__dirname === 'undefined') {
      (globalThis as any).__dirname = '/';
    }

    // Dynamic import sql-asm.js (pure JS, no WASM needed).
    // Must be dynamic so the __dirname polyfill is set first.
    // @ts-ignore — sql.js has no bundled types for asm build
    const initSqlJs = (await import('sql.js/dist/sql-asm.js')).default;
    const SQL = await initSqlJs();

    // Fetch nodes.db via ASSETS binding (avoids self-fetch going through Worker routes)
    const baseUrl = new URL(requestUrl).origin;
    const response = await assets.fetch(new Request(`${baseUrl}/data/nodes.db`));

    if (!response.ok || response.headers.get('content-length') === '0') {
      return null; // nodes.db not available
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) return null;

    const db = new SQL.Database(new Uint8Array(buffer));
    const adapter = createSqlJsAdapter(db);
    const repository = new NodeRepository(adapter);
    const templateService = new TemplateService(adapter);
    const cache = new SimpleCache();

    cachedContext = { db: adapter, repository, templateService, cache };
    return cachedContext;
  } catch (err) {
    console.error('[nodes-db-loader] Failed to load nodes.db:', err);
    return null;
  }
}
