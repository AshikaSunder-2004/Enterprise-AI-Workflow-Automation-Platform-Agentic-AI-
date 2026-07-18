import axios from 'axios';
import { Tool, ToolResult, ExecutionContext } from '../interface';

export const slackSendMessageTool: Tool = {
  name: 'slack_send_message',
  version: '1.0.0',
  description: 'Send a message to a Slack channel or user',
  category: 'communication',
  requiredScopes: ['chat:write'],
  rateLimitPolicy: { requests: 60, windowMs: 60_000 },
  inputSchema: {
    type: 'object',
    required: ['channel', 'text'],
    properties: {
      channel: {
        type: 'string',
        description: 'Slack channel ID (e.g. C01234567) or channel name (e.g. #general)',
      },
      text: { type: 'string', description: 'Message text (supports Slack mrkdwn formatting)' },
      blocks: {
        type: 'array',
        description: 'Optional Slack Block Kit blocks for rich messages',
      },
    },
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      messageId: { type: 'string' },
      channel: { type: 'string' },
      timestamp: { type: 'string' },
    },
  },
  async execute(input: unknown, ctx: ExecutionContext): Promise<ToolResult> {
    const { channel, text, blocks } = input as { channel: string; text: string; blocks?: unknown[] };
    const token = (ctx.connectorConfig?.slack_bot_token as string) ?? process.env.SLACK_BOT_TOKEN;

    if (!token) {
      // MOCK mode — return simulated response so the platform runs without credentials
      return {
        success: true,
        data: {
          messageId: `mock_${Date.now()}`,
          channel,
          timestamp: new Date().toISOString(),
          mock: true,
          sentText: text,
        },
      };
    }

    try {
      const response = await axios.post(
        'https://slack.com/api/chat.postMessage',
        { channel, text, blocks },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      if (!response.data.ok) {
        return { success: false, error: `Slack API error: ${response.data.error}` };
      }

      return {
        success: true,
        data: {
          messageId: response.data.ts,
          channel: response.data.channel,
          timestamp: response.data.ts,
        },
      };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};

export const slackReadChannelTool: Tool = {
  name: 'slack_read_channel',
  version: '1.0.0',
  description: 'Read recent messages from a Slack channel',
  category: 'communication',
  requiredScopes: ['channels:history'],
  rateLimitPolicy: { requests: 30, windowMs: 60_000 },
  inputSchema: {
    type: 'object',
    required: ['channel'],
    properties: {
      channel: { type: 'string', description: 'Channel ID to read from' },
      limit: { type: 'number', description: 'Number of messages to fetch (default: 10, max: 100)', default: 10 },
    },
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      messages: { type: 'array' },
    },
  },
  async execute(input: unknown, ctx: ExecutionContext): Promise<ToolResult> {
    const { channel, limit = 10 } = input as { channel: string; limit?: number };
    const token = (ctx.connectorConfig?.slack_bot_token as string) ?? process.env.SLACK_BOT_TOKEN;

    if (!token) {
      return {
        success: true,
        data: {
          messages: [
            { text: 'Mock message 1', user: 'U0001', ts: '1720000000.000001' },
            { text: 'Mock message 2', user: 'U0002', ts: '1720000001.000001' },
          ],
          mock: true,
        },
      };
    }

    try {
      const response = await axios.get('https://slack.com/api/conversations.history', {
        params: { channel, limit },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.data.ok) {
        return { success: false, error: `Slack API error: ${response.data.error}` };
      }

      return {
        success: true,
        data: { messages: response.data.messages },
      };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
