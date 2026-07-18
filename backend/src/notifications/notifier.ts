import { logger } from '../observability/logger';

interface NotifyPayload {
  type: 'human_task' | 'run_failed' | 'run_completed';
  taskId?: string;
  runId: string;
  tenantId: string;
  prompt?: string;
  assignedTo?: string;
  message?: string;
}

class Notifier {
  async notify(payload: NotifyPayload): Promise<void> {
    logger.info('Sending notification', { type: payload.type, runId: payload.runId });

    // In production, route to Slack/email based on tenant config
    // For now, log the notification (and support real Slack if configured)
    if (payload.type === 'human_task' && payload.prompt) {
      await this.notifySlack(payload);
    }
  }

  private async notifySlack(payload: NotifyPayload): Promise<void> {
    const token = process.env.SLACK_BOT_TOKEN;
    const channel = process.env.SLACK_NOTIFICATION_CHANNEL;

    if (!token || !channel) {
      logger.info('[MOCK] Human task notification', {
        taskId: payload.taskId,
        runId: payload.runId,
        prompt: payload.prompt,
      });
      return;
    }

    try {
      const axios = (await import('axios')).default;
      await axios.post(
        'https://slack.com/api/chat.postMessage',
        {
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
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      logger.error('Slack notification failed', { err });
    }
  }
}

export const notifier = new Notifier();
