import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { buildDefaultPermissions, UserRole } from '../../common/enums/modules.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'dev-secret',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userModel.findById(payload.sub);
    if (!user || !user.active) {
      throw new UnauthorizedException('Usuário inválido ou inativo');
    }

    await this.syncPermissionsIfNeeded(user);

    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions,
      representativeId: user.representativeId,
      avatar: user.avatar,
    };
  }

  private async syncPermissionsIfNeeded(user: UserDocument) {
    const defaults = buildDefaultPermissions(user.role as UserRole);
    let changed = false;

    for (const def of defaults) {
      const existing = user.permissions.find((p) => p.module === def.module);
      if (!existing) {
        user.permissions.push(def as never);
        changed = true;
        continue;
      }
      for (const action of ['view', 'create', 'edit', 'delete', 'export'] as const) {
        if (def[action] && !existing[action]) {
          existing[action] = true;
          changed = true;
        }
      }
    }

    if (changed) {
      await user.save();
    }
  }
}
