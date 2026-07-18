import { UserRole } from '@prisma/client';
export interface JwtPayload {
    sub: string;
    tenantId: string;
    role: UserRole;
    email: string;
}
export declare function signAccessToken(payload: JwtPayload): string;
export declare function signRefreshToken(payload: Pick<JwtPayload, 'sub' | 'tenantId'>): string;
export declare function verifyAccessToken(token: string): JwtPayload;
export declare function verifyRefreshToken(token: string): Pick<JwtPayload, 'sub' | 'tenantId'>;
export declare function hashPassword(password: string): Promise<string>;
export declare function verifyPassword(password: string, hash: string): Promise<boolean>;
export declare function generateApiKey(): {
    key: string;
    hash: string;
};
export declare function hashApiKey(key: string): string;
//# sourceMappingURL=jwt.d.ts.map