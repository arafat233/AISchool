export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    tenantId: string;
    schoolId?: string;
    plan: string;
    iat?: number;
    exp?: number;
}
export interface JwtTokens {
    accessToken: string;
    expiresIn: number;
}
export interface RequestUser {
    id: string;
    email: string;
    role: string;
    tenantId: string;
    schoolId?: string;
    plan: string;
}
//# sourceMappingURL=auth.d.ts.map