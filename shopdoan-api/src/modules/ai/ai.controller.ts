import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { AiOrchestratorService } from './orchestrator/ai-orchestrator.service';
import { AiMessageDto } from './dto/ai-message.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly orchestrator: AiOrchestratorService) {}

  @Post('stream')
  async stream(
    @Body() dto: AiMessageDto,
    @CurrentUser() user: any,
    @Res() response: Response,
  ) {
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache');

    for await (const chunk of this.orchestrator.streamCustomer(
      user.id,
      dto.message,
    )) {
      response.write(chunk);
    }
    response.end();
  }
}
