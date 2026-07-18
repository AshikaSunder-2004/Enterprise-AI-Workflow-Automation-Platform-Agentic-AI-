"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wss = void 0;
const ws_1 = require("ws");
const jwt_1 = require("../auth/jwt");
const logger_1 = require("../observability/logger");
class AiwfWebSocketServer {
    connections = new Map();
    wss = null;
    attach(server) {
        this.wss = new ws_1.WebSocketServer({ server, path: '/ws' });
        this.wss.on('connection', (ws, req) => {
            // Auth via query param token
            const url = new URL(req.url ?? '', `http://localhost`);
            const token = url.searchParams.get('token');
            if (!token) {
                ws.close(4001, 'Unauthorized');
                return;
            }
            try {
                const payload = (0, jwt_1.verifyAccessToken)(token);
                const connId = `${payload.tenantId}:${Date.now()}:${Math.random()}`;
                this.connections.set(connId, { ws, tenantId: payload.tenantId });
                logger_1.logger.info('WebSocket connected', { tenantId: payload.tenantId });
                ws.on('close', () => {
                    this.connections.delete(connId);
                    logger_1.logger.info('WebSocket disconnected', { tenantId: payload.tenantId });
                });
                ws.on('error', (err) => {
                    logger_1.logger.warn('WebSocket error', { err: err.message });
                    this.connections.delete(connId);
                });
                // Send welcome ping
                ws.send(JSON.stringify({ type: 'connected', message: 'Live updates active' }));
            }
            catch {
                ws.close(4001, 'Invalid token');
            }
        });
    }
    broadcastToTenant(tenantId, data) {
        const message = JSON.stringify(data);
        let sent = 0;
        for (const [, conn] of this.connections) {
            if (conn.tenantId === tenantId && conn.ws.readyState === ws_1.WebSocket.OPEN) {
                conn.ws.send(message);
                sent++;
            }
        }
        if (sent > 0) {
            logger_1.logger.debug('WebSocket broadcast', { tenantId, recipients: sent });
        }
    }
}
exports.wss = new AiwfWebSocketServer();
//# sourceMappingURL=websocket.js.map