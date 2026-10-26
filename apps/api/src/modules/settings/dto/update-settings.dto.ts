import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSettingsDto {
  @ApiProperty({
    example: {
      receipt_header: 'Konter Pulsa Budi',
      receipt_footer: 'Terima kasih atas kunjungan Anda',
      tax_rate: 0.11,
      low_stock_threshold: 5,
      auto_print_receipt: true,
    },
  })
  @IsObject()
  settings: Record<string, any>;
}