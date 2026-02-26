import { Redis } from "ioredis";

// Use require for the mock so it doesn't fail if not in production
const RedisMock = require("ioredis-mock");

const globalForRedis = global as unknown as { redis: Redis };

const redisOptions = {
  maxRetriesPerRequest: 3,
  connectTimeout: 2000,
  retryStrategy(times: number) {
    if (times > 3) return null; // stop retrying after 3 attempts
    return Math.min(times * 100, 1000);
  }
};

const createRedisClient = () => {
  const url = process.env.REDIS_URL;
  
  if (process.env.NODE_ENV === "test" || !url) {
    if (!url && process.env.NODE_ENV !== "test") {
      console.warn("[Redis] No REDIS_URL found. Using in-memory mock.");
    }
    return new RedisMock();
  }

  try {
    const client = new Redis(url, redisOptions);

    client.on("error", (err) => {
      // Don't log the full stack trace for connection errors to avoid noise
      console.warn(`[Redis] Connection warning: ${err.message}`);
    });

    return client;
  } catch (err) {
    console.error("[Redis] Failed to initialize client, falling back to mock:", err);
    return new RedisMock();
  }
};

export const redis = globalForRedis.redis || createRedisClient();

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
