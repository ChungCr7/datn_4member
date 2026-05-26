import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@/mail/mailer.service';

type AuthEmailUser = {
  email: string;
  name?: string | null;
};

type SendAuthEmailInput = {
  to: string;
  subject: string;
  template: string;
  context: Record<string, string | number | boolean | null | undefined>;
};

@Injectable()
export class AuthEmailService {
  private readonly logger = new Logger(AuthEmailService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
  ) {}

  sendRegistrationVerification(user: AuthEmailUser, code: string) {
    const frontendUrl = this.getFrontendUrl();
    const verifyUrl = `${frontendUrl}/auth/verify-email?email=${encodeURIComponent(
      user.email,
    )}&code=${code}`;

    return this.sendAuthEmail({
      to: user.email,
      subject: 'Xac thuc tai khoan ShopDoan',
      template: 'registration-verification',
      context: {
        ...this.baseTemplateContext(user, code),
        verifyUrl,
      },
    });
  }

  sendPasswordReset(user: AuthEmailUser, code: string) {
    const frontendUrl = this.getFrontendUrl();
    const resetUrl = `${frontendUrl}/auth/reset-password?email=${encodeURIComponent(
      user.email,
    )}&code=${code}`;

    return this.sendAuthEmail({
      to: user.email,
      subject: 'Dat lai mat khau ShopDoan',
      template: 'password-reset',
      context: {
        ...this.baseTemplateContext(user, code),
        resetUrl,
      },
    });
  }

  private async sendAuthEmail(input: SendAuthEmailInput) {
    const result = await this.mailerService.sendMail({
      to: input.to,
      subject: input.subject,
      template: input.template,
      context: input.context,
    });

    if (!result.success) {
      this.logger.warn(
        `Brevo delivery failed for ${input.to}: ${
          result.message || 'unknown error'
        }`,
      );
    }

    return result;
  }

  private baseTemplateContext(user: AuthEmailUser, code: string) {
    return {
      displayName: user.name || user.email,
      code,
      ttlMinutes: 10,
    };
  }

  private getFrontendUrl() {
    return (this.configService.get<string>('FRONTEND_URL') || '').replace(
      /\/$/,
      '',
    );
  }
}
