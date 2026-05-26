import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { Public } from '@/auth/decorators/public.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { ChatbotService } from './chatbot.service';
import { SendMessageDto } from './dto/send-message.dto';
import { SellerReplyDto } from './dto/seller-reply.dto';

type AuthUser = {
  id?: number | string;
  sub?: number | string;
  userId?: number | string;
  role?: string;
  accountRole?: string;
  legacyRole?: string;
};

type AuthRequest = {
  headers?: {
    authorization?: string | string[];
  };
  user?: AuthUser;
};

@ApiTags('Chatbot')
@Controller('chatbot')
export class ChatbotController {
  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('message')
  @Public()
  async sendMessage(@Body() dto: SendMessageDto, @Req() req: AuthRequest) {
    return this.chatbotService.sendMessage(
      dto.message,
      this.getOptionalUserId(req),
      dto.sessionId,
    );
  }

  @Get('conversations')
  @ApiBearerAuth()
  async getConversations(@Req() req: AuthRequest) {
    return this.chatbotService.getConversations(req.user);
  }

  @Get('ai-status')
  @Roles('seller', 'root', 'admin')
  async getAiStatus() {
    return this.chatbotService.getAiStatus();
  }

  @Get('conversations/me')
  @ApiBearerAuth()
  async getMyConversation(@Req() req: AuthRequest) {
    return this.chatbotService.getUserConversation(this.getRequiredUserId(req));
  }

  @Get('conversations/:sessionId')
  @ApiBearerAuth()
  async getConversation(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Req() req: AuthRequest,
  ) {
    return this.chatbotService.getConversation(sessionId, req.user);
  }

  @Post('conversations/:sessionId/reply')
  @Roles('seller', 'root', 'admin')
  async sellerReply(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() dto: SellerReplyDto,
    @Req() req: AuthRequest,
  ) {
    return this.chatbotService.addSellerReply(
      sessionId,
      this.getRequiredUserId(req),
      dto.text,
    );
  }

  private getOptionalUserId(req: AuthRequest): number | undefined {
    const requestUserId = this.extractUserId(req.user);
    if (requestUserId) return requestUserId;

    const authorization = req.headers?.authorization;
    const token =
      typeof authorization === 'string' && authorization.startsWith('Bearer ')
        ? authorization.slice(7)
        : undefined;

    if (!token) return undefined;

    try {
      const payload = this.jwtService.verify<AuthUser>(token);
      return this.extractUserId(payload);
    } catch {
      return undefined;
    }
  }

  private getRequiredUserId(req: AuthRequest): number {
    return this.extractUserId(req.user) || 0;
  }

  private extractUserId(user?: AuthUser) {
    const userId = user?.userId || user?.sub || user?.id;
    return userId ? Number(userId) : undefined;
  }
}
