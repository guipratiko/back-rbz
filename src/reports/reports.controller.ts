import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard, PermissionsGuard } from '../common/guards/auth.guards';
import { RequireModule } from '../common/decorators/auth.decorator';
import { SystemModule } from '../common/enums/modules.enum';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private service: ReportsService) {}

  @RequireModule(SystemModule.RELATORIOS, 'view')
  @Get('summary')
  summary() {
    return this.service.getSummary();
  }
}
