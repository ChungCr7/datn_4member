import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PaginationDto } from '@/common/pagination.dto';
import { RegisterSellerDto, UpdateSellerProfileDto } from './dto/seller.dto';

@Injectable()
export class SellersService {
  constructor(private readonly prisma: PrismaService) {}

  async register(userId: number, dto: RegisterSellerDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        address: true,
        sellerProfile: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const current = user.sellerProfile;
    if (current?.status === 'APPROVED') {
      throw new BadRequestException('Seller profile is already approved');
    }
    if (current?.status === 'PENDING') {
      throw new BadRequestException('Seller registration is already pending');
    }
    if (current?.status === 'SUSPENDED') {
      throw new ForbiddenException('Seller profile is suspended');
    }

    const data = {
      shopName: dto.shopName.trim(),
      shopSlug: await this.uniqueSlug(
        dto.shopSlug || dto.shopName,
        current?.id,
      ),
      description: dto.description?.trim() || null,
      logo: dto.logo?.trim() || null,
      banner: dto.banner?.trim() || null,
      address: dto.address?.trim() || user.address || null,
      phone: dto.phone?.trim() || user.phone || null,
      status: 'PENDING' as const,
    };

    const profile = current
      ? await this.prisma.sellerProfile.update({
          where: { id: current.id },
          data,
          include: this.include(),
        })
      : await this.prisma.sellerProfile.create({
          data: { ...data, userId },
          include: this.include(),
        });

    return this.response('Seller registration submitted successfully', profile);
  }

  async getMine(userId: number) {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: this.include(),
    });
    if (!profile) throw new NotFoundException('Seller profile not found');
    return this.response('Seller profile retrieved successfully', profile);
  }

  async updateMine(userId: number, dto: UpdateSellerProfileDto) {
    const current = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });
    if (!current) throw new NotFoundException('Seller profile not found');
    if (current.status === 'SUSPENDED') {
      throw new ForbiddenException('Seller profile is suspended');
    }

    const shopSlug =
      dto.shopSlug || dto.shopName
        ? await this.uniqueSlug(dto.shopSlug || dto.shopName!, current.id)
        : undefined;

    const profile = await this.prisma.sellerProfile.update({
      where: { id: current.id },
      data: {
        ...(dto.shopName !== undefined && { shopName: dto.shopName.trim() }),
        ...(shopSlug !== undefined && { shopSlug }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim() || null,
        }),
        ...(dto.logo !== undefined && { logo: dto.logo?.trim() || null }),
        ...(dto.banner !== undefined && { banner: dto.banner?.trim() || null }),
        ...(dto.address !== undefined && {
          address: dto.address?.trim() || null,
        }),
        ...(dto.phone !== undefined && { phone: dto.phone?.trim() || null }),
      },
      include: this.include(),
    });

    if (profile.status === 'APPROVED') {
      await this.syncLegacyShop(profile);
    }

    return this.response('Seller profile updated successfully', profile);
  }

  async findAll(pagination: PaginationDto) {
    const search = pagination.search?.trim().slice(0, 100);
    const where = {
      ...(search
        ? {
            OR: [
              { shopName: { contains: search, mode: 'insensitive' as const } },
              { shopSlug: { contains: search, mode: 'insensitive' as const } },
              {
                user: {
                  email: { contains: search, mode: 'insensitive' as const },
                },
              },
            ],
          }
        : {}),
      ...(pagination.filter && pagination.filter !== 'all'
        ? { status: pagination.filter.toUpperCase() as any }
        : {}),
    };

    const [sellers, total] = await Promise.all([
      this.prisma.sellerProfile.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        include: this.include(),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sellerProfile.count({ where }),
    ]);

    return this.response('Sellers retrieved successfully', {
      sellers,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    });
  }

  async approve(id: number) {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { id },
      include: this.include(),
    });
    if (!profile) throw new NotFoundException('Seller profile not found');
    if (profile.status === 'APPROVED') {
      return this.response('Seller profile already approved', profile);
    }
    if (profile.status === 'SUSPENDED') {
      throw new BadRequestException(
        'Suspended seller cannot be approved directly',
      );
    }

    const sellerRole = await this.prisma.role.findUnique({
      where: { name: 'SELLER' },
    });
    if (!sellerRole) throw new BadRequestException('SELLER role not found');

    const approved = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: profile.userId },
        data: { roleId: sellerRole.id, accountRole: 'SELLER' },
      });

      return tx.sellerProfile.update({
        where: { id },
        data: { status: 'APPROVED' },
        include: this.include(),
      });
    });

    await this.syncLegacyShop(approved);
    return this.response('Seller profile approved successfully', approved);
  }

  async reject(id: number, reason?: string) {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { id },
      include: this.include(),
    });
    if (!profile) throw new NotFoundException('Seller profile not found');
    if (profile.status === 'APPROVED') {
      throw new BadRequestException('Approved seller cannot be rejected');
    }

    const rejected = await this.prisma.sellerProfile.update({
      where: { id },
      data: {
        status: 'REJECTED',
        description: reason?.trim()
          ? `${profile.description || ''}\nReject reason: ${reason.trim()}`.trim()
          : profile.description,
      },
      include: this.include(),
    });

    return this.response('Seller profile rejected successfully', rejected);
  }

  private include() {
    return {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          name: true,
          phone: true,
          avatar: true,
          accountRole: true,
        },
      },
      _count: { select: { products: true, orderItems: true } },
    };
  }

  private async syncLegacyShop(profile: {
    userId: number;
    shopName: string;
    shopSlug: string;
    description: string | null;
    logo: string | null;
    banner: string | null;
    phone: string | null;
    address: string | null;
  }) {
    await this.prisma.shop.upsert({
      where: { ownerId: profile.userId },
      update: {
        shopName: profile.shopName,
        slug: profile.shopSlug,
        description: profile.description,
        logo: profile.logo,
        banner: profile.banner,
        phone: profile.phone,
        address: profile.address,
        status: 'active',
        approvedAt: new Date(),
      },
      create: {
        ownerId: profile.userId,
        shopName: profile.shopName,
        slug: profile.shopSlug,
        description: profile.description,
        logo: profile.logo,
        banner: profile.banner,
        phone: profile.phone,
        address: profile.address,
        status: 'active',
        approvedAt: new Date(),
      },
    });
  }

  private async uniqueSlug(value: string, currentId?: number) {
    const base = this.slugify(value);
    if (!base) throw new BadRequestException('Shop slug is invalid');
    let slug = base;
    let index = 1;
    while (
      await this.prisma.sellerProfile.findFirst({
        where: {
          shopSlug: slug,
          ...(currentId ? { id: { not: currentId } } : {}),
        },
        select: { id: true },
      })
    ) {
      slug = `${base}-${index++}`;
    }
    return slug;
  }

  private slugify(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private response(message: string, data: unknown) {
    return { success: true, message, data };
  }
}
