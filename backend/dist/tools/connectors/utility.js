"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentSummarizerTool = exports.webSearchTool = void 0;
const axios_1 = __importDefault(require("axios"));
exports.webSearchTool = {
    name: 'web_search',
    version: '1.0.0',
    description: 'Search the web and return a list of relevant results with titles, URLs, and snippets',
    category: 'utility',
    requiredScopes: ['web:search'],
    rateLimitPolicy: { requests: 30, windowMs: 60_000 },
    inputSchema: {
        type: 'object',
        required: ['query'],
        properties: {
            query: { type: 'string', description: 'Search query string' },
            numResults: { type: 'number', default: 5, description: 'Number of results to return (max 10)' },
        },
        additionalProperties: false,
    },
    outputSchema: {
        type: 'object',
        properties: {
            results: { type: 'array' },
        },
    },
    async execute(input, _ctx) {
        const { query, numResults = 5 } = input;
        const apiKey = process.env.SERPER_API_KEY;
        if (!apiKey) {
            // Mock search results for demo
            return {
                success: true,
                data: {
                    results: [
                        {
                            title: `Mock result 1 for: "${query}"`,
                            url: 'https://example.com/result-1',
                            snippet: `This is a simulated search result for the query "${query}". In production, configure SERPER_API_KEY.`,
                        },
                        {
                            title: `Mock result 2 for: "${query}"`,
                            url: 'https://example.com/result-2',
                            snippet: `Another simulated search result about "${query}".`,
                        },
                    ],
                    mock: true,
                },
            };
        }
        try {
            const response = await axios_1.default.post('https://google.serper.dev/search', { q: query, num: Math.min(numResults, 10) }, { headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' } });
            const results = (response.data.organic ?? []).map((r) => ({
                title: r.title,
                url: r.link,
                snippet: r.snippet,
            }));
            return { success: true, data: { results } };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    },
};
exports.documentSummarizerTool = {
    name: 'document_summarize',
    version: '1.0.0',
    description: 'Summarize a long piece of text or document content into a concise summary',
    category: 'utility',
    requiredScopes: ['llm:summarize'],
    rateLimitPolicy: { requests: 20, windowMs: 60_000 },
    inputSchema: {
        type: 'object',
        required: ['text'],
        properties: {
            text: { type: 'string', description: 'Text to summarize' },
            maxLength: { type: 'number', default: 200, description: 'Target summary length in words' },
            style: {
                type: 'string',
                enum: ['concise', 'detailed', 'bullet_points'],
                default: 'concise',
            },
        },
        additionalProperties: false,
    },
    outputSchema: {
        type: 'object',
        properties: {
            summary: { type: 'string' },
        },
    },
    async execute(input, _ctx) {
        const { text, maxLength = 200, style = 'concise' } = input;
        const { GoogleGenAI } = await Promise.resolve().then(() => __importStar(require('@google/genai')));
        const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const styleInstructions = {
            concise: `Summarize in ${maxLength} words or fewer.`,
            detailed: `Write a detailed summary in ${maxLength} words.`,
            bullet_points: `Summarize as bullet points (max ${Math.ceil(maxLength / 20)} points).`,
        }[style] ?? `Summarize in ${maxLength} words.`;
        try {
            const result = await genai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: `${styleInstructions}\n\nText to summarize:\n${text.slice(0, 50000)}`,
            });
            return { success: true, data: { summary: result.text } };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    },
};
//# sourceMappingURL=utility.js.map