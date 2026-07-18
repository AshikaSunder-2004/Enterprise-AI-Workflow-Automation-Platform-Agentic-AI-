import axios from 'axios';
import { Tool, ToolResult, ExecutionContext } from '../interface';

export const httpRequestTool: Tool = {
  name: 'http_request',
  version: '1.0.0',
  description: 'Make an HTTP request to any REST API endpoint',
  category: 'generic',
  requiredScopes: ['http:request'],
  rateLimitPolicy: { requests: 100, windowMs: 60_000 },
  inputSchema: {
    type: 'object',
    required: ['url', 'method'],
    properties: {
      url: { type: 'string', format: 'uri', description: 'The target URL' },
      method: {
        type: 'string',
        enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        description: 'HTTP method',
      },
      headers: {
        type: 'object',
        additionalProperties: { type: 'string' },
        description: 'Request headers as key-value pairs',
      },
      body: {
        description: 'Request body (for POST/PUT/PATCH)',
      },
      params: {
        type: 'object',
        additionalProperties: { type: 'string' },
        description: 'URL query parameters',
      },
      timeoutMs: {
        type: 'number',
        default: 10000,
        description: 'Request timeout in milliseconds',
      },
    },
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      status: { type: 'number' },
      headers: { type: 'object' },
      data: {},
    },
  },
  async execute(input: unknown, _ctx: ExecutionContext): Promise<ToolResult> {
    const {
      url,
      method,
      headers = {},
      body,
      params,
      timeoutMs = 10000,
    } = input as {
      url: string;
      method: string;
      headers?: Record<string, string>;
      body?: unknown;
      params?: Record<string, string>;
      timeoutMs?: number;
    };

    // Security: block internal/private IPs
    const blocked = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(
      url.replace(/^https?:\/\//, '')
    );
    if (blocked) {
      return { success: false, error: 'Requests to private/internal addresses are not allowed' };
    }

    try {
      const response = await axios({
        url,
        method: method as 'GET',
        headers,
        data: body,
        params,
        timeout: timeoutMs,
        maxRedirects: 3,
        validateStatus: () => true, // Don't throw on 4xx/5xx
      });

      return {
        success: true,
        data: {
          status: response.status,
          headers: response.headers,
          data: response.data,
        },
      };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
