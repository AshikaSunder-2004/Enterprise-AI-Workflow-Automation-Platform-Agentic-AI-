import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticate, requireEditor } from '../../auth/middleware';
import { workflowRepo, versionRepo, runRepo } from '../../db/repositories';
import { validateWorkflowDefinition } from '../../engine/dag-validator';
import { enqueueWorkflowRun } from '../../queue/producer';
import { prisma } from '../../db/client';
import { logger } from '../../observability/logger';
import { v4 as uuid } from 'uuid';
import { WorkflowDefinition } from '../../engine/types';

const router = Router();
router.use(authenticate);

// ─── List Workflows ────────────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const workflows = await workflowRepo.findByTenant(req.tenantId!);
    res.json({ workflows });
  } catch (err) {
    logger.error('List workflows error', { err });
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

// ─── Get Workflow ──────────────────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const workflow = await workflowRepo.findById(req.params.id as string, req.tenantId!);
    if (!workflow) { res.status(404).json({ error: 'Workflow not found' }); return; }
    res.json({ workflow });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

// ─── Create Workflow ───────────────────────────────────────────────────────

router.post(
  '/',
  requireEditor,
  [
    body('name').isLength({ min: 1, max: 200 }).trim(),
    body('description').optional().isString(),
    body('triggerType').optional().isIn(['MANUAL', 'SCHEDULE', 'WEBHOOK', 'WORKFLOW_OUTPUT']),
    body('definition').isObject(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    const { name, description, triggerType = 'MANUAL', triggerConfig, definition } = req.body;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const workflow = await tx.workflow.create({
          data: {
            tenantId: req.tenantId!,
            name,
            description,
            triggerType,
            triggerConfig,
          },
        });

        const version = await tx.workflowVersion.create({
          data: {
            workflowId: workflow.id,
            version: 1,
            definition,
            status: 'DRAFT',
          },
        });

        await tx.workflow.update({
          where: { id: workflow.id },
          data: { currentVersionId: version.id },
        });

        return { workflow, version };
      });

      res.status(201).json({ workflow: result.workflow, version: result.version });
    } catch (err) {
      logger.error('Create workflow error', { err });
      res.status(500).json({ error: 'Failed to create workflow' });
    }
  }
);

// ─── Update Workflow (creates new version) ─────────────────────────────────

router.put(
  '/:id',
  requireEditor,
  [body('definition').optional().isObject(), body('name').optional().isString()],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    const { name, description, definition } = req.body;

    try {
      const workflow = await workflowRepo.findById(req.params.id as string, req.tenantId!);
      if (!workflow) { res.status(404).json({ error: 'Workflow not found' }); return; }

      await prisma.$transaction(async (tx) => {
        if (name || description) {
          await tx.workflow.update({ where: { id: req.params.id as string }, data: { name, description } });
        }
        if (definition) {
          const newVersion = await tx.workflowVersion.create({
            data: {
              workflowId: req.params.id as string,
              version: (workflow.versions[0]?.version ?? 0) + 1,
              definition,
              status: 'DRAFT',
            },
          });
          await tx.workflow.update({
            where: { id: req.params.id as string },
            data: { currentVersionId: newVersion.id },
          });
        }
      });

      res.json({ message: 'Workflow updated' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update workflow' });
    }
  }
);

// ─── Publish Workflow (validates DAG) ─────────────────────────────────────

router.post('/:id/publish', requireEditor, async (req: Request, res: Response): Promise<void> => {
  try {
    const workflow = await workflowRepo.findById(req.params.id as string, req.tenantId!);
    if (!workflow) { res.status(404).json({ error: 'Workflow not found' }); return; }

    const draft = workflow.versions.find((v) => v.status === 'DRAFT');
    if (!draft) { res.status(400).json({ error: 'No draft version to publish' }); return; }

    const validation = validateWorkflowDefinition(draft.definition as unknown as WorkflowDefinition);
    if (!validation.valid) {
      res.status(422).json({ error: 'DAG validation failed', errors: validation.errors });
      return;
    }

    await versionRepo.publish(draft.id);
    res.json({ message: 'Workflow published', versionId: draft.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to publish workflow' });
  }
});

// ─── Trigger Run ───────────────────────────────────────────────────────────

router.post('/:id/trigger', async (req: Request, res: Response): Promise<void> => {
  try {
    const workflow = await workflowRepo.findById(req.params.id as string, req.tenantId!);
    if (!workflow) { res.status(404).json({ error: 'Workflow not found' }); return; }

    const published = workflow.versions.find((v) => v.status === 'PUBLISHED');
    if (!published) {
      res.status(400).json({ error: 'No published version. Publish the workflow first.' });
      return;
    }

    const run = await runRepo.create({
      workflow: { connect: { id: workflow.id } },
      version: { connect: { id: published.id } },
      tenant: { connect: { id: req.tenantId! } },
      status: 'PENDING',
      triggerPayload: req.body.payload ?? null,
    });

    await enqueueWorkflowRun({
      runId: run.id,
      tenantId: req.tenantId!,
      workflowId: workflow.id,
      versionId: published.id,
    });

    res.status(202).json({ runId: run.id, status: 'PENDING' });
  } catch (err) {
    logger.error('Trigger run error', { err });
    res.status(500).json({ error: 'Failed to trigger workflow run', details: err instanceof Error ? err.message : String(err) });
  }
});

// ─── Delete Workflow ───────────────────────────────────────────────────────

router.delete('/:id', requireEditor, async (req: Request, res: Response): Promise<void> => {
  try {
    await workflowRepo.delete(req.params.id as string, req.tenantId!);
    res.json({ message: 'Workflow deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

export default router;
