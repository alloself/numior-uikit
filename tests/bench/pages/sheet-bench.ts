import type { Browser, Locator, Page } from '@playwright/test';
import { BenchPage } from './bench-page';

const HEAD_ROWS = 1;
const ROW_HEADERS = 1;

export class SheetBenchPage extends BenchPage {
  readonly sheet: Locator;
  readonly viewport: Locator;

  constructor(page: Page) {
    super(page, 'view=sheet&');
    this.sheet = page.getByTestId('bench-sheet');
    this.viewport = this.sheet.locator('.nui-table__viewport');
  }

  async focusCell(row: number, col: number): Promise<void> {
    await this.viewport
      .locator(
        `[role="row"][aria-rowindex="${row + HEAD_ROWS + 1}"] [aria-colindex="${col + ROW_HEADERS + 1}"]`,
      )
      .click();
  }

  async scrollHome(): Promise<void> {
    await this.viewport.evaluate((element) => {
      element.scrollTo({ top: 0, left: 0 });
    });

    await this.nextFrame();
  }

  wheelFrames(steps: number, delta: number): Promise<number[]> {
    return this.framesWhileWheeling(this.viewport, steps, delta);
  }

  wheelAcrossFrames(steps: number, delta: number): Promise<number[]> {
    return this.framesWhileWheeling(this.viewport, steps, 0, delta);
  }

  windowMoves(browser: Browser, rounds: number): Promise<number[]> {
    return this.mainThreadPerWindowMove(browser, this.viewport, rounds);
  }
}
