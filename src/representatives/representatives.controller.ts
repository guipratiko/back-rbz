import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RepresentativesService } from './representatives.service';
import { CreateRepresentativeDto, UpdateRepresentativeDto } from './dto/representative.dto';
import { JwtAuthGuard, PermissionsGuard } from '../common/guards/auth.guards';
import { RequireModule, CurrentUser } from '../common/decorators/auth.decorator';
import { SystemModule } from '../common/enums/modules.enum';
import { AuthUser } from '../common/interfaces/auth-user.interface';

@ApiTags('Representatives')
@ApiBearerAuth()
@Controller('representatives')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RepresentativesController {
  constructor(private service: RepresentativesService) {}

  @RequireModule(SystemModule.REPRESENTANTES, 'view')
  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.service.findAll(user);
  }

  @RequireModule(SystemModule.REPRESENTANTES, 'view')
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user);
  }

  @RequireModule(SystemModule.REPRESENTANTES, 'create')
  @Post()
  create(@Body() dto: CreateRepresentativeDto) {
    return this.service.create(dto);
  }

  @RequireModule(SystemModule.REPRESENTANTES, 'edit')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRepresentativeDto) {
    return this.service.update(id, dto);
  }

  @RequireModule(SystemModule.REPRESENTANTES, 'delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
