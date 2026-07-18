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
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifier = void 0;
const logger_1 = require("../observability/logger");
class Notifier {
    async notify(payload) {
        logger_1.logger.info('Sending notification', { type: payload.type, runId: payload.runId });
        // In production, route to Slack/email based on tenant config
        // For now, log the notification (and support real Slack if configured)
        if (payload.type === 'human_task' && payload.prompt) {
            await this.notifySlack(payload);
        }
    }
    async notifySlack(payload) {
        const token = process.env.SLACK_BOT_TOKEN;
        const channel = process.env.SLACK_NOTIFICATION_CHANNEL;
        if (!token || !channel) {
            logger_1.logger.info('[MOCK] Human task notification', {
                taskId: payload.taskId,
                runId: payload.runId,
                prompt: payload.prompt,
            });
            return;
        }
        try {
            const axios = (await Promise.resolve().then(() => __importStar(require('axios')))).default;
            await axios.post('https://slack.com/api/chat.postMessage', {
                channel,
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `*🤖 Human Input Required*\n*Task:* ${payload.taskId}\n*Run:* ${payload.runId}\n\n${payload.prompt}`,
                        },
                    },
                    {
                        type: 'actions',
                        elements: [
                            {
                                type: 'button',
                                text: { type: 'plain_text', text: '✅ Approve' },
                                style: 'primary',
                                url: `${process.env.FRONTEND_URL}/human-tasks/${payload.taskId}`,
                            },
                        ],
                    },
                ],
            }, { headers: { Authorization: `Bearer ${token}` } });
        }
        catch (err) {
            logger_1.logger.error('Slack notification failed', { err });
        }
    }
}
exports.notifier = new Notifier();
//# sourceMappingURL=notifier.js.map