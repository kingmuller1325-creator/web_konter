import { Controller, Get, Put, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UseGuards } from '@nestjs/common';

@ApiTags('Settings')
@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all settings' })
  async getAll(@CurrentUser('outletId') outletId: string) {
    return this.settingsService.getAll(outletId);
  }

  @Get(':key')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get setting by key' })
  async getByKey(@CurrentUser('outletId') outletId: string, @Param('key') key: string) {
    return this.settingsService.getByKey(outletId, key);
  }

  @Put()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update settings (bulk)' })
  async update(
    @Body() updateSettingsDto: UpdateSettingsDto,
    @CurrentUser('outletId') outletId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.settingsService.update(outletId, updateSettingsDto, userId);
  }

  @Put('reset')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Reset settings to default' })
  async reset(
    @Body() body: { keys: string[] },
    @CurrentUser('outletId') outletId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.settingsService.reset(outletId, body.keys, userId);
  }
}