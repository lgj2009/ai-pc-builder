import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (redis) return redis;
  const redisUrl = process.env.UPSTASH_REDIS_URL;
  if (!redisUrl) {
    throw new Error("UPSTASH_REDIS_URL is not set");
  }
  // Upstash Redis URL format: https://:token@host.upstash.io
  const url = new URL(redisUrl);
  const token = url.password || url.username;
  redis = new Redis({
    url: `${url.protocol}//${url.host}`,
    token,
  });
  return redis;
}
