import u from "@/utils";

// Cache system with dual backend: Redis (preferred) + in-memory fallback
class CacheManager {
  private memoryCache: Map<string, { value: any; expiry: number }> = new Map();
  private redis: any = null;
  private redisAvailable: boolean = false;

  constructor() {
    this.initRedis();
  }

  private async initRedis() {
    try {
      const IORedis = (await import("ioredis")).default;
      this.redis = new IORedis({
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
      await this.redis.connect();
      this.redisAvailable = true;
      console.log("[Cache] Redis cache enabled");
    } catch {
      this.redisAvailable = false;
      console.log("[Cache] Redis unavailable, using in-memory cache");
    }
  }

  // Set a cache value with TTL (seconds)
  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    const serialized = JSON.stringify(value);

    if (this.redisAvailable && this.redis) {
      try {
        await this.redis.setex(`cache:${key}`, ttlSeconds, serialized);
        return;
      } catch {}
    }

    // Fallback: in-memory
    this.memoryCache.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  // Get a cached value
  async get<T = any>(key: string): Promise<T | null> {
    if (this.redisAvailable && this.redis) {
      try {
        const data = await this.redis.get(`cache:${key}`);
        if (data) return JSON.parse(data) as T;
        return null;
      } catch {}
    }

    // Fallback: in-memory
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.memoryCache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  // Delete a cache entry
  async del(key: string): Promise<void> {
    if (this.redisAvailable && this.redis) {
      try { await this.redis.del(`cache:${key}`); } catch {}
    }
    this.memoryCache.delete(key);
  }

  // Get or compute: return cached value or compute and cache it
  async getOrSet<T>(key: string, computeFn: () => Promise<T>, ttlSeconds: number = 3600): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await computeFn();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  // Cache AI model config (frequently accessed, rarely changes)
  async getModelConfig(key: string) {
    return this.getOrSet(`model_config:${key}`, async () => {
      const row = await u.db("t_aiModelMap")
        .leftJoin("t_config", "t_config.id", "t_aiModelMap.configId")
        .where("t_aiModelMap.key", key)
        .whereNotNull("t_aiModelMap.configId")
        .select("t_config.*")
        .first();
      return row || null;
    }, 300); // 5 min cache
  }

  // Cache prompt templates
  async getPromptTemplate(code: string) {
    return this.getOrSet(`prompt:${code}`, async () => {
      const row = await u.db("t_prompts").where("code", code).first();
      return row || null;
    }, 600); // 10 min cache
  }

  // Cache project settings
  async getProjectSettings(projectId: number) {
    return this.getOrSet(`project:${projectId}`, async () => {
      return u.db("t_project").where("id", projectId).first();
    }, 120); // 2 min cache
  }

  // Deduplicate: check if same prompt was recently generated
  async isDuplicate(promptHash: string): Promise<boolean> {
    const key = `dedup:${promptHash}`;
    const exists = await this.get(key);
    if (exists) return true;
    await this.set(key, 1, 86400); // 24h dedup window
    return false;
  }

  // Clear all cache
  async flush(): Promise<void> {
    if (this.redisAvailable && this.redis) {
      try {
        const keys = await this.redis.keys("cache:*");
        if (keys.length > 0) await this.redis.del(...keys);
      } catch {}
    }
    this.memoryCache.clear();
  }

  // Get cache stats
  async getStats() {
    const memorySize = this.memoryCache.size;
    let redisSize = 0;

    if (this.redisAvailable && this.redis) {
      try {
        const keys = await this.redis.keys("cache:*");
        redisSize = keys.length;
      } catch {}
    }

    return {
      backend: this.redisAvailable ? "redis" : "memory",
      memoryEntries: memorySize,
      redisEntries: redisSize,
      totalEntries: this.redisAvailable ? redisSize : memorySize,
    };
  }
}

const cache = new CacheManager();
export default cache;
