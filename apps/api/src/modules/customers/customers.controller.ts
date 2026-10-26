import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UseGuards } from '@nestjs/common';

@ApiTags('Customers')
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Get all customers' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @CurrentUser('outletId') outletId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ) {
    return this.customersService.findAll(outletId, +page, +limit, search);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Get customer by ID' })
  async findById(@Param('id') id: string, @CurrentUser('outletId') outletId: string) {
    return this.customersService.findById(id, outletId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.CASHIER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new customer' })
  async create(
    @Body() createCustomerDto: CreateCustomerDto,
    @CurrentUser('outletId') outletId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.customersService.create(outletId, createCustomerDto, userId);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Update customer' })
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @CurrentUser('outletId') outletId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.customersService.update(id, outletId, updateCustomerDto, userId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete customer' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('outletId') outletId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.customersService.delete(id, outletId, userId);
  }
}