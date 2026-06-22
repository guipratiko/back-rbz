import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto';
import { JwtAuthGuard, PermissionsGuard } from '../common/guards/auth.guards';
import { RequireModule, CurrentUser } from '../common/decorators/auth.decorator';
import { SystemModule } from '../common/enums/modules.enum';
import { AuthUser } from '../common/interfaces/auth-user.interface';

@ApiTags('Calendar')
@ApiBearerAuth()
@Controller('calendar')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CalendarController {
  constructor(private service: CalendarService) {}

  @RequireModule(SystemModule.AGENDA, 'view')
  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.service.findAll(user);
  }

  @RequireModule(SystemModule.AGENDA, 'view')
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user);
  }

  @RequireModule(SystemModule.AGENDA, 'create')
  @Post()
  create(@Body() dto: CreateAppointmentDto) {
    return this.service.create(dto);
  }

  @RequireModule(SystemModule.AGENDA, 'edit')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAppointmentDto, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto, user);
  }

  @RequireModule(SystemModule.AGENDA, 'delete')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user);
  }
}

