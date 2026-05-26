import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class QwenService {
  private readonly logger = new Logger(QwenService.name);

  constructor(private readonly configService: ConfigService) {}

  async generate(prompt: string) {
    const endpoint = this.endpoint('/api/generate');
    const model = this.model();

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, stream: false }),
      });
      if (!response.ok) {
        this.logger.warn(`Ollama returned HTTP ${response.status}`);
        return 'AI assistant is temporarily unavailable. Please try again later.';
      }
      const data = (await response.json()) as { response?: string };
      return data.response?.trim() || 'I could not generate a response.';
    } catch (error) {
      this.logger.warn(
        `Ollama request failed: ${error instanceof Error ? error.message : error}`,
      );
      return 'AI assistant is temporarily unavailable. Please try again later.';
    }
  }

  async *stream(prompt: string) {
    const endpoint = this.endpoint('/api/generate');
    const model = this.model();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: true }),
    });

    if (!response.ok || !response.body) {
      yield 'AI assistant is temporarily unavailable.';
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const data = JSON.parse(line) as { response?: string };
          if (data.response) yield data.response;
        } catch {
          yield line;
        }
      }
    }
  }

  private endpoint(path: string) {
    const base =
      this.configService.get<string>('OLLAMA_URL') ||
      this.configService.get<string>('LOCAL_AI_BASE_URL') ||
      'http://localhost:11434';
    return `${base.replace(/\/$/, '')}${path}`;
  }

  private model() {
    return (
      this.configService.get<string>('QWEN_MODEL') ||
      this.configService.get<string>('LOCAL_AI_MODEL') ||
      'qwen2.5:3b'
    );
  }
}
