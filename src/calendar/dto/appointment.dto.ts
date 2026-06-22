import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { AppointmentType, AppointmentStatus } from '@prisma/client';

export class CreateAppointmentDto {
  @ApiProperty() @IsString() clientId: string;
  @ApiProperty() @IsString() representativeId: string;
  @ApiProperty() @IsDateString() data: string;
  @ApiProperty() @IsString() hora: string;
  @ApiProperty({ enum: AppointmentType }) @IsEnum(AppointmentType) tipo: AppointmentType;
  @ApiPropertyOptional() @IsOptional() @IsString() local?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() participantes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() objetivo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() observacoes?: string;
}

export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) {
  @ApiPropertyOptional({ enum: AppointmentStatus }) @IsOptional() @IsEnum(AppointmentStatus) status?: AppointmentStatus;
}
