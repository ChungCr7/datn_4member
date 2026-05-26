import { IsString, MaxLength, MinLength } from 'class-validator';

export class SendShopMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message!: string;
}
