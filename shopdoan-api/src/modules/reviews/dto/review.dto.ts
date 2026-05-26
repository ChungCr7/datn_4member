import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  menuItemId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  orderDetailId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  shopId?: number;

  @IsOptional()
  @IsIn(['product', 'shop'])
  targetType?: 'product' | 'shop';
}

export class UpdateReviewDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  sellerReply?: string;

  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;

  @IsOptional()
  @IsString()
  hiddenReason?: string;
}
