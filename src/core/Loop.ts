export const FIXED_STEP = 1 / 120;
const MAX_SUBSTEPS = 5;
const MAX_FRAME = 0.1;

/** Fixed-step accumulator with render interpolation; pause keeps rendering. */
export class Loop {
  private accumulator = 0;
  private last = 0;
  private raf = 0;
  private paused = false;
  private running = false;

  constructor(
    private readonly update: (dt: number) => void,
    private readonly render: (alpha: number) => void,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  setPaused(paused: boolean): void {
    if (paused) this.accumulator = 0;
    this.paused = paused;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  private tick = (now: number): void => {
    if (!this.running) return;
    const elapsed = Math.min((now - this.last) / 1000, MAX_FRAME);
    this.last = now;

    if (!this.paused) {
      this.accumulator = Math.min(this.accumulator + elapsed, FIXED_STEP * MAX_SUBSTEPS);
      let steps = 0;
      while (this.accumulator >= FIXED_STEP && steps < MAX_SUBSTEPS) {
        this.update(FIXED_STEP);
        this.accumulator -= FIXED_STEP;
        steps += 1;
      }
    }

    this.render(this.accumulator / FIXED_STEP);
    this.raf = requestAnimationFrame(this.tick);
  };
}
