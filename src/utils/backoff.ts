export interface BackoffOptions {
  minMs: number;
  maxMs: number;
  factor?: number;
  jitter?: number;
}

export class ExponentialBackoff {
  private readonly minMs: number;
  private readonly maxMs: number;
  private readonly factor: number;
  private readonly jitter: number;
  private attempt: number;

  constructor(options: BackoffOptions) {
    this.minMs = options.minMs;
    this.maxMs = options.maxMs;
    this.factor = options.factor ?? 1.8;
    this.jitter = options.jitter ?? 0.2;
    this.attempt = 0;
  }

  nextDelay(): number {
    const base = this.minMs * Math.pow(this.factor, this.attempt++);
    const capped = Math.min(this.maxMs, base);
    const jitterRange = capped * this.jitter;
    const jittered = capped + (Math.random() * jitterRange - jitterRange / 2);
    return Math.max(this.minMs, Math.floor(jittered));
  }

  reset(): void {
    this.attempt = 0;
  }
}
