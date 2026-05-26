import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '@/modules/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  comparePasswordHelper,
  hashTokenHelper,
  compareTokenHelper,
  hashPasswordHelper,
  generateResetCode,
} from '@/helpers/password.helper';
import { RegisterDto } from '@/auth/dto/register.dto';
import { CodeDto } from '@/auth/dto/code.dto';
import { ChangePasswordDto } from '@/auth/dto/change-password.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthEmailService } from '@/auth/auth-email.service';
import { Prisma } from '@prisma/client';
import dayjs from 'dayjs';
import { StringValue } from 'ms';
import { toMarketplaceRole } from '@/auth/role.utils';

const CODE_TTL_MINUTES = 10;
const MAX_CODE_ATTEMPTS = 5;
const VERIFY_EMAIL_COOLDOWN_SECONDS = 60;
const UNVERIFIED_ACCOUNT_TTL_HOURS = 24;

export type AuthUser = {
  id: number;
  email: string;
  name?: string | null;
  fullName?: string | null;
  avatar?: string | null;
  accountRole?: string | null;
  role?: string | { name: string } | null;
  refreshToken?: string | null;
};

type RefreshTokenPayload = {
  sub: number;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly authEmailService: AuthEmailService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(
      email.trim().toLowerCase(),
    );

    if (!user) return null;

    const isMatch = await comparePasswordHelper(password, user.password);

    if (!isMatch) return null;

    return user;
  }

  async login(user: AuthUser) {
    return this.getTokens(user);
  }

  private async getTokens(user: AuthUser) {
    const legacyRole = this.getLegacyRoleName(user);
    const roleName = this.getMarketplaceRoleName(user);
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: roleName,
        legacyRole,
      },
      {
        secret: this.configService.get<string>('JWT_SECRET')!,
        expiresIn: this.configService.get<string>(
          'JWT_EXPIRES_IN',
        ) as StringValue,
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
      },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET')!,
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
        ) as StringValue,
      },
    );

    const hashedRefreshToken = await hashTokenHelper(refreshToken);
    await this.usersService.updateRefreshToken(user.id, hashedRefreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName || user.name,
        fullName: user.fullName || user.name,
        avatar: user.avatar || null,
        role: roleName,
        legacyRole,
      },
    };
  }

  async refreshToken(token: string) {
    if (!token) {
      throw new UnauthorizedException('Refresh token is required');
    }

    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const tokenMatches = await compareTokenHelper(token, user.refreshToken);
    if (!tokenMatches) {
      throw new UnauthorizedException('Refresh token mismatch');
    }

    return this.getTokens(user);
  }

  async logout(userId: number) {
    await this.usersService.updateRefreshToken(userId, null);
    return { success: true };
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existingUser = await this.usersService.findByEmail(email);

    if (existingUser?.isActive) {
      this.logger.warn(`Register blocked for verified email: ${email}`);
      throw new BadRequestException('Email đã tồn tại');
    }

    const password = await hashPasswordHelper(dto.password);
    const code = generateResetCode();
    const now = new Date();
    const verificationData = this.createVerificationCodeData(code, now);

    try {
      const user = existingUser
        ? await this.updateUnverifiedRegistration(
            existingUser,
            dto,
            password,
            verificationData,
          )
        : await this.prisma.user.create({
            data: {
              email,
              name: dto.name,
              phone: dto.phone || null,
              password,
              isActive: false,
              fullName: dto.name,
              accountRole: 'BUYER',
              ...verificationData,
              role: {
                connect: { name: 'USER' },
              },
            },
            select: this.publicAuthUserSelect(),
          });

      const mailResult =
        await this.authEmailService.sendRegistrationVerification(user, code);

      this.logger.log(
        `${existingUser ? 'Refreshed unverified registration' : 'Created unverified registration'} for ${email}`,
      );
      if (!mailResult.success) {
        this.logger.warn(
          `Verification email was not delivered to ${email}: ${mailResult.message || 'unknown error'}`,
        );
      }

      return {
        user,
        message: 'Mã xác thực đã được gửi đến email của bạn',
        nextStep: 'verify_email',
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.warn(
          `Register race detected for ${email}; reusing existing unverified user`,
        );
        const racedUser = await this.usersService.findByEmail(email);
        if (racedUser?.isActive) {
          throw new BadRequestException('Email đã tồn tại');
        }
        if (racedUser) {
          const user = await this.updateUnverifiedRegistration(
            racedUser,
            dto,
            password,
            verificationData,
          );
          const mailResult =
            await this.authEmailService.sendRegistrationVerification(
              user,
              code,
            );
          if (!mailResult.success) {
            this.logger.warn(
              `Verification email was not delivered to ${email}: ${mailResult.message || 'unknown error'}`,
            );
          }
          return {
            user,
            message: 'Mã xác thực đã được gửi đến email của bạn',
            nextStep: 'verify_email',
          };
        }
      }
      throw error;
    }
  }

  private async updateUnverifiedRegistration(
    existingUser: {
      id: number;
      email: string;
      verificationSentAt: Date | null;
    },
    dto: RegisterDto,
    password: string,
    verificationData: {
      codeId: string;
      codeExpired: Date;
      verificationSentAt: Date;
      codeAttempts: number;
      codeAttemptExpired: null;
    },
  ) {
    this.assertVerificationEmailCooldown(existingUser.verificationSentAt);

    return this.prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name: dto.name,
        fullName: dto.name,
        phone: dto.phone || null,
        password,
        isActive: false,
        accountRole: 'BUYER',
        ...verificationData,
      },
      select: this.publicAuthUserSelect(),
    });
  }

  async verifyRegistration(email: string, code: string) {
    const user = await this.findUserByEmailOrThrow(
      email,
      'Registration not found',
    );

    if (user.isActive) {
      return { success: true, message: 'Tài khoản đã được xác thực' };
    }

    await this.assertValidCode(user, code, 'Mã xác thực không đúng');

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: this.clearCodeData({ isActive: true }),
      select: this.publicAuthUserSelect(),
    });

    return {
      success: true,
      user: updatedUser,
      message: 'Xác thực email thành công',
    };
  }

  activate(dto: CodeDto) {
    return this.verifyRegistration(dto.email, dto.code);
  }

  async resendActivation(email: string) {
    const user = await this.findUserByEmailOrThrow(email, 'User not found');

    if (user.isActive) {
      throw new BadRequestException('Tài khoản đã được kích hoạt');
    }

    this.assertVerificationEmailCooldown(user.verificationSentAt);

    const code = generateResetCode();
    const verificationData = this.createVerificationCodeData(code);
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: verificationData,
      select: this.publicAuthUserSelect(),
    });

    const mailResult = await this.authEmailService.sendRegistrationVerification(
      updatedUser,
      code,
    );

    this.logger.log(`Resent verification email to ${updatedUser.email}`);
    if (!mailResult.success) {
      this.logger.warn(
        `Verification resend failed for ${updatedUser.email}: ${mailResult.message || 'unknown error'}`,
      );
    }

    return {
      email: updatedUser.email,
      message: 'Mã xác thực đã được gửi đến email của bạn',
    };
  }

  async forgotPassword(email: string) {
    const user = await this.findUserByEmailOrThrow(email, 'User not found');

    if (!user.isActive) {
      throw new BadRequestException('Vui lòng xác thực email trước');
    }

    await this.ensureCodeAttemptAllowed(user);

    const code = generateResetCode();
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        codeId: code,
        codeExpired: this.getCodeExpiredAt(),
        codeAttempts: 0,
        codeAttemptExpired: null,
      },
    });

    await this.authEmailService.sendPasswordReset(user, code);

    return { email: user.email, message: 'Reset code sent to your email' };
  }

  async verifyCode(email: string, code: string) {
    const user = await this.findUserByEmailOrThrow(email, 'User not found');
    await this.assertValidCode(user, code, 'Invalid reset code');

    return { success: true, message: 'Code verified' };
  }

  async changePassword(dto: ChangePasswordDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Password mismatch');
    }

    const user = await this.findUserByEmailOrThrow(dto.email, 'User not found');
    await this.assertValidCode(user, dto.code, 'Invalid code');

    const newPassword = await hashPasswordHelper(dto.password);

    await this.prisma.user.update({
      where: { id: user.id },
      data: this.clearCodeData({ password: newPassword }),
    });

    return { success: true };
  }

  async fixRootUser() {
    try {
      // Use usersService to handle the database operations
      const result = await this.usersService.fixRootUser();
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fix root user',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private getCodeExpiredAt() {
    return dayjs().add(CODE_TTL_MINUTES, 'minutes').toDate();
  }

  private createVerificationCodeData(code: string, sentAt = new Date()) {
    return {
      codeId: code,
      codeExpired: this.getCodeExpiredAt(),
      verificationSentAt: sentAt,
      codeAttempts: 0,
      codeAttemptExpired: null,
    };
  }

  private publicAuthUserSelect() {
    return {
      id: true,
      email: true,
      name: true,
      fullName: true,
      avatar: true,
      phone: true,
      isActive: true,
      accountRole: true,
      role: { select: { name: true } },
    } as const;
  }

  private clearCodeData<T extends Record<string, unknown>>(data?: T) {
    return {
      ...(data ?? {}),
      codeId: null,
      codeExpired: null,
      verificationSentAt: null,
      codeAttempts: 0,
      codeAttemptExpired: null,
    };
  }

  private assertVerificationEmailCooldown(sentAt?: Date | null) {
    if (!sentAt) return;

    const nextAllowedAt = dayjs(sentAt).add(
      VERIFY_EMAIL_COOLDOWN_SECONDS,
      'seconds',
    );
    if (dayjs().isBefore(nextAllowedAt)) {
      const retryAfter = Math.max(1, nextAllowedAt.diff(dayjs(), 'second'));
      throw new BadRequestException({
        message: `Vui long cho ${retryAfter} giay truoc khi gui lai email xac thuc`,
        retryAfter,
      });
    }
  }

  async cleanupExpiredUnverifiedAccounts() {
    const cutoff = dayjs()
      .subtract(UNVERIFIED_ACCOUNT_TTL_HOURS, 'hours')
      .toDate();
    const now = new Date();

    try {
      const result = await this.prisma.user.deleteMany({
        where: {
          isActive: false,
          codeId: { not: null },
          verificationSentAt: { not: null },
          codeExpired: { lt: now },
          createdAt: { lt: cutoff },
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `Cleaned up ${result.count} unverified account(s) older than ${UNVERIFIED_ACCOUNT_TTL_HOURS} hours`,
        );
      }

      return result.count;
    } catch (error) {
      this.logger.error(
        `Failed to cleanup unverified accounts: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      return 0;
    }
  }

  private async findUserByEmailOrThrow(email: string, message: string) {
    const user = await this.usersService.findByEmail(
      email.trim().toLowerCase(),
    );

    if (!user) {
      throw new BadRequestException(message);
    }

    return user;
  }

  private async ensureCodeAttemptAllowed(user: {
    id: number;
    codeAttempts: number;
    codeAttemptExpired: Date | null;
  }) {
    if (
      user.codeAttemptExpired &&
      dayjs().isBefore(user.codeAttemptExpired) &&
      user.codeAttempts >= MAX_CODE_ATTEMPTS
    ) {
      throw new BadRequestException(
        'Too many attempts. Please try again later.',
      );
    }

    if (!user.codeAttemptExpired || dayjs().isAfter(user.codeAttemptExpired)) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          codeAttempts: 0,
          codeAttemptExpired: null,
        },
      });
    }
  }

  private async assertValidCode(
    user: {
      id: number;
      codeId: string | null;
      codeExpired: Date | null;
      codeAttempts: number;
      codeAttemptExpired: Date | null;
    },
    code: string,
    invalidMessage: string,
  ) {
    await this.ensureCodeAttemptAllowed(user);

    if (!user.codeId || user.codeId !== code) {
      await this.incrementCodeAttempts(user.id, user.codeAttempts);
      throw new BadRequestException(invalidMessage);
    }

    if (!user.codeExpired || dayjs().isAfter(user.codeExpired)) {
      throw new BadRequestException('Code expired');
    }
  }

  private async incrementCodeAttempts(userId: number, attempts: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        codeAttempts: attempts + 1,
        codeAttemptExpired: dayjs().add(1, 'hour').toDate(),
      },
    });
  }

  private getLegacyRoleName(user: AuthUser) {
    return typeof user.role === 'string' ? user.role : (user.role?.name ?? '');
  }

  private getMarketplaceRoleName(user: AuthUser) {
    return toMarketplaceRole(user.accountRole || this.getLegacyRoleName(user));
  }
}
