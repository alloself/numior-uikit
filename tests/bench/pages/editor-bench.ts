import type { Locator, Page } from '@playwright/test';
import { BenchPage } from './bench-page';

declare global {
  interface Window {
    numiorLongTasks?: number[];
  }
}

export class EditorBenchPage extends BenchPage {
  readonly content: Locator;

  constructor(page: Page) {
    super(page, 'view=editor&seed=1&', 'blocks');
    this.content = page.getByTestId('bench-editor');
  }

  async placeAtStart(): Promise<void> {
    await this.content.evaluate((root) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const first = walker.nextNode();

      root.focus();
      if (first === null) {
        return;
      }

      document.getSelection()?.setBaseAndExtent(first, 0, first, 0);
    });

    await this.nextFrame();
  }

  async pressEach(keys: readonly string[]): Promise<number[]> {
    await this.page.evaluate(() => {
      window.numiorBench?.latencies.splice(0);
    });

    for (const key of keys) {
      await this.page.keyboard.press(key);
      await this.nextFrame();
    }
    return this.page.evaluate(() => [...(window.numiorBench?.latencies ?? [])]);
  }

  async selectAllAndBold(rounds: number): Promise<number[]> {
    const samples: number[] = [];

    for (let round = 0; round < rounds; round += 1) {
      await this.page.keyboard.press('Control+a');
      await this.nextFrame();
      samples.push(...(await this.pressEach(['Control+b'])));
    }
    return samples;
  }

  async pasteLines(lines: number, rounds: number): Promise<number[]> {
    const samples: number[] = [];

    for (let round = 0; round < rounds; round += 1) {
      await this.placeAtStart();

      samples.push(
        await this.content.evaluate(
          (root, count) =>
            new Promise<number>((resolve) => {
              const data = new DataTransfer();

              data.setData(
                'text/plain',
                Array.from({ length: count }, (_, index) => `Pasted line ${index + 1}`).join('\n'),
              );

              const started = performance.now();

              root.dispatchEvent(
                new ClipboardEvent('paste', {
                  clipboardData: data,
                  bubbles: true,
                  cancelable: true,
                }),
              );

              requestAnimationFrame(() => {
                const channel = new MessageChannel();

                channel.port1.addEventListener('message', () => {
                  channel.port1.close();
                  resolve(performance.now() - started);
                });

                channel.port1.start();
                channel.port2.postMessage(undefined);
              });
            }),
          lines,
        ),
      );

      await this.page.keyboard.press('Control+z');
      await this.nextFrame();
    }
    return samples;
  }

  async wheelFrames(
    steps: number,
    delta: number,
  ): Promise<{ frames: number[]; longTasks: number[] }> {
    await this.page.evaluate(() => {
      window.numiorLongTasks = [];

      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.numiorLongTasks?.push(entry.duration);
        }
      }).observe({ type: 'longtask' });
    });

    const frames = await this.framesWhileWheeling(this.content, steps, delta);
    const longTasks = await this.page.evaluate(() => [...(window.numiorLongTasks ?? [])]);

    return { frames, longTasks };
  }
}
