import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { AdminSellersController } from './admin-sellers.controller';
import { SellersController } from './sellers.controller';
import { SellersService } from './sellers.service';

@Module({
  imports: [PrismaModule],
  controllers: [SellersController, AdminSellersController],
  providers: [SellersService],
  exports: [SellersService],
})
export class SellersModule {}
