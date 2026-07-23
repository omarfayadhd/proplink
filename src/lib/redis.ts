import { Redis } from "@upstash/redis";

// Upstash is optional in local dev (H1.5, docs/BLOCKERS.md): without keys every
// cache helper degrades to a direct call.
export const redis: Redis | null =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

/** Read-through cache: JSON value under `key` with `ttlSeconds`, else compute. */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>,
): Promise<T> {
  if (!redis) return compute();
  try {
    const hit = await redis.get<T>(key);
    if (hit !== null && hit !== undefined) return hit;
  } catch (err) {
    console.error(`redis get failed for ${key}:`, err);
    return compute();
  }
  const value = await compute();
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (err) {
    console.error(`redis set failed for ${key}:`, err);
  }
  return value;
}
