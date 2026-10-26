import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StockInDto } from './dto/stock-in.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getMovements(
    outletId: string,
    page = 1,
    limit = 20,
    productId?: string,
    type?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = { outletId };
    if (productId) where.productId = productId;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, sku: true, name: true } },
        },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return { data, total };
  }

  async getMovementById(id: string, outletId: string) {
    const movement = await this.prisma.stockMovement.findFirst({
      where: { id, outletId },
      include: { product: { select: { id: true, sku: true, name: true } } },
    });

    if (!movement) {
      throw new NotFoundException('Pergerakan stok tidak ditemukan');
    }

    return movement;
  }

  async stockIn(outletId: string, stockInDto: StockInDto, createdBy: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: stockInDto.productId, outletId },
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    // Update product stock
    const newStock = product.stockQty + stockInDto.qty;

    const [updatedProduct, movement] = await this.prisma.$transaction([
      this.prisma.product.update({
        where: { id: stockInDto.productId },
        data: { stockQty: newStock },
      }),
      this.prisma.stockMovement.create({
        data: {
          outletId,
          productId: stockInDto.productId,
          type: 'IN',
          qty: stockInDto.qty,
          refType: 'purchase',
          refId: stockInDto.referenceId,
          note: stockInDto.note,
          createdBy,
        },
      }),
    ]);

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        outletId,
        userId: createdBy,
        action: 'STOCK_IN',
        entity: 'Product',
        entityId: stockInDto.productId,
        newData: { qty: stockInDto.qty, referenceId: stockInDto.referenceId, note: stockInDto.note },
      },
    });

    return { product: updatedProduct, movement };
  }

  async stockAdjustment(outletId: string, productId: string, qty: number, note: string, adjustedBy: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, outletId },
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    const newStock = product.stockQty + qty;

    if (newStock < 0) {
      throw new BadRequestException('Stok tidak boleh negatif');
    }

    const [updatedProduct, movement] = await this.prisma.$transaction([
      this.prisma.product.update({
        where: { id: productId },
        data: { stockQty: newStock },
      }),
      this.prisma.stockMovement.create({
        data: {
          outletId,
          productId,
          type: 'ADJUSTMENT',
          qty,
          refType: 'adjustment',
          note,
          createdBy: adjustedBy,
        },
      }),
    ]);

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        outletId,
        userId: adjustedBy,
        action: 'STOCK_ADJUSTMENT',
        entity: 'Product',
        entityId: productId,
        oldData: { stockQty: product.stockQty },
        newData: { stockQty: newStock, adjustment: qty, note },
      },
    });

    return { product: updatedProduct, movement };
  }

  async getStockSummary(outletId: string) {
    const products = await this.prisma.product.findMany({
      where: { outletId, isActive: true },
      select: { costPrice: true, stockQty: true, minStock: true },
    });

    const totalProducts = products.length;
    const lowStockProducts = products.filter(
      (p) => p.stockQty > 0 && p.stockQty <= p.minStock,
    ).length;
    const outOfStockProducts = products.filter((p) => p.stockQty === 0).length;
    const totalStockQty = products.reduce((sum, p) => sum + p.stockQty, 0);
    const totalStockValue = products.reduce(
      (sum, p) => sum + Number(p.costPrice) * p.stockQty,
      0,
    );

    return {
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      totalStockQty,
      totalStockValue,
    };
  }

  async reconcileStock(outletId: string, reconciledBy: string) {
    // Recalculate stock from movements
    const movements = await this.prisma.stockMovement.groupBy({
      by: ['productId'],
      where: { outletId },
      _sum: { qty: true },
    });

    let corrected = 0;
    for (const m of movements) {
      const product = await this.prisma.product.findFirst({
        where: { id: m.productId, outletId },
      });

      if (product && product.stockQty !== m._sum.qty) {
        await this.prisma.product.update({
          where: { id: m.productId },
          data: { stockQty: m._sum.qty || 0 },
        });
        corrected++;
      }
    }

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        outletId,
        userId: reconciledBy,
        action: 'RECONCILE_STOCK',
        entity: 'Inventory',
        newData: { correctedProducts: corrected },
      },
    });

    return { correctedProducts: corrected };
  }
}