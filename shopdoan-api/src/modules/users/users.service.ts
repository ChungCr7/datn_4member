import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  hashPasswordHelper,
  comparePasswordHelper,
} from '@/helpers/password.helper';
import { PaginationDto } from '@/common/pagination.dto';
import { UploadService } from '@/common/upload.service';
import { toMarketplaceRole } from '@/auth/role.utils';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

  async create(
    createUserDto: CreateUserDto,
    requestingUserId?: number,
    requestingUserRole?: string,
  ) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const roleId = await this.resolveWritableRoleId(
      createUserDto.roleId,
      createUserDto.roleName,
      requestingUserRole,
      'USER',
    );
    const role = await this.prisma.role.findUniqueOrThrow({
      where: { id: roleId },
    });

    const user = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        fullName: createUserDto.name,
        email: createUserDto.email.trim().toLowerCase(),
        phone: createUserDto.phone?.trim() || null,
        address: createUserDto.address?.trim() || null,
        image: createUserDto.image || null,
        avatar: createUserDto.image || null,
        password: await hashPasswordHelper(
          createUserDto.password || 'User@123456',
        ),
        roleId,
        accountRole: toMarketplaceRole(role.name),
        isActive: createUserDto.isActive ?? true,
      },
      select: {
        id: true,
        name: true,
        fullName: true,
        email: true,
        phone: true,
        address: true,
        image: true,
        avatar: true,
        isActive: true,
        accountRole: true,
        role: { select: { id: true, name: true } },
        createdAt: true,
      },
    });
    return user;
  }

  async findAll(pagination: PaginationDto) {
    // Sanitize search input
    const searchTerm = pagination.search
      ? String(pagination.search).trim().slice(0, 100)
      : '';

    const where = searchTerm
      ? {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' as const } },
            { email: { contains: searchTerm, mode: 'insensitive' as const } },
            { phone: { contains: searchTerm, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          image: true,
          avatar: true,
          fullName: true,
          accountRole: true,
          isActive: true,
          role: { select: { id: true, name: true } },
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        image: true,
        avatar: true,
        fullName: true,
        accountRole: true,
        isActive: true,
        role: { select: { id: true, name: true } },
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string) {
    return await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
  }

  async findById(id: number) {
    return await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
  }

  async updateRefreshToken(userId: number, refreshToken: string | null) {
    return await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken,
      },
    });
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    requestingUserId: number,
    requestingUserRole?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Users can only update their own profile unless they are ADMIN or ROOT.
    const requestRole = String(requestingUserRole || '').toLowerCase();
    const isOwnProfile = id === requestingUserId;
    const isAdmin = requestRole === 'admin';
    const isPrivileged = isAdmin || requestRole === 'root';
    const isRoot = requestRole === 'root';

    if (user.role.name.toLowerCase() === 'root' && !isOwnProfile && !isRoot) {
      throw new ForbiddenException('Only ROOT can update ROOT account');
    }

    if (!isOwnProfile && !isPrivileged) {
      const requestingUser = await this.prisma.user.findUnique({
        where: { id: requestingUserId },
        include: { role: true },
      });
      const dbRole = String(requestingUser?.role?.name || '').toLowerCase();
      if (dbRole !== 'admin' && dbRole !== 'root') {
        throw new ForbiddenException('Users can only update their own profile');
      }
    }

    // Password change verification
    if (updateUserDto.password) {
      // If user is updating their own profile, require old password verification
      if (isOwnProfile) {
        if (!updateUserDto.oldPassword) {
          throw new BadRequestException(
            'Old password is required to change password',
          );
        }
        const isPasswordValid = await comparePasswordHelper(
          updateUserDto.oldPassword,
          user.password || '',
        );
        if (!isPasswordValid) {
          throw new BadRequestException('Old password is incorrect');
        }
      }
      // ADMIN/ROOT can change passwords for other users after ownership checks above.
    }

    const wantsRoleChange =
      updateUserDto.roleId !== undefined ||
      updateUserDto.roleName !== undefined;
    if (wantsRoleChange && !isRoot) {
      throw new ForbiddenException('Only ROOT can change user roles');
    }

    const nextRoleId = wantsRoleChange
      ? await this.resolveWritableRoleId(
          updateUserDto.roleId,
          updateUserDto.roleName,
          requestingUserRole,
          user.role.name,
        )
      : undefined;
    const nextRole = nextRoleId
      ? await this.prisma.role.findUnique({ where: { id: nextRoleId } })
      : null;

    if (
      wantsRoleChange &&
      user.role.name.toLowerCase() === 'root' &&
      nextRoleId !== user.roleId
    ) {
      throw new ForbiddenException('ROOT account role cannot be changed');
    }

    // Validate email uniqueness if email is being changed
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });
      if (existingUser) {
        throw new BadRequestException('Email already exists');
      }
    }

    const name = updateUserDto.name?.trim();
    const email = updateUserDto.email?.trim();
    const phone = updateUserDto.phone?.trim();
    const address = updateUserDto.address?.trim();
    const image = updateUserDto.image?.trim();

    return await this.prisma.user.update({
      where: { id },
      data: {
        ...(updateUserDto.name !== undefined && { name: name || null }),
        ...(updateUserDto.name !== undefined && { fullName: name || null }),
        ...(updateUserDto.email !== undefined && email && { email }),
        ...(updateUserDto.phone !== undefined && { phone: phone || null }),
        ...(updateUserDto.address !== undefined && {
          address: address || null,
        }),
        ...(updateUserDto.image !== undefined && { image: image || null }),
        ...(updateUserDto.image !== undefined && { avatar: image || null }),
        ...(updateUserDto.isActive !== undefined && {
          isActive: updateUserDto.isActive,
        }),
        ...(nextRoleId !== undefined && { roleId: nextRoleId }),
        ...(nextRole && { accountRole: toMarketplaceRole(nextRole.name) }),
        ...(updateUserDto.password && {
          password: await hashPasswordHelper(updateUserDto.password),
        }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        image: true,
        avatar: true,
        fullName: true,
        accountRole: true,
        isActive: true,
        role: { select: { id: true, name: true } },
      },
    });
  }

  async remove(
    id: number,
    requestingUserId: number,
    requestingUserRole?: string,
  ) {
    const requestRole = String(requestingUserRole || '').toLowerCase();
    if (requestRole !== 'admin' && requestRole !== 'root') {
      throw new ForbiddenException('Only ADMIN or ROOT can delete users');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    if (
      user.role.name.toLowerCase() === 'root' ||
      (user.role.name.toLowerCase() === 'admin' && requestRole !== 'root') ||
      id === requestingUserId
    ) {
      throw new ForbiddenException('ROOT account cannot be deleted');
    }
    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted successfully' };
  }

  async updateProfileImage(userId: number, imageFile: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Delete old image if it exists
    if (user.image) {
      await this.uploadService.deleteImageIfExists(user.image);
    }

    // Upload new image
    const imageUrl = await this.uploadService.uploadImage(imageFile, 'users');

    // Update user with new image
    return await this.prisma.user.update({
      where: { id: userId },
      data: { image: imageUrl },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        image: true,
        avatar: true,
        fullName: true,
        accountRole: true,
        isActive: true,
        role: { select: { id: true, name: true } },
      },
    });
  }

  async fixRootUser() {
    try {
      // Ensure ROOT role exists
      const rootRole = await this.prisma.role.upsert({
        where: { name: 'ROOT' },
        update: {},
        create: { name: 'ROOT' },
      });

      // Hash the root password
      const hashedPassword = await hashPasswordHelper('Root@123456');
      const existingRoot = await this.prisma.user.findFirst({
        where: { roleId: rootRole.id },
        include: { role: true },
      });

      // Keep exactly one ROOT account; update it if it already exists.
      const rootUser = existingRoot
        ? await this.prisma.user.update({
            where: { id: existingRoot.id },
            data: {
              password: hashedPassword,
              isActive: true,
              name: existingRoot.name || 'System Root',
              fullName:
                existingRoot.fullName || existingRoot.name || 'System Root',
              accountRole: 'ADMIN',
            },
            include: { role: true },
          })
        : await this.prisma.user.create({
            data: {
              email: 'root@system.com',
              password: hashedPassword,
              name: 'System Root',
              fullName: 'System Root',
              roleId: rootRole.id,
              accountRole: 'ADMIN',
              isActive: true,
            },
            include: { role: true },
          });

      await this.prisma.user.updateMany({
        where: {
          roleId: rootRole.id,
          id: { not: rootUser.id },
        },
        data: {
          roleId: await this.resolveWritableRoleId(undefined, 'USER', 'root'),
          accountRole: 'BUYER',
        },
      });

      return {
        success: true,
        message: 'Root user fixed',
        user: {
          email: rootUser.email,
          name: rootUser.name,
          role: rootUser.role?.name,
          isActive: rootUser.isActive,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fix root user',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async resolveWritableRoleId(
    roleId?: number,
    roleName?: string,
    requestingUserRole?: string,
    fallbackRoleName = 'USER',
  ) {
    const requestRole = String(requestingUserRole || '').toLowerCase();
    const wantsRole = roleId !== undefined || roleName !== undefined;

    if (wantsRole && requestRole !== 'root') {
      throw new ForbiddenException('Only ROOT can change user roles');
    }

    if (roleId !== undefined) {
      const role = await this.prisma.role.findUnique({ where: { id: roleId } });
      if (!role) throw new BadRequestException('Role not found');
      if (role.name.toLowerCase() === 'root') {
        throw new ForbiddenException('Cannot assign ROOT role');
      }
      return role.id;
    }

    const targetRoleName = (roleName || fallbackRoleName).trim().toUpperCase();
    if (targetRoleName === 'ROOT') {
      throw new ForbiddenException('Cannot assign ROOT role');
    }
    if (!['ADMIN', 'SELLER', 'USER'].includes(targetRoleName)) {
      throw new BadRequestException('Role must be ADMIN, SELLER or USER');
    }

    const role = await this.prisma.role.findUnique({
      where: { name: targetRoleName },
    });
    if (!role)
      throw new BadRequestException(`${targetRoleName} role not found`);
    return role.id;
  }
}
