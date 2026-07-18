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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.app = void 0;
require("../config/env"); // Validate environment first
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_1 = require("../config/env");
const logger_1 = require("../observability/logger");
const tools_1 = require("../tools");
const websocket_1 = require("./websocket");
const client_1 = require("../db/client");
const auth_1 = __importDefault(require("./routes/auth"));
const workflows_1 = __importDefault(require("./routes/workflows"));
const runs_1 = __importDefault(require("./routes/runs"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const app = (0, express_1.default)();
exports.app = app;
const server = http_1.default.createServer(app);
exports.server = server;
// ─── Security Middleware ───────────────────────────────────────────────────
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false, // Handled by frontend
}));
app.use((0, cors_1.default)({
    origin: env_1.config.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));
// ─── Global Rate Limiting ──────────────────────────────────────────────────
app.use((0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
}));
// Stricter limit for auth endpoints
app.use('/api/auth', (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many authentication attempts' },
}));
// ─── Body Parsing ──────────────────────────────────────────────────────────
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// ─── Request Logging ───────────────────────────────────────────────────────
app.use((req, _res, next) => {
    logger_1.logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
    });
    next();
});
// ─── API Routes ────────────────────────────────────────────────────────────
app.use('/api/auth', auth_1.default);
app.use('/api/workflows', workflows_1.default);
app.use('/api/runs', runs_1.default);
app.use('/api/analytics', analytics_1.default);
// ─── Health Check ──────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
    try {
        await client_1.prisma.$queryRaw `SELECT 1`;
        res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    }
    catch {
        res.status(503).json({ status: 'unhealthy', timestamp: new Date().toISOString() });
    }
});
// ─── Inbound Webhook Trigger ───────────────────────────────────────────────
app.post('/webhook/:workflowId', async (req, res) => {
    const { workflowId } = req.params;
    const signature = req.headers['x-webhook-signature'];
    try {
        const { prisma: db } = await Promise.resolve().then(() => __importStar(require('../db/client')));
        const { runRepo, versionRepo } = await Promise.resolve().then(() => __importStar(require('../db/repositories')));
        const { enqueueWorkflowRun } = await Promise.resolve().then(() => __importStar(require('../queue/producer')));
        const workflow = await db.workflow.findFirst({
            where: { id: workflowId },
            include: { versions: { where: { status: 'PUBLISHED' }, orderBy: { version: 'desc' }, take: 1 } },
        });
        if (!workflow || !workflow.versions[0]) {
            res.status(404).json({ error: 'Workflow not found or not published' });
            return;
        }
        // TODO: Verify webhook signature for production use
        const run = await runRepo.create({
            workflow: { connect: { id: workflow.id } },
            version: { connect: { id: workflow.versions[0].id } },
            tenant: { connect: { id: workflow.tenantId } },
            status: 'PENDING',
            triggerPayload: req.body,
        });
        await enqueueWorkflowRun({
            runId: run.id,
            tenantId: workflow.tenantId,
            workflowId: workflow.id,
            versionId: workflow.versions[0].id,
        });
        res.status(202).json({ runId: run.id });
    }
    catch (err) {
        logger_1.logger.error('Webhook trigger error', { err });
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});
// ─── 404 Handler ──────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
});
// ─── Global Error Handler ─────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    logger_1.logger.error('Unhandled error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal server error' });
});
// ─── Start ────────────────────────────────────────────────────────────────
async function start() {
    (0, tools_1.initializeTools)();
    websocket_1.wss.attach(server);
    server.listen(env_1.config.PORT, () => {
        logger_1.logger.info(`🚀 AIWF Backend running on port ${env_1.config.PORT}`, {
            env: env_1.config.NODE_ENV,
            port: env_1.config.PORT,
        });
    });
}
start().catch((err) => {
    logger_1.logger.error('Server startup failed', { err });
    process.exit(1);
});
//# sourceMappingURL=server.js.map