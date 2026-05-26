import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { ValidateCartItemDto } from './dto/validate-cart-item.dto';

@ApiTags('Cart')
@Controller('cart')
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Req() req: any) {
    return this.cartService.getCart(req.user.id);
  }

  @Post('validate-item')
  validateItem(@Body() dto: ValidateCartItemDto) {
    return this.cartService.validateItem(dto);
  }

  @Post('items')
  addItem(@Req() req: any, @Body() dto: ValidateCartItemDto) {
    return this.cartService.addItem(req.user.id, dto);
  }

  @Patch('items/:cartKey')
  updateItem(
    @Req() req: any,
    @Param('cartKey') cartKey: string,
    @Body() body: { quantity: number },
  ) {
    return this.cartService.updateItem(
      req.user.id,
      cartKey,
      Number(body.quantity),
    );
  }

  @Delete('items/:cartKey')
  removeItem(@Req() req: any, @Param('cartKey') cartKey: string) {
    return this.cartService.removeItem(req.user.id, cartKey);
  }

  @Delete()
  clearCart(@Req() req: any) {
    return this.cartService.clearCart(req.user.id);
  }

  @Delete('clear')
  clearCartAlias(@Req() req: any) {
    return this.cartService.clearCart(req.user.id);
  }
}
