const hits = new Map<string, number[]>();

// Simple per-user limit: max `limit` calls per `windowMs`.
export function allow(userId: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) return false;
  recent.push(now);
  hits.set(userId, recent);
  return true;
}
