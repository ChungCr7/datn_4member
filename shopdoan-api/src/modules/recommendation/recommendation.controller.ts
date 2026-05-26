import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '@/auth/decorators/public.decorator';
import { RecommendationService } from './recommendation.service';

interface AuthUser {
  id?: number | string;
  sub?: number | string;
  userId?: number | string;
}

interface AuthRequest {
  user?: AuthUser;
}

@ApiTags('Recommendations')
@Controller('recommendations')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get('home')
  @Public()
  home(@Query('limit') limit = '12', @Req() req: AuthRequest) {
    return this.recommendationService.recommendHome(
      Number(limit) || 12,
      this.getOptionalUserId(req),
    );
  }

  @Get('me')
  @ApiBearerAuth()
  me(@Query('limit') limit = '12', @Req() req: AuthRequest) {
    return this.recommendationService.recommendMe(
      this.getRequiredUserId(req),
      Number(limit) || 12,
    );
  }

  private getOptionalUserId(req: AuthRequest): number | undefined {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    return userId ? Number(userId) : undefined;
  }

  private getRequiredUserId(req: AuthRequest): number {
    return Number(req.user?.userId || req.user?.sub || req.user?.id);
  }
}
