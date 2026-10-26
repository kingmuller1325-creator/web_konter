import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(outletId: string, page = 1, limit = 20, search?: string) {
    const where: any = { outletId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { transactions: true } },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string, outletId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, outletId },
      include: {
        _count: { select: { transactions: true } },
      },
    });

    if (!customer) {
      throw new NotFoundException('Pelanggan tidak ditemukan');
    }

    return customer;
  }

  async findByPhone(phone: string, outletId: string) {
    return this.prisma.customer.findFirst({
      where: { phone, outletId },
    });
  }

  async create(outletId: string, createCustomerDto: CreateCustomerDto, createdBy: string) {
    // Check phone uniqueness if provided
    if (createCustomerDto.phone) {
      const existing = await this.prisma.customer.findFirst({
        where: { phone: createCustomerDto.phone, outletId },
      });
      if (existing) {
        throw new ConflictException('Nomor telepon sudah terdaftar');
      }
    }

    const customer = await this.prisma.customer.create({
      data: { ...createCustomerDto, outletId },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        outletId,
        userId: createdBy,
        action: 'CREATE_CUSTOMER',
        entity: 'Customer',
        entityId: customer.id,
        newData: JSON.parse(JSON.stringify(createCustomerDto)),
      },
    });

    return customer;
  }

  async update(id: string, outletId: string, updateCustomerDto: UpdateCustomerDto, updatedBy: string) {
    const existingCustomer = await this.findById(id, outletId);

    // Check phone uniqueness if changing
    if (updateCustomerDto.phone && updateCustomerDto.phone !== existingCustomer.phone) {
      const existing = await this.prisma.customer.findFirst({
        where: { phone: updateCustomerDto.phone, outletId, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException('Nomor telepon sudah terdaftar');
      }
    }

    const customer = await this.prisma.customer.update({
      where: { id },
      data: updateCustomerDto,
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        outletId,
        userId: updatedBy,
        action: 'UPDATE_CUSTOMER',
        entity: 'Customer',
        entityId: id,
        oldData: JSON.parse(JSON.stringify(existingCustomer)),
        newData: JSON.parse(JSON.stringify(updateCustomerDto)),
      },
    });

    return customer;
  }

  async delete(id: string, outletId: string, deletedBy: string) {
    const customer = await this.findById(id, outletId);

    // Check if customer has transactions
    const transactionCount = await this.prisma.transaction.count({
      where: { customerId: id },
    });

    if (transactionCount > 0) {
      throw new ConflictException('Tidak dapat menghapus pelanggan yang memiliki riwayat transaksi');
    }

    await this.prisma.customer.delete({ where: { id } });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        outletId,
        userId: deletedBy,
        action: 'DELETE_CUSTOMER',
        entity: 'Customer',
        entityId: id,
      },
    });

    return { message: 'Pelanggan berhasil dihapus' };
  }
}