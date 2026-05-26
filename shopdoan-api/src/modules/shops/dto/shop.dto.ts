import { IsOptional, IsString } from 'class-validator';

export class CreateShopDto {
  @IsString()
  shopName!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  banner?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  businessType?: string;
}

export class UpdateShopDto {
  @IsOptional()
  @IsString()
  shopName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  banner?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class RejectSellerRequestDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
