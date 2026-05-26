import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { AiAssistantResponseType } from '@/modules/graphql/marketplace.types';
import { AiOrchestratorService } from './orchestrator/ai-orchestrator.service';

@Resolver()
export class AiResolver {
  constructor(private readonly orchestrator: AiOrchestratorService) {}

  @Mutation(() => AiAssistantResponseType)
  askAi(@CurrentUser() user: any, @Args('message') message: string) {
    return this.orchestrator.answerCustomer(user.id, message);
  }
}
