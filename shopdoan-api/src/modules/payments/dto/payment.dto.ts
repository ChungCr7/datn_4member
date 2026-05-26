import { Type } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

export class CreateStripeCheckoutDto {
  @Type(() => Number)
  @IsNumber()
  orderId!: number;
}

export class ConfirmStripeCheckoutDto {
  @IsString()
  sessionId!: string;
}

export class CreateCodPaymentDto {
  @Type(() => Number)
  @IsNumber()
  orderId!: number;
}
