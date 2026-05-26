import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class PaymentsService {
  private stripe: any = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (secretKey) {
      this.stripe = new Stripe(secretKey);
    }
  }

  async createCodPayment(
    orderId: number,
    userId: number,
    userRole?: string,
    legacyRole?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    if (!order)
      throw new NotFoundException(`Order with ID ${orderId} not found`);

    const role = String(userRole || legacyRole || '').toLowerCase();
    if (order.userId !== userId && role !== 'admin' && role !== 'root') {
      throw new BadRequestException(
        'Cannot create payment for another user order',
      );
    }

    const amount = Number(
      order.finalAmount || order.totalAmount || order.totalPrice,
    );
    const payment = await this.prisma.payment.upsert({
      where: {
        id: order.payments.find((entry) => entry.method === 'COD')?.id || 0,
      },
      update: {
        method: 'COD',
        amount,
        status: 'UNPAID',
      },
      create: {
        orderId: order.id,
        method: 'COD',
        amount,
        status: 'UNPAID',
      },
    });

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        paymentMethod: 'COD',
        marketplacePaymentStatus: 'UNPAID',
        paymentProvider: 'cash',
        paymentStatus: 'pending',
      },
      include: { payments: true, orderItems: true },
    });

    return {
      success: true,
      message: 'COD payment created successfully',
      data: { payment, order: updated },
    };
  }

  async createStripeCheckout(
    orderId: number,
    userId: number,
    userRole?: string,
    requestOrigin?: string,
  ) {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, details: true },
    });
    if (!order)
      throw new NotFoundException(`Order with ID ${orderId} not found`);

    const role = String(userRole || '').toLowerCase();
    if (order.userId !== userId && role !== 'admin' && role !== 'root') {
      throw new BadRequestException('Cannot pay another user order');
    }

    const frontendUrl = this.resolveCheckoutFrontendUrl(requestOrigin);

    // VND is a zero-decimal currency, so we don't multiply by 100
    const amountInVND = Math.round(order.totalPrice);

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: order.user.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'vnd',
            product_data: { name: `ShopDoAn order #${order.id}` },
            unit_amount: amountInVND,
          },
        },
      ],
      metadata: { orderId: String(order.id) },
      success_url: `${frontendUrl}/orders?payment=success&orderId=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/checkout?payment=cancelled&orderId=${order.id}`,
    });

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        paymentProvider: 'stripe',
        paymentStatus: 'pending',
        paymentIntentId: session.payment_intent
          ? String(session.payment_intent)
          : session.id,
        paymentUrl: session.url,
      },
    });

    return { order: updated, checkoutUrl: session.url, sessionId: session.id };
  }

  private resolveCheckoutFrontendUrl(requestOrigin?: string) {
    const normalizedOrigin = requestOrigin?.replace(/\/$/, '');
    if (normalizedOrigin && !normalizedOrigin.includes('localhost:3001')) {
      return normalizedOrigin;
    }

    return (
      this.configService.get<string>('USER_FRONTEND_URL') ||
      this.configService.get<string>('FRONTEND_URL') ||
      'http://localhost:3000'
    ).replace(/\/$/, '');
  }

  async confirmStripeCheckout(
    sessionId: string,
    userId: number,
    userRole?: string,
  ) {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const session = await this.stripe.checkout.sessions.retrieve(sessionId);
    const orderId = Number(session.metadata?.orderId);
    if (!orderId) {
      throw new BadRequestException(
        'Stripe session does not include an order ID',
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order)
      throw new NotFoundException(`Order with ID ${orderId} not found`);

    const role = String(userRole || '').toLowerCase();
    if (order.userId !== userId && role !== 'admin' && role !== 'root') {
      throw new BadRequestException('Cannot confirm another user order');
    }

    const isPaid =
      session.payment_status === 'paid' || session.status === 'complete';
    if (!isPaid) {
      return {
        order,
        paid: false,
        sessionStatus: session.status,
        paymentStatus: session.payment_status,
      };
    }

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        paymentProvider: 'stripe',
        paymentStatus: 'paid',
        paymentIntentId: session.payment_intent
          ? String(session.payment_intent)
          : session.id,
        paidAt: order.paidAt || new Date(),
      },
    });

    return {
      order: updated,
      paid: true,
      sessionStatus: session.status,
      paymentStatus: session.payment_status,
    };
  }

  async handleWebhook(payload: Buffer | string | any, signature?: string) {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    let event: any = payload;
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    try {
      // If we have webhook secret and signature, verify the webhook
      if (webhookSecret && signature) {
        // Ensure payload is a Buffer or string for signature verification
        let rawPayload: Buffer | string = payload;
        if (Buffer.isBuffer(payload)) {
          rawPayload = payload;
        } else if (typeof payload === 'string') {
          rawPayload = payload;
        } else {
          // If payload is already parsed, we can't verify signature
          console.warn(
            'Webhook payload is already parsed, skipping signature verification',
          );
          rawPayload = JSON.stringify(payload);
        }

        try {
          event = this.stripe.webhooks.constructEvent(
            rawPayload,
            signature,
            webhookSecret,
          );
        } catch (signError) {
          console.error('Webhook signature verification failed:', signError);
          throw new BadRequestException(
            `Webhook signature verification failed: ${
              signError instanceof Error ? signError.message : 'Unknown error'
            }`,
          );
        }
      } else {
        // If no webhook secret or signature, try to parse the payload
        if (typeof payload === 'string') {
          event = JSON.parse(payload);
        } else if (Buffer.isBuffer(payload)) {
          event = JSON.parse(payload.toString('utf-8'));
        }
        // If payload is already an object, use it as is
      }
    } catch (error) {
      console.error('Webhook processing error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Webhook Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = Number(session.metadata?.orderId);
      if (orderId) {
        await this.prisma.order.update({
          where: { id: orderId },
          data: {
            paymentProvider: 'stripe',
            paymentStatus: 'paid',
            paymentIntentId: session.payment_intent
              ? String(session.payment_intent)
              : session.id,
            paidAt: new Date(),
          },
        });
      }
    }

    // Handle checkout.session.expired and payment_intent.payment_failed
    if (
      event.type === 'checkout.session.expired' ||
      event.type === 'payment_intent.payment_failed'
    ) {
      const session = event.data.object;
      const orderId = session.metadata?.orderId
        ? Number(session.metadata.orderId)
        : null;
      if (orderId) {
        await this.prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: 'failed' },
        });
      }
    }

    return { received: true };
  }
}
