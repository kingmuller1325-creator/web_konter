import { Controller, Post, Get, Body, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { SyncService } from './sync.service';
import { SyncPushDto } from './dto/sync.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Role } from '@prisma/client';

@ApiTags('Sync')
@Controller('sync')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SyncController {
  constructor(private syncService: SyncService) {}

  @Post('push')
  @ApiOperation({ summary: 'Push offline operations to server' })
  async push(
    @Body() syncPushDto: SyncPushDto,
    @CurrentUser('outletId') outletId: string,
    @CurrentUser('id') userId: string,
    @Query('deviceId') deviceId: string,
  ) {
    if (!deviceId) {
      throw new BadRequestException('deviceId query parameter is required');
    }
    return this.syncService.push(outletId, deviceId, syncPushDto, userId);
  }

  @Get('pull')
  @ApiOperation({ summary: 'Pull master data and updates from server' })
  @ApiQuery({ name: 'since', required: false, type: String })
  @ApiQuery({ name: 'entities', required: false, type: String, example: 'products,categories,customers' })
  @ApiQuery({ name: 'deviceId', required: true, type: String })
  async pull(
    @CurrentUser('outletId') outletId: string,
    @Query('since') since?: string,
    @Query('entities') entities?: string,
    @Query('deviceId') deviceId?: string,
  ) {
    if (!deviceId) {
      throw new BadRequestException('deviceId query parameter is required');
    }

    const entityList = entities ? entities.split(',') : ['products', 'categories', 'customers', 'transactions'];

    return this.syncService.pull(outletId, deviceId, { since, entities: entityList });
  }

  @Get('status')
  @ApiOperation({ summary: 'Get sync status for device' })
  @ApiQuery({ name: 'deviceId', required: true, type: String })
  async getStatus(
    @CurrentUser('outletId') outletId: string,
    @Query('deviceId') deviceId: string,
  ) {
    return this.syncService.getSyncStatus(outletId, deviceId);
  }
}