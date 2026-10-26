import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOutletDto } from './dto/create-outlet.dto';
import { UpdateOutletDto } from './dto/update-outlet.dto';

@Injectable()
export class OutletsService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 20, search?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.outlet.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { users: true, products: true, transactions: true },
          },
        },
      }),
      this.prisma.outlet.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true, products: true, transactions: true, shifts: true },
        },
      },
    });

    if (!outlet) {
      throw new NotFoundException('Outlet tidak ditemukan');
    }

    return outlet;
  }

  async create(createOutletDto: CreateOutletDto, createdBy: string) {
    const outlet = await this.prisma.outlet.create({
      data: createOutletDto,
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        outletId: outlet.id,
        userId: createdBy,
        action: 'CREATE_OUTLET',
        entity: 'Outlet',
        entityId: outlet.id,
        newData: JSON.parse(JSON.stringify(createOutletDto)),
      },
    });

    return outlet;
  }

  async update(id: string, updateOutletDto: UpdateOutletDto, updatedBy: string) {
    const existingOutlet = await this.findById(id);

    const outlet = await this.prisma.outlet.update({
      where: { id },
      data: updateOutletDto,
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        outletId: id,
        userId: updatedBy,
        action: 'UPDATE_OUTLET',
        entity: 'Outlet',
        entityId: id,
        oldData: JSON.parse(JSON.stringify(existingOutlet)),
        newData: JSON.parse(JSON.stringify(updateOutletDto)),
      },
    });

    return outlet;
  }

  async delete(id: string, deletedBy: string) {
    await this.findById(id);

    await this.prisma.outlet.delete({ where: { id } });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: deletedBy,
        action: 'DELETE_OUTLET',
        entity: 'Outlet',
        entityId: id,
      },
    });

    return { message: 'Outlet berhasil dihapus' };
  }

  async getMyOutlet(outletId: string) {
    return this.findById(outletId);
  }
}