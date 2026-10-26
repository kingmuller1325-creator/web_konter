import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { OutletsService } from './outlets.service';
import { CreateOutletDto } from './dto/create-outlet.dto';
import { UpdateOutletDto } from './dto/update-outlet.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UseGuards } from '@nestjs/common';

@ApiTags('Outlets')
@Controller('outlets')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OutletsController {
  constructor(private outletsService: OutletsService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all outlets (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ) {
    return this.outletsService.findAll(+page, +limit, search);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user outlet' })
  async getMyOutlet(@CurrentUser('outletId') outletId: string) {
    return this.outletsService.getMyOutlet(outletId);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get outlet by ID' })
  async findById(@Param('id') id: string) {
    return this.outletsService.findById(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new outlet' })
  async create(
    @Body() createOutletDto: CreateOutletDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.outletsService.create(createOutletDto, userId);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update outlet' })
  async update(
    @Param('id') id: string,
    @Body() updateOutletDto: UpdateOutletDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.outletsService.update(id, updateOutletDto, userId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete outlet' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.outletsService.delete(id, userId);
  }
}