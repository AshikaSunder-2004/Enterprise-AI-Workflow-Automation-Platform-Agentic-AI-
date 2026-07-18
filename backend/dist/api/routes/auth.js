"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const client_1 = require("../../db/client");
const repositories_1 = require("../../db/repositories");
const jwt_1 = require("../../auth/jwt");
const middleware_1 = require("../../auth/middleware");
const logger_1 = require("../../observability/logger");
const router = (0, express_1.Router)();
// ─── Register Tenant + Admin User ─────────────────────────────────────────
router.post('/register', [
    (0, express_validator_1.body)('tenantName').isLength({ min: 2 }).trim(),
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').isLength({ min: 8 }),
    (0, express_validator_1.body)('name').isLength({ min: 2 }).trim(),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    const { tenantName, email, password, name } = req.body;
    try {
        // Check duplicate email globally (email is unique per tenant, not globally)
        const passwordHash = await (0, jwt_1.hashPassword)(password);
        const result = await client_1.prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: { name: tenantName },
            });
            const user = await tx.user.create({
                data: {
                    tenantId: tenant.id,
                    email,
                    passwordHash,
                    name,
                    role: 'ADMIN',
                },
            });
            return { tenant, user };
        });
        const accessToken = (0, jwt_1.signAccessToken)({
            sub: result.user.id,
            tenantId: result.tenant.id,
            role: result.user.role,
            email: result.user.email,
        });
        const refreshToken = (0, jwt_1.signRefreshToken)({
            sub: result.user.id,
            tenantId: result.tenant.id,
        });
        // Store refresh token hash
        await client_1.prisma.user.update({
            where: { id: result.user.id },
            data: { refreshToken },
        });
        logger_1.logger.info('New tenant registered', { tenantId: result.tenant.id, email });
        res.status(201).json({
            accessToken,
            refreshToken,
            user: {
                id: result.user.id,
                email: result.user.email,
                name: result.user.name,
                role: result.user.role,
                tenantId: result.tenant.id,
                tenantName: result.tenant.name,
            },
        });
    }
    catch (err) {
        if (err.code === 'P2002') {
            res.status(409).json({ error: 'Email already registered' });
            return;
        }
        logger_1.logger.error('Registration error', { err });
        res.status(500).json({ error: 'Registration failed' });
    }
});
// ─── Login ─────────────────────────────────────────────────────────────────
router.post('/login', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').notEmpty(),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    const { email, password } = req.body;
    try {
        const user = await client_1.prisma.user.findFirst({
            where: { email },
            include: { tenant: true },
        });
        if (!user || !(await (0, jwt_1.verifyPassword)(password, user.passwordHash))) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }
        const accessToken = (0, jwt_1.signAccessToken)({
            sub: user.id,
            tenantId: user.tenantId,
            role: user.role,
            email: user.email,
        });
        const refreshToken = (0, jwt_1.signRefreshToken)({
            sub: user.id,
            tenantId: user.tenantId,
        });
        await client_1.prisma.user.update({
            where: { id: user.id },
            data: { refreshToken },
        });
        res.json({
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                tenantId: user.tenantId,
                tenantName: user.tenant.name,
            },
        });
    }
    catch (err) {
        logger_1.logger.error('Login error', { err });
        res.status(500).json({ error: 'Login failed' });
    }
});
// ─── Refresh Token ─────────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        res.status(400).json({ error: 'Refresh token required' });
        return;
    }
    try {
        const payload = (0, jwt_1.verifyRefreshToken)(refreshToken);
        const user = await client_1.prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user || user.refreshToken !== refreshToken) {
            res.status(401).json({ error: 'Invalid refresh token' });
            return;
        }
        const accessToken = (0, jwt_1.signAccessToken)({
            sub: user.id,
            tenantId: user.tenantId,
            role: user.role,
            email: user.email,
        });
        res.json({ accessToken });
    }
    catch {
        res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
});
// ─── Generate API Key (Admin only) ─────────────────────────────────────────
router.post('/api-key', middleware_1.authenticate, middleware_1.requireAdmin, async (req, res) => {
    try {
        const { key, hash } = (0, jwt_1.generateApiKey)();
        await repositories_1.tenantRepo.findById(req.tenantId).then(() => client_1.prisma.tenant.update({
            where: { id: req.tenantId },
            data: { apiKeyHash: hash },
        }));
        res.json({
            apiKey: key,
            message: 'Store this key securely — it will not be shown again',
        });
    }
    catch (err) {
        logger_1.logger.error('API key generation error', { err });
        res.status(500).json({ error: 'Failed to generate API key' });
    }
});
// ─── Logout ────────────────────────────────────────────────────────────────
router.post('/logout', middleware_1.authenticate, async (req, res) => {
    await client_1.prisma.user.updateMany({
        where: { id: req.user.sub },
        data: { refreshToken: null },
    });
    res.json({ message: 'Logged out' });
});
exports.default = router;
//# sourceMappingURL=auth.js.map