import { IsArray, ValidateNested, IsOptional, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SyncOperationDto {
  @ApiProperty({ example: 'CREATE_TRANSACTION' })
  @IsString()
  @IsEnum(['CREATE_TRANSACTION'])
  type: string;

  @ApiPropertyOptional({ example: 'uuid-v4-client-generated' })
  @IsOptional()
  @IsString()
  clientTxnId?: string;

  @ApiProperty({ type: Object })
  payload: any;
}

export class SyncPushDto {
  @ApiProperty({ type: [SyncOperationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncOperationDto)
  operations: SyncOperationDto[];
}

export class SyncPullDto {
  @ApiPropertyOptional({ example: '2024-01-15T10:00:00Z' })
  @IsOptional()
  @IsString()
  since?: string;

  @ApiPropertyOptional({ type: [String], example: ['products', 'categories', 'customers', 'transactions'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsEnum(['products', 'categories', 'customers', 'transactions'], { each: true })
  entities?: string[] = ['products', 'categories', 'customers', 'transactions'];
}