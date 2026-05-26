import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class ValidateCartItemDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  menuItemId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  productId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  menuItemOptionId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  variantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  quantity?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
