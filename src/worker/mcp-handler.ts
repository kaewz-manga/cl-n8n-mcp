/**
 * Stateless MCP handler for Cloudflare Workers.
 *
 * Handles JSON-RPC 2.0 requests for the MCP protocol:
 * - initialize: Returns server capabilities
 * - notifications/initialized: Acknowledged
 * - tools/list: Returns available tools
 * - tools/call: Dispatches to tool handlers
 */
import { Hono } from 'hono';
import type { Env } from './env';
import { n8nDocumentationToolsFinal } from '../mcp/tools';
import { n8nManagementTools } from '../mcp/tools-n8n-manager';
import { makeToolsN8nFriendly } from '../mcp/tools-n8n-friendly';
import { dispatchToolCall } from '../mcp/handlers/tool-dispatcher';
import { getServerContext } from './nodes-db-loader';
import { validateApiKey, checkRateLimits, logApiUsage } from '../saas/services/api-key-service';
import { connectionsRepository } from '../saas/database/users-repository';
import { decrypt } from '../saas/services/encryption-service';
import { InstanceContext } from '../types/instance-context';
import { PROJECT_VERSION } from '../utils/version';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

const mcp = new Hono<{ Bindings: Env }>();

/**
 * POST /mcp — Main MCP endpoint
 * Authenticates via x-n8n-key (SaaS API key) or Authorization header
 */
mcp.post('/', async (c) => {
  const startTime = Date.now();
  let userId: string | undefined;
  let apiKeyId: string | null = null;
  let connectionId: string | null = null;
  let toolName = 'unknown';

  try {
    // --- Authentication ---
    const apiKeyHeader = c.req.header('x-n8n-key');
    const authHeader = c.req.header('Authorization');
    const authToken = apiKeyHeader || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);

    if (!authToken) {
      return c.json(jsonRpcError(null, -32000, 'Authentication required'), 401);
    }

    // Check if it's a SaaS API key (n2f_ prefix)
    if (authToken.startsWith('n2f_')) {
      const validation = await validateApiKey(authToken);
      if (!validation.valid) {
        return c.json(jsonRpcError(null, -32000, validation.error || 'Invalid API key'), 401);
      }
      userId = validation.userId;
      apiKeyId = validation.apiKey?.id || null;
      connectionId = validation.connectionId || null;

      // Check rate limits
      const rateLimitResult = await checkRateLimits(userId!);
      if (!rateLimitResult.allowed) {
        return c.json(jsonRpcError(null, -32000, rateLimitResult.error || 'Rate limited'), 429);
      }
    } else if (authToken === c.env.AUTH_TOKEN) {
      // Direct auth token — no SaaS user tracking
    } else {
      return c.json(jsonRpcError(null, -32000, 'Invalid authentication'), 401);
    }

    // --- Parse JSON-RPC ---
    const body = await c.req.json() as JsonRpcRequest;

    if (body.jsonrpc !== '2.0' || !body.method) {
      return c.json(jsonRpcError(body?.id ?? null, -32600, 'Invalid JSON-RPC request'), 400);
    }

    // --- Build instance context ---
    let instanceContext: InstanceContext | undefined;

    if (connectionId) {
      // Resolve n8n connection from SaaS DB
      const conn = await connectionsRepository.getById(connectionId);
      if (conn) {
        instanceContext = {
          n8nApiUrl: conn.n8n_url,
          n8nApiKey: decrypt(conn.n8n_api_key_encrypted),
          instanceId: connectionId,
        };
      }
    } else {
      // Fall back to request headers (multi-tenant mode)
      const n8nUrl = c.req.header('x-n8n-url');
      const n8nKey = c.req.header('x-n8n-key');
      if (n8nUrl && n8nKey && !n8nKey.startsWith('n2f_')) {
        instanceContext = {
          n8nApiUrl: n8nUrl,
          n8nApiKey: n8nKey,
          instanceId: c.req.header('x-instance-id') || undefined,
        };
      }
    }

    // --- Dispatch method ---
    const result = await handleMethod(body, c.env.ASSETS, c.req.url, c.env, instanceContext);
    toolName = body.method;

    // Log usage if SaaS user
    if (userId) {
      c.executionCtx.waitUntil(
        logApiUsage(userId, apiKeyId, connectionId, toolName, 'success', Date.now() - startTime)
      );
    }

    return c.json(result);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';

    if (userId) {
      c.executionCtx.waitUntil(
        logApiUsage(userId, apiKeyId, connectionId, toolName, 'error', Date.now() - startTime, message)
      );
    }

    return c.json(jsonRpcError(null, -32603, message), 500);
  }
});

async function handleMethod(
  request: JsonRpcRequest,
  assets: { fetch: (request: Request) => Promise<Response> },
  requestUrl: string,
  env: Env,
  instanceContext?: InstanceContext
): Promise<JsonRpcResponse> {
  const id = request.id ?? null;

  switch (request.method) {
    case 'initialize':
      return jsonRpcResult(id, {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: { listChanged: false },
        },
        serverInfo: {
          name: 'n8n-mcp',
          version: PROJECT_VERSION || '2.33.2',
        },
      });

    case 'notifications/initialized':
      // Notification — no response needed for JSON-RPC notifications (no id)
      return jsonRpcResult(id, {});

    case 'tools/list': {
      // Merge documentation + management tools
      // Include management tools when: instance configured OR multi-tenant mode (runtime checks handle auth)
      const allTools = [...n8nDocumentationToolsFinal];
      const hasInstanceConfig = !!(instanceContext?.n8nApiUrl && instanceContext?.n8nApiKey);
      const isMultiTenant = env?.ENABLE_MULTI_TENANT === 'true';

      if (hasInstanceConfig || isMultiTenant) {
        allTools.push(...n8nManagementTools);
      }

      // Apply n8n-friendly descriptions
      const friendlyTools = makeToolsN8nFriendly(allTools);

      return jsonRpcResult(id, {
        tools: friendlyTools.map(t => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
          ...(t.annotations ? { annotations: t.annotations } : {}),
        })),
      });
    }

    case 'tools/call': {
      const params = request.params || {};
      const toolName = params.name as string;
      const toolArgs = (params.arguments || {}) as Record<string, unknown>;

      if (!toolName) {
        return jsonRpcError(id, -32602, 'Missing tool name');
      }

      // Load server context (nodes.db via sql.js from ASSETS binding)
      const serverContext = await getServerContext(assets, requestUrl);

      if (!serverContext) {
        return jsonRpcError(id, -32603,
          'Node database not available. Ensure nodes.db is built and deployed as a static asset.'
        );
      }

      // Inject instance context
      serverContext.instanceContext = instanceContext;

      const result = await dispatchToolCall(toolName, toolArgs, serverContext);

      return jsonRpcResult(id, {
        content: Array.isArray(result)
          ? result
          : [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }],
      });
    }

    default:
      return jsonRpcError(id, -32601, `Method not found: ${request.method}`);
  }
}

function jsonRpcResult(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result };
}

function jsonRpcError(id: string | number | null, code: number, message: string, data?: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message, ...(data ? { data } : {}) } };
}

export default mcp;
