import { Controller, Post, Body, Req, Get, Put, Delete, Param, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { CreateUserDto, LoginDto, RefreshTokenDto, UpdateUserDto } from './dto/auth.dto';
import { Public, RequireModule, CurrentUser } from '../common/decorators/auth.decorator';
import { JwtAuthGuard, PermissionsGuard } from '../common/guards/auth.guards';
import { SystemModule } from '../common/enums/modules.enum';
import { avatarMulterOptions } from './avatar-upload';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

@ApiTags('Auth')
@Controller('auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: { ip?: string; headers: Record<string, string> }) {
    return this.authService.login(dto, req.ip, req.headers['user-agent']);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  me(@CurrentUser() user: Record<string, unknown>) {
    return user;
  }

  @ApiBearerAuth()
  @RequireModule(SystemModule.CONFIGURACOES, 'view')
  @Get('users')
  async findAll() {
    await this.authService.syncRepresentativeUsers();
    return this.authService.findAllUsers();
  }

  @ApiBearerAuth()
  @RequireModule(SystemModule.CONFIGURACOES, 'create')
  @Post('users')
  create(@Body() dto: CreateUserDto) {
    return this.authService.createUser(dto);
  }

  @ApiBearerAuth()
  @RequireModule(SystemModule.CONFIGURACOES, 'edit')
  @Post('users/sync-representatives')
  syncRepresentatives() {
    return this.authService.syncRepresentativeUsers();
  }

  @ApiBearerAuth()
  @RequireModule(SystemModule.CONFIGURACOES, 'edit')
  @Put('users/:id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.authService.updateUser(id, dto);
  }

  @ApiBearerAuth()
  @RequireModule(SystemModule.CONFIGURACOES, 'delete')
  @Delete('users/:id')
  deleteUser(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.authService.deleteUser(id, user.id);
  }

  @ApiBearerAuth()
  @Post('me/avatar')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file', avatarMulterOptions))
  uploadAvatar(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthUser) {
    if (!file) throw new BadRequestException('Arquivo de imagem obrigatório');
    return this.authService.updateAvatar(user.id, file.filename);
  }
}
