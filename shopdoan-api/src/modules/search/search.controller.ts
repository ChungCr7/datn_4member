import { Controller, Delete, Get, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { Public } from '@/auth/decorators/public.decorator';
import { SearchQueryDto, SearchSuggestionDto } from './dto/search.dto';
import { SearchService } from './search.service';

interface AuthUser {
  id?: number | string;
  sub?: number | string;
  userId?: number | string;
}

interface AuthRequest {
  headers?: {
    authorization?: string | string[];
  };
  user?: AuthUser;
}

type OptionalJwtPayload = AuthUser;

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly jwtService: JwtService,
  ) {}

  @Get()
  @Public()
  search(@Query() query: SearchQueryDto, @Req() req: AuthRequest) {
    return this.searchService.search(query, this.getOptionalUserId(req));
  }

  @Get('suggestions')
  @Public()
  suggestions(@Query() query: SearchSuggestionDto) {
    return this.searchService.suggestions(query);
  }

  @Get('history')
  @ApiBearerAuth()
  history(@Req() req: AuthRequest) {
    return this.searchService.history(this.getRequiredUserId(req));
  }

  @Delete('history')
  @ApiBearerAuth()
  clearHistory(@Req() req: AuthRequest) {
    return this.searchService.clearHistory(this.getRequiredUserId(req));
  }

  private getOptionalUserId(req: AuthRequest): number | undefined {
    if (req.user?.userId || req.user?.sub || req.user?.id) {
      return Number(req.user.userId || req.user.sub || req.user.id);
    }

    const authorization = req.headers?.authorization;
    const token =
      typeof authorization === 'string' && authorization.startsWith('Bearer ')
        ? authorization.slice(7)
        : undefined;

    if (!token) {
      return undefined;
    }

    try {
      const payload = this.jwtService.verify<OptionalJwtPayload>(token);
      const userId = payload?.sub || payload?.userId || payload?.id;
      return userId ? Number(userId) : undefined;
    } catch {
      return undefined;
    }
  }

  private getRequiredUserId(req: AuthRequest): number {
    return Number(req.user?.userId || req.user?.sub || req.user?.id);
  }
}
