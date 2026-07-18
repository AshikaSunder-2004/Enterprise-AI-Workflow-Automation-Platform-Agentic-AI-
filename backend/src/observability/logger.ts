import winston from 'winston';
import { config } from '../config/env';

const { combine, timestamp, json, colorize, simple, errors } = winston.format;

// Custom format to mask secrets
const maskSecrets = winston.format((info) => {
  const str = JSON.stringify(info);
  const masked = str
    .replace(/"password[^"]*":"[^"]+"/gi, '"password":"[REDACTED]"')
    .replace(/"token[^"]*":"[^"]+"/gi, '"token":"[REDACTED]"')
    .replace(/"secret[^"]*":"[^"]+"/gi, '"secret":"[REDACTED]"')
    .replace(/"key[^"]*":"[^"]+"/gi, '"key":"[REDACTED]"')
    .replace(/"credentials[^"]*":"[^"]+"/gi, '"credentials":"[REDACTED]"');
  return JSON.parse(masked);
});

const logger = winston.createLogger({
  level: config.NODE_ENV === 'development' ? 'debug' : 'info',
  format: combine(
    errors({ stack: true }),
    timestamp(),
    maskSecrets(),
    json()
  ),
  defaultMeta: { service: 'aiwf-backend' },
  transports: [
    new winston.transports.Console({
      format: config.NODE_ENV === 'development'
        ? combine(colorize(), simple())
        : combine(maskSecrets(), json()),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

export { logger };

// Convenience helpers for correlated logging
export function runLogger(runId: string, tenantId: string) {
  return logger.child({ run_id: runId, tenant_id: tenantId });
}

export function traceLogger(runId: string, nodeId: string, tenantId: string) {
  return logger.child({ run_id: runId, node_id: nodeId, tenant_id: tenantId });
}
