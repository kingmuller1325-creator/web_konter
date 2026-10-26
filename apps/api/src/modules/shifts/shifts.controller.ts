import { Controller, Get, Post, Put, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { ShiftsService } from './shifts.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UseGuards } from '@nestjs/common';

@ApiTags('Shifts')
@Controller('shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ShiftsController {
  constructor(private shiftsService: ShiftsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Get all shifts' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['OPEN', 'CLOSED'] })
  async findAll(
    @CurrentUser('outletId') outletId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
  ) {
    return this.shiftsService.findAll(outletId, +page, +limit, status);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current open shift for cashier' })
  async getCurrentShift(
    @CurrentUser('outletId') outletId: string,
    @CurrentUser('id') cashierId: string,
  ) {
    return this.shiftsService.getCurrentShift(outletId, cashierId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Get shift by ID' })
  async findById(@Param('id') id: string, @CurrentUser('outletId') outletId: string) {
    return this.shiftsService.findById(id, outletId);
  }

  @Get(':id/summary')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Get shift summary' })
  async getSummary(@Param('id') id: string, @CurrentUser('outletId') outletId: string) {
    return this.shiftsService.getSummary(id, outletId);
  }

  @Post('open')
  @Roles(Role.ADMIN, Role.CASHIER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Open new shift' })
  async open(
    @Body() openShiftDto: OpenShiftDto,
    @CurrentUser('outletId') outletId: string,
    @CurrentUser('id') cashierId: string,
  ) {
    return this.shiftsService.open(outletId, cashierId, openShiftDto);
  }

  @Put(':id/close')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Close shift' })
  async close(
    @Param('id') id: string,
    @Body() closeShiftDto: CloseShiftDto,
    @CurrentUser('outletId') outletId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.shiftsService.close(outletId, id, closeShiftDto, userId);
  }
}