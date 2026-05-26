import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { SendShopMessageDto } from './dto/shop-chat.dto';
import { ShopChatService } from './shop-chat.service';

@ApiTags('Shop Chat')
@Controller('shop-chat')
@ApiBearerAuth()
export class ShopChatController {
  constructor(private readonly shopChatService: ShopChatService) {}

  @Get('sellers/:sellerId')
  getBuyerConversation(
    @Param('sellerId', ParseIntPipe) sellerId: number,
    @CurrentUser() user: any,
  ) {
    return this.shopChatService.getBuyerConversation(
      sellerId,
      this.userId(user),
    );
  }

  @Post('sellers/:sellerId/messages')
  sendBuyerMessage(
    @Param('sellerId', ParseIntPipe) sellerId: number,
    @Body() dto: SendShopMessageDto,
    @CurrentUser() user: any,
  ) {
    return this.shopChatService.sendBuyerMessage(
      sellerId,
      this.userId(user),
      dto.message,
    );
  }

  @Get('seller/conversations')
  @Roles('seller', 'admin', 'root')
  getSellerConversations(@CurrentUser() user: any) {
    return this.shopChatService.getSellerConversations(this.userId(user), user);
  }

  @Get('seller/conversations/:conversationId')
  @Roles('seller', 'admin', 'root')
  getSellerConversation(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @CurrentUser() user: any,
  ) {
    return this.shopChatService.getSellerConversation(
      conversationId,
      this.userId(user),
      user,
    );
  }

  @Post('seller/conversations/:conversationId/messages')
  @Roles('seller', 'admin', 'root')
  sendSellerMessage(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Body() dto: SendShopMessageDto,
    @CurrentUser() user: any,
  ) {
    return this.shopChatService.sendSellerMessage(
      conversationId,
      this.userId(user),
      user,
      dto.message,
    );
  }

  private userId(user: any) {
    return Number(user?.userId || user?.sub || user?.id);
  }
}
