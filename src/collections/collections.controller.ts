import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CollectionsService } from './collections.service';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto';
import { JwtAuthGuard, PermissionsGuard } from '../common/guards/auth.guards';
import { RequireModule } from '../common/decorators/auth.decorator';
import { SystemModule } from '../common/enums/modules.enum';

@ApiTags('Collections')
@ApiBearerAuth()
@Controller('collections')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CollectionsController {
  constructor(private service: CollectionsService) {}

  @RequireModule(SystemModule.COLECOES, 'view')
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @RequireModule(SystemModule.COLECOES, 'view')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @RequireModule(SystemModule.COLECOES, 'create')
  @Post()
  create(@Body() dto: CreateCollectionDto) {
    return this.service.create(dto);
  }

  @RequireModule(SystemModule.COLECOES, 'edit')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCollectionDto) {
    return this.service.update(id, dto);
  }

  @RequireModule(SystemModule.COLECOES, 'delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
