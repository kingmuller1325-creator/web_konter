import { IsString, IsNumber, Min, IsOptional, IsArray, ValidateNested, IsEnum, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class TransactionItemDto {
  @ApiProperty({ example: 'uuid-product-id' })
  @IsString()
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  qty: number;

  @ApiProperty({ example: 25000 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number = 0;
}

export class PaymentDto {
  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: 'QRIS-REF-123' })
  @IsOptional()
  @IsString()
  reference?: string;
}

export class CreateTransactionDto {
  @ApiProperty({ example: 'uuid-v4-client-generated' })
  @IsString()
  @IsUUID()
  clientTxnId: string;

  @ApiPropertyOptional({ example: 'uuid-customer-id' })
  @IsOptional()
  @IsString()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ example: 'uuid-shift-id' })
  @IsOptional()
  @IsString()
  @IsUUID()
  shiftId?: string;

  @ApiProperty({ type: [TransactionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransactionItemDto)
  items: TransactionItemDto[];

  @ApiProperty({ type: [PaymentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentDto)
  payments: PaymentDto[];

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number = 0;

  @ApiPropertyOptional({ example: 'Transaksi kasir' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ example: '2024-01-15T10:30:00Z' })
  @IsOptional()
  @IsString()
  createdAt?: string;
}