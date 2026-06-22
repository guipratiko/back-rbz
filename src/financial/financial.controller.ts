import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FinancialService } from './financial.service';
import { JwtAuthGuard, PermissionsGuard } from '../common/guards/auth.guards';
import { RequireModule } from '../common/decorators/auth.decorator';
import { SystemModule } from '../common/enums/modules.enum';

@ApiTags('Financial')
@ApiBearerAuth()
@Controller('financial')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinancialController {
  constructor(private service: FinancialService) {}

  @RequireModule(SystemModule.FINANCEIRO, 'view')
  @Get('overview')
  overview() {
    return this.service.getOverview();
  }

  @RequireModule(SystemModule.FINANCEIRO, 'view')
  @Get('orders')
  orders() {
    return this.service.getOrders();
  }
}
