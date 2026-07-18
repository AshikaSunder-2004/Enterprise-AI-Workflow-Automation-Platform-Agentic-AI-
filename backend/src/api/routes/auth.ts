import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../../db/client';
import { tenantRepo } from '../../db/repositories';
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateApiKey,
} from '../../auth/jwt';
import { authenticate, requireAdmin } from '../../auth/middleware';
import { logger } from '../../observability/logger';

const router = Router();

// ─── Register Tenant + Admin User ─────────────────────────────────────────

router.post(
  '/register',
  [
    body('tenantName').isLength({ min: 2 }).trim(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('name').isLength({ min: 2 }).trim(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { tenantName, email, password, name } = req.body;

    try {
      // Check duplicate email globally (email is unique per tenant, not globally)
      const passwordHash = await hashPassword(password);

      const result = await prisma.$transaction(async (tx) => {
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

      const accessToken = signAccessToken({
        sub: result.user.id,
        tenantId: result.tenant.id,
        role: result.user.role,
        email: result.user.email,
      });
      const refreshToken = signRefreshToken({
        sub: result.user.id,
        tenantId: result.tenant.id,
      });

      // Store refresh token hash
      await prisma.user.update({
        where: { id: result.user.id },
        data: { refreshToken },
      });

      logger.info('New tenant registered', { tenantId: result.tenant.id, email });

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
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2002') {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }
      logger.error('Registration error', { err });
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// ─── Login ─────────────────────────────────────────────────────────────────

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password } = req.body;

    try {
      const user = await prisma.user.findFirst({
        where: { email },
        include: { tenant: true },
      });

      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const accessToken = signAccessToken({
        sub: user.id,
        tenantId: user.tenantId,
        role: user.role,
        email: user.email,
      });
      const refreshToken = signRefreshToken({
        sub: user.id,
        tenantId: user.tenantId,
      });

      await prisma.user.update({
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
    } catch (err) {
      logger.error('Login error', { err });
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// ─── Refresh Token ─────────────────────────────────────────────────────────

router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token required' });
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user || user.refreshToken !== refreshToken) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const accessToken = signAccessToken({
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    });

    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// ─── Generate API Key (Admin only) ─────────────────────────────────────────

router.post('/api-key', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { key, hash } = generateApiKey();

    await tenantRepo.findById(req.tenantId!).then(() =>
      prisma.tenant.update({
        where: { id: req.tenantId! },
        data: { apiKeyHash: hash },
      })
    );

    res.json({
      apiKey: key,
      message: 'Store this key securely — it will not be shown again',
    });
  } catch (err) {
    logger.error('API key generation error', { err });
    res.status(500).json({ error: 'Failed to generate API key' });
  }
});

// ─── Logout ────────────────────────────────────────────────────────────────

router.post('/logout', authenticate, async (req: Request, res: Response): Promise<void> => {
  await prisma.user.updateMany({
    where: { id: req.user!.sub },
    data: { refreshToken: null },
  });
  res.json({ message: 'Logged out' });
});

export default router;
