import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard, PermissionsGuard } from '../common/guards/auth.guards';
import { RequireModule } from '../common/decorators/auth.decorator';
import { SystemModule } from '../common/enums/modules.enum';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private service: DashboardService) {}

  @RequireModule(SystemModule.DASHBOARD_EXECUTIVO, 'view')
  @Get('executive')
  executive() {
    return this.service.getExecutive();
  }

  @RequireModule(SystemModule.DASHBOARD_EXECUTIVO, 'view')
  @Get('commercial')
  commercial() {
    return this.service.getCommercial();
  }

  @RequireModule(SystemModule.MARKETING, 'view')
  @Get('marketing')
  marketing() {
    return this.service.getMarketing();
  }

  @RequireModule(SystemModule.CARTEIRA_MAPA, 'view')
  @Get('geographic')
  geographic() {
    return this.service.getGeographic();
  }

  @RequireModule(SystemModule.CARTEIRA_MAPA, 'view')
  @Get('cross-selling')
  crossSelling() {
    return this.service.getCrossSelling();
  }

  @RequireModule(SystemModule.RETENCAO, 'view')
  @Get('retention')
  retention() {
    return this.service.getRetention();
  }

  @RequireModule(SystemModule.DASHBOARD_EXECUTIVO, 'view')
  @Get('alerts')
  alerts() {
    return this.service.getAlerts();
  }
}
