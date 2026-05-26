import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);

  constructor(private readonly configService: ConfigService) {}

  async embed(text: string): Promise<number[]> {
    const base =
      this.configService.get<string>('OLLAMA_URL') ||
      this.configService.get<string>('LOCAL_AI_BASE_URL') ||
      'http://localhost:11434';
    const model =
      this.configService.get<string>('EMBEDDING_MODEL') || 'nomic-embed-text';

    try {
      const response = await fetch(
        `${base.replace(/\/$/, '')}/api/embeddings`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, prompt: text }),
        },
      );
      if (!response.ok) return [];
      const data = (await response.json()) as { embedding?: number[] };
      return data.embedding || [];
    } catch (error) {
      this.logger.warn(
        `Embedding request failed: ${error instanceof Error ? error.message : error}`,
      );
      return [];
    }
  }

  cosineSimilarity(a: number[], b: number[]) {
    if (!a.length || !b.length || a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i += 1) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
