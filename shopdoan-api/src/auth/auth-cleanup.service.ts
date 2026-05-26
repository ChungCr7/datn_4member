import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuthService } from '@/auth/auth.service';

@Injectable()
export class AuthCleanupService {
  private readonly logger = new Logger(AuthCleanupService.name);

  constructor(private readonly authService: AuthService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredUnverifiedAccounts() {
    try {
      const count = await this.authService.cleanupExpiredUnverifiedAccounts();
      if (count > 0) {
        this.logger.log(`Removed ${count} expired unverified account(s)`);
      }
    } catch (error) {
      this.logger.error(
        `Cleanup cron failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }
}
