import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoClient, BrevoError, BrevoTimeoutError } from '@getbrevo/brevo';
import * as fs from 'node:fs';
import * as path from 'node:path';
import Handlebars from 'handlebars';

type MailContext = Record<string, string | number | boolean | null | undefined>;

export type SendMailInput = {
  to: string;
  subject: string;
  template: string;
  context: MailContext;
};

export type SendMailResult = {
  success: boolean;
  id?: string;
  skipped?: boolean;
  message?: string;
};

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly sender: { email: string; name?: string };
  private readonly brevo?: BrevoClient;
  private readonly templateCache = new Map<
    string,
    Handlebars.TemplateDelegate
  >();

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('BREVO_API_KEY');
    this.sender = this.parseSender(
      this.configService.get<string>('MAIL_FROM') ||
        'ShopDoan <no-reply@shopdoan.vn>',
    );

    if (!apiKey) {
      this.logger.warn(
        'BREVO_API_KEY is missing. Transactional emails will be skipped.',
      );
      return;
    }

    this.brevo = new BrevoClient({
      apiKey,
      timeoutInSeconds: Number(
        this.configService.get<string>('BREVO_TIMEOUT_SECONDS') || 30,
      ),
      maxRetries: Number(
        this.configService.get<string>('BREVO_MAX_RETRIES') || 2,
      ),
    });
  }

  async sendMail(input: SendMailInput): Promise<SendMailResult> {
    if (!this.brevo) {
      return {
        success: false,
        skipped: true,
        message: 'Brevo email service is not configured',
      };
    }

    try {
      const htmlContent = this.renderTemplate(input.template, input.context);
      const result = await this.brevo.transactionalEmails.sendTransacEmail({
        sender: this.sender,
        to: [{ email: input.to }],
        subject: input.subject,
        htmlContent,
      });

      return {
        success: true,
        id: result.messageId || result.messageIds?.[0],
      };
    } catch (error) {
      const message = this.getBrevoErrorMessage(error);
      this.logger.error(`Brevo email failed for ${input.to}: ${message}`);
      return { success: false, message };
    }
  }

  private renderTemplate(templateName: string, context: MailContext) {
    const cachedTemplate = this.templateCache.get(templateName);
    if (cachedTemplate) {
      return cachedTemplate(context);
    }

    const templatePath = this.resolveTemplatePath(templateName);
    const source = fs.readFileSync(templatePath, 'utf8');
    const template = Handlebars.compile(source);

    this.templateCache.set(templateName, template);
    return template(context);
  }

  private resolveTemplatePath(templateName: string) {
    const fileName = `${templateName}.hbs`;
    const candidates = [
      path.join(__dirname, 'templates', fileName),
      path.join(process.cwd(), 'src', 'mail', 'templates', fileName),
      path.join(process.cwd(), 'dist', 'mail', 'templates', fileName),
    ];

    const templatePath = candidates.find((candidate) =>
      fs.existsSync(candidate),
    );
    if (!templatePath) {
      throw new Error(`Mail template "${templateName}" was not found`);
    }

    return templatePath;
  }

  private parseSender(value: string) {
    const match = value.match(/^\s*(.*?)\s*<([^<>@\s]+@[^<>@\s]+)>\s*$/);
    if (match) {
      return { name: match[1].trim() || undefined, email: match[2] };
    }

    return { email: value.trim() };
  }

  private getBrevoErrorMessage(error: unknown) {
    if (error instanceof BrevoTimeoutError) {
      return `Brevo API timeout: ${error.message}`;
    }

    if (error instanceof BrevoError) {
      const body =
        error.body && typeof error.body === 'object'
          ? JSON.stringify(error.body)
          : '';
      return `Brevo API error${error.statusCode ? ` ${error.statusCode}` : ''}: ${
        error.message
      }${body ? ` | ${body}` : ''}`;
    }

    return error instanceof Error ? error.message : 'Unknown Brevo email error';
  }
}
