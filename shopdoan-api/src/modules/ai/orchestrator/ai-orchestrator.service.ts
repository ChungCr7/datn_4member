import { Injectable } from '@nestjs/common';
import { AiMemoryService } from '@/modules/ai/memory/ai-memory.service';
import { PromptBuilderService } from '@/modules/ai/prompts/prompt-builder.service';
import { QwenService } from '@/modules/ai/qwen/qwen.service';
import { AiToolsService } from '@/modules/ai/tools/ai-tools.service';

@Injectable()
export class AiOrchestratorService {
  constructor(
    private readonly memory: AiMemoryService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly qwen: QwenService,
    private readonly tools: AiToolsService,
  ) {}

  async answerCustomer(userId: number, message: string) {
    const intent = this.detectIntent(message);
    const [userContext, products, recommendations, orders] = await Promise.all([
      this.memory.getUserContext(userId),
      this.tools.searchProducts(message),
      this.tools.getRecommendations(userId, message),
      this.tools.getUserHistory(userId),
    ]);

    const prompt = this.promptBuilder.customerAssistant({
      message,
      userContext,
      products,
      recommendations,
      orders,
    });
    const response = await this.qwen.generate(prompt);
    await this.memory.rememberPreference(userId, 'last_intent', {
      intent,
      message,
      at: new Date().toISOString(),
    });

    return { message: response, recommendations, intent };
  }

  streamCustomer(userId: number, message: string) {
    return this.createCustomerStream(userId, message);
  }

  private async *createCustomerStream(userId: number, message: string) {
    const [userContext, products, recommendations, orders] = await Promise.all([
      this.memory.getUserContext(userId),
      this.tools.searchProducts(message),
      this.tools.getRecommendations(userId, message),
      this.tools.getUserHistory(userId),
    ]);
    const prompt = this.promptBuilder.customerAssistant({
      message,
      userContext,
      products,
      recommendations,
      orders,
    });
    for await (const chunk of this.qwen.stream(prompt)) {
      yield chunk;
    }
  }

  private detectIntent(message: string) {
    const text = message.toLowerCase();
    if (/(order|don hang|đơn hàng|tracking|theo doi)/i.test(text)) {
      return 'order_tracking';
    }
    if (/(recommend|goi y|gợi ý|nen mua|nên mua)/i.test(text)) {
      return 'recommendation';
    }
    if (/(seo|description|mo ta|mô tả|keyword)/i.test(text)) {
      return 'seller_content';
    }
    return 'conversation';
  }
}
