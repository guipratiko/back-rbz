import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsEmail,
  IsArray,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ClientStatus, GrupoRbz, LeadSource } from '@prisma/client';

export class CreateClientDto {
  @ApiProperty() @IsString() razaoSocial: string;
  @ApiProperty() @IsString() nomeFantasia: string;
  @ApiProperty() @IsString() cnpj: string;
  @ApiPropertyOptional() @IsOptional() @IsString() inscricaoEstadual?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() telefone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() whatsapp?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() instagram?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cidade?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() estado?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() endereco?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cep?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() segmento?: string;
  @ApiPropertyOptional({ enum: ClientStatus }) @IsOptional() @IsEnum(ClientStatus) status?: ClientStatus;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() clienteCarteira?: boolean;
  @ApiPropertyOptional({ enum: GrupoRbz }) @IsOptional() @IsEnum(GrupoRbz) grupoRbz?: GrupoRbz;
  @ApiPropertyOptional() @IsOptional() @IsString() principalBrandId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() collectionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() representativeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() primeiroContato?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() ultimaInteracao?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() compraDesde?: string;
  @ApiPropertyOptional({ enum: LeadSource }) @IsOptional() @IsEnum(LeadSource) leadSource?: LeadSource;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) faturamentoCiclo?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) ticketMedio?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) pedidosCiclo?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) frequenciaCompra?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) potencialEstimado?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() observacoes?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() receberNovidades?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() receberConteudos?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() lgpdAutorizado?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) brandIds?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() pipelineColumnId?: string;
}

export class UpdateClientDto extends PartialType(CreateClientDto) {}

export class CreateObservationDto {
  @ApiProperty() @IsString() content: string;
}
