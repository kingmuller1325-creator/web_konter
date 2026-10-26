import { IsString, MinLength, MaxLength, IsOptional, IsNumber, Min, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'SKU001' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  sku: string;

  @ApiPropertyOptional({ example: '8999999123456' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  barcode?: string;

  @ApiProperty({ example: 'Pulsa Telkomsel 25K' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Pulsa reguler Telkomsel nominal 25.000' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 'pcs' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string = 'pcs';

  @ApiProperty({ example: 24000 })
  @IsNumber()
  @Min(0)
  costPrice: number;

  @ApiProperty({ example: 25000 })
  @IsNumber()
  @Min(0)
  sellPrice: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number = 5;

  @ApiPropertyOptional({ enum: ['digital', 'physical'] })
  @IsOptional()
  @IsBoolean()
  isDigital?: boolean = false;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;
}