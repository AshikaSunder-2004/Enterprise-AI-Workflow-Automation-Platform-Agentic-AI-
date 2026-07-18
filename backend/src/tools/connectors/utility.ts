import axios from 'axios';
import { Tool, ToolResult, ExecutionContext } from '../interface';

export const webSearchTool: Tool = {
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
  async execute(input: unknown, _ctx: ExecutionContext): Promise<ToolResult> {
    const { query, numResults = 5 } = input as { query: string; numResults?: number };
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
      const response = await axios.post(
        'https://google.serper.dev/search',
        { q: query, num: Math.min(numResults, 10) },
        { headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' } }
      );

      const results = (response.data.organic ?? []).map((r: {
        title: string;
        link: string;
        snippet: string;
      }) => ({
        title: r.title,
        url: r.link,
        snippet: r.snippet,
      }));

      return { success: true, data: { results } };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};

export const documentSummarizerTool: Tool = {
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
  async execute(input: unknown, _ctx: ExecutionContext): Promise<ToolResult> {
    const { text, maxLength = 200, style = 'concise' } = input as {
      text: string;
      maxLength?: number;
      style?: string;
    };

    const { GoogleGenAI } = await import('@google/genai');
    const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

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
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
