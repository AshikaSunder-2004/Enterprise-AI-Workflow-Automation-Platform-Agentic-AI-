import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { JwtPayload } from './jwt';
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
            tenantId?: string;
        }
    }
}
export declare function authenticate(req: Request, res: Response, next: NextFunction): void;
export declare function requireRole(...roles: UserRole[]): (req: Request, res: Response, next: NextFunction) => void;
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireEditor: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireApprover: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=middleware.d.ts.map