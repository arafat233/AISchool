import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  ForbiddenException,
} from "@nestjs/common";
import { Observable } from "rxjs";
import type { RequestUser } from "@school-erp/types";

/**
 * Enforces tenant isolation: if a route param or query param named `tenantId`
 * or `schoolId` is present, it must match the JWT-authenticated user's tenant.
 * SUPER_ADMIN users are exempt.
 */
@Injectable()
export class TenantScopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      user?: RequestUser;
      params?: Record<string, string>;
      query?: Record<string, string>;
      body?: Record<string, unknown>;
    }>();

    const user = req.user;
    // Skip for unauthenticated (handled by JwtAuthGuard) or super admin
    if (!user || user.role === "SUPER_ADMIN") {
      return next.handle();
    }

    const paramTenantId =
      req.params?.tenantId ?? req.query?.tenantId ?? req.body?.tenantId as string | undefined;

    if (paramTenantId && paramTenantId !== user.tenantId) {
      throw new ForbiddenException("Tenant isolation violation");
    }

    return next.handle();
  }
}
