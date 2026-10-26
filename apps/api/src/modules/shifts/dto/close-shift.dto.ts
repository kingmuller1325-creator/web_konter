import { IsNumber, Min, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CloseShiftDto {
  @ApiProperty({ example: 1500000, description: 'Uang penutup kasir (fisik)' })
  @IsNumber()
  @Min(0)
  closingCash: number;

  @ApiPropertyOptional({ example: 'Selisih 5000' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}