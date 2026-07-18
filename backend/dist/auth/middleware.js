"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireApprover = exports.requireEditor = exports.requireAdmin = void 0;
exports.authenticate = authenticate;
exports.requireRole = requireRole;
const jwt_1 = require("./jwt");
const repositories_1 = require("../db/repositories");
const logger_1 = require("../observability/logger");
// ─── JWT Auth Middleware ───────────────────────────────────────────────────
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    // Try API key first
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
        authenticateApiKey(apiKey, req, res, next);
        return;
    }
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid Authorization header' });
        return;
    }
    const token = authHeader.slice(7);
    try {
        const payload = (0, jwt_1.verifyAccessToken)(token);
        req.user = payload;
        req.tenantId = payload.tenantId;
        next();
    }
    catch {
        logger_1.logger.warn('JWT verification failed');
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}
async function authenticateApiKey(key, req, res, next) {
    try {
        const hash = (0, jwt_1.hashApiKey)(key);
        const tenant = await repositories_1.tenantRepo.findByApiKey(hash);
        if (!tenant) {
            res.status(401).json({ error: 'Invalid API key' });
            return;
        }
        // API key auth — synthetic payload with admin role for programmatic access
        req.user = {
            sub: `api_key_${tenant.id}`,
            tenantId: tenant.id,
            role: 'ADMIN',
            email: 'api@system',
        };
        req.tenantId = tenant.id;
        next();
    }
    catch {
        res.status(500).json({ error: 'Authentication error' });
    }
}
// ─── RBAC Middleware ───────────────────────────────────────────────────────
const ROLE_HIERARCHY = {
    VIEWER: 0,
    APPROVER: 1,
    EDITOR: 2,
    ADMIN: 3,
};
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthenticated' });
            return;
        }
        const userLevel = ROLE_HIERARCHY[req.user.role];
        const requiredLevel = Math.min(...roles.map((r) => ROLE_HIERARCHY[r]));
        if (userLevel < requiredLevel) {
            logger_1.logger.warn('RBAC violation', {
                userId: req.user.sub,
                userRole: req.user.role,
                requiredRoles: roles,
            });
            res.status(403).json({ error: 'Insufficient permissions' });
            return;
        }
        next();
    };
}
// Specific shortcuts
exports.requireAdmin = requireRole('ADMIN');
exports.requireEditor = requireRole('EDITOR', 'ADMIN');
exports.requireApprover = requireRole('APPROVER', 'EDITOR', 'ADMIN');
//# sourceMappingURL=middleware.js.map