import {
  Body,
  Controller,
  Headers,
  Post,
  Req,
  RawBodyRequest,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '@/auth/decorators/public.decorator';
import {
  ConfirmStripeCheckoutDto,
  CreateCodPaymentDto,
  CreateStripeCheckoutDto,
} from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('cod')
  @ApiBearerAuth()
  createCodPayment(@Body() dto: CreateCodPaymentDto, @Req() req: any) {
    return this.paymentsService.createCodPayment(
      dto.orderId,
      req.user.userId || req.user.sub || req.user.id,
      req.user.role,
      req.user.legacyRole,
    );
  }

  @Post('stripe/checkout')
  @ApiBearerAuth()
  createStripeCheckout(
    @Body() dto: CreateStripeCheckoutDto,
    @Req() req: any,
    @Headers('origin') origin?: string,
  ) {
    return this.paymentsService.createStripeCheckout(
      dto.orderId,
      req.user.userId || req.user.sub || req.user.id,
      req.user.role,
      origin,
    );
  }

  @Post('stripe/confirm')
  @ApiBearerAuth()
  confirmStripeCheckout(
    @Body() dto: ConfirmStripeCheckoutDto,
    @Req() req: any,
  ) {
    return this.paymentsService.confirmStripeCheckout(
      dto.sessionId,
      req.user.userId || req.user.sub || req.user.id,
      req.user.role,
    );
  }

  @Post('stripe/webhook')
  @Public()
  stripeWebhook(
    @Req() req: RawBodyRequest<any>,
    @Headers('stripe-signature') signature?: string,
  ) {
    // Get raw body - try multiple methods to handle different framework configurations
    let rawBody: Buffer | string | undefined;

    // Method 1: Check for rawBody in request (NestJS/Express with middleware setup)
    if (req.rawBody) {
      rawBody = req.rawBody;
    }
    // Method 2: Check if body is already a Buffer
    else if (Buffer.isBuffer(req.body)) {
      rawBody = req.body;
    }
    // Method 3: Get from readable stream if available
    else if (req.raw && typeof req.raw === 'object') {
      rawBody = req.raw;
    }
    // Fallback: convert body to string if it exists
    else if (req.body) {
      rawBody =
        typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    if (!rawBody) {
      throw new Error('Unable to get raw body for webhook verification');
    }

    return this.paymentsService.handleWebhook(rawBody, signature);
  }
}
