import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Req,
} from '@nestjs/common';
import { AuthService, AuthUser } from '@/auth/auth.service';
import { RegisterDto } from '@/auth/dto/register.dto';
import { CodeDto } from '@/auth/dto/code.dto';
import { ChangePasswordDto } from '@/auth/dto/change-password.dto';
import { LocalAuthGuard } from '@/auth/guards/local-auth.guard';
import { Public } from '@/auth/decorators/public.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('verify-registration')
  @Public()
  verifyRegistration(@Body('email') email: string, @Body('code') code: string) {
    return this.authService.verifyRegistration(email, code);
  }

  @Post('login')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(LocalAuthGuard)
  login(@Request() req: { user: AuthUser }) {
    return this.authService.login(req.user);
  }

  @Post('activate')
  @Public()
  activate(@Body() dto: CodeDto) {
    return this.authService.activate(dto);
  }

  @Post('resend-activation')
  @Public()
  resendActivation(@Body('email') email: string) {
    return this.authService.resendActivation(email);
  }

  @Post('forgot-password')
  @Public()
  forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('verify-code')
  @Public()
  verifyCode(@Body('email') email: string, @Body('code') code: string) {
    return this.authService.verifyCode(email, code);
  }

  @Post('change-password')
  @Public()
  changePassword(@Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(dto);
  }

  @Post('refresh')
  @Public()
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @Post('logout')
  async logout(@Req() req: any) {
    return this.authService.logout(
      req.user.userId || req.user.sub || req.user.id,
    );
  }

  @Post('fix-root-user')
  @Roles('root')
  async fixRootUser() {
    return this.authService.fixRootUser();
  }
}
