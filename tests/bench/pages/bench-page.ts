import type { Browser, Locator, Page } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { windowMoveSamples } from '../helpers/trace';
import { boxOf } from '../../e2e/helpers/geometry';

const OPEN_TIMEOUT = 180_000;

const COLD_LOADS = 5;

const firstPaintOf = async (page: Page, address: string): Promise<number> => {
  await page.goto(address, { timeout: OPEN_TIMEOUT });

  await page.waitForFunction(() => typeof window.numiorBench?.firstRowMs === 'number', undefined, {
    timeout: OPEN_TIMEOUT,
  });

  return page.evaluate(() => window.numiorBench?.firstRowMs ?? Number.NaN);
};

const TRACE = join(tmpdir(), 'numior-bench-window-move.json');

export abstract class BenchPage {
  private address = '';

  protected constructor(
    protected readonly page: Page,
    private readonly query: string,
    private readonly countParam = 'rows',
  ) {}

  async open(count: number): Promise<void> {
    this.address = `/bench.html?${this.query}${this.countParam}=${count}`;
    await firstPaintOf(this.page, this.address);
  }

  dataMs(): Promise<number> {
    return this.page.evaluate(() => window.numiorBench?.dataMs ?? Number.NaN);
  }

  async coldStarts(browser: Browser): Promise<number[]> {
    const samples = [await this.page.evaluate(() => window.numiorBench?.firstRowMs ?? Number.NaN)];
    const viewport = this.page.viewportSize();
    const base = this.page.url();

    for (let load = 1; load < COLD_LOADS; load += 1) {
      const context = await browser.newContext({ viewport, baseURL: new URL(base).origin });
      const page = await context.newPage();

      samples.push(await firstPaintOf(page, this.address));
      await context.close();
    }
    return samples;
  }

  remount(): Promise<number> {
    return this.page.evaluate(() => window.numiorBench?.remount() ?? Number.NaN);
  }

  async nextFrame(): Promise<void> {
    await this.page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve();
            });
          });
        }),
    );
  }

  async keyLatencies(key: string, times: number): Promise<number[]> {
    await this.page.evaluate(() => {
      window.numiorBench?.latencies.splice(0);
    });

    for (let step = 0; step < times; step += 1) {
      await this.page.keyboard.press(key);
      await this.nextFrame();
    }
    return this.page.evaluate(() => [...(window.numiorBench?.latencies ?? [])]);
  }

  async heapMb(): Promise<number> {
    const session = await this.page.context().newCDPSession(this.page);
    await session.send('HeapProfiler.collectGarbage');
    const usage = await session.send('Runtime.getHeapUsage');
    await session.detach();
    return Math.round(usage.usedSize / 1_048_576);
  }

  protected async framesWhileWheeling(
    target: Locator,
    steps: number,
    delta: number,
    across = 0,
  ): Promise<number[]> {
    const box = await boxOf(target);

    await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

    await this.page.evaluate(() => {
      window.numiorBench?.recordFrames(true);
    });

    for (let step = 0; step < steps; step += 1) {
      await this.page.mouse.wheel(across, delta);
      await this.nextFrame();
    }
    return this.page.evaluate(() => {
      window.numiorBench?.recordFrames(false);
      return [...(window.numiorBench?.frames ?? [])];
    });
  }

  protected async mainThreadPerWindowMove(
    browser: Browser,
    target: Locator,
    rounds: number,
  ): Promise<number[]> {
    await target.evaluate((element) => {
      element.scrollTop = 0;
    });

    await this.nextFrame();
    const jump = await target.evaluate((element) => element.clientHeight);
    return windowMoveSamples(browser, this.page, target, { jump, rounds, path: TRACE });
  }
}
