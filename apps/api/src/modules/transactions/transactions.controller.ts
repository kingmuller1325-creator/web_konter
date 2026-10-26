import { Controller, Get, Post, Put, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { VoidTransactionDto } from './dto/void-transaction.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UseGuards } from '@nestjs/common';

@ApiTags('Transactions')
@Controller('transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Get all transactions with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'cashierId', required: false, type: String })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  @ApiQuery({ name: 'shiftId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['COMPLETED', 'VOIDED', 'PENDING_SYNC', 'FAILED'] })
  @ApiQuery({ name: 'paymentMethod', required: false, enum: ['CASH', 'QRIS', 'TRANSFER', 'EWALLET', 'SPLIT'] })
  async findAll(
    @CurrentUser('outletId') outletId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('cashierId') cashierId?: string,
    @Query('customerId') customerId?: string,
    @Query('shiftId') shiftId?: string,
    @Query('status') status?: string,
    @Query('paymentMethod') paymentMethod?: string,
  ) {
    return this.transactionsService.findAll(outletId, +page, +limit, {
      startDate,
      endDate,
      cashierId,
      customerId,
      shiftId,
      status,
      paymentMethod,
    });
  }

  @Get('daily-summary')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Get daily sales summary' })
  @ApiQuery({ name: 'date', required: true, type: String })
  async getDailySummary(
    @CurrentUser('outletId') outletId: string,
    @Query('date') date: string,
  ) {
    return this.transactionsService.getDailySummary(outletId, date);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Get transaction by ID' })
  async findById(@Param('id') id: string, @CurrentUser('outletId') outletId: string) {
    return this.transactionsService.findById(id, outletId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.CASHIER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new transaction (idempotent with clientTxnId)' })
  async create(
    @Body() createTransactionDto: CreateTransactionDto,
    @CurrentUser('outletId') outletId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.transactionsService.create(outletId, createTransactionDto, userId);
  }

  @Put(':id/void')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Void transaction (admin only)' })
  async void(
    @Param('id') id: string,
    @Body() voidTransactionDto: VoidTransactionDto,
    @CurrentUser('outletId') outletId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.transactionsService.void(outletId, id, voidTransactionDto.reason, userId);
  }
}