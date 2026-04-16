import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { PlanUpgradeRequiredError } from "@school-erp/errors";
import type { RequestUser } from "@school-erp/types";

import { PLAN_KEY } from "../decorators/requires-plan.decorator";

const PLAN_ORDER: Record<string, number> = {
  FREE: 0,
  BASIC: 1,
  STANDARD: 2,
  PREMIUM: 3,
  ENTERPRISE: 4,
};

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPlan = this.reflector.getAllAndOverride<string>(PLAN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredPlan) return true;

    const { user } = context.switchToHttp().getRequest<{ user: RequestUser }>();
    if (!user) return false;

    const userPlanLevel = PLAN_ORDER[user.plan] ?? 0;
    const requiredPlanLevel = PLAN_ORDER[requiredPlan] ?? 0;

    if (userPlanLevel < requiredPlanLevel) {
      throw new PlanUpgradeRequiredError(requiredPlan);
    }
    return true;
  }
}
