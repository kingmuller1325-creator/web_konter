import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { InventoryService } from './inventory.service';
import { StockInDto } from './dto/stock-in.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UseGuards } from '@nestjs/common';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get('movements')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Get stock movements' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'productId', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: ['IN', 'OUT', 'ADJUSTMENT'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getMovements(
    @CurrentUser('outletId') outletId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('productId') productId?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.inventoryService.getMovements(outletId, +page, +limit, productId, type, startDate, endDate);
  }

  @Get('movements/:id')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Get stock movement by ID' })
  async getMovementById(@Param('id') id: string, @CurrentUser('outletId') outletId: string) {
    return this.inventoryService.getMovementById(id, outletId);
  }

  @Post('stock-in')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record stock in (purchase)' })
  async stockIn(
    @Body() stockInDto: StockInDto,
    @CurrentUser('outletId') outletId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.inventoryService.stockIn(outletId, stockInDto, userId);
  }

  @Post('adjust')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Stock adjustment' })
  async stockAdjustment(
    @Body() body: { productId: string; qty: number; note: string },
    @CurrentUser('outletId') outletId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.inventoryService.stockAdjustment(outletId, body.productId, body.qty, body.note, userId);
  }

  @Get('summary')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Get inventory summary' })
  async getSummary(@CurrentUser('outletId') outletId: string) {
    return this.inventoryService.getStockSummary(outletId);
  }

  @Post('reconcile')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Reconcile stock from movements' })
  async reconcile(@CurrentUser('outletId') outletId: string, @CurrentUser('id') userId: string) {
    return this.inventoryService.reconcileStock(outletId, userId);
  }
}