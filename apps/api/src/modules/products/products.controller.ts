import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UseGuards } from '@nestjs/common';

@ApiTags('Products')
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Get all products with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'isDigital', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'lowStock', required: false, type: Boolean })
  async findAll(
    @CurrentUser('outletId') outletId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('isDigital') isDigital?: string,
    @Query('isActive') isActive?: string,
    @Query('lowStock') lowStock?: string,
  ) {
    return this.productsService.findAll(
      outletId,
      +page,
      +limit,
      search,
      categoryId,
      isDigital === undefined ? undefined : isDigital === 'true',
      isActive === undefined ? undefined : isActive === 'true',
      lowStock === undefined ? undefined : lowStock === 'true',
    );
  }

  @Get('pos')
  @ApiOperation({ summary: 'Get products for POS (active only, minimal fields)' })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAllForPOS(
    @CurrentUser('outletId') outletId: string,
    @Query('search') search?: string,
  ) {
    return this.productsService.findAllForPOS(outletId, search);
  }

  @Get('low-stock')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get products with low stock' })
  async getLowStock(@CurrentUser('outletId') outletId: string) {
    return this.productsService.getLowStock(outletId);
  }

  @Get('barcode/:barcode')
  @ApiOperation({ summary: 'Find product by barcode' })
  async findByBarcode(@Param('barcode') barcode: string, @CurrentUser('outletId') outletId: string) {
    return this.productsService.findByBarcode(barcode, outletId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Get product by ID' })
  async findById(@Param('id') id: string, @CurrentUser('outletId') outletId: string) {
    return this.productsService.findById(id, outletId);
  }

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new product' })
  async create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser('outletId') outletId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.productsService.create(outletId, createProductDto, userId);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update product' })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser('outletId') outletId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.productsService.update(id, outletId, updateProductDto, userId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete/deactivate product' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('outletId') outletId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.productsService.delete(id, outletId, userId);
  }

  @Put(':id/adjust-stock')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Adjust product stock' })
  async adjustStock(
    @Param('id') id: string,
    @Body() adjustStockDto: AdjustStockDto,
    @CurrentUser('outletId') outletId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.productsService.adjustStock(id, outletId, adjustStockDto.qty, adjustStockDto.note || '', userId);
  }
}