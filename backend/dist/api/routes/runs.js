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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middleware_1 = require("../../auth/middleware");
const repositories_1 = require("../../db/repositories");
const producer_1 = require("../../queue/producer");
const logger_1 = require("../../observability/logger");
const router = (0, express_1.Router)();
router.use(middleware_1.authenticate);
// ─── List Runs ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const { status, workflowId } = req.query;
        const runs = await repositories_1.runRepo.findByTenant(req.tenantId, {
            status: status,
            workflowId,
        });
        res.json({ runs });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch runs' });
    }
});
// ─── Get Run ───────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const run = await repositories_1.runRepo.findById(req.params.id, req.tenantId);
        if (!run) {
            res.status(404).json({ error: 'Run not found' });
            return;
        }
        res.json({ run });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch run' });
    }
});
// ─── Get Run Trace (audit trail) ───────────────────────────────────────────
router.get('/:id/trace', async (req, res) => {
    try {
        const run = await repositories_1.runRepo.findById(req.params.id, req.tenantId);
        if (!run) {
            res.status(404).json({ error: 'Run not found' });
            return;
        }
        const events = await repositories_1.eventRepo.findByRun(req.params.id);
        res.json({ runId: req.params.id, events });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch run trace' });
    }
});
// ─── Cancel Run ────────────────────────────────────────────────────────────
router.post('/:id/cancel', middleware_1.requireApprover, async (req, res) => {
    try {
        const run = await repositories_1.runRepo.findById(req.params.id, req.tenantId);
        if (!run) {
            res.status(404).json({ error: 'Run not found' });
            return;
        }
        if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(run.status)) {
            res.status(400).json({ error: 'Run is already in a terminal state' });
            return;
        }
        await repositories_1.runRepo.updateStatus(req.params.id, 'CANCELLED');
        res.json({ message: 'Run cancelled' });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to cancel run' });
    }
});
// ─── Human Tasks ───────────────────────────────────────────────────────────
router.get('/human-tasks/pending', async (req, res) => {
    try {
        const tasks = await repositories_1.humanTaskRepo.findPending(req.tenantId, req.user?.sub);
        res.json({ tasks });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch human tasks' });
    }
});
router.post('/human-tasks/:taskId/approve', middleware_1.requireApprover, async (req, res) => {
    const { taskId } = req.params;
    const { input } = req.body;
    try {
        const tasks = await repositories_1.humanTaskRepo.findByRun(''); // Fetch by taskId
        // Find the task directly
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../../db/client')));
        const task = await prisma.humanTask.findUnique({ where: { id: taskId } });
        if (!task) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }
        await repositories_1.humanTaskRepo.resolve(taskId, 'APPROVED', { decision: 'approved', input });
        await (0, producer_1.enqueueResumeRun)({
            runId: task.runId,
            tenantId: req.tenantId,
            humanTaskId: taskId,
            decision: 'approved',
            input: input ?? { approved: true },
        });
        res.json({ message: 'Task approved, run resuming' });
    }
    catch (err) {
        logger_1.logger.error('Approve task error', { err });
        res.status(500).json({ error: 'Failed to approve task' });
    }
});
router.post('/human-tasks/:taskId/reject', middleware_1.requireApprover, async (req, res) => {
    const { taskId } = req.params;
    const { reason } = req.body;
    try {
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../../db/client')));
        const task = await prisma.humanTask.findUnique({ where: { id: taskId } });
        if (!task) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }
        await repositories_1.humanTaskRepo.resolve(taskId, 'REJECTED', { decision: 'rejected', reason });
        await (0, producer_1.enqueueResumeRun)({
            runId: task.runId,
            tenantId: req.tenantId,
            humanTaskId: taskId,
            decision: 'rejected',
            input: { rejected: true, reason },
        });
        res.json({ message: 'Task rejected, run will be marked as failed' });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to reject task' });
    }
});
exports.default = router;
//# sourceMappingURL=runs.js.map