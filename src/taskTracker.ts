/** Keep background webhook work awaitable from tests without delaying the HTTP ack. */
export class TaskTracker {
  private readonly pending = new Set<Promise<void>>();

  track(task: Promise<void>): void {
    this.pending.add(task);
    void task.finally(() => {
      this.pending.delete(task);
    });
  }

  async drain(): Promise<void> {
    while (this.pending.size > 0) {
      await Promise.allSettled([...this.pending]);
    }
  }
}
