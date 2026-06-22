import { IsString, IsOptional, IsEmail, IsNumber, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateRepresentativeDto {
  @ApiProperty() @IsString() nome: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiPropertyOptional() @IsOptional() @IsString() foto?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() telefone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() whatsapp?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() metaConsolidada?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() brandIds?: string[];
}

export class UpdateRepresentativeDto extends PartialType(CreateRepresentativeDto) {}
