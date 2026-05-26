import {
  IsBoolean,
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  Min,
  IsIn,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

const toBoolean = ({ value }: { value: unknown }) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

export class CreateMenuItemDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  basePrice!: number;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsIn(['active', 'hidden', 'draft', 'rejected'])
  status?: 'active' | 'hidden' | 'draft' | 'rejected';

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @Type(() => Number)
  @IsNumber()
  menuId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  shopId?: number;
}

export class UpdateMenuItemDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  basePrice?: number;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsIn(['active', 'hidden', 'draft', 'rejected'])
  status?: 'active' | 'hidden' | 'draft' | 'rejected';

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  menuId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  shopId?: number;
}

export class CreateMenuItemOptionDto {
  @IsString()
  title!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  additionalPrice!: number;

  @IsOptional()
  @IsString()
  optionalDescription?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isAvailable?: boolean;

  @Type(() => Number)
  @IsNumber()
  menuItemId!: number;
}

export class UpdateMenuItemOptionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  additionalPrice?: number;

  @IsOptional()
  @IsString()
  optionalDescription?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isAvailable?: boolean;
}
