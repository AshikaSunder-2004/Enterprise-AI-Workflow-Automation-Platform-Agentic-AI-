import { Router, Request, Response } from 'express';
import { authenticate } from '../../auth/middleware';
import { tokenUsageRepo } from '../../db/repositories';
import { toolRegistry } from '../../tools/registry';
import { runRepo } from '../../db/repositories';
import { prisma } from '../../db/client';

const router = Router();
router.use(authenticate);

// ─── Cost Summary ──────────────────────────────────────────────────────────

router.get('/cost', async (req: Request, res: Response): Promise<void> => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const summary = await tokenUsageRepo.summaryByTenant(req.tenantId!, days);

    const totalCost = summary.reduce((acc, s) => acc + Number(s._sum.costUsd ?? 0), 0);
    const totalTokens = summary.reduce((acc, s) => acc + Number(s._sum.totalTokens ?? 0), 0);

    res.json({ summary, totalCost, totalTokens, days });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cost summary' });
  }
});

// ─── Run Statistics ────────────────────────────────────────────────────────

router.get('/runs/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await prisma.workflowRun.groupBy({
      by: ['status'],
      where: { tenantId: req.tenantId! },
      _count: { id: true },
    });
    res.json({ stats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch run stats' });
  }
});

// ─── Available Tools ───────────────────────────────────────────────────────

router.get('/tools', async (req: Request, res: Response): Promise<void> => {
  const tools = toolRegistry.listTools().map((t) => ({
    name: t.name,
    version: t.version,
    description: t.description,
    category: t.category,
    requiredScopes: t.requiredScopes,
    inputSchema: t.inputSchema,
  }));
  res.json({ tools });
});

// ─── Daily Run + Cost Trend ────────────────────────────────────────────────

router.get('/trends', async (req: Request, res: Response): Promise<void> => {
  try {
    const days = parseInt(req.query.days as string) || 14;
    const since = new Date(Date.now() - days * 86400000);

    const [runs, costs] = await Promise.all([
      prisma.workflowRun.findMany({
        where: { tenantId: req.tenantId!, startedAt: { gte: since } },
        select: { startedAt: true, status: true },
      }),
      prisma.tokenUsage.findMany({
        where: { tenantId: req.tenantId!, createdAt: { gte: since } },
        select: { createdAt: true, costUsd: true, totalTokens: true },
      }),
    ]);

    res.json({ runs, costs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

export default router;
