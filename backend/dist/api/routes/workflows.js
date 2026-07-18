"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const middleware_1 = require("../../auth/middleware");
const repositories_1 = require("../../db/repositories");
const dag_validator_1 = require("../../engine/dag-validator");
const producer_1 = require("../../queue/producer");
const client_1 = require("../../db/client");
const logger_1 = require("../../observability/logger");
const router = (0, express_1.Router)();
router.use(middleware_1.authenticate);
// ─── List Workflows ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const workflows = await repositories_1.workflowRepo.findByTenant(req.tenantId);
        res.json({ workflows });
    }
    catch (err) {
        logger_1.logger.error('List workflows error', { err });
        res.status(500).json({ error: 'Failed to fetch workflows' });
    }
});
// ─── Get Workflow ──────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const workflow = await repositories_1.workflowRepo.findById(req.params.id, req.tenantId);
        if (!workflow) {
            res.status(404).json({ error: 'Workflow not found' });
            return;
        }
        res.json({ workflow });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch workflow' });
    }
});
// ─── Create Workflow ───────────────────────────────────────────────────────
router.post('/', middleware_1.requireEditor, [
    (0, express_validator_1.body)('name').isLength({ min: 1, max: 200 }).trim(),
    (0, express_validator_1.body)('description').optional().isString(),
    (0, express_validator_1.body)('triggerType').optional().isIn(['MANUAL', 'SCHEDULE', 'WEBHOOK', 'WORKFLOW_OUTPUT']),
    (0, express_validator_1.body)('definition').isObject(),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    const { name, description, triggerType = 'MANUAL', triggerConfig, definition } = req.body;
    try {
        const result = await client_1.prisma.$transaction(async (tx) => {
            const workflow = await tx.workflow.create({
                data: {
                    tenantId: req.tenantId,
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
    }
    catch (err) {
        logger_1.logger.error('Create workflow error', { err });
        res.status(500).json({ error: 'Failed to create workflow' });
    }
});
// ─── Update Workflow (creates new version) ─────────────────────────────────
router.put('/:id', middleware_1.requireEditor, [(0, express_validator_1.body)('definition').optional().isObject(), (0, express_validator_1.body)('name').optional().isString()], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    const { name, description, definition } = req.body;
    try {
        const workflow = await repositories_1.workflowRepo.findById(req.params.id, req.tenantId);
        if (!workflow) {
            res.status(404).json({ error: 'Workflow not found' });
            return;
        }
        await client_1.prisma.$transaction(async (tx) => {
            if (name || description) {
                await tx.workflow.update({ where: { id: req.params.id }, data: { name, description } });
            }
            if (definition) {
                const newVersion = await tx.workflowVersion.create({
                    data: {
                        workflowId: req.params.id,
                        version: (workflow.versions[0]?.version ?? 0) + 1,
                        definition,
                        status: 'DRAFT',
                    },
                });
                await tx.workflow.update({
                    where: { id: req.params.id },
                    data: { currentVersionId: newVersion.id },
                });
            }
        });
        res.json({ message: 'Workflow updated' });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to update workflow' });
    }
});
// ─── Publish Workflow (validates DAG) ─────────────────────────────────────
router.post('/:id/publish', middleware_1.requireEditor, async (req, res) => {
    try {
        const workflow = await repositories_1.workflowRepo.findById(req.params.id, req.tenantId);
        if (!workflow) {
            res.status(404).json({ error: 'Workflow not found' });
            return;
        }
        const draft = workflow.versions.find((v) => v.status === 'DRAFT');
        if (!draft) {
            res.status(400).json({ error: 'No draft version to publish' });
            return;
        }
        const validation = (0, dag_validator_1.validateWorkflowDefinition)(draft.definition);
        if (!validation.valid) {
            res.status(422).json({ error: 'DAG validation failed', errors: validation.errors });
            return;
        }
        await repositories_1.versionRepo.publish(draft.id);
        res.json({ message: 'Workflow published', versionId: draft.id });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to publish workflow' });
    }
});
// ─── Trigger Run ───────────────────────────────────────────────────────────
router.post('/:id/trigger', async (req, res) => {
    try {
        const workflow = await repositories_1.workflowRepo.findById(req.params.id, req.tenantId);
        if (!workflow) {
            res.status(404).json({ error: 'Workflow not found' });
            return;
        }
        const published = workflow.versions.find((v) => v.status === 'PUBLISHED');
        if (!published) {
            res.status(400).json({ error: 'No published version. Publish the workflow first.' });
            return;
        }
        const run = await repositories_1.runRepo.create({
            workflow: { connect: { id: workflow.id } },
            version: { connect: { id: published.id } },
            tenant: { connect: { id: req.tenantId } },
            status: 'PENDING',
            triggerPayload: req.body.payload ?? null,
        });
        await (0, producer_1.enqueueWorkflowRun)({
            runId: run.id,
            tenantId: req.tenantId,
            workflowId: workflow.id,
            versionId: published.id,
        });
        res.status(202).json({ runId: run.id, status: 'PENDING' });
    }
    catch (err) {
        logger_1.logger.error('Trigger run error', { err });
        res.status(500).json({ error: 'Failed to trigger workflow run' });
    }
});
// ─── Delete Workflow ───────────────────────────────────────────────────────
router.delete('/:id', middleware_1.requireEditor, async (req, res) => {
    try {
        await repositories_1.workflowRepo.delete(req.params.id, req.tenantId);
        res.json({ message: 'Workflow deleted' });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to delete workflow' });
    }
});
exports.default = router;
//# sourceMappingURL=workflows.js.map