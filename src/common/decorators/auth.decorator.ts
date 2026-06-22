import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { SystemModule } from '../enums/modules.enum';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const MODULE_KEY = 'module';
export const PERMISSION_KEY = 'permission';

export const RequireModule = (module: SystemModule, action: string = 'view') =>
  SetMetadata(MODULE_KEY, { module, action });

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
