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
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  
  if (process.env.NODE_ENV === "test") {
    return new RedisMock();
  }

  const client = new Redis(url, redisOptions);

  // Handle errors immediately so the process doesn't crash on unhandled events
  client.on("error", (err) => {
    console.warn(`[Redis] Connection warning: ${err.message}. Running in-memory mode.`);
  });

  return client;
};

export const redis = globalForRedis.redis || createRedisClient();

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
