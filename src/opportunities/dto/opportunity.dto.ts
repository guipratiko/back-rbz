import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { OpportunityStatus, PipelineStage, LossReason } from '@prisma/client';

export class CreateOpportunityDto {
  @ApiProperty() @IsString() clientId: string;
  @ApiProperty() @IsString() brandId: string;
  @ApiProperty() @IsString() collectionId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() representativeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() meta?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() orcamento?: number;
  @ApiPropertyOptional({ enum: OpportunityStatus }) @IsOptional() @IsEnum(OpportunityStatus) status?: OpportunityStatus;
  @ApiPropertyOptional({ enum: PipelineStage }) @IsOptional() @IsEnum(PipelineStage) pipelineStage?: PipelineStage;
  @ApiPropertyOptional() @IsOptional() @IsString() observacoes?: string;
}

export class UpdateOpportunityDto extends PartialType(CreateOpportunityDto) {
  @ApiPropertyOptional() @IsOptional() @IsNumber() valorVendido?: number;
  @ApiPropertyOptional({ enum: LossReason }) @IsOptional() @IsEnum(LossReason) lossReason?: LossReason;
}

export class UpdatePipelineDto {
  @ApiProperty({ enum: PipelineStage }) @IsEnum(PipelineStage) pipelineStage: PipelineStage;
  @ApiPropertyOptional({ enum: LossReason }) @IsOptional() @IsEnum(LossReason) lossReason?: LossReason;
}
