import { toolRegistry } from './registry';
import { slackSendMessageTool, slackReadChannelTool } from './connectors/slack';
import { httpRequestTool } from './connectors/http';
import { webSearchTool, documentSummarizerTool } from './connectors/utility';
import { gmailSendTool, jiraCreateIssueTool } from './connectors/integrations';
import { logger } from '../observability/logger';

export function initializeTools(): void {
  logger.info('Initializing tool registry...');

  // Communication
  toolRegistry.register(slackSendMessageTool);
  toolRegistry.register(slackReadChannelTool);
  toolRegistry.register(gmailSendTool);

  // Project Management
  toolRegistry.register(jiraCreateIssueTool);

  // Generic
  toolRegistry.register(httpRequestTool);

  // Utility
  toolRegistry.register(webSearchTool);
  toolRegistry.register(documentSummarizerTool);

  logger.info(`Tool registry initialized with ${toolRegistry.listTools().length} tools`);
}
