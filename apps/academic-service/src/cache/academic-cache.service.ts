import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";

/**
 * Thin Redis cache layer for academic-service.
 *
 * Cached resources (read-heavy, rarely mutated):
 *  - getGradeLevels(schoolId)        TTL 1 h
 *  - getSubjects(schoolId)           TTL 1 h
 *  - getTimetable(sectionId, yearId) TTL 30 min
 *
 * Callers are responsible for invalidating on mutation (see AcademicService).
 */
@Injectable()
export class AcademicCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AcademicCacheService.name);
  private redis!: Redis;

  onModuleInit() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST ?? "localhost",
      port: Number(process.env.REDIS_PORT ?? 6379),
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });

    this.redis.on("error", (err) => {
      this.logger.error(`Redis error: ${err.message}`);
    });

    this.redis.on("connect", () => {
      this.logger.log("Redis connected (academic cache)");
    });
  }

  async onModuleDestroy() {
    await this.redis.quit().catch(() => { /* ignore */ });
  }

  // ─── Key builders ───────────────────────────────────────────────────────────

  gradeLevelsKey(schoolId: string) { return `academic:grade-levels:${schoolId}`; }
  subjectsKey(schoolId: string) { return `academic:subjects:${schoolId}`; }
  timetableKey(sectionId: string, academicYearId: string) { return `academic:timetable:${sectionId}:${academicYearId}`; }

  // ─── Generic helpers ────────────────────────────────────────────────────────

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (err) {
      this.logger.warn(`Cache GET failed for ${key}: ${(err as Error).message}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch (err) {
      this.logger.warn(`Cache SET failed for ${key}: ${(err as Error).message}`);
    }
  }

  async del(...keys: string[]): Promise<void> {
    try {
      if (keys.length > 0) await this.redis.del(...keys);
    } catch (err) {
      this.logger.warn(`Cache DEL failed: ${(err as Error).message}`);
    }
  }

  /**
   * Invalidates all timetable keys for a section across all academic years.
   * Uses SCAN to avoid blocking Redis.
   */
  async invalidateTimetableForSection(sectionId: string): Promise<void> {
    const pattern = `academic:timetable:${sectionId}:*`;
    let cursor = "0";
    const toDelete: string[] = [];
    try {
      do {
        const [next, keys] = await this.redis.scan(cursor, "MATCH", pattern, "COUNT", 50);
        cursor = next;
        toDelete.push(...keys);
      } while (cursor !== "0");
      if (toDelete.length > 0) await this.redis.del(...toDelete);
    } catch (err) {
      this.logger.warn(`Cache SCAN/DEL failed for pattern ${pattern}: ${(err as Error).message}`);
    }
  }
}
