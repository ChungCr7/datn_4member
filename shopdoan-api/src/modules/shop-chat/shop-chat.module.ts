import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { ShopChatController } from './shop-chat.controller';
import { ShopChatService } from './shop-chat.service';
import { NotificationsModule } from '@/modules/notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [ShopChatController],
  providers: [ShopChatService],
})
export class ShopChatModule {}
