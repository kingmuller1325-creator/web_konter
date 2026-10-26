import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  async findAll(outletId: string, page = 1, limit = 20, status?: string) {
    const where: any = { outletId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.shift.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { openedAt: 'desc' },
        include: {
          cashier: { select: { id: true, name: true } },
          _count: { select: { transactions: true } },
        },
      }),
      this.prisma.shift.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string, outletId: string) {
    const shift = await this.prisma.shift.findFirst({
      where: { id, outletId },
      include: {
        cashier: { select: { id: true, name: true } },
        transactions: {
          orderBy: { createdAt: 'desc' },
          include: {
            items: { select: { qty: true, subtotal: true } },
            payments: { select: { method: true, amount: true } },
          },
        },
      },
    });

    if (!shift) {
      throw new NotFoundException('Shift tidak ditemukan');
    }

    return shift;
  }

  async getCurrentShift(outletId: string, cashierId: string) {
    return this.prisma.shift.findFirst({
      where: { outletId, cashierId, status: 'OPEN' },
      include: {
        _count: { select: { transactions: true } },
      },
    });
  }

  async open(outletId: string, cashierId: string, openShiftDto: OpenShiftDto) {
    // Check if cashier already has an open shift
    const existingShift = await this.prisma.shift.findFirst({
      where: { outletId, cashierId, status: 'OPEN' },
    });

    if (existingShift) {
      throw new ConflictException('Anda masih memiliki shift yang terbuka');
    }

    const shift = await this.prisma.shift.create({
      data: {
        outletId,
        cashierId,
        openingCash: new Decimal(openShiftDto.openingCash),
        notes: openShiftDto.notes,
      },
      include: {
        cashier: { select: { id: true, name: true } },
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        outletId,
        userId: cashierId,
        action: 'OPEN_SHIFT',
        entity: 'Shift',
        entityId: shift.id,
        newData: { openingCash: openShiftDto.openingCash, notes: openShiftDto.notes },
      },
    });

    return shift;
  }

  async close(outletId: string, shiftId: string, closeShiftDto: CloseShiftDto, closedBy: string) {
    const shift = await this.findById(shiftId, outletId);

    if (shift.status === 'CLOSED') {
      throw new BadRequestException('Shift sudah ditutup');
    }

    if (shift.cashierId !== closedBy) {
      throw new BadRequestException('Hanya kasir yang membuka shift yang dapat menutupnya');
    }

    // Expected cash = opening cash + cash payments received during the shift
    const completedTransactions = await this.prisma.transaction.findMany({
      where: { shiftId, status: 'COMPLETED' },
      select: { payments: { select: { method: true, amount: true } } },
    });

    const cashSales = completedTransactions.reduce((sum: number, txn: any) => {
      const cash = txn.payments
        .filter((p: any) => p.method === 'CASH')
        .reduce((s: number, p: any) => s + Number(p.amount), 0);
      return sum + cash;
    }, 0);

    const expectedCash = Number(shift.openingCash) + cashSales;
    const closingCash = new Decimal(closeShiftDto.closingCash);
    const difference = closingCash.sub(expectedCash);

    const closedShift = await this.prisma.shift.update({
      where: { id: shiftId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closingCash,
        expectedCash: new Decimal(expectedCash),
        difference,
        notes: closeShiftDto.notes,
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        outletId,
        userId: closedBy,
        action: 'CLOSE_SHIFT',
        entity: 'Shift',
        entityId: shiftId,
        oldData: { openingCash: Number(shift.openingCash), status: 'OPEN' },
        newData: {
          closingCash: Number(closingCash),
          expectedCash: expectedCash,
          difference: Number(difference),
          notes: closeShiftDto.notes,
        },
      },
    });

    return closedShift;
  }

  async getSummary(shiftId: string, outletId: string) {
    const shift = await this.findById(shiftId, outletId);

    const completedTransactions = shift.transactions.filter((t) => t.status === 'COMPLETED');
    const voidedTransactions = shift.transactions.filter((t) => t.status === 'VOIDED');

    const summary = {
      shift: {
        id: shift.id,
        openedAt: shift.openedAt,
        closedAt: shift.closedAt,
        cashier: shift.cashier,
        openingCash: Number(shift.openingCash),
        closingCash: shift.closingCash !== null ? Number(shift.closingCash) : null,
        expectedCash: shift.expectedCash !== null ? Number(shift.expectedCash) : null,
        difference: shift.difference !== null ? Number(shift.difference) : null,
        status: shift.status,
      },
      transactions: {
        total: completedTransactions.length,
        voided: voidedTransactions.length,
        revenue: completedTransactions.reduce((sum, t) => sum + Number(t.total), 0),
      },
      byPaymentMethod: {} as Record<string, { count: number; total: number }>,
    };

    for (const txn of completedTransactions) {
      for (const payment of txn.payments) {
        const method = payment.method;
        if (!summary.byPaymentMethod[method]) {
          summary.byPaymentMethod[method] = { count: 0, total: 0 };
        }
        summary.byPaymentMethod[method].count++;
        summary.byPaymentMethod[method].total += Number(payment.amount);
      }
    }

    return summary;
  }
}