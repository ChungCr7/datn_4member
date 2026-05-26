import { Module } from '@nestjs/common';
import { AuthService } from '@/auth/auth.service';
import { AuthController } from '@/auth/auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StringValue } from 'ms';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtStrategy } from '@/auth/passport/jwt.strategy';
import { LocalStrategy } from '@/auth/passport/local.strategy';
import { UsersModule } from '@/modules/users/users.module';
import { AuthEmailService } from '@/auth/auth-email.service';
import { AuthCleanupService } from '@/auth/auth-cleanup.service';

@Module({
  imports: [
    UsersModule,

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') as StringValue,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthEmailService,
    AuthCleanupService,
    PrismaService,
    LocalStrategy,
    JwtStrategy,
  ],
})
export class AuthModule {}
