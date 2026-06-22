import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Session, SessionDocument } from '../users/schemas/session.schema';
import { AuthLog, AuthLogDocument } from '../users/schemas/auth-log.schema';
import { CreateUserDto, LoginDto, UpdateUserDto } from './dto/auth.dto';
import {
  buildDefaultPermissions,
  UserRole,
} from '../common/enums/modules.enum';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    @InjectModel(AuthLog.name) private authLogModel: Model<AuthLogDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (!user || !user.active) {
      await this.logAuth('', dto.email, 'LOGIN_FAILED', ip, userAgent, false);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      await this.logAuth(user._id.toString(), dto.email, 'LOGIN_FAILED', ip, userAgent, false);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const tokens = await this.generateTokens(user);
    user.lastLoginAt = new Date();
    await this.ensureRolePermissions(user);
    await user.save();
    await this.logAuth(user._id.toString(), dto.email, 'LOGIN', ip, userAgent, true);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    const session = await this.sessionModel.findOne({
      refreshToken,
      active: true,
      expiresAt: { $gt: new Date() },
    });
    if (!session) throw new UnauthorizedException('Sessão inválida');

    const user = await this.userModel.findById(session.userId);
    if (!user || !user.active) throw new UnauthorizedException('Usuário inválido');

    session.active = false;
    await session.save();

    return this.generateTokens(user);
  }

  async logout(refreshToken: string) {
    await this.sessionModel.updateOne({ refreshToken }, { active: false });
    return { message: 'Logout realizado' };
  }

  async createUser(dto: CreateUserDto) {
    const exists = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (exists) throw new ConflictException('E-mail já cadastrado');

    let representativeId = dto.representativeId;

    if (dto.role === UserRole.REPRESENTANTE_COMERCIAL && !representativeId) {
      representativeId = await this.ensureRepresentativeRecord(dto.name, dto.email);
    }

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await this.userModel.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      password: hashed,
      role: dto.role as UserRole,
      representativeId,
      permissions: buildDefaultPermissions(dto.role as UserRole),
    });

    return this.sanitizeUser(user);
  }

  async syncRepresentativeUsers() {
    const users = await this.userModel.find({
      role: UserRole.REPRESENTANTE_COMERCIAL,
      $or: [{ representativeId: { $exists: false } }, { representativeId: null }, { representativeId: '' }],
    });

    let synced = 0;
    for (const user of users) {
      const repId = await this.ensureRepresentativeRecord(user.name, user.email);
      user.representativeId = repId;
      await user.save();
      synced++;
    }
    return { synced };
  }

  private async ensureRepresentativeRecord(name: string, email: string) {
    const normalizedEmail = email.toLowerCase();
    const existing = await this.prisma.representative.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) return existing.id;

    const created = await this.prisma.representative.create({
      data: { nome: name, email: normalizedEmail },
    });
    return created.id;
  }

  async findAllUsers() {
    const users = await this.userModel.find().select('-password').lean();
    return users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      active: u.active,
      permissions: u.permissions,
      representativeId: u.representativeId,
      avatar: u.avatar,
      lastLoginAt: u.lastLoginAt,
    }));
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('Usuário não encontrado');

    if (dto.name) user.name = dto.name;
    if (dto.email) user.email = dto.email.toLowerCase();
    if (dto.password) user.password = await bcrypt.hash(dto.password, 12);
    if (dto.role) {
      user.role = dto.role as UserRole;
      if (!dto.permissions) user.permissions = buildDefaultPermissions(dto.role as UserRole);
    }
    if (dto.active !== undefined) user.active = dto.active;
    if (dto.representativeId !== undefined) user.representativeId = dto.representativeId;
    if (dto.permissions) user.permissions = dto.permissions as never;

    await user.save();
    return this.sanitizeUser(user);
  }

  async updateAvatar(userId: string, filename: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('Usuário não encontrado');

    if (user.avatar) {
      const oldPath = join(process.cwd(), user.avatar.replace('/api/uploads/', 'uploads/'));
      try {
        await unlink(oldPath);
      } catch {
        /* ignore missing file */
      }
    }

    user.avatar = `/api/uploads/avatars/${filename}`;
    await user.save();
    return this.sanitizeUser(user);
  }

  async deleteUser(id: string, requesterId: string) {
    if (id === requesterId) {
      throw new BadRequestException('Você não pode excluir sua própria conta');
    }

    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('Usuário não encontrado');

    if (user.avatar) {
      const oldPath = join(process.cwd(), user.avatar.replace('/api/uploads/', 'uploads/'));
      try {
        await unlink(oldPath);
      } catch {
        /* ignore */
      }
    }

    await this.sessionModel.deleteMany({ userId: id });
    await this.userModel.findByIdAndDelete(id);

    return { message: 'Usuário excluído com sucesso' };
  }

  private async ensureRolePermissions(user: UserDocument) {
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

  private async generateTokens(user: UserDocument) {
    const payload = { sub: user._id.toString(), email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET') || 'dev-refresh-secret',
      expiresIn: '7d',
    });

    await this.sessionModel.create({
      userId: user._id.toString(),
      refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: UserDocument) {
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      representativeId: user.representativeId,
      avatar: user.avatar,
    };
  }

  private async logAuth(
    userId: string,
    email: string,
    action: string,
    ip?: string,
    userAgent?: string,
    success = true,
  ) {
    await this.authLogModel.create({ userId, email, action, ipAddress: ip, userAgent, success });
  }
}
