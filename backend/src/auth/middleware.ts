import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { verifyAccessToken, hashApiKey, JwtPayload } from './jwt';
import { tenantRepo } from '../db/repositories';
import { logger } from '../observability/logger';

// Extend Express Request to carry auth context
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      tenantId?: string;
    }
  }
}

// ─── JWT Auth Middleware ───────────────────────────────────────────────────

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  // Try API key first
  const apiKey = req.headers['x-api-key'] as string | undefined;
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
    const payload = verifyAccessToken(token);
    req.user = payload;
    req.tenantId = payload.tenantId;
    next();
  } catch {
    logger.warn('JWT verification failed');
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

async function authenticateApiKey(
  key: string,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const hash = hashApiKey(key);
    const tenant = await tenantRepo.findByApiKey(hash);
    if (!tenant) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }
    // API key auth — synthetic payload with admin role for programmatic access
    req.user = {
      sub: `api_key_${tenant.id}`,
      tenantId: tenant.id,
      role: 'ADMIN' as UserRole,
      email: 'api@system',
    };
    req.tenantId = tenant.id;
    next();
  } catch {
    res.status(500).json({ error: 'Authentication error' });
  }
}

// ─── RBAC Middleware ───────────────────────────────────────────────────────

const ROLE_HIERARCHY: Record<UserRole, number> = {
  VIEWER: 0,
  APPROVER: 1,
  EDITOR: 2,
  ADMIN: 3,
};

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }

    const userLevel = ROLE_HIERARCHY[req.user.role];
    const requiredLevel = Math.min(...roles.map((r) => ROLE_HIERARCHY[r]));

    if (userLevel < requiredLevel) {
      logger.warn('RBAC violation', {
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
export const requireAdmin = requireRole('ADMIN');
export const requireEditor = requireRole('EDITOR', 'ADMIN');
export const requireApprover = requireRole('APPROVER', 'EDITOR', 'ADMIN');
