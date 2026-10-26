import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { VoidTransactionDto } from './dto/void-transaction.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    outletId: string,
    page = 1,
    limit = 20,
    filters: {
      startDate?: string;
      endDate?: string;
      cashierId?: string;
      customerId?: string;
      shiftId?: string;
      status?: string;
      paymentMethod?: string;
    } = {},
  ) {
    const where: any = { outletId };
    
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }
    if (filters.cashierId) where.cashierId = filters.cashierId;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.shiftId) where.shiftId = filters.shiftId;
    if (filters.status) where.status = filters.status;
    if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          cashier: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true, phone: true } },
          shift: { select: { id: true, openedAt: true } },
          items: {
            include: { product: { select: { id: true, sku: true, name: true } } },
          },
          payments: true,
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string, outletId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, outletId },
      include: {
        cashier: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, phone: true } },
        shift: { select: { id: true, openedAt: true } },
        items: {
          include: { product: { select: { id: true, sku: true, name: true } } },
        },
        payments: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaksi tidak ditemukan');
    }

    return transaction;
  }

  async findByClientTxnId(clientTxnId: string, outletId: string) {
    return this.prisma.transaction.findFirst({
      where: { clientTxnId, outletId },
      include: {
        items: true,
        payments: true,
      },
    });
  }

  async create(outletId: string, createTransactionDto: CreateTransactionDto, cashierId: string) {
    const { clientTxnId, items, payments, customerId, shiftId, discount, note, paymentMethod, createdAt } = createTransactionDto;

    // Check idempotency - if transaction with this clientTxnId already exists
    const existingTxn = await this.findByClientTxnId(clientTxnId, outletId);
    if (existingTxn) {
      return { ...existingTxn, idempotent: true };
    }

    // Validate shift if provided
    if (shiftId) {
      const shift = await this.prisma.shift.findFirst({
        where: { id: shiftId, outletId, status: 'OPEN' },
      });
      if (!shift) {
        throw new BadRequestException('Shift tidak valid atau sudah ditutup');
      }
    }

    // Validate customer if provided
    if (customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: customerId, outletId },
      });
      if (!customer) {
        throw new BadRequestException('Pelanggan tidak ditemukan');
      }
    }

    // Validate products and calculate totals
    const productIds = items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, outletId },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('Satu atau lebih produk tidak ditemukan');
    }

    // Calculate totals and validate stock
    let subtotal = new Decimal(0);
    const transactionItems: Array<{
      productId: string;
      productName: string;
      productSku: string;
      qty: number;
      unitPrice: Decimal;
      costPrice: Decimal;
      discount: Decimal;
      subtotal: Decimal;
    }> = [];

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new BadRequestException(`Produk ${item.productId} tidak ditemukan`);
      }

      // Check stock for non-digital products
      if (!product.isDigital && product.stockQty < item.qty) {
        throw new BadRequestException(
          `Stok tidak mencukupi untuk ${product.name}. Tersedia: ${product.stockQty}, Diminta: ${item.qty}`,
        );
      }

      const unitPrice = new Decimal(item.unitPrice);
      const itemDiscount = new Decimal(item.discount || 0);
      const itemSubtotal = unitPrice.mul(item.qty).sub(itemDiscount);

      subtotal = subtotal.add(itemSubtotal);

      transactionItems.push({
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        qty: item.qty,
        unitPrice,
        costPrice: product.costPrice,
        discount: itemDiscount,
        subtotal: itemSubtotal,
      });
    }

    const totalDiscount = new Decimal(discount || 0);
    const total = subtotal.sub(totalDiscount);

    // Validate payments match total
    const paymentTotal = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    if (Math.abs(paymentTotal - Number(total)) > 0.01) {
      throw new BadRequestException('Total pembayaran tidak sesuai dengan total transaksi');
    }

    // Create transaction in a database transaction
    const transaction = await this.prisma.$transaction(async (tx) => {
      // Create transaction
      const newTxn = await tx.transaction.create({
        data: {
          clientTxnId,
          outletId,
          cashierId,
          customerId,
          shiftId,
          subtotal,
          discount: totalDiscount,
          total,
          paymentMethod,
          status: 'COMPLETED',
          note,
          createdAt: createdAt ? new Date(createdAt) : new Date(),
          syncedAt: new Date(),
        },
      });

      // Create transaction items
      await tx.transactionItem.createMany({
        data: transactionItems.map((item) => ({
          ...item,
          transactionId: newTxn.id,
        })),
      });

      // Create payments
      await tx.payment.createMany({
        data: payments.map((p) => ({
          transactionId: newTxn.id,
          method: p.method,
          amount: new Decimal(p.amount),
          reference: p.reference,
        })),
      });

      // Update stock for non-digital products
      for (const item of transactionItems) {
        const product = products.find((p) => p.id === item.productId);
        if (product && !product.isDigital) {
          // Conditional decrement prevents overselling on concurrent requests
          const result = await tx.product.updateMany({
            where: { id: item.productId, stockQty: { gte: item.qty } },
            data: { stockQty: { decrement: item.qty } },
          });

          if (result.count === 0) {
            throw new BadRequestException(
              `Stok tidak mencukupi untuk ${product.name} (tersedia: ${product.stockQty})`,
            );
          }

          // Create stock movement (signed: OUT is negative)
          await tx.stockMovement.create({
            data: {
              outletId,
              productId: item.productId,
              type: 'OUT',
              qty: -item.qty,
              refType: 'transaction',
              refId: newTxn.id,
              createdBy: cashierId,
            },
          });
        }
      }

      // Only cash physically enters the drawer
      const cashReceived = payments
        .filter((p) => p.method === 'CASH')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      if (shiftId && cashReceived > 0) {
        await tx.shift.update({
          where: { id: shiftId },
          data: { expectedCash: { increment: cashReceived } },
        });
      }

      return newTxn;
    });

    // Fetch complete transaction
    const completeTxn = await this.findById(transaction.id, outletId);

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        outletId,
        userId: cashierId,
        action: 'CREATE_TRANSACTION',
        entity: 'Transaction',
        entityId: transaction.id,
        newData: { clientTxnId, total: Number(total), itemCount: items.length },
      },
    });

    return { ...completeTxn, idempotent: false };
  }

  async void(outletId: string, id: string, reason: string, voidedBy: string) {
    const transaction = await this.findById(id, outletId);

    if (transaction.status === 'VOIDED') {
      throw new BadRequestException('Transaksi sudah dibatalkan');
    }

    if (transaction.status === 'PENDING_SYNC') {
      throw new BadRequestException('Tidak dapat membatalkan transaksi yang belum tersinkronisasi');
    }

    // Restore stock for non-digital products
    await this.prisma.$transaction(async (tx) => {
      // Update transaction status
      await tx.transaction.update({
        where: { id },
        data: {
          status: 'VOIDED',
          voidedAt: new Date(),
          voidReason: reason,
          voidedBy,
        },
      });

      // Restore stock
      for (const item of transaction.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (product && !product.isDigital) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQty: { increment: item.qty } },
          });

          // Create stock movement for restoration
          await tx.stockMovement.create({
            data: {
              outletId,
              productId: item.productId,
              type: 'IN',
              qty: item.qty,
              refType: 'return',
              refId: id,
              note: `Void: ${reason}`,
              createdBy: voidedBy,
            },
          });
        }
      }

      // Update shift expected cash (cash portion only)
      if (transaction.shiftId) {
        const cashReceived = transaction.payments
          .filter((p) => p.method === 'CASH')
          .reduce((sum, p) => sum + Number(p.amount), 0);

        if (cashReceived > 0) {
          await tx.shift.update({
            where: { id: transaction.shiftId },
            data: { expectedCash: { decrement: cashReceived } },
          });
        }
      }
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        outletId,
        userId: voidedBy,
        action: 'VOID_TRANSACTION',
        entity: 'Transaction',
        entityId: id,
        oldData: { status: transaction.status, total: Number(transaction.total) },
        newData: { status: 'VOIDED', reason },
      },
    });

    return { message: 'Transaksi berhasil dibatalkan', voidedAt: new Date() };
  }

  async getDailySummary(outletId: string, date: string) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        outletId,
        status: 'COMPLETED',
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, costPrice: true } } },
        },
        payments: true,
      },
    });

    const summary = {
      date,
      totalTransactions: transactions.length,
      totalRevenue: new Decimal(0),
      totalCost: new Decimal(0),
      totalProfit: new Decimal(0),
      byPaymentMethod: {} as Record<string, { count: number; total: Decimal }>,
      topProducts: [] as any[],
    };

    const productSales: Record<string, { qty: number; revenue: Decimal; cost: Decimal }> = {};

    for (const txn of transactions) {
      summary.totalRevenue = summary.totalRevenue.add(txn.total);

      for (const payment of txn.payments) {
        const method = payment.method;
        if (!summary.byPaymentMethod[method]) {
          summary.byPaymentMethod[method] = { count: 0, total: new Decimal(0) };
        }
        summary.byPaymentMethod[method].count++;
        summary.byPaymentMethod[method].total = summary.byPaymentMethod[method].total.add(payment.amount);
      }

      for (const item of txn.items) {
        const cost = new Decimal(item.costPrice).mul(item.qty);
        summary.totalCost = summary.totalCost.add(cost);

        if (!productSales[item.productId]) {
          productSales[item.productId] = { qty: 0, revenue: new Decimal(0), cost: new Decimal(0) };
        }
        productSales[item.productId].qty += item.qty;
        productSales[item.productId].revenue = productSales[item.productId].revenue.add(item.subtotal);
        productSales[item.productId].cost = productSales[item.productId].cost.add(cost);
      }
    }

    summary.totalProfit = summary.totalRevenue.sub(summary.totalCost);

    // Top 10 products
    summary.topProducts = Object.entries(productSales)
      .map(([productId, data]) => ({
        productId,
        qty: data.qty,
        revenue: Number(data.revenue),
        profit: Number(data.revenue.sub(data.cost)),
      }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    // Convert Decimal to number for response
    return {
      ...summary,
      totalRevenue: Number(summary.totalRevenue),
      totalCost: Number(summary.totalCost),
      totalProfit: Number(summary.totalProfit),
      byPaymentMethod: Object.fromEntries(
        Object.entries(summary.byPaymentMethod).map(([k, v]) => [k, { count: v.count, total: Number(v.total) }]),
      ),
    };
  }
}