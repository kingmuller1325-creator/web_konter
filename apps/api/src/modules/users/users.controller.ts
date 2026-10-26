import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UseGuards } from '@nestjs/common';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all users' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @CurrentUser('outletId') outletId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll(outletId, +page, +limit, search);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get user by ID' })
  async findById(@Param('id') id: string, @CurrentUser('outletId') outletId: string) {
    return this.usersService.findById(id, outletId);
  }

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new user' })
  async create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser('outletId') outletId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.usersService.create(outletId, createUserDto, userId);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update user' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser('outletId') outletId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.usersService.update(id, outletId, updateUserDto, userId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete user' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('outletId') outletId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.usersService.delete(id, outletId, userId);
  }

  @Put(':id/toggle-status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Toggle user active status' })
  async toggleStatus(
    @Param('id') id: string,
    @CurrentUser('outletId') outletId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.usersService.toggleStatus(id, outletId, userId);
  }
}