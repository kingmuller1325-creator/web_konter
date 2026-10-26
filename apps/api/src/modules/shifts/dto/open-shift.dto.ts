import { IsNumber, Min, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OpenShiftDto {
  @ApiProperty({ example: 500000, description: 'Uang pembuka kasir' })
  @IsNumber()
  @Min(0)
  openingCash: number;

  @ApiPropertyOptional({ example: 'Shift pagi' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}