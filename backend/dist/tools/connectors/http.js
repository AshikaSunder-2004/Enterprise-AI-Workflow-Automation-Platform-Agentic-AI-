"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpRequestTool = void 0;
const axios_1 = __importDefault(require("axios"));
exports.httpRequestTool = {
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
    async execute(input, _ctx) {
        const { url, method, headers = {}, body, params, timeoutMs = 10000, } = input;
        // Security: block internal/private IPs
        const blocked = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.replace(/^https?:\/\//, ''));
        if (blocked) {
            return { success: false, error: 'Requests to private/internal addresses are not allowed' };
        }
        try {
            const response = await (0, axios_1.default)({
                url,
                method: method,
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
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    },
};
//# sourceMappingURL=http.js.map