import { IsString } from 'class-validator';

export class SellerReplyDto {
  @IsString()
  text!: string;
}
