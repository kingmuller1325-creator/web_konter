import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VoidTransactionDto {
  @ApiProperty({ example: 'txn_123' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'Pelanggan membatalkan pembelian' })
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  reason: string;
}