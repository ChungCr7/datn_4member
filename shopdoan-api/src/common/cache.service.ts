import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly memory = new Map<
    string,
    { value: unknown; expiresAt: number }
  >();
  private redis?: RedisClientType;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const url = this.configService.get<string>('REDIS_URL');
    if (!url) return;

    try {
      this.redis = createClient({ url });
      this.redis.on('error', (error) => {
        this.logger.warn(`Redis cache error: ${error.message}`);
      });
      await this.redis.connect();
      this.logger.log('Redis cache connected');
    } catch (error) {
      this.redis = undefined;
      this.logger.warn(
        `Redis unavailable, using in-memory cache: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.redis?.isOpen) {
      await this.redis.quit();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redis?.isOpen) {
      const value = await this.redis.get(key);
      return value ? (JSON.parse(value) as T) : null;
    }

    const item = this.memory.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.memory.delete(key);
      return null;
    }
    return item.value as T;
  }

  async set(key: string, value: unknown, ttl = 600000): Promise<void> {
    if (this.redis?.isOpen) {
      await this.redis.set(key, JSON.stringify(value), { PX: ttl });
      return;
    }

    this.memory.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  async del(key: string): Promise<void> {
    if (this.redis?.isOpen) {
      await this.redis.del(key);
      return;
    }
    this.memory.delete(key);
  }

  async delByPrefix(prefix: string): Promise<void> {
    if (this.redis?.isOpen) {
      const keys = await this.redis.keys(`${prefix}*`);
      if (keys.length) await this.redis.del(keys);
      return;
    }

    for (const key of this.memory.keys()) {
      if (key.startsWith(prefix)) this.memory.delete(key);
    }
  }

  async clear(): Promise<void> {
    if (this.redis?.isOpen) {
      await this.redis.flushDb();
      return;
    }
    this.memory.clear();
  }

  cleanupExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.memory.entries()) {
      if (now > item.expiresAt) this.memory.delete(key);
    }
  }
}
