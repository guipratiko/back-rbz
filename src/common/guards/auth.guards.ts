import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY, MODULE_KEY } from '../decorators/auth.decorator';
import { SystemModule } from '../enums/modules.enum';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(err: unknown, user: TUser): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('Não autenticado');
    }
    return user;
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const moduleMeta = this.reflector.getAllAndOverride<{
      module: SystemModule;
      action: string;
    }>(MODULE_KEY, [context.getHandler(), context.getClass()]);

    if (!moduleMeta) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) throw new UnauthorizedException('Não autenticado');
    if (user.role === 'ADMINISTRADOR') return true;

    const permission = user.permissions?.find(
      (p: { module: SystemModule }) => p.module === moduleMeta.module,
    );

    if (!permission) return false;

    const actionMap: Record<string, keyof typeof permission> = {
      view: 'view',
      create: 'create',
      edit: 'edit',
      delete: 'delete',
      export: 'export',
    };

    const key = actionMap[moduleMeta.action] || 'view';
    return Boolean(permission[key]);
  }
}
