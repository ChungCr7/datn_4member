import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateShopDto, UpdateShopDto } from './dto/shop.dto';
import { PaginationDto } from '@/common/pagination.dto';
import { UploadService } from '@/common/upload.service';

@Injectable()
export class ShopsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  async applySellerRequest(
    userId: number,
    dto: CreateShopDto,
    files?: { logo?: Express.Multer.File[]; banner?: Express.Multer.File[] },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, shop: true },
    });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    if (user.shop) throw new BadRequestException('Tài khoản đã có gian hàng');

    const pending = await this.prisma.sellerRequest.findFirst({
      where: { userId, status: 'pending' },
    });
    if (pending) {
      throw new BadRequestException(
        'Bạn đã có hồ sơ đăng ký người bán đang chờ duyệt',
      );
    }

    const logo = files?.logo?.[0]
      ? await this.uploadService.uploadImage(files.logo[0], 'shops/logos')
      : dto.logo || null;
    const banner = files?.banner?.[0]
      ? await this.uploadService.uploadImage(files.banner[0], 'shops/banners')
      : dto.banner || null;

    return this.prisma.sellerRequest.create({
      data: {
        userId,
        shopName: dto.shopName.trim(),
        description: dto.description?.trim() || null,
        logo,
        banner,
        phone: dto.phone?.trim() || user.phone || null,
        address: dto.address?.trim() || user.address || null,
        businessType: dto.businessType?.trim() || null,
      },
      include: this.sellerRequestInclude(),
    });
  }

  async findSellerRequests(pagination: PaginationDto) {
    const search = pagination.search?.trim().slice(0, 100);
    const where = {
      ...(search
        ? {
            OR: [
              { shopName: { contains: search, mode: 'insensitive' as const } },
              {
                user: {
                  email: { contains: search, mode: 'insensitive' as const },
                },
              },
              {
                user: {
                  name: { contains: search, mode: 'insensitive' as const },
                },
              },
            ],
          }
        : {}),
      ...(pagination.filter && pagination.filter !== 'all'
        ? { status: pagination.filter as any }
        : {}),
    };

    const [requests, total] = await Promise.all([
      this.prisma.sellerRequest.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        include: this.sellerRequestInclude(),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sellerRequest.count({ where }),
    ]);

    return {
      requests,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  async findMySellerRequests(userId: number) {
    return this.prisma.sellerRequest.findMany({
      where: { userId },
      include: this.sellerRequestInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveSellerRequest(id: number, reviewerId: number) {
    const request = await this.prisma.sellerRequest.findUnique({
      where: { id },
      include: { user: { include: { role: true, shop: true } } },
    });
    if (!request) throw new NotFoundException('Không tìm thấy hồ sơ đăng ký');
    if (request.status !== 'pending') {
      throw new BadRequestException('Hồ sơ này đã được xử lý');
    }
    if (request.user.shop)
      throw new BadRequestException('Người dùng đã có gian hàng');

    const sellerRole = await this.prisma.role.findUnique({
      where: { name: 'SELLER' },
    });
    if (!sellerRole)
      throw new BadRequestException('Thiếu vai trò SELLER trong hệ thống');

    return this.prisma.$transaction(async (tx) => {
      const shop = await tx.shop.create({
        data: {
          ownerId: request.userId,
          shopName: request.shopName,
          slug: await this.uniqueShopSlug(request.shopName),
          description: request.description,
          logo: request.logo,
          banner: request.banner,
          phone: request.phone,
          address: request.address,
          status: 'active',
          approvedAt: new Date(),
        },
      });

      await tx.user.update({
        where: { id: request.userId },
        data: { roleId: sellerRole.id },
      });

      return tx.sellerRequest.update({
        where: { id },
        data: {
          status: 'approved',
          shopId: shop.id,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
        },
        include: this.sellerRequestInclude(),
      });
    });
  }

  async rejectSellerRequest(id: number, reviewerId: number, reason?: string) {
    const request = await this.prisma.sellerRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException('Không tìm thấy hồ sơ đăng ký');
    if (request.status !== 'pending') {
      throw new BadRequestException('Hồ sơ này đã được xử lý');
    }
    return this.prisma.sellerRequest.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectReason: reason?.trim() || 'Hồ sơ chưa đáp ứng yêu cầu của sàn',
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
      include: this.sellerRequestInclude(),
    });
  }

  async createForSeller(ownerId: number, dto: CreateShopDto) {
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
      include: { role: true, shop: true },
    });
    if (!owner) throw new NotFoundException('Seller user not found');
    if (owner.shop) throw new BadRequestException('Seller already has a shop');
    if (
      owner.role.name !== 'SELLER' &&
      owner.role.name !== 'ADMIN' &&
      owner.role.name !== 'ROOT'
    ) {
      throw new BadRequestException('Only SELLER users can own shops');
    }

    return this.prisma.shop.create({
      data: {
        ownerId,
        shopName: dto.shopName.trim(),
        description: dto.description?.trim() || null,
        logo: dto.logo || null,
        banner: dto.banner || null,
        phone: dto.phone || null,
        address: dto.address || null,
        slug: await this.uniqueShopSlug(dto.shopName),
        status:
          owner.role.name === 'ROOT' || owner.role.name === 'ADMIN'
            ? 'active'
            : 'pending',
      },
      include: this.include(),
    });
  }

  async findAll(pagination: PaginationDto) {
    const search = pagination.search?.trim().slice(0, 100);
    const where = {
      ...(search
        ? {
            OR: [
              { shopName: { contains: search, mode: 'insensitive' as const } },
              {
                description: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
      ...(pagination.filter && pagination.filter !== 'all'
        ? { status: pagination.filter as any }
        : {}),
    };

    const [shops, total] = await Promise.all([
      this.prisma.shop.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        include: this.include(),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.shop.count({ where }),
    ]);

    return {
      shops,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  async findOne(id: number) {
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      include: this.include(),
    });
    if (!shop) throw new NotFoundException('Shop not found');
    return shop;
  }

  async findPublicShop(idOrSlug: string) {
    const id = Number(idOrSlug);
    const shop = await this.prisma.shop.findFirst({
      where: Number.isFinite(id) && id > 0 ? { id } : { slug: idOrSlug },
      include: {
        ...this.include(),
        categories: {
          include: { category: true },
          orderBy: { sortOrder: 'asc' },
        },
        reviews: {
          where: { isHidden: false },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { user: { select: { id: true, name: true, image: true } } },
        },
        products: {
          where: { status: 'active', isAvailable: true },
          include: {
            shop: true,
            menu: { select: { id: true, title: true } },
            category: true,
            options: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!shop) throw new NotFoundException('Không tìm thấy gian hàng');
    return shop;
  }

  async findMine(ownerId: number) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId },
      include: this.include(),
    });
    if (!shop) throw new NotFoundException('Shop not found');
    return shop;
  }

  async update(id: number, dto: UpdateShopDto, userId: number, role?: string) {
    const shop = await this.findOne(id);
    this.assertOwnerOrRoot(shop.ownerId, userId, role);

    return this.prisma.shop.update({
      where: { id },
      data: {
        ...(dto.shopName !== undefined && { shopName: dto.shopName.trim() }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim() || null,
        }),
        ...(dto.logo !== undefined && { logo: dto.logo || null }),
        ...(dto.banner !== undefined && { banner: dto.banner || null }),
      },
      include: this.include(),
    });
  }

  async setStatus(id: number, status: 'pending' | 'active' | 'suspended') {
    await this.findOne(id);
    return this.prisma.shop.update({
      where: { id },
      data: {
        status,
        ...(status === 'active' ? { approvedAt: new Date() } : {}),
      },
      include: this.include(),
    });
  }

  async ensureSellerShop(userId: number) {
    return this.findMine(userId);
  }

  assertOwnerOrRoot(ownerId: number, userId: number, role?: string) {
    const requestRole = String(role).toLowerCase();
    if (
      ownerId !== userId &&
      requestRole !== 'admin' &&
      requestRole !== 'root'
    ) {
      throw new ForbiddenException('Seller can only manage own shop');
    }
  }

  private include() {
    return {
      owner: {
        select: { id: true, name: true, email: true, phone: true, image: true },
      },
      _count: {
        select: {
          products: true,
          orderItems: true,
          reviews: true,
          conversations: true,
        },
      },
    };
  }

  private sellerRequestInclude() {
    return {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          image: true,
        },
      },
      shop: true,
      reviewedBy: { select: { id: true, name: true, email: true } },
    };
  }

  private async uniqueShopSlug(name: string) {
    const base = this.slugify(name) || `shop-${Date.now()}`;
    let slug = base;
    let index = 1;
    while (await this.prisma.shop.findUnique({ where: { slug } })) {
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
}
