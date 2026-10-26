import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getAll(outletId: string) {
    const settings = await this.prisma.setting.findMany({
      where: { outletId },
    });

    // Convert to key-value object
    const result: Record<string, any> = {};
    for (const setting of settings) {
      result[setting.key] = setting.value;
    }

    return result;
  }

  async getByKey(outletId: string, key: string) {
    const setting = await this.prisma.setting.findUnique({
      where: { outletId_key: { outletId, key } },
    });

    if (!setting) {
      throw new NotFoundException(`Setting ${key} tidak ditemukan`);
    }

    return setting.value;
  }

  async update(outletId: string, updateSettingsDto: UpdateSettingsDto, updatedBy: string) {
    const results = [];

    for (const [key, value] of Object.entries(updateSettingsDto.settings)) {
      const existing = await this.prisma.setting.findUnique({
        where: { outletId_key: { outletId, key } },
      });

      if (existing) {
        await this.prisma.setting.update({
          where: { outletId_key: { outletId, key } },
          data: { value: value as any },
        });

        // Audit log
        await this.prisma.auditLog.create({
          data: {
            outletId,
            userId: updatedBy,
            action: 'UPDATE_SETTING',
            entity: 'Setting',
            entityId: key,
            oldData: { key, value: existing.value },
            newData: { key, value },
          },
        });
      } else {
        await this.prisma.setting.create({
          data: { outletId, key, value: value as any },
        });

        // Audit log
        await this.prisma.auditLog.create({
          data: {
            outletId,
            userId: updatedBy,
            action: 'CREATE_SETTING',
            entity: 'Setting',
            entityId: key,
            newData: { key, value },
          },
        });
      }

      results.push({ key, value });
    }

    return { settings: results };
  }

  async reset(outletId: string, keys: string[], resetBy: string) {
    // Delete specified settings
    await this.prisma.setting.deleteMany({
      where: { outletId, key: { in: keys } },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        outletId,
        userId: resetBy,
        action: 'RESET_SETTINGS',
        entity: 'Setting',
        newData: { keys },
      },
    });

    return { message: 'Pengaturan direset', keys };
  }
}