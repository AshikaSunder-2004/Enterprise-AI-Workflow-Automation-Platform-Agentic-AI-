import { toolRegistry } from '../../../src/tools/registry';
import { slackSendMessageTool } from '../../../src/tools/connectors/slack';
import { httpRequestTool } from '../../../src/tools/connectors/http';
import { webSearchTool } from '../../../src/tools/connectors/utility';

describe('Tool Registry', () => {
  beforeAll(() => {
    toolRegistry.register(slackSendMessageTool);
    toolRegistry.register(httpRequestTool);
    toolRegistry.register(webSearchTool);
  });

  test('should register and retrieve tools', () => {
    const tool = toolRegistry.getTool('slack_send_message', 'test-tenant');
    expect(tool).toBeDefined();
    expect(tool!.name).toBe('slack_send_message');
  });

  test('should validate valid input successfully', () => {
    const error = toolRegistry.validateInput('slack_send_message', {
      channel: '#general',
      text: 'Hello world',
    });
    expect(error).toBeNull();
  });

  test('should reject invalid input', () => {
    const error = toolRegistry.validateInput('slack_send_message', {
      channel: '#general',
      // missing required 'text' field
    });
    expect(error).not.toBeNull();
  });

  test('should return tool list', () => {
    const tools = toolRegistry.listTools();
    expect(tools.length).toBeGreaterThanOrEqual(3);
  });

  test('should filter tools by category', () => {
    const utilityTools = toolRegistry.listTools({ category: 'utility' });
    expect(utilityTools.every((t) => t.category === 'utility')).toBe(true);
  });
});

describe('Slack Tool', () => {
  test('should return mock response when no token configured', async () => {
    const result = await slackSendMessageTool.execute(
      { channel: '#test', text: 'Hello' },
      { runId: 'test-run', tenantId: 'test-tenant', idempotencyKey: 'test-key' }
    );
    expect(result.success).toBe(true);
    expect((result.data as { mock?: boolean }).mock).toBe(true);
  });
});

describe('HTTP Tool', () => {
  test('should block private/internal IP addresses', async () => {
    const result = await httpRequestTool.execute(
      { url: 'http://localhost:5432/admin', method: 'GET' },
      { runId: 'test-run', tenantId: 'test-tenant', idempotencyKey: 'test-key' }
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('private/internal');
  });

  test('should make external HTTP requests', async () => {
    const result = await httpRequestTool.execute(
      { url: 'https://httpbin.org/get', method: 'GET' },
      { runId: 'test-run', tenantId: 'test-tenant', idempotencyKey: 'test-key' }
    );
    // Note: May fail in offline environments
    if (result.success) {
      expect((result.data as { status: number }).status).toBe(200);
    }
  });
});

describe('Web Search Tool', () => {
  test('should return mock results when SERPER_API_KEY not set', async () => {
    delete process.env.SERPER_API_KEY;
    const result = await webSearchTool.execute(
      { query: 'test query', numResults: 3 },
      { runId: 'test-run', tenantId: 'test-tenant', idempotencyKey: 'test-key' }
    );
    expect(result.success).toBe(true);
    expect((result.data as { mock?: boolean }).mock).toBe(true);
    expect((result.data as { results: unknown[] }).results.length).toBeGreaterThan(0);
  });
});
