import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { ShopChatController } from './shop-chat.controller';
import { ShopChatService } from './shop-chat.service';

@Module({
  imports: [PrismaModule],
  controllers: [ShopChatController],
  providers: [ShopChatService],
})
export class ShopChatModule {}
