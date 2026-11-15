import type { Browser, Locator, Page } from '@playwright/test';
import { BenchPage } from './bench-page';

const SETTLE_TIMEOUT = 60_000;

export class TableBenchPage extends BenchPage {
  readonly table: Locator;
  readonly viewport: Locator;
  readonly quick: Locator;
  readonly filter: Locator;

  constructor(page: Page) {
    super(page, '');
    this.table = page.getByTestId('bench-table');
    this.viewport = this.table.locator('.nui-table__viewport');
    this.quick = page.getByTestId('bench-quick');
    this.filter = page.getByRole('dialog').filter({ has: page.locator('form.nui-table-filter') });
  }

  async focusCell(row: number, col: number): Promise<void> {
    await this.viewport
      .locator(`[role="row"][aria-rowindex="${row + 2}"] [aria-colindex="${col + 1}"]`)
      .click();
  }

  async scrollHome(): Promise<void> {
    await this.viewport.evaluate((element) => {
      element.scrollTo({ top: 0, left: 0 });
    });

    await this.nextFrame();
  }

  private header(col: number): Locator {
    return this.viewport.locator(`[role="columnheader"][aria-colindex="${col + 1}"]`);
  }

  private async clearSettles(): Promise<void> {
    await this.page.evaluate(() => {
      window.numiorBench?.settles.splice(0);
    });
  }

  private async waitForSettles(expected: number): Promise<void> {
    await this.page.waitForFunction(
      (count) => (window.numiorBench?.settles.length ?? 0) >= count,
      expected,
      { timeout: SETTLE_TIMEOUT },
    );
  }

  private settles(): Promise<number[]> {
    return this.page.evaluate(() => [...(window.numiorBench?.settles ?? [])]);
  }

  async sortLatencies(col: number, clicks: number, shift = false): Promise<number[]> {
    await this.clearSettles();

    for (let click = 1; click <= clicks; click += 1) {
      await this.header(col).click({ modifiers: shift ? ['Shift'] : [] });
      await this.waitForSettles(click);
    }
    return this.settles();
  }

  async sortWithLongTasks(col: number): Promise<{ latency: number; longTasks: number[] }> {
    await this.page.evaluate(() => {
      window.numiorLongTasks = [];

      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.numiorLongTasks?.push(entry.duration);
        }
      }).observe({ type: 'longtask' });
    });

    const [latency = Number.NaN] = await this.sortLatencies(col, 1);
    const longTasks = await this.page.evaluate(() => [...(window.numiorLongTasks ?? [])]);

    return { latency, longTasks };
  }

  private async openFilter(col: number): Promise<void> {
    await this.header(col).hover();
    await this.header(col).locator('.nui-table__menu').click();

    await this.table
      .locator(':scope > .nui-menu')
      .getByRole('menuitem', { name: 'Фильтр…', exact: true })
      .click();

    await this.filter.waitFor();
  }

  async setFilterLatencies(col: number, labels: readonly string[]): Promise<number[]> {
    await this.clearSettles();

    for (const [round, label] of labels.entries()) {
      await this.openFilter(col);
      await this.filter.getByRole('checkbox', { name: label, exact: true }).click();
      await this.filter.getByRole('button', { name: 'Применить' }).click();
      await this.waitForSettles(round + 1);
    }
    return this.settles();
  }

  async resetFilter(col: number): Promise<void> {
    await this.clearSettles();
    await this.openFilter(col);
    await this.filter.getByRole('button', { name: 'Сбросить' }).click();
    await this.waitForSettles(1);
  }

  async groupLatencies(sets: readonly (readonly string[])[]): Promise<number[]> {
    const samples: number[] = [];

    for (const keys of sets) {
      await this.clearSettles();

      await this.page.evaluate((next) => {
        window.numiorBench?.setGroupBy(next);
      }, keys);

      await this.waitForSettles(1);
      samples.push(...(await this.settles()));
    }
    return samples;
  }

  async quickLatencies(text: string, erase: number): Promise<number[]> {
    await this.quick.click();
    await this.clearSettles();
    const keys = [...text.split(''), ...Array.from({ length: erase }, () => 'Backspace')];

    for (const [step, key] of keys.entries()) {
      await this.page.keyboard.press(key);
      await this.waitForSettles(step + 1);
    }
    return this.settles();
  }

  wheelFrames(steps: number, delta: number): Promise<number[]> {
    return this.framesWhileWheeling(this.viewport, steps, delta);
  }

  windowMoves(browser: Browser, rounds: number): Promise<number[]> {
    return this.mainThreadPerWindowMove(browser, this.viewport, rounds);
  }
}
