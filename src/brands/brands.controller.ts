import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BrandsService } from './brands.service';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';
import { JwtAuthGuard, PermissionsGuard } from '../common/guards/auth.guards';
import { RequireModule, CurrentUser } from '../common/decorators/auth.decorator';
import { SystemModule } from '../common/enums/modules.enum';
import { AuthUser } from '../common/interfaces/auth-user.interface';

@ApiTags('Brands')
@ApiBearerAuth()
@Controller('brands')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BrandsController {
  constructor(private brandsService: BrandsService) {}

  @RequireModule(SystemModule.MARCAS, 'view')
  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.brandsService.findAll(user);
  }

  @RequireModule(SystemModule.MARCAS, 'view')
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.brandsService.findOne(id, user);
  }

  @RequireModule(SystemModule.MARCAS, 'create')
  @Post()
  create(@Body() dto: CreateBrandDto) {
    return this.brandsService.create(dto);
  }

  @RequireModule(SystemModule.MARCAS, 'edit')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBrandDto, @CurrentUser() user: AuthUser) {
    return this.brandsService.update(id, dto, user);
  }

  @RequireModule(SystemModule.MARCAS, 'delete')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.brandsService.remove(id, user);
  }
}
