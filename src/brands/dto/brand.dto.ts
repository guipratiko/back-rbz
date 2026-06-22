import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { BrandStatus } from '@prisma/client';

export class RepresentativeLinkDto {
  @ApiProperty() @IsString() representativeId: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() metaMarca?: number;
}

export class CreateBrandDto {
  @ApiPropertyOptional() @IsOptional() @IsString() nome?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nomeFantasia?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cnpj?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() razaoSocial?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descricao?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() telefone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cidade?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() estado?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() endereco?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cep?: string;
  @ApiPropertyOptional({ enum: BrandStatus }) @IsOptional() @IsEnum(BrandStatus) status?: BrandStatus;
  @ApiPropertyOptional() @IsOptional() @IsNumber() metaAnual?: number;
  @ApiPropertyOptional({ type: [RepresentativeLinkDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RepresentativeLinkDto)
  representativeLinks?: RepresentativeLinkDto[];
  /** @deprecated use representativeLinks */
  @ApiPropertyOptional() @IsOptional() @IsArray() representativeIds?: string[];
}

export class UpdateBrandDto extends PartialType(CreateBrandDto) {}
