import { Global, Module } from '@nestjs/common';
import { MailerService } from '@/mail/mailer.service';

@Global()
@Module({
  providers: [MailerService],
  exports: [MailerService],
})
export class MailModule {}
