import { Router, Request, Response } from 'express';
import { authenticate, requireApprover } from '../../auth/middleware';
import { runRepo, eventRepo, humanTaskRepo } from '../../db/repositories';
import { enqueueResumeRun } from '../../queue/producer';
import { logger } from '../../observability/logger';

const router = Router();
router.use(authenticate);

// ─── List Runs ─────────────────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, workflowId } = req.query as { status?: string; workflowId?: string };
    const runs = await runRepo.findByTenant(req.tenantId!, {
      status: status as any,
      workflowId,
    });
    res.json({ runs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch runs' });
  }
});

// ─── Get Run ───────────────────────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const run = await runRepo.findById(req.params.id as string, req.tenantId!);
    if (!run) { res.status(404).json({ error: 'Run not found' }); return; }
    res.json({ run });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch run' });
  }
});

// ─── Get Run Trace (audit trail) ───────────────────────────────────────────

router.get('/:id/trace', async (req: Request, res: Response): Promise<void> => {
  try {
    const run = await runRepo.findById(req.params.id as string, req.tenantId!);
    if (!run) { res.status(404).json({ error: 'Run not found' }); return; }

    const events = await eventRepo.findByRun(req.params.id as string);
    res.json({ runId: req.params.id, events });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch run trace' });
  }
});

// ─── Cancel Run ────────────────────────────────────────────────────────────

router.post('/:id/cancel', requireApprover, async (req: Request, res: Response): Promise<void> => {
  try {
    const run = await runRepo.findById(req.params.id as string, req.tenantId!);
    if (!run) { res.status(404).json({ error: 'Run not found' }); return; }
    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(run.status)) {
      res.status(400).json({ error: 'Run is already in a terminal state' });
      return;
    }
    await runRepo.updateStatus(req.params.id as string, 'CANCELLED');
    res.json({ message: 'Run cancelled' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel run' });
  }
});

// ─── Human Tasks ───────────────────────────────────────────────────────────

router.get('/human-tasks/pending', async (req: Request, res: Response): Promise<void> => {
  try {
    const tasks = await humanTaskRepo.findPending(req.tenantId!, req.user?.sub);
    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch human tasks' });
  }
});

router.post(
  '/human-tasks/:taskId/approve',
  requireApprover,
  async (req: Request, res: Response): Promise<void> => {
    const { taskId } = req.params;
    const { input } = req.body;

    try {
      const tasks = await humanTaskRepo.findByRun(''); // Fetch by taskId
      // Find the task directly
      const { prisma } = await import('../../db/client');
      const task = await prisma.humanTask.findUnique({ where: { id: taskId as string } });

      if (!task) { res.status(404).json({ error: 'Task not found' }); return; }

      await humanTaskRepo.resolve(taskId as string, 'APPROVED', { decision: 'approved', input });

      await enqueueResumeRun({
        runId: task.runId,
        tenantId: req.tenantId!,
        humanTaskId: taskId as string,
        decision: 'approved',
        input: input ?? { approved: true },
      });

      res.json({ message: 'Task approved, run resuming' });
    } catch (err) {
      logger.error('Approve task error', { err });
      res.status(500).json({ error: 'Failed to approve task' });
    }
  }
);

router.post(
  '/human-tasks/:taskId/reject',
  requireApprover,
  async (req: Request, res: Response): Promise<void> => {
    const { taskId } = req.params;
    const { reason } = req.body;

    try {
      const { prisma } = await import('../../db/client');
      const task = await prisma.humanTask.findUnique({ where: { id: taskId as string } });
      if (!task) { res.status(404).json({ error: 'Task not found' }); return; }

      await humanTaskRepo.resolve(taskId as string, 'REJECTED', { decision: 'rejected', reason });

      await enqueueResumeRun({
        runId: task.runId,
        tenantId: req.tenantId!,
        humanTaskId: taskId as string,
        decision: 'rejected',
        input: { rejected: true, reason },
      });

      res.json({ message: 'Task rejected, run will be marked as failed' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to reject task' });
    }
  }
);

export default router;
