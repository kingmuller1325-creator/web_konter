import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(outletId: string, page = 1, limit = 20, search?: string) {
    const where: any = { outletId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          outlet: { select: { id: true, name: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string, outletId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, outletId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        outlet: { select: { id: true, name: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    return user;
  }

  async create(outletId: string, createUserDto: CreateUserDto, createdBy: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email sudah terdaftar');
    }

    // Never pass the plain-text password to Prisma or to the audit log.
    const { password, ...userData } = createUserDto;
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.create({
      data: {
        ...userData,
        passwordHash,
        outletId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        outletId,
        userId: createdBy,
        action: 'CREATE_USER',
        entity: 'User',
        entityId: user.id,
        newData: { ...userData, passwordHash: '[REDACTED]' },
      },
    });

    return user;
  }

  async update(id: string, outletId: string, updateUserDto: UpdateUserDto, updatedBy: string) {
    const existingUser = await this.findById(id, outletId);

    // Check email uniqueness if changing
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });
      if (emailExists) {
        throw new ConflictException('Email sudah terdaftar');
      }
    }

    const data: any = { ...updateUserDto };
    if (updateUserDto.password) {
      data.passwordHash = await bcrypt.hash(updateUserDto.password, 12);
      delete data.password;
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        outletId,
        userId: updatedBy,
        action: 'UPDATE_USER',
        entity: 'User',
        entityId: id,
        oldData: existingUser,
        newData: {
        ...data,
        ...(data.passwordHash ? { passwordHash: '[REDACTED]' } : {}),
      },
      },
    });

    return user;
  }

  async delete(id: string, outletId: string, deletedBy: string) {
    if (id === deletedBy) {
      throw new BadRequestException('Anda tidak dapat menghapus akun sendiri');
    }

    await this.findById(id, outletId);

    await this.prisma.user.delete({ where: { id } });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        outletId,
        userId: deletedBy,
        action: 'DELETE_USER',
        entity: 'User',
        entityId: id,
      },
    });

    return { message: 'User berhasil dihapus' };
  }

  async toggleStatus(id: string, outletId: string, updatedBy: string) {
    if (id === updatedBy) {
      throw new BadRequestException('Anda tidak dapat menonaktifkan akun sendiri');
    }

    const user = await this.findById(id, outletId);

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: { id: true, isActive: true },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        outletId,
        userId: updatedBy,
        action: updated.isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
        entity: 'User',
        entityId: id,
      },
    });

    return updated;
  }
}