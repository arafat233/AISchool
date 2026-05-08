import Redis from "ioredis";

let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      host: process.env.REDIS_HOST ?? "localhost",
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD,
      lazyConnect: true,
    });
  }
  return _redis;
}

export async function isJwtBlacklisted(jti: string): Promise<boolean> {
  try {
    const val = await getRedis().get(`jwt:bl:${jti}`);
    return val !== null;
  } catch {
    // If Redis is unreachable, fail open (don't block all requests)
    return false;
  }
}
