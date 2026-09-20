// A bounded per-instance cache; it never persists API failures as empty results.
export class ExpiringCache<T> {
  private entries = new Map<string, { value: T; expiresAt: number }>();

  constructor(private maxEntries: number, private ttlMs: number) {}

  get(key: string, now = Date.now()): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= now) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, now = Date.now()) {
    for (const [oldKey, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(oldKey);
    }
    this.entries.delete(key);
    while (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
    this.entries.set(key, { value, expiresAt: now + this.ttlMs });
  }
}
