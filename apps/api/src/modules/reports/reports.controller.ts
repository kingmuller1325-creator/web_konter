import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { ReportsService } from './reports.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UseGuards } from '@nestjs/common';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('sales')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get sales report' })
  @ApiQuery({ name: 'startDate', required: true, type: String, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: true, type: String, example: '2024-01-31' })
  async getSalesReport(
    @CurrentUser('outletId') outletId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getSalesReport(outletId, startDate, endDate);
  }

  @Get('products')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get product sales report' })
  @ApiQuery({ name: 'startDate', required: true, type: String, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: true, type: String, example: '2024-01-31' })
  async getProductReport(
    @CurrentUser('outletId') outletId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getProductReport(outletId, startDate, endDate);
  }

  @Get('stock')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get stock report' })
  async getStockReport(@CurrentUser('outletId') outletId: string) {
    return this.reportsService.getStockReport(outletId);
  }

  @Get('profit-loss')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get profit & loss report' })
  @ApiQuery({ name: 'startDate', required: true, type: String, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: true, type: String, example: '2024-01-31' })
  async getProfitLossReport(
    @CurrentUser('outletId') outletId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getProfitLossReport(outletId, startDate, endDate);
  }
}