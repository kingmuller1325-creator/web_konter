import { IsNumber, Min, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdjustStockDto {
  @ApiProperty({ example: 10, description: 'Positif untuk menambah, negatif untuk mengurangi stok' })
  @IsNumber()
  @Min(-999999)
  qty: number;

  @ApiPropertyOptional({ example: 'Penyesuaian stok fisik' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}