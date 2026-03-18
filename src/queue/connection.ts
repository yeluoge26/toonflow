import IORedis from "ioredis";

// Redis connection - configurable via environment variables
const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379");
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

export const connection: any = new IORedis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy(times: number) {
    if (times > 10) {
      console.error("[Redis] Max retries reached, giving up");
      return null;
    }
    return Math.min(times * 500, 5000);
  },
});

connection.on("connect", () => {
  console.log(`[Redis] Connected to ${REDIS_HOST}:${REDIS_PORT}`);
});

connection.on("error", (err: any) => {
  console.error("[Redis] Connection error:", err.message);
});

export function createConnection(): any {
  return new IORedis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}
