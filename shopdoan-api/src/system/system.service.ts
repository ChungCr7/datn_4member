import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class SystemService implements OnModuleInit {
  private readonly logger = new Logger(SystemService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.initRoles();
      await this.initRootUser();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown system initialization error';
      this.logger.warn(`Skipped system seed at startup: ${message}`);
    }
  }

  async ensureRolesExist() {
    const roles = ['ROOT', 'ADMIN', 'SELLER', 'USER'];

    for (const name of roles) {
      try {
        await this.prisma.role.findUniqueOrThrow({
          where: { name },
        });
      } catch {
        await this.prisma.role.create({
          data: { name },
        });
      }
    }
  }

  private async initRoles() {
    const roles = ['ROOT', 'ADMIN', 'SELLER', 'USER'];

    for (const name of roles) {
      try {
        // Check if role exists
        const existing = await this.prisma.role.findUnique({
          where: { name },
        });

        if (!existing) {
          // Create role if it doesn't exist
          await this.prisma.role.create({
            data: { name },
          });
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown role initialization error';
        this.logger.warn(`Role initialization skipped for ${name}: ${message}`);
      }
    }
  }

  private async initRootUser() {
    const rootEmail = process.env.ROOT_EMAIL;
    const rootPassword = process.env.ROOT_PASSWORD;

    if (!rootEmail || !rootPassword) {
      throw new Error(
        '[SYSTEM INIT] ROOT_EMAIL or ROOT_PASSWORD is not configured',
      );
    }

    const rootRole = await this.prisma.role.findUniqueOrThrow({
      where: { name: 'ROOT' },
    });

    const hashed = await bcrypt.hash(rootPassword, 10);
    const existingRoot = await this.prisma.user.findFirst({
      where: { roleId: rootRole.id },
    });

    const rootUser = existingRoot
      ? existingRoot
      : await this.prisma.user.upsert({
          where: { email: rootEmail },
          update: {
            password: hashed,
            roleId: rootRole.id,
            accountRole: 'ADMIN',
            isActive: true,
          },
          create: {
            email: rootEmail,
            password: hashed,
            name: 'System Root',
            fullName: 'System Root',
            accountRole: 'ADMIN',
            isActive: true,
            role: {
              connect: { id: rootRole.id },
            },
          },
        });

    const userRole = await this.prisma.role.findUnique({
      where: { name: 'USER' },
    });
    if (userRole) {
      await this.prisma.user.updateMany({
        where: {
          roleId: rootRole.id,
          id: { not: rootUser.id },
        },
        data: { roleId: userRole.id, accountRole: 'BUYER' },
      });
    }
  }
}
