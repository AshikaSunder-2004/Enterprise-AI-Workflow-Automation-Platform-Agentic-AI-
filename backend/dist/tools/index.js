"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeTools = initializeTools;
const registry_1 = require("./registry");
const slack_1 = require("./connectors/slack");
const http_1 = require("./connectors/http");
const utility_1 = require("./connectors/utility");
const integrations_1 = require("./connectors/integrations");
const logger_1 = require("../observability/logger");
function initializeTools() {
    logger_1.logger.info('Initializing tool registry...');
    // Communication
    registry_1.toolRegistry.register(slack_1.slackSendMessageTool);
    registry_1.toolRegistry.register(slack_1.slackReadChannelTool);
    registry_1.toolRegistry.register(integrations_1.gmailSendTool);
    // Project Management
    registry_1.toolRegistry.register(integrations_1.jiraCreateIssueTool);
    // Generic
    registry_1.toolRegistry.register(http_1.httpRequestTool);
    // Utility
    registry_1.toolRegistry.register(utility_1.webSearchTool);
    registry_1.toolRegistry.register(utility_1.documentSummarizerTool);
    logger_1.logger.info(`Tool registry initialized with ${registry_1.toolRegistry.listTools().length} tools`);
}
//# sourceMappingURL=index.js.map