import axios from 'axios';
import { Tool, ToolResult, ExecutionContext } from '../interface';

export const gmailSendTool: Tool = {
  name: 'gmail_send',
  version: '1.0.0',
  description: 'Send an email via Gmail',
  category: 'communication',
  requiredScopes: ['gmail:send'],
  rateLimitPolicy: { requests: 30, windowMs: 60_000 },
  inputSchema: {
    type: 'object',
    required: ['to', 'subject', 'body'],
    properties: {
      to: { type: 'string', description: 'Recipient email address' },
      subject: { type: 'string', description: 'Email subject line' },
      body: { type: 'string', description: 'Email body (plain text or HTML)' },
      cc: { type: 'string', description: 'CC recipient email address' },
      isHtml: { type: 'boolean', default: false, description: 'Whether body is HTML' },
    },
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      messageId: { type: 'string' },
      threadId: { type: 'string' },
    },
  },
  async execute(input: unknown, ctx: ExecutionContext): Promise<ToolResult> {
    const { to, subject, body, cc, isHtml = false } = input as {
      to: string;
      subject: string;
      body: string;
      cc?: string;
      isHtml?: boolean;
    };

    const token = ctx.connectorConfig?.gmail_access_token as string | undefined;

    if (!token) {
      return {
        success: true,
        data: {
          messageId: `mock_gmail_${Date.now()}`,
          threadId: `mock_thread_${Date.now()}`,
          mock: true,
          to,
          subject,
        },
      };
    }

    try {
      // Build RFC 2822 message
      const contentType = isHtml ? 'text/html' : 'text/plain';
      const headers = [
        `To: ${to}`,
        ...(cc ? [`Cc: ${cc}`] : []),
        `Subject: ${subject}`,
        `Content-Type: ${contentType}; charset=utf-8`,
        '',
        body,
      ].join('\r\n');

      const encoded = Buffer.from(headers)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await axios.post(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        { raw: encoded },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      return {
        success: true,
        data: { messageId: response.data.id, threadId: response.data.threadId },
      };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};

export const jiraCreateIssueTool: Tool = {
  name: 'jira_create_issue',
  version: '1.0.0',
  description: 'Create a new issue in Jira',
  category: 'project_management',
  requiredScopes: ['jira:write'],
  rateLimitPolicy: { requests: 30, windowMs: 60_000 },
  inputSchema: {
    type: 'object',
    required: ['projectKey', 'summary', 'issueType'],
    properties: {
      projectKey: { type: 'string', description: 'Jira project key (e.g. DEV)' },
      summary: { type: 'string', description: 'Issue title/summary' },
      description: { type: 'string', description: 'Issue description' },
      issueType: {
        type: 'string',
        enum: ['Bug', 'Story', 'Task', 'Epic'],
        description: 'Issue type',
      },
      priority: {
        type: 'string',
        enum: ['Lowest', 'Low', 'Medium', 'High', 'Highest'],
        description: 'Issue priority',
      },
      assignee: { type: 'string', description: 'Assignee account ID' },
      labels: {
        type: 'array',
        items: { type: 'string' },
        description: 'Issue labels',
      },
    },
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      issueId: { type: 'string' },
      issueKey: { type: 'string' },
      url: { type: 'string' },
    },
  },
  async execute(input: unknown, ctx: ExecutionContext): Promise<ToolResult> {
    const { projectKey, summary, description, issueType, priority, assignee, labels } =
      input as {
        projectKey: string;
        summary: string;
        description?: string;
        issueType: string;
        priority?: string;
        assignee?: string;
        labels?: string[];
      };

    const apiToken = ctx.connectorConfig?.jira_api_token as string | undefined;
    const jiraEmail = ctx.connectorConfig?.jira_email as string | undefined;
    const jiraHost = (ctx.connectorConfig?.jira_host as string) ?? process.env.JIRA_HOST;

    if (!apiToken || !jiraEmail || !jiraHost) {
      return {
        success: true,
        data: {
          issueId: `MOCK-${Date.now()}`,
          issueKey: `${projectKey}-999`,
          url: `https://mock.atlassian.net/browse/${projectKey}-999`,
          mock: true,
        },
      };
    }

    try {
      const response = await axios.post(
        `${jiraHost}/rest/api/3/issue`,
        {
          fields: {
            project: { key: projectKey },
            summary,
            description: description
              ? { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }] }
              : undefined,
            issuetype: { name: issueType },
            priority: priority ? { name: priority } : undefined,
            assignee: assignee ? { accountId: assignee } : undefined,
            labels,
          },
        },
        {
          auth: { username: jiraEmail, password: apiToken },
          headers: { 'Content-Type': 'application/json' },
        }
      );

      return {
        success: true,
        data: {
          issueId: response.data.id,
          issueKey: response.data.key,
          url: `${jiraHost}/browse/${response.data.key}`,
        },
      };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
