import winston from 'winston';
declare const logger: winston.Logger;
export { logger };
export declare function runLogger(runId: string, tenantId: string): winston.Logger;
export declare function traceLogger(runId: string, nodeId: string, tenantId: string): winston.Logger;
//# sourceMappingURL=logger.d.ts.map