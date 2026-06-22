import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreatePipelineColumnDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdatePipelineColumnDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class ReorderPipelineColumnsDto {
  @ApiProperty({ type: [String] })
  @IsString({ each: true })
  columnIds: string[];
}

export class MovePipelineCardDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  columnId: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  position: number;
}
