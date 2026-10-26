import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SyncPushDto, SyncPullDto } from './dto/sync.dto';
import { TransactionsService } from '../transactions/transactions.service';

@Injectable()
export class SyncService {
  constructor(
    private prisma: PrismaService,
    private transactionsService: TransactionsService,
  ) {}

  async push(outletId: string, deviceId: string, syncPushDto: SyncPushDto, userId: string) {
    const results = [];

    for (const operation of syncPushDto.operations) {
      try {
        let result: any;

        switch (operation.type) {
          case 'CREATE_TRANSACTION':
            result = await this.handleCreateTransaction(outletId, deviceId, operation, userId);
            break;
          default:
            result = { status: 'failed', error: `Unknown operation type: ${operation.type}` };
        }

        results.push({
          clientTxnId: operation.clientTxnId || operation.payload?.clientTxnId,
          ...result,
        });
      } catch (error) {
        results.push({
          clientTxnId: operation.clientTxnId || operation.payload?.clientTxnId,
          status: 'failed',
          error: error.message,
        });
      }
    }

    // Update sync metadata
    await this.updateSyncMetadata(outletId, deviceId, 'transactions', new Date());

    return { results };
  }

  private async handleCreateTransaction(outletId: string, deviceId: string, operation: any, userId: string) {
    const { clientTxnId, payload } = operation;

    // Check if already synced
    const existing = await this.prisma.transaction.findFirst({
      where: { clientTxnId, outletId },
    });

    if (existing) {
      return { status: 'synced', serverId: existing.id, idempotent: true };
    }

    // Never trust a cashierId supplied by the client; use the authenticated user.
    const result = await this.transactionsService.create(
      outletId,
      { ...payload, clientTxnId },
      userId,
    );

    return { status: 'synced', serverId: result.id, idempotent: false };
  }

  async pull(outletId: string, deviceId: string, syncPullDto: SyncPullDto) {
    const { since, entities = [] } = syncPullDto;
    const sinceDate = since ? new Date(since) : new Date(0);

    const response: any = {};

    if (entities.includes('products')) {
      const products = await this.prisma.product.findMany({
        where: {
          outletId,
          isActive: true,
          updatedAt: { gt: sinceDate },
        },
        select: {
          id: true,
          sku: true,
          barcode: true,
          name: true,
          unit: true,
          sellPrice: true,
          costPrice: true,
          stockQty: true,
          minStock: true,
          isDigital: true,
          categoryId: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'asc' },
      });
      response.products = products;
    }

    if (entities.includes('categories')) {
      const categories = await this.prisma.category.findMany({
        where: {
          outletId,
          isActive: true,
          updatedAt: { gt: sinceDate },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          sortOrder: true,
          updatedAt: true,
        },
        orderBy: { sortOrder: 'asc' },
      });
      response.categories = categories;
    }

    if (entities.includes('customers')) {
      const customers = await this.prisma.customer.findMany({
        where: {
          outletId,
          updatedAt: { gt: sinceDate },
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          address: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'asc' },
      });
      response.customers = customers;
    }

    if (entities.includes('transactions')) {
      // Return transactions that need to be known by client (e.g., voided by admin)
      const transactions = await this.prisma.transaction.findMany({
        where: {
          outletId,
          updatedAt: { gt: sinceDate },
        },
        select: {
          id: true,
          clientTxnId: true,
          status: true,
          voidedAt: true,
          voidReason: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'asc' },
        take: 100,
      });
      response.transactions = transactions;
    }

    // Update sync metadata
    for (const entity of entities) {
      await this.updateSyncMetadata(outletId, deviceId, entity, new Date(), true);
    }

    return response;
  }

  private async updateSyncMetadata(
    outletId: string,
    deviceId: string,
    entity: string,
    timestamp: Date,
    isPull = false,
  ) {
    await this.prisma.syncMetadata.upsert({
      where: {
        outletId_deviceId_entity: { outletId, deviceId, entity },
      },
      update: isPull ? { lastPulledAt: timestamp } : { lastSyncedAt: timestamp },
      create: {
        outletId,
        deviceId,
        entity,
        lastSyncedAt: isPull ? new Date(0) : timestamp,
        lastPulledAt: isPull ? timestamp : new Date(0),
      },
    });
  }

  async getSyncStatus(outletId: string, deviceId: string) {
    const metadata = await this.prisma.syncMetadata.findMany({
      where: { outletId, deviceId },
    });

    return metadata.map((m) => ({
      entity: m.entity,
      lastSyncedAt: m.lastSyncedAt,
      lastPulledAt: m.lastPulledAt,
    }));
  }
}