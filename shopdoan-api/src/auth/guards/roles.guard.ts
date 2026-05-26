import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '@/auth/decorators/roles.decorator';
import { GqlExecutionContext } from '@nestjs/graphql';
import { normalizeGuardRole } from '@/auth/role.utils';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) return true;

    const request =
      context.getType<'http' | 'graphql'>() === 'graphql'
        ? GqlExecutionContext.create(context).getContext().req
        : context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    const userRoles = new Set(
      [user.role, user.legacyRole, user.accountRole]
        .filter(Boolean)
        .map((role) => normalizeGuardRole(role)),
    );

    const hasRole = requiredRoles.some((role) =>
      userRoles.has(normalizeGuardRole(role)),
    );

    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
