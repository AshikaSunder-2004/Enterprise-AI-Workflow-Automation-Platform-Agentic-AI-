"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middleware_1 = require("../../auth/middleware");
const repositories_1 = require("../../db/repositories");
const registry_1 = require("../../tools/registry");
const client_1 = require("../../db/client");
const router = (0, express_1.Router)();
router.use(middleware_1.authenticate);
// ─── Cost Summary ──────────────────────────────────────────────────────────
router.get('/cost', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const summary = await repositories_1.tokenUsageRepo.summaryByTenant(req.tenantId, days);
        const totalCost = summary.reduce((acc, s) => acc + Number(s._sum.costUsd ?? 0), 0);
        const totalTokens = summary.reduce((acc, s) => acc + Number(s._sum.totalTokens ?? 0), 0);
        res.json({ summary, totalCost, totalTokens, days });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch cost summary' });
    }
});
// ─── Run Statistics ────────────────────────────────────────────────────────
router.get('/runs/stats', async (req, res) => {
    try {
        const stats = await client_1.prisma.workflowRun.groupBy({
            by: ['status'],
            where: { tenantId: req.tenantId },
            _count: { id: true },
        });
        res.json({ stats });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch run stats' });
    }
});
// ─── Available Tools ───────────────────────────────────────────────────────
router.get('/tools', async (req, res) => {
    const tools = registry_1.toolRegistry.listTools().map((t) => ({
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
router.get('/trends', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 14;
        const since = new Date(Date.now() - days * 86400000);
        const [runs, costs] = await Promise.all([
            client_1.prisma.workflowRun.findMany({
                where: { tenantId: req.tenantId, startedAt: { gte: since } },
                select: { startedAt: true, status: true },
            }),
            client_1.prisma.tokenUsage.findMany({
                where: { tenantId: req.tenantId, createdAt: { gte: since } },
                select: { createdAt: true, costUsd: true, totalTokens: true },
            }),
        ]);
        res.json({ runs, costs });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch trends' });
    }
});
exports.default = router;
//# sourceMappingURL=analytics.js.map