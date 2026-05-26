import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateMenuDto, UpdateMenuDto } from './dto/menu.dto';
import { PaginationDto } from '@/common/pagination.dto';
import { CacheService } from '@/common/cache.service';
import { UploadService } from '@/common/upload.service';

@Injectable()
export class MenusService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private uploadService: UploadService,
  ) {}

  async create(dto: CreateMenuDto, imageFile?: Express.Multer.File) {
    let imageUrl = dto.image || null;
    if (imageFile) {
      imageUrl = await this.uploadService.uploadImage(imageFile, 'menus');
    }

    const menu = await this.prisma.menu.create({
      data: {
        title: dto.title,
        description: dto.description || null,
        image: imageUrl,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
      include: { menuItems: { include: { options: true } } },
    });
    await this.cacheService.delByPrefix('menus:all');
    return menu;
  }

  async findAll(pagination: PaginationDto) {
    const cacheKey = `menus:all:${pagination.page}:${pagination.limit}:${pagination.search || ''}:${pagination.filter || ''}:${pagination.sortBy || ''}:${pagination.sortOrder || ''}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) return cached;

    // Sanitize search input
    const searchTerm = pagination.search
      ? String(pagination.search).trim().slice(0, 100)
      : '';

    const where = {
      ...(searchTerm
        ? {
            OR: [
              { title: { contains: searchTerm, mode: 'insensitive' as const } },
              {
                description: {
                  contains: searchTerm,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
      ...(pagination.filter === 'active' ? { isActive: true } : {}),
      ...(pagination.filter === 'inactive' ? { isActive: false } : {}),
    };
    const sortBy = ['title', 'sortOrder', 'createdAt'].includes(
      pagination.sortBy || '',
    )
      ? pagination.sortBy!
      : 'sortOrder';
    const sortOrder = pagination.sortOrder === 'desc' ? 'desc' : 'asc';

    const [menus, total] = await Promise.all([
      this.prisma.menu.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        include: {
          menuItems: { include: { options: true } },
          _count: { select: { menuItems: true } },
        },
        orderBy: [{ [sortBy]: sortOrder }, { createdAt: 'desc' }],
      }),
      this.prisma.menu.count({ where }),
    ]);

    const result = {
      menus,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
    await this.cacheService.set(cacheKey, result, 5 * 60 * 1000);
    return result;
  }

  async findOne(id: number) {
    const cacheKey = `menu:${id}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) return cached;

    const menu = await this.prisma.menu.findUnique({
      where: { id },
      include: {
        menuItems: { include: { options: true } },
      },
    });

    if (!menu) {
      throw new NotFoundException(`Menu with ID ${id} not found`);
    }
    await this.cacheService.set(cacheKey, menu, 5 * 60 * 1000);
    return menu;
  }

  async update(
    id: number,
    dto: UpdateMenuDto,
    imageFile?: Express.Multer.File,
  ) {
    const menu = await this.prisma.menu.findUnique({
      where: { id },
      select: { id: true, image: true },
    });

    if (!menu) {
      throw new NotFoundException(`Menu with ID ${id} not found`);
    }

    let imageUrl = menu.image;

    if (imageFile) {
      // Delete old image if it exists
      if (menu.image) {
        await this.uploadService.deleteImageIfExists(menu.image);
      }
      imageUrl = await this.uploadService.uploadImage(imageFile, 'menus');
    } else if (dto.image !== undefined && dto.image !== menu.image) {
      // If image URL is explicitly set to something different, delete old one
      if (menu.image) {
        await this.uploadService.deleteImageIfExists(menu.image);
      }
      imageUrl = dto.image;
    }

    const updated = await this.prisma.menu.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(imageUrl !== undefined && { image: imageUrl }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { menuItems: { include: { options: true } } },
    });

    await this.cacheService.del(`menu:${id}`);
    await this.cacheService.delByPrefix('menus:all');
    return updated;
  }

  async remove(id: number) {
    const menu = await this.prisma.menu.findUnique({
      where: { id },
      select: { id: true, image: true },
    });

    if (!menu) {
      throw new NotFoundException(`Menu with ID ${id} not found`);
    }

    // Delete image from Cloudinary
    if (menu.image) {
      await this.uploadService.deleteImageIfExists(menu.image);
    }

    await this.prisma.menu.delete({ where: { id } });
    await this.cacheService.del(`menu:${id}`);
    await this.cacheService.delByPrefix('menus:all');
    return { message: 'Menu deleted successfully' };
  }
}
