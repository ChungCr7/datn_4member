import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import { RecommendationModule } from '@/modules/recommendation/recommendation.module';
import { AiController } from './ai.controller';
import { AiResolver } from './ai.resolver';
import { EmbeddingsService } from './embeddings/embeddings.service';
import { AiMemoryService } from './memory/ai-memory.service';
import { AiOrchestratorService } from './orchestrator/ai-orchestrator.service';
import { PromptBuilderService } from './prompts/prompt-builder.service';
import { QwenService } from './qwen/qwen.service';
import { AiToolsService } from './tools/ai-tools.service';

@Module({
  imports: [ConfigModule, PrismaModule, RecommendationModule],
  controllers: [AiController],
  providers: [
    AiResolver,
    AiOrchestratorService,
    AiMemoryService,
    AiToolsService,
    EmbeddingsService,
    PromptBuilderService,
    QwenService,
  ],
  exports: [AiOrchestratorService, EmbeddingsService],
})
export class AiModule {}
