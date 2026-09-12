import rateLimit, { Store, Options, ClientRateLimitInfo } from 'express-rate-limit';
import { StandardErrorCode } from '@sicp/shared';
import { sendError } from '../../utils/response';
import { QueueManager } from '../../jobs/queue.manager';
import { logger } from '../../utils/logger';

/**
 * Resilient Redis Store for Express Rate Limit
 * Leverages QueueManager's active ioredis connection with automatic
 * non-blocking in-memory fallback if Redis is unavailable or undergoing reconnect.
 */
export class ResilientRedisStore implements Store {
  public windowMs!: number;
  public prefix: string;
  public localKeys: boolean = false;
  private localFallback = new Map<string, { totalHits: number; resetTime: Date }>();

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    const redis = QueueManager.getRedisClient();
    if (redis && QueueManager.isRedisReady()) {
      try {
        const fullKey = `rl:${this.prefix}:${key}`;
        const p = redis.pipeline();
        p.get(fullKey);
        p.pttl(fullKey);
        const results = await p.exec();
        const rawHits = results?.[0]?.[1];
        const pttl = (results?.[1]?.[1] as number) || -1;
        if (rawHits !== null && rawHits !== undefined) {
          const totalHits = parseInt(rawHits as string, 10) || 0;
          const resetTime = pttl > 0 ? new Date(Date.now() + pttl) : new Date(Date.now() + this.windowMs);
          return { totalHits, resetTime };
        }
      } catch {
        // Transparent fallback to local map
      }
    }
    return this.localFallback.get(key);
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const redis = QueueManager.getRedisClient();
    if (redis && QueueManager.isRedisReady()) {
      try {
        const fullKey = `rl:${this.prefix}:${key}`;
        const p = redis.pipeline();
        p.incr(fullKey);
        p.pttl(fullKey);
        const res = await p.exec();
        const totalHits = (res?.[0]?.[1] as number) || 1;
        let pttl = (res?.[1]?.[1] as number) || -1;
        if (pttl < 0) {
          await redis.pexpire(fullKey, this.windowMs);
          pttl = this.windowMs;
        }
        return {
          totalHits,
          resetTime: new Date(Date.now() + pttl),
        };
      } catch {
        // Transparent fallback on Redis error
      }
    }

    const now = Date.now();
    const existing = this.localFallback.get(key);
    if (!existing || existing.resetTime.getTime() <= now) {
      const record = { totalHits: 1, resetTime: new Date(now + this.windowMs) };
      this.localFallback.set(key, record);
      return record;
    }
    existing.totalHits += 1;
    return existing;
  }

  async decrement(key: string): Promise<void> {
    const redis = QueueManager.getRedisClient();
    if (redis && QueueManager.isRedisReady()) {
      try {
        await redis.decr(`rl:${this.prefix}:${key}`);
        return;
      } catch {}
    }
    const existing = this.localFallback.get(key);
    if (existing && existing.totalHits > 0) {
      existing.totalHits -= 1;
    }
  }

  async resetKey(key: string): Promise<void> {
    const redis = QueueManager.getRedisClient();
    if (redis && QueueManager.isRedisReady()) {
      try {
        await redis.del(`rl:${this.prefix}:${key}`);
      } catch {}
    }
    this.localFallback.delete(key);
  }

  async resetAll(): Promise<void> {
    this.localFallback.clear();
  }
}

function createRateLimitHandler(customMessage: string) {
  return (req: any, res: any) => {
    const requestId = (res.locals.requestId as string) || 'unknown';
    logger.warn(`Rate limit exceeded for client IP ${req.ip} on ${req.method} ${req.originalUrl || req.url}`, { requestId });
    sendError(res, 429, {
      code: StandardErrorCode.RATE_LIMITED,
      message: customMessage,
      requestId,
    });
  };
}

export const standardRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // max 300 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false },
  store: new ResilientRedisStore('std'),
  handler: createRateLimitHandler('Too many requests. Please slow down and try again later.'),
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // auth attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false },
  store: new ResilientRedisStore('auth'),
  handler: createRateLimitHandler('Too many authentication attempts. Please try again after 15 minutes.'),
});

export const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60, // AI intelligence requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false },
  store: new ResilientRedisStore('ai'),
  handler: createRateLimitHandler('AI rate limit reached. Please wait a few moments before requesting further intelligence analysis.'),
});

export const voiceRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // Voice STT requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false },
  store: new ResilientRedisStore('voice'),
  handler: createRateLimitHandler('Voice transcription rate limit reached. Please type your submission directly or try again later.'),
});

export const mutationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120, // Critical state mutations per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false },
  store: new ResilientRedisStore('mutation'),
  handler: createRateLimitHandler('Action rate limit reached. Please allow recent changes to process before submitting further requests.'),
});

export const searchRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120, // Searches per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false },
  store: new ResilientRedisStore('search'),
  handler: createRateLimitHandler('Search query rate limit reached. Please wait before executing further searches.'),
});

