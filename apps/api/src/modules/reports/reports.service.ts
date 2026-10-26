import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getSalesReport(outletId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        outletId,
        status: 'COMPLETED',
        createdAt: { gte: start, lte: end },
      },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, costPrice: true, category: { select: { name: true } } } } },
        },
        payments: true,
        cashier: { select: { id: true, name: true } },
      },
    });

    const dailyData: Record<string, any> = {};
    const categorySales: Record<string, { qty: number; revenue: Decimal; cost: Decimal }> = {};
    const cashierSales: Record<string, { transactions: number; revenue: Decimal }> = {};

    let totalRevenue = new Decimal(0);
    let totalCost = new Decimal(0);
    let totalTransactions = 0;
    const paymentMethods: Record<string, { count: number; total: Decimal }> = {};

    for (const txn of transactions) {
      const dateKey = txn.createdAt.toISOString().split('T')[0];
      totalRevenue = totalRevenue.add(txn.total);
      totalTransactions++;

      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { date: dateKey, revenue: new Decimal(0), transactions: 0, profit: new Decimal(0) };
      }
      dailyData[dateKey].revenue = dailyData[dateKey].revenue.add(txn.total);
      dailyData[dateKey].transactions++;

      for (const payment of txn.payments) {
        const method = payment.method;
        if (!paymentMethods[method]) {
          paymentMethods[method] = { count: 0, total: new Decimal(0) };
        }
        paymentMethods[method].count++;
        paymentMethods[method].total = paymentMethods[method].total.add(payment.amount);
      }

      for (const item of txn.items) {
        const cost = new Decimal(item.costPrice).mul(item.qty);
        totalCost = totalCost.add(cost);

        const catName = item.product.category?.name || 'Tanpa Kategori';
        if (!categorySales[catName]) {
          categorySales[catName] = { qty: 0, revenue: new Decimal(0), cost: new Decimal(0) };
        }
        categorySales[catName].qty += item.qty;
        categorySales[catName].revenue = categorySales[catName].revenue.add(item.subtotal);
        categorySales[catName].cost = categorySales[catName].cost.add(cost);

        if (!dailyData[dateKey].profit) dailyData[dateKey].profit = new Decimal(0);
        dailyData[dateKey].profit = dailyData[dateKey].profit.add(item.subtotal.sub(cost));
      }

      const cashierName = txn.cashier?.name || 'Unknown';
      if (!cashierSales[cashierName]) {
        cashierSales[cashierName] = { transactions: 0, revenue: new Decimal(0) };
      }
      cashierSales[cashierName].transactions++;
      cashierSales[cashierName].revenue = cashierSales[cashierName].revenue.add(txn.total);
    }

    const totalProfit = totalRevenue.sub(totalCost);

    return {
      period: { startDate, endDate },
      summary: {
        totalTransactions,
        totalRevenue: Number(totalRevenue),
        totalCost: Number(totalCost),
        totalProfit: Number(totalProfit),
        averageTransaction: totalTransactions > 0 ? Number(totalRevenue) / totalTransactions : 0,
      },
      daily: Object.values(dailyData).map((d) => ({
        ...d,
        revenue: Number(d.revenue),
        profit: Number(d.profit || 0),
      })),
      byCategory: Object.entries(categorySales).map(([category, data]) => ({
        category,
        qty: data.qty,
        revenue: Number(data.revenue),
        cost: Number(data.cost),
        profit: Number(data.revenue.sub(data.cost)),
      })),
      byCashier: Object.entries(cashierSales).map(([cashier, data]) => ({
        cashier,
        transactions: data.transactions,
        revenue: Number(data.revenue),
      })),
      byPaymentMethod: Object.entries(paymentMethods).map(([method, data]) => ({
        method,
        count: data.count,
        total: Number(data.total),
      })),
    };
  }

  async getProductReport(outletId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        outletId,
        status: 'COMPLETED',
        createdAt: { gte: start, lte: end },
      },
      include: {
        items: {
          include: { product: { select: { id: true, sku: true, name: true, costPrice: true, category: { select: { name: true } } } } },
        },
      },
    });

    const productSales: Record<string, any> = {};

    for (const txn of transactions) {
      for (const item of txn.items) {
        const product = item.product;
        const cost = new Decimal(item.costPrice).mul(item.qty);

        if (!productSales[product.id]) {
          productSales[product.id] = {
            productId: product.id,
            sku: product.sku,
            name: product.name,
            category: product.category?.name || 'Tanpa Kategori',
            qty: 0,
            revenue: new Decimal(0),
            cost: new Decimal(0),
            avgPrice: new Decimal(0),
          };
        }

        productSales[product.id].qty += item.qty;
        productSales[product.id].revenue = productSales[product.id].revenue.add(item.subtotal);
        productSales[product.id].cost = productSales[product.id].cost.add(cost);
      }
    }

    // Calculate average price
    for (const product of Object.values(productSales)) {
      product.avgPrice = product.revenue.div(product.qty);
    }

    return {
      period: { startDate, endDate },
      products: Object.values(productSales)
        .map((p) => ({
          ...p,
          revenue: Number(p.revenue),
          cost: Number(p.cost),
          profit: Number(p.revenue.sub(p.cost)),
          avgPrice: Number(p.avgPrice),
        }))
        .sort((a, b) => b.qty - a.qty),
    };
  }

  async getStockReport(outletId: string) {
    const products = await this.prisma.product.findMany({
      where: { outletId, isActive: true },
      include: { category: { select: { name: true } } },
      orderBy: [{ isDigital: 'asc' }, { stockQty: 'asc' }],
    });

    return {
      products: products.map((p) => ({
        id: p.id,
        sku: p.sku,
        barcode: p.barcode,
        name: p.name,
        category: p.category?.name || 'Tanpa Kategori',
        unit: p.unit,
        stockQty: p.stockQty,
        minStock: p.minStock,
        costPrice: Number(p.costPrice),
        sellPrice: Number(p.sellPrice),
        isDigital: p.isDigital,
        isLowStock: p.stockQty <= p.minStock,
        isOutOfStock: p.stockQty === 0,
        stockValue: Number(p.costPrice) * p.stockQty,
      })),
      summary: {
        totalProducts: products.length,
        lowStockCount: products.filter((p) => p.stockQty <= p.minStock && p.stockQty > 0).length,
        outOfStockCount: products.filter((p) => p.stockQty === 0).length,
        totalStockValue: products.reduce((sum, p) => sum + Number(p.costPrice) * p.stockQty, 0),
      },
    };
  }

  async getProfitLossReport(outletId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Revenue from completed transactions
    const revenueAgg = await this.prisma.transaction.aggregate({
      where: { outletId, status: 'COMPLETED', createdAt: { gte: start, lte: end } },
      _sum: { total: true },
    });

    // Cost of goods sold from transaction items
    const transactions = await this.prisma.transaction.findMany({
      where: { outletId, status: 'COMPLETED', createdAt: { gte: start, lte: end } },
      include: {
        items: { include: { product: { select: { costPrice: true } } } },
      },
    });

    let cogs = new Decimal(0);
    for (const txn of transactions) {
      for (const item of txn.items) {
        cogs = cogs.add(new Decimal(item.costPrice).mul(item.qty));
      }
    }

    const revenue = new Decimal(revenueAgg._sum.total || 0);
    const grossProfit = revenue.sub(cogs);

    // Operating expenses (could be extended)
    // For now, we'll just show gross profit

    return {
      period: { startDate, endDate },
      revenue: Number(revenue),
      cogs: Number(cogs),
      grossProfit: Number(grossProfit),
      grossMargin: revenue.gt(0) ? Number(grossProfit.div(revenue).mul(100)) : 0,
    };
  }
}