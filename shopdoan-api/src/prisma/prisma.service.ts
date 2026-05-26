import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown database connection error';
      this.logger.warn(
        `Database connection was not ready at startup: ${message}`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
