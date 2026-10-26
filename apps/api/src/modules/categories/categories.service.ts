import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(outletId: string, page = 1, limit = 50, search?: string) {
    const where: any = { outletId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          _count: { select: { products: true } },
        },
      }),
      this.prisma.category.count({ where }),
    ]);

    return { data, total };
  }

  async findAllActive(outletId: string) {
    return this.prisma.category.findMany({
      where: { outletId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findById(id: string, outletId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, outletId },
      include: { _count: { select: { products: true } } },
    });

    if (!category) {
      throw new NotFoundException('Kategori tidak ditemukan');
    }

    return category;
  }

  async create(outletId: string, createCategoryDto: CreateCategoryDto, createdBy: string) {
    // Generate slug from name
    const slug = createCategoryDto.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check slug uniqueness
    const existing = await this.prisma.category.findUnique({
      where: { outletId_slug: { outletId, slug } },
    });

    if (existing) {
      throw new ConflictException('Kategori dengan nama serupa sudah ada');
    }

    const category = await this.prisma.category.create({
      data: {
        ...createCategoryDto,
        outletId,
        slug,
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        outletId,
        userId: createdBy,
        action: 'CREATE_CATEGORY',
        entity: 'Category',
        entityId: category.id,
        newData: JSON.parse(JSON.stringify(createCategoryDto)),
      },
    });

    return category;
  }

  async update(id: string, outletId: string, updateCategoryDto: UpdateCategoryDto, updatedBy: string) {
    const existingCategory = await this.findById(id, outletId);

    // Check slug uniqueness if name changed
    if (updateCategoryDto.name && updateCategoryDto.name !== existingCategory.name) {
      const slug = updateCategoryDto.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const existing = await this.prisma.category.findFirst({
        where: { outletId, slug, NOT: { id } },
      });

      if (existing) {
        throw new ConflictException('Kategori dengan nama serupa sudah ada');
      }

      updateCategoryDto.slug = slug;
    }

    const category = await this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        outletId,
        userId: updatedBy,
        action: 'UPDATE_CATEGORY',
        entity: 'Category',
        entityId: id,
        oldData: JSON.parse(JSON.stringify(existingCategory)),
        newData: JSON.parse(JSON.stringify(updateCategoryDto)),
      },
    });

    return category;
  }

  async delete(id: string, outletId: string, deletedBy: string) {
    const category = await this.findById(id, outletId);

    // Check if category has products
    const productCount = await this.prisma.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      throw new ConflictException('Tidak dapat menghapus kategori yang masih memiliki produk');
    }

    await this.prisma.category.delete({ where: { id } });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        outletId,
        userId: deletedBy,
        action: 'DELETE_CATEGORY',
        entity: 'Category',
        entityId: id,
      },
    });

    return { message: 'Kategori berhasil dihapus' };
  }

  async reorder(outletId: string, categoryIds: string[], updatedBy: string) {
    const updates = categoryIds.map((id, index) =>
      this.prisma.category.update({
        where: { id },
        data: { sortOrder: index },
      })
    );

    await this.prisma.$transaction(updates);

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        outletId,
        userId: updatedBy,
        action: 'REORDER_CATEGORIES',
        entity: 'Category',
        newData: { categoryIds },
      },
    });

    return { message: 'Urutan kategori diperbarui' };
  }
}