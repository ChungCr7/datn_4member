import { Injectable } from '@nestjs/common';

@Injectable()
export class PromptBuilderService {
  customerAssistant(input: {
    message: string;
    userContext: unknown;
    products: unknown[];
    recommendations: unknown[];
    orders: unknown[];
  }) {
    return [
      'You are ShopDoAn marketplace AI assistant.',
      'Answer in the user language. Be concise, helpful, and grounded only in provided marketplace data.',
      'Use products, recommendations, order history, and recent chat context when relevant.',
      `User message: ${input.message}`,
      `User context: ${JSON.stringify(input.userContext)}`,
      `Search results: ${JSON.stringify(input.products)}`,
      `Recommendations: ${JSON.stringify(input.recommendations)}`,
      `Recent orders: ${JSON.stringify(input.orders)}`,
    ].join('\n');
  }

  sellerAssistant(input: { task: string; shop: unknown; products: unknown[] }) {
    return [
      'You are ShopDoAn seller AI assistant.',
      'Generate marketplace-ready content with strong Vietnamese e-commerce SEO.',
      `Task: ${input.task}`,
      `Shop: ${JSON.stringify(input.shop)}`,
      `Products: ${JSON.stringify(input.products)}`,
    ].join('\n');
  }
}
