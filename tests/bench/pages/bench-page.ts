import type { Browser, Locator, Page } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { windowMoveSamples } from '../helpers/trace';

const OPEN_TIMEOUT = 180_000;

const TRACE = join(tmpdir(), 'numior-bench-window-move.json');

export abstract class BenchPage {
  protected constructor(
    protected readonly page: Page,
    private readonly query: string,
  ) {}

  async open(rows: number): Promise<void> {
    await this.page.goto(`/bench.html?${this.query}rows=${rows}`, { timeout: OPEN_TIMEOUT });

    await this.page.waitForFunction(
      () => typeof window.numiorBench?.firstRowMs === 'number',
      undefined,
      { timeout: OPEN_TIMEOUT },
    );
  }

  dataMs(): Promise<number> {
    return this.page.evaluate(() => window.numiorBench?.dataMs ?? Number.NaN);
  }

  coldStart(): Promise<number> {
    return this.page.evaluate(() => window.numiorBench?.firstRowMs ?? Number.NaN);
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
    const box = await target.boundingBox();

    if (box === null) {
      throw new Error('The bench scroller has no box');
    }
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
