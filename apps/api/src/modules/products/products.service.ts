import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    outletId: string,
    page = 1,
    limit = 20,
    search?: string,
    categoryId?: string,
    isDigital?: boolean,
    isActive?: boolean,
    lowStock?: boolean,
  ) {
    const where: any = { outletId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (isDigital !== undefined) where.isDigital = isDigital;
    if (isActive !== undefined) where.isActive = isActive;

    if (lowStock) {
      const lowStockIds = await this.getLowStockIds(outletId);
      if (lowStockIds.length === 0) {
        return { data: [], total: 0 };
      }
      where.id = { in: lowStockIds };
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ isDigital: 'asc' }, { name: 'asc' }],
        include: { category: { select: { id: true, name: true } } },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data, total };
  }

  async findAllForPOS(outletId: string, search?: string) {
    const where: any = { outletId, isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.product.findMany({
      where,
      orderBy: [{ isDigital: 'asc' }, { name: 'asc' }],
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
        isActive: true,
        isDigital: true,
        category: { select: { id: true, name: true } },
      },
    });
  }

  async findByBarcode(barcode: string, outletId: string) {
    const product = await this.prisma.product.findFirst({
      where: { barcode, outletId, isActive: true },
      include: { category: { select: { id: true, name: true } } },
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    return product;
  }

  async findById(id: string, outletId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, outletId },
      include: { category: { select: { id: true, name: true } } },
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    return product;
  }

  async create(outletId: string, createProductDto: CreateProductDto, createdBy: string) {
    // Check SKU uniqueness
    const existingSku = await this.prisma.product.findUnique({
      where: { outletId_sku: { outletId, sku: createProductDto.sku } },
    });
    if (existingSku) {
      throw new ConflictException('SKU sudah digunakan');
    }

    // Check barcode uniqueness if provided
    if (createProductDto.barcode) {
      const existingBarcode = await this.prisma.product.findFirst({
        where: { outletId, barcode: createProductDto.barcode },
      });
      if (existingBarcode) {
        throw new ConflictException('Barcode sudah digunakan');
      }
    }

    const product = await this.prisma.product.create({
      data: {
        ...createProductDto,
        outletId,
        costPrice: new Decimal(createProductDto.costPrice),
        sellPrice: new Decimal(createProductDto.sellPrice),
      },
      include: { category: { select: { id: true, name: true } } },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        outletId,
        userId: createdBy,
        action: 'CREATE_PRODUCT',
        entity: 'Product',
        entityId: product.id,
        newData: JSON.parse(JSON.stringify(createProductDto)),
      },
    });

    return product;
  }

  async update(id: string, outletId: string, updateProductDto: UpdateProductDto, updatedBy: string) {
    const existingProduct = await this.findById(id, outletId);

    // Check SKU uniqueness if changing
    if (updateProductDto.sku && updateProductDto.sku !== existingProduct.sku) {
      const existingSku = await this.prisma.product.findUnique({
        where: { outletId_sku: { outletId, sku: updateProductDto.sku } },
      });
      if (existingSku) {
        throw new ConflictException('SKU sudah digunakan');
      }
    }

    // Check barcode uniqueness if changing
    if (updateProductDto.barcode && updateProductDto.barcode !== existingProduct.barcode) {
      const existingBarcode = await this.prisma.product.findFirst({
        where: { outletId, barcode: updateProductDto.barcode, NOT: { id } },
      });
      if (existingBarcode) {
        throw new ConflictException('Barcode sudah digunakan');
      }
    }

    const data: any = { ...updateProductDto };
    if (updateProductDto.costPrice !== undefined) {
      data.costPrice = new Decimal(updateProductDto.costPrice);
    }
    if (updateProductDto.sellPrice !== undefined) {
      data.sellPrice = new Decimal(updateProductDto.sellPrice);
    }

    const product = await this.prisma.product.update({
      where: { id },
      data,
      include: { category: { select: { id: true, name: true } } },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        outletId,
        userId: updatedBy,
        action: 'UPDATE_PRODUCT',
        entity: 'Product',
        entityId: id,
        oldData: JSON.parse(JSON.stringify(existingProduct)),
        newData: JSON.parse(JSON.stringify(data)),
      },
    });

    return product;
  }

  async delete(id: string, outletId: string, deletedBy: string) {
    const product = await this.findById(id, outletId);

    // Check if product has transactions
    const transactionCount = await this.prisma.transactionItem.count({
      where: { productId: id },
    });

    if (transactionCount > 0) {
      // Soft delete - just mark as inactive
      await this.prisma.product.update({
        where: { id },
        data: { isActive: false },
      });

      // Audit log
      await this.prisma.auditLog.create({
        data: {
          outletId,
          userId: deletedBy,
          action: 'DEACTIVATE_PRODUCT',
          entity: 'Product',
          entityId: id,
        },
      });

      return { message: 'Produk dinonaktifkan (masih memiliki riwayat transaksi)' };
    }

    // Hard delete if no transactions
    await this.prisma.product.delete({ where: { id } });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        outletId,
        userId: deletedBy,
        action: 'DELETE_PRODUCT',
        entity: 'Product',
        entityId: id,
      },
    });

    return { message: 'Produk berhasil dihapus' };
  }

  async adjustStock(id: string, outletId: string, qty: number, note: string, adjustedBy: string) {
    const product = await this.findById(id, outletId);
    const newStock = product.stockQty + qty;

    if (newStock < 0) {
      throw new BadRequestException('Stok tidak boleh negatif');
    }

    // Update product stock
    const updated = await this.prisma.product.update({
      where: { id },
      data: { stockQty: newStock },
    });

    // Create stock movement (signed qty: positive IN, negative OUT)
    await this.prisma.stockMovement.create({
      data: {
        outletId,
        productId: id,
        type: 'ADJUSTMENT',
        qty,
        refType: 'adjustment',
        note,
        createdBy: adjustedBy,
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        outletId,
        userId: adjustedBy,
        action: 'ADJUST_STOCK',
        entity: 'Product',
        entityId: id,
        oldData: { stockQty: product.stockQty },
        newData: { stockQty: newStock, adjustment: qty, note },
      },
    });

    return updated;
  }

  private async getLowStockIds(outletId: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Product"
      WHERE "outletId" = ${outletId}
        AND "isActive" = true
        AND "stockQty" <= "minStock"
    `;
    return rows.map((row) => row.id);
  }

  async getLowStock(outletId: string) {
    const ids = await this.getLowStockIds(outletId);
    if (ids.length === 0) return [];

    return this.prisma.product.findMany({
      where: { id: { in: ids } },
      orderBy: { stockQty: 'asc' },
      include: { category: { select: { id: true, name: true } } },
    });
  }
}