import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiParam } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ClientsService } from './clients.service';
import { CnpjLookupService } from './cnpj-lookup.service';
import { CreateClientDto, CreateObservationDto, UpdateClientDto } from './dto/client.dto';
import { JwtAuthGuard, PermissionsGuard } from '../common/guards/auth.guards';
import { RequireModule, CurrentUser } from '../common/decorators/auth.decorator';
import { SystemModule } from '../common/enums/modules.enum';
import { AuthUser } from '../common/interfaces/auth-user.interface';

@ApiTags('Clients')
@ApiBearerAuth()
@Controller('clients')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClientsController {
  constructor(
    private clientsService: ClientsService,
    private cnpjLookupService: CnpjLookupService,
  ) {}

  @RequireModule(SystemModule.CLIENTES, 'view')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Get('lookup/cnpj/:cnpj')
  @ApiParam({ name: 'cnpj', description: 'CNPJ com ou sem formatação' })
  lookupCnpj(@Param('cnpj') cnpj: string) {
    return this.cnpjLookupService.lookup(cnpj);
  }

  @RequireModule(SystemModule.CLIENTES, 'view')
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('search') search?: string) {
    return this.clientsService.findAll(user, search);
  }

  @RequireModule(SystemModule.CLIENTES, 'view')
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.clientsService.findOne(id, user);
  }

  @RequireModule(SystemModule.CLIENTES, 'view')
  @Get(':id/cross-sell')
  crossSell(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.clientsService.getCrossSell(id, user);
  }

  @RequireModule(SystemModule.CLIENTES, 'create')
  @Post()
  create(@Body() dto: CreateClientDto, @CurrentUser() user: AuthUser) {
    return this.clientsService.create(dto, user);
  }

  @RequireModule(SystemModule.CLIENTES, 'edit')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClientDto, @CurrentUser() user: AuthUser) {
    return this.clientsService.update(id, dto, user);
  }

  @RequireModule(SystemModule.CLIENTES, 'delete')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.clientsService.remove(id, user);
  }

  @RequireModule(SystemModule.CLIENTES, 'edit')
  @Post(':id/observations')
  addObservation(
    @Param('id') id: string,
    @Body() dto: CreateObservationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clientsService.addObservation(id, dto, user);
  }
}

