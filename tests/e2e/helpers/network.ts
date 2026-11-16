import { expect, type Page, type Request } from '@playwright/test';

const QUIET_MS = 500;

export class MainFrameNetwork {
  private readonly inflight = new Set<Request>();
  private changedAt = Date.now();

  constructor(readonly page: Page) {
    page.on('request', (request) => {
      this.started(request);
    });

    page.on('requestfinished', (request) => {
      this.ended(request);
    });

    page.on('requestfailed', (request) => {
      this.ended(request);
    });
  }

  async quiet(): Promise<void> {
    await expect
      .poll(() => this.unsettled(), {
        intervals: [100],
        timeout: 30_000,
      })
      .toEqual([]);
  }

  private unsettled(): string[] {
    const pending = [...this.inflight].map((request) => `${request.method()} ${request.url()}`);

    if (pending.length > 0 || Date.now() - this.changedAt >= QUIET_MS) {
      return pending;
    }
    return ['settling'];
  }

  private started(request: Request): void {
    const speculative = request.headers()['sec-purpose']?.includes('prefetch') === true;

    if (request.frame() !== this.page.mainFrame() || speculative) {
      return;
    }
    this.inflight.add(request);
    this.changedAt = Date.now();
  }

  private ended(request: Request): void {
    if (!this.inflight.delete(request)) {
      return;
    }
    this.changedAt = Date.now();
  }
}
