/**
 * Offline data sync service.
 *
 * Strategy:
 *  1. On foreground load: fetch fresh data → persist to AsyncStorage with timestamp.
 *  2. On reconnect (NetInfo event): flush pending mutations, then refresh.
 *  3. Conflict resolution: if server version > local version, surface a diff UI.
 *
 * Keys stored:
 *  - timetable:<classId>
 *  - attendance:<studentId>:<year>-<month>
 *  - roster:<classId>          (student list)
 *  - pending_mutations         (array of queued writes)
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const TTL_MS = 24 * 60 * 60 * 1000; // 1 day

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  version: number;
}

export async function cacheSet<T>(key: string, data: T, version = 1): Promise<void> {
  const entry: CacheEntry<T> = { data, cachedAt: Date.now(), version };
  await AsyncStorage.setItem(key, JSON.stringify(entry));
}

export async function cacheGet<T>(key: string): Promise<{ data: T; stale: boolean; version: number } | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  const entry = JSON.parse(raw) as CacheEntry<T>;
  return { data: entry.data, stale: Date.now() - entry.cachedAt > TTL_MS, version: entry.version };
}

export async function cacheClear(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

// ─── Pending mutation queue ──────────────────────────────────────────────────

export interface PendingMutation {
  id: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  payload: object;
  queuedAt: number;
  retries: number;
}

const PENDING_KEY = "pending_mutations";

export async function enqueueMutation(mutation: Omit<PendingMutation, "queuedAt" | "retries">): Promise<void> {
  const existing = await getPendingMutations();
  existing.push({ ...mutation, queuedAt: Date.now(), retries: 0 });
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(existing));
}

export async function getPendingMutations(): Promise<PendingMutation[]> {
  const raw = await AsyncStorage.getItem(PENDING_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function removeMutation(id: string): Promise<void> {
  const existing = await getPendingMutations();
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(existing.filter((m) => m.id !== id)));
}

export async function clearAllMutations(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_KEY);
}
