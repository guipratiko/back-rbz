import { IsString, IsEnum, IsNumber, IsDateString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CollectionSeason, CollectionStatus } from '@prisma/client';

export class BrandLinkDto {
  @ApiProperty() @IsString() brandId: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() meta?: number;
}

export class CreateCollectionDto {
  @ApiProperty() @IsString() nome: string;
  @ApiProperty() @IsNumber() ano: number;
  @ApiProperty({ enum: CollectionSeason }) @IsEnum(CollectionSeason) temporada: CollectionSeason;
  @ApiProperty() @IsDateString() dataInicio: string;
  @ApiProperty() @IsDateString() dataEncerramento: string;
  @ApiPropertyOptional({ enum: CollectionStatus }) @IsOptional() @IsEnum(CollectionStatus) status?: CollectionStatus;
  @ApiPropertyOptional({ type: [BrandLinkDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BrandLinkDto)
  brandLinks?: BrandLinkDto[];
  /** @deprecated use brandLinks */
  @ApiPropertyOptional() @IsOptional() @IsArray() brandIds?: string[];
}

export class UpdateCollectionDto extends PartialType(CreateCollectionDto) {}
