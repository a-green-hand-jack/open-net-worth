// A native notice should wait for the renderer's profile display preferences, but a failed
// renderer or unavailable profile must not suppress the notice indefinitely.
export class ProfileDisplayGate {
  private ready = false;
  private accepting = false;
  private pending: (() => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly timeoutMs = 5_000) {}

  get acceptsProfile(): boolean { return this.accepting; }
  reset(): void { this.cancel(); this.ready = false; this.accepting = false; }
  finishLoading(): void { this.accepting = true; }
  markReady(): void { if (!this.accepting) return; this.ready = true; const pending = this.pending; this.cancel(); pending?.(); }
  requestWithBanner(banner: () => void, notice: () => void, fallback: () => void): void {
    banner();
    this.request(notice, fallback);
  }
  request(notice: () => void, fallback: () => void): void {
    if (this.ready) { notice(); return; }
    this.cancel();
    this.pending = notice;
    this.timer = setTimeout(() => { this.pending = null; this.timer = null; fallback(); notice(); }, this.timeoutMs);
  }
  dispose(): void { this.cancel(); this.accepting = false; }
  private cancel(): void { if (this.timer) clearTimeout(this.timer); this.timer = null; this.pending = null; }
}
