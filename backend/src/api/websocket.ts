import { WebSocketServer, WebSocket } from 'ws';
import { verifyAccessToken } from '../auth/jwt';
import { logger } from '../observability/logger';

interface TenantConnection {
  ws: WebSocket;
  tenantId: string;
}

class AiwfWebSocketServer {
  private connections: Map<string, TenantConnection> = new Map();
  private wss: WebSocketServer | null = null;

  attach(server: import('http').Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws, req) => {
      // Auth via query param token
      const url = new URL(req.url ?? '', `http://localhost`);
      const token = url.searchParams.get('token');

      if (!token) {
        ws.close(4001, 'Unauthorized');
        return;
      }

      try {
        const payload = verifyAccessToken(token);
        const connId = `${payload.tenantId}:${Date.now()}:${Math.random()}`;
        this.connections.set(connId, { ws, tenantId: payload.tenantId });

        logger.info('WebSocket connected', { tenantId: payload.tenantId });

        ws.on('close', () => {
          this.connections.delete(connId);
          logger.info('WebSocket disconnected', { tenantId: payload.tenantId });
        });

        ws.on('error', (err) => {
          logger.warn('WebSocket error', { err: err.message });
          this.connections.delete(connId);
        });

        // Send welcome ping
        ws.send(JSON.stringify({ type: 'connected', message: 'Live updates active' }));
      } catch {
        ws.close(4001, 'Invalid token');
      }
    });
  }

  broadcastToTenant(tenantId: string, data: object): void {
    const message = JSON.stringify(data);
    let sent = 0;

    for (const [, conn] of this.connections) {
      if (conn.tenantId === tenantId && conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.send(message);
        sent++;
      }
    }

    if (sent > 0) {
      logger.debug('WebSocket broadcast', { tenantId, recipients: sent });
    }
  }
}

export const wss = new AiwfWebSocketServer();
