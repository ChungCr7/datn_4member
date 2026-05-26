import { IsEmail, IsString } from 'class-validator';

export class CodeDto {
  @IsEmail()
  email!: string;

  @IsString()
  code!: string;
}
