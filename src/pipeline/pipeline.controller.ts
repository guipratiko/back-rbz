import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PipelineService } from './pipeline.service';
import { JwtAuthGuard, PermissionsGuard } from '../common/guards/auth.guards';
import { RequireModule, CurrentUser } from '../common/decorators/auth.decorator';
import { SystemModule } from '../common/enums/modules.enum';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import {
  CreatePipelineColumnDto,
  MovePipelineCardDto,
  ReorderPipelineColumnsDto,
  UpdatePipelineColumnDto,
} from './dto/pipeline.dto';

@ApiTags('Pipeline')
@ApiBearerAuth()
@Controller('pipeline')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PipelineController {
  constructor(private service: PipelineService) {}

  @RequireModule(SystemModule.FUNIL_COMERCIAL, 'view')
  @Get('kanban')
  getKanban(@CurrentUser() user: AuthUser) {
    return this.service.getKanban(user);
  }

  @RequireModule(SystemModule.FUNIL_COMERCIAL, 'view')
  @Get('columns')
  getColumns(@CurrentUser() user: AuthUser) {
    return this.service.getColumns(user);
  }

  @RequireModule(SystemModule.FUNIL_COMERCIAL, 'view')
  @Post('columns')
  createColumn(@CurrentUser() user: AuthUser, @Body() dto: CreatePipelineColumnDto) {
    return this.service.createColumn(user, dto);
  }

  @RequireModule(SystemModule.FUNIL_COMERCIAL, 'view')
  @Put('columns/reorder')
  reorderColumns(@CurrentUser() user: AuthUser, @Body() dto: ReorderPipelineColumnsDto) {
    return this.service.reorderColumns(user, dto.columnIds);
  }

  @RequireModule(SystemModule.FUNIL_COMERCIAL, 'view')
  @Put('columns/:id')
  updateColumn(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePipelineColumnDto,
  ) {
    return this.service.updateColumn(user, id, dto);
  }

  @RequireModule(SystemModule.FUNIL_COMERCIAL, 'view')
  @Delete('columns/:id')
  deleteColumn(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deleteColumn(user, id);
  }

  @RequireModule(SystemModule.FUNIL_COMERCIAL, 'edit')
  @Put('cards/:opportunityId/move')
  moveCard(
    @CurrentUser() user: AuthUser,
    @Param('opportunityId') opportunityId: string,
    @Body() dto: MovePipelineCardDto,
  ) {
    return this.service.moveCard(user, opportunityId, dto);
  }
}
