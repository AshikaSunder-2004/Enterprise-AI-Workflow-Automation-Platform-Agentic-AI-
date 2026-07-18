declare class AiwfWebSocketServer {
    private connections;
    private wss;
    attach(server: import('http').Server): void;
    broadcastToTenant(tenantId: string, data: object): void;
}
export declare const wss: AiwfWebSocketServer;
export {};
//# sourceMappingURL=websocket.d.ts.map