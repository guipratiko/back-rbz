import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OpportunitiesService } from './opportunities.service';
import { CreateOpportunityDto, UpdateOpportunityDto, UpdatePipelineDto } from './dto/opportunity.dto';
import { JwtAuthGuard, PermissionsGuard } from '../common/guards/auth.guards';
import { RequireModule, CurrentUser } from '../common/decorators/auth.decorator';
import { SystemModule } from '../common/enums/modules.enum';
import { AuthUser } from '../common/interfaces/auth-user.interface';

@ApiTags('Opportunities')
@ApiBearerAuth()
@Controller('opportunities')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OpportunitiesController {
  constructor(private service: OpportunitiesService) {}

  @RequireModule(SystemModule.FUNIL_COMERCIAL, 'view')
  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.service.findAll(user);
  }

  @RequireModule(SystemModule.FUNIL_COMERCIAL, 'view')
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user);
  }

  @RequireModule(SystemModule.FUNIL_COMERCIAL, 'create')
  @Post()
  create(@Body() dto: CreateOpportunityDto) {
    return this.service.create(dto);
  }

  @RequireModule(SystemModule.FUNIL_COMERCIAL, 'create')
  @Post('generate/:clientId')
  generate(@Param('clientId') clientId: string, @CurrentUser() user: AuthUser) {
    return this.service.generateForClient(clientId, user);
  }

  @RequireModule(SystemModule.FUNIL_COMERCIAL, 'edit')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOpportunityDto, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto, user);
  }

  @RequireModule(SystemModule.FUNIL_COMERCIAL, 'edit')
  @Put(':id/pipeline')
  updatePipeline(@Param('id') id: string, @Body() dto: UpdatePipelineDto, @CurrentUser() user: AuthUser) {
    return this.service.updatePipeline(id, dto, user);
  }

  @RequireModule(SystemModule.FUNIL_COMERCIAL, 'delete')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user);
  }
}

