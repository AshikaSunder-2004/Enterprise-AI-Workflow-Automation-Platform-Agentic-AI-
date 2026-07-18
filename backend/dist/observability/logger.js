"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.runLogger = runLogger;
exports.traceLogger = traceLogger;
const winston_1 = __importDefault(require("winston"));
const env_1 = require("../config/env");
const { combine, timestamp, json, colorize, simple, errors } = winston_1.default.format;
// Custom format to mask secrets
const maskSecrets = winston_1.default.format((info) => {
    const str = JSON.stringify(info);
    const masked = str
        .replace(/"password[^"]*":"[^"]+"/gi, '"password":"[REDACTED]"')
        .replace(/"token[^"]*":"[^"]+"/gi, '"token":"[REDACTED]"')
        .replace(/"secret[^"]*":"[^"]+"/gi, '"secret":"[REDACTED]"')
        .replace(/"key[^"]*":"[^"]+"/gi, '"key":"[REDACTED]"')
        .replace(/"credentials[^"]*":"[^"]+"/gi, '"credentials":"[REDACTED]"');
    return JSON.parse(masked);
});
const logger = winston_1.default.createLogger({
    level: env_1.config.NODE_ENV === 'development' ? 'debug' : 'info',
    format: combine(errors({ stack: true }), timestamp(), maskSecrets(), json()),
    defaultMeta: { service: 'aiwf-backend' },
    transports: [
        new winston_1.default.transports.Console({
            format: env_1.config.NODE_ENV === 'development'
                ? combine(colorize(), simple())
                : combine(maskSecrets(), json()),
        }),
        new winston_1.default.transports.File({
            filename: 'logs/error.log',
            level: 'error',
        }),
        new winston_1.default.transports.File({
            filename: 'logs/combined.log',
        }),
    ],
});
exports.logger = logger;
// Convenience helpers for correlated logging
function runLogger(runId, tenantId) {
    return logger.child({ run_id: runId, tenant_id: tenantId });
}
function traceLogger(runId, nodeId, tenantId) {
    return logger.child({ run_id: runId, node_id: nodeId, tenant_id: tenantId });
}
//# sourceMappingURL=logger.js.map