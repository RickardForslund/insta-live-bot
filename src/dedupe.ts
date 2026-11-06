/** Remember ids for a while so Meta webhook retries do not run a command twice. */
export class TtlSet {
  private readonly expiry = new Map<string, number>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxSize = 2000,
  ) {}

  /** @returns true when the key was not seen inside the current window. */
  add(key: string, now = Date.now()): boolean {
    this.evict(now);
    const expiresAt = this.expiry.get(key);
    if (expiresAt !== undefined && expiresAt > now) return false;
    this.expiry.set(key, now + this.ttlMs);
    return true;
  }

  private evict(now: number): void {
    for (const [key, expiresAt] of this.expiry) {
      if (expiresAt <= now) this.expiry.delete(key);
    }
    while (this.expiry.size > this.maxSize) {
      const oldest = this.expiry.keys().next().value;
      if (oldest === undefined) break;
      this.expiry.delete(oldest);
    }
  }
}
