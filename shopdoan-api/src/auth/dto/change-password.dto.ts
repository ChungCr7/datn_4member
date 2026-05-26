import { IsEmail, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsEmail()
  email!: string;

  @IsString()
  code!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  confirmPassword!: string;
}
