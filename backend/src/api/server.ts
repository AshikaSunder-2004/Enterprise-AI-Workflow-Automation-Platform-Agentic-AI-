import '../config/env'; // Validate environment first
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { config } from '../config/env';
import { logger } from '../observability/logger';
import { initializeTools } from '../tools';
import { wss } from './websocket';
import { prisma } from '../db/client';

import authRoutes from './routes/auth';
import workflowRoutes from './routes/workflows';
import runRoutes from './routes/runs';
import analyticsRoutes from './routes/analytics';

const app = express();
const server = http.createServer(app);

// ─── Security Middleware ───────────────────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: false, // Handled by frontend
}));

app.use(cors({
  origin: config.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// ─── Global Rate Limiting ──────────────────────────────────────────────────

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
  })
);

// Stricter limit for auth endpoints
app.use(
  '/api/auth',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many authentication attempts' },
  })
);

// ─── Body Parsing ──────────────────────────────────────────────────────────

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Request Logging ───────────────────────────────────────────────────────

app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// ─── API Routes ────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/runs', runRoutes);
app.use('/api/analytics', analyticsRoutes);

// ─── Health Check ──────────────────────────────────────────────────────────

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'unhealthy', timestamp: new Date().toISOString() });
  }
});

// ─── Inbound Webhook Trigger ───────────────────────────────────────────────

app.post('/webhook/:workflowId', async (req, res) => {
  const { workflowId } = req.params;
  const signature = req.headers['x-webhook-signature'] as string;

  try {
    const { prisma: db } = await import('../db/client');
    const { runRepo, versionRepo } = await import('../db/repositories');
    const { enqueueWorkflowRun } = await import('../queue/producer');

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
  } catch (err) {
    logger.error('Webhook trigger error', { err });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ─── 404 Handler ──────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────

async function start() {
  initializeTools();
  wss.attach(server);

  server.listen(config.PORT, () => {
    logger.info(`🚀 AIWF Backend running on port ${config.PORT}`, {
      env: config.NODE_ENV,
      port: config.PORT,
    });
  });
}

start().catch((err) => {
  logger.error('Server startup failed', { err });
  process.exit(1);
});

export { app, server };
