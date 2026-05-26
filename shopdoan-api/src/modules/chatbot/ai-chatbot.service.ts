import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type AiParsedQuery = {
  intent?: 'recommend' | 'search' | 'add_to_cart' | 'order_tracking' | 'faq';
  itemName?: string | null;
  quantity?: number | null;
  priceMax?: number | null;
  keywords?: string[];
  taste?: string | null;
  people?: number | null;
  context?: string | null;
};

export type AiParseResult = {
  query: AiParsedQuery;
  provider: 'gemini' | 'local';
  model?: string | null;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

type LocalAiResponse = {
  response?: string;
  message?: {
    content?: string;
  };
};

@Injectable()
export class AiChatbotService {
  private readonly logger = new Logger(AiChatbotService.name);

  constructor(private readonly configService: ConfigService) {}

  async parseFoodOrderMessage(message: string): Promise<AiParsedQuery | null> {
    const result = await this.parseFoodOrderMessageWithMeta(message);
    return result?.query ?? null;
  }

  async parseFoodOrderMessageWithMeta(
    message: string,
  ): Promise<AiParseResult | null> {
    const cloudResult = await this.parseWithGemini(message);
    if (cloudResult) return cloudResult;

    return this.parseWithLocalAi(message);
  }

  getProviderStatus() {
    const geminiApiKey = this.configService.get<string>('GEMINI_API_KEY');
    const localAiUrl = this.configService.get<string>('LOCAL_AI_URL');
    const geminiModel = this.configService.get<string>('GEMINI_MODEL');
    const localModel =
      this.configService.get<string>('LOCAL_AI_MODEL') || 'qwen2.5:3b';

    return {
      activeProvider: geminiApiKey ? 'gemini' : localAiUrl ? 'local' : 'none',
      providers: {
        gemini: {
          configured: Boolean(geminiApiKey),
          model: geminiModel,
        },
        local: {
          configured: Boolean(localAiUrl),
          model: localModel,
        },
      },
    };
  }

  private async parseWithGemini(
    message: string,
  ): Promise<AiParseResult | null> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) return null;

    const model = this.configService.get<string>('GEMINI_MODEL');
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: [
                    'Analyze this Vietnamese restaurant chatbot message for ShopDoan food ordering.',
                    'Return JSON only with keys:',
                    'intent: recommend|search|add_to_cart|order_tracking|faq,',
                    'itemName, quantity, priceMax, keywords, taste, people, context.',
                    'Convert 30k to 30000. Infer Vietnamese food intent, spicy/sweet/salty/drink/budget/people/weather/order-support context when present.',
                    `Message: ${message}`,
                  ].join(' '),
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        this.logger.warn(
          `Gemini parse failed with HTTP ${response.status} for model ${model}`,
        );
        return null;
      }
      const data = (await response.json()) as GeminiResponse;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return null;
      const query = this.parseJsonResponse(text);
      if (query) {
        this.logger.log(`AI parser used gemini:${model}`);
        return { query, provider: 'gemini', model };
      }
      return null;
    } catch (error) {
      this.logger.warn(
        `Gemini parse request failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      return null;
    }
  }

  private async parseWithLocalAi(
    message: string,
  ): Promise<AiParseResult | null> {
    const endpoint = this.configService.get<string>('LOCAL_AI_URL');
    if (!endpoint) return null;

    const model =
      this.configService.get<string>('LOCAL_AI_MODEL') || 'qwen2.5:3b';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          stream: false,
          format: 'json',
          prompt: [
            'Analyze this Vietnamese restaurant chatbot message for ShopDoan food ordering.',
            'Return JSON only with keys:',
            'intent: recommend|search|add_to_cart|order_tracking|faq,',
            'itemName, quantity, priceMax, keywords, taste, people, context.',
            'Convert 30k to 30000. Infer Vietnamese food intent, spicy/sweet/salty/drink/budget/people/weather/order-support context when present.',
            `Message: ${message}`,
          ].join(' '),
        }),
      });

      if (!response.ok) {
        this.logger.warn(
          `Local AI parse failed with HTTP ${response.status} for model ${model}`,
        );
        return null;
      }
      const data = (await response.json()) as LocalAiResponse;
      const text = data?.response || data?.message?.content;
      if (!text) return null;
      const query = this.parseJsonResponse(text);
      if (query) {
        this.logger.log(`AI parser used local:${model}`);
        return { query, provider: 'local', model };
      }
      return null;
    } catch (error) {
      this.logger.warn(
        `Local AI parse request failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      return null;
    }
  }

  private parseJsonResponse(text: string): AiParsedQuery | null {
    try {
      const cleaned = text
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();
      return JSON.parse(cleaned) as AiParsedQuery;
    } catch {
      return null;
    }
  }
}
